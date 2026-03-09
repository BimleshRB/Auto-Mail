import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import SystemConfig from "@/models/SystemConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
       return NextResponse.json({ error: "Missing payment payload data for cryptographic verification." }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch Razorpay Secret Key to act as the decipher
    const config = await SystemConfig.findOne();
    if (!config || !config.razorpayKeySecret) {
       return NextResponse.json({ error: "Payment verification unavailable. Integrity check failed." }, { status: 503 });
    }

    // 2. The Verification Algorithm (HMAC SHA-256)
    // We concatenate the order_id and payment_id with a pipe '|', and hash it using our secret key.
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(body.toString())
      .digest("hex");

    // 3. Compare mathematical hashes to guarantee sequence wasn't spoofed
    if (expectedSignature !== razorpaySignature) {
       // Mark transaction as failed if it exists
       await Transaction.findOneAndUpdate(
          { razorpayOrderId: razorpayOrderId },
          { status: 'failed' }
       );
       return NextResponse.json({ error: "Invalid payment signature. Potential tampering detected." }, { status: 400 });
    }

    // 4. Update the Immutable Ledger as Verified
    const transaction = await Transaction.findOneAndUpdate(
       { razorpayOrderId: razorpayOrderId },
       { 
         razorpayPaymentId: razorpayPaymentId,
         razorpaySignature: razorpaySignature,
         status: 'verified' 
       },
       { new: true }
    );

    if (!transaction) {
       return NextResponse.json({ error: "Transaction ledger not found for this Order ID." }, { status: 404 });
    }

    // 5. Upgrade the User!
    // Set plan, features, and grant generation capacity based on tier.
    let templatesGeneratedThisMonth = 0; // reset
    let quota = 50; // free limit fallback
    
    if (transaction.planTier === 'growth') {
       quota = 5000;
    } else if (transaction.planTier === 'scale') {
       quota = 9999999; // Unlimited
    }

    await User.findByIdAndUpdate(transaction.userId, {
       plan: transaction.planTier,
       'subscriptionStats.templatesGeneratedThisMonth': 0 // reset on new billing cycle
    });

    return NextResponse.json({ 
       message: "Payment cryptographically verified! Account upgraded successfully.", 
       plan: transaction.planTier 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Signature Verification Error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify payment integrity." }, { status: 500 });
  }
}
