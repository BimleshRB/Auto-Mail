import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hrName, companyName, targetRole } = await req.json();

    if (!hrName || !companyName || !targetRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User profile not found. Please save your profile settings first.' }, { status: 404 });
    }

    const { professionalLinks } = user;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an expert software engineer writing a highly professional, concise, and compelling cold email to a recruiter/HR manager.
      
      Target HR Name: ${hrName}
      Target Company: ${companyName}
      Target Role: ${targetRole}
      
      My Professional Links:
      - Resume: ${professionalLinks.resume || 'N/A'}
      - Portfolio: ${professionalLinks.portfolio || 'N/A'}
      - GitHub: ${professionalLinks.github || 'N/A'}
      - LinkedIn: ${professionalLinks.linkedin || 'N/A'}
      - Twitter: ${professionalLinks.twitter || 'N/A'}
      
      Requirements:
      - Keep it under 150 words.
      - Be highly professional and confident.
      - Mention the target role and company name clearly.
      - End with a call to action.
      - Do not include placeholders like "[Your Name]". Assume the sender will review it. Just write the email body.
      - No subject line in the output, just the body of the email.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ template: text });
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
