import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import SystemConfig from "@/models/SystemConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import Razorpay from "razorpay";

const PLAN_PRICING = {
  free: 0,
  growth: 2900, // $29, but Razorpay works in the smallest currency unit. Let's assume INR for Razorpay India, so 2900 INR = ~29 USD equivalent (or 2900 cents if USD)
  scale: 8900
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planTier } = await req.json();
    if (!['growth', 'scale'].includes(planTier)) {
      return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    }

    const amount = PLAN_PRICING[planTier as keyof typeof PLAN_PRICING];

    await dbConnect();

    // 1. Fetch dynamic Razorpay Keys from System Config (Bypass .env)
    const config = await SystemConfig.findOne();
    if (!config || !config.razorpayKeyId || !config.razorpayKeySecret) {
       return NextResponse.json({ error: "Payment gateway is currently offline." }, { status: 503 });
    }

    // 2. Lookup User
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Initialize Razorpay Server-Side SDK securely
    const razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });

    // 4. Generate a Tamper-Proof Order Server-Side
    const options = {
      amount: amount * 100, // Razorpay requires amount in smallest currency sub-unit (e.g., paise/cents)
      currency: "USD",
      receipt: `receipt_order_${user._id}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // 5. Register the pending order in our Immutable Transaction Ledger
    await Transaction.create({
      userId: user._id,
      razorpayOrderId: order.id,
      amount: amount,
      planTier: planTier,
      status: 'pending'
    });

    // 6. Return only the safe Order ID back to the frontend.
    return NextResponse.json({ 
       orderId: order.id, 
       amount: order.amount, 
       currency: order.currency, 
       keyId: config.razorpayKeyId // Safe to expose public Key ID 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Payment Checkout Error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate checkout" }, { status: 500 });
  }
}
