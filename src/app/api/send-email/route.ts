import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { decryptData } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hrEmail, emailBody, subject } = await req.json();

    if (!hrEmail || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify MX record to prevent bouncing on fake/invalid domains
    try {
      const domain = hrEmail.split('@')[1];
      if (!domain) throw new Error("Invalid email format");
      const records = await dns.promises.resolveMx(domain);
      if (!records || records.length === 0) {
        throw new Error("No MX records found");
      }
    } catch (err: any) {
      console.error(`[DEBUG SEND] MX Verification failed for: ${hrEmail}`, err.message);
      return NextResponse.json({ error: "Email domain verification failed. The recipient domain does not exist or cannot accept mail." }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user || !user.emailConfig?.gmailAddress || !user.emailConfig?.appPassword) {
      return NextResponse.json({ error: 'Email configuration missing in user profile.' }, { status: 404 });
    }

    const { gmailAddress, appPassword } = user.emailConfig;
    const decryptedPassword = decryptData(appPassword);

    if (!gmailAddress || !decryptedPassword) {
      return NextResponse.json({ error: 'Incomplete email configuration. Please set your Gmail and App Password in System Config.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailAddress,
        pass: decryptedPassword,
      },
    });

    const mailOptions = {
        from: user.emailConfig.gmailAddress,
        to: hrEmail,
        subject: subject || 'Application for Software Engineering Role',
        text: emailBody, // We use text here, but html: could be used if preferred
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully!' });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
