import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    let user = await User.findOne({ email: session.user.email });

    if (!user) {
      // User is created by NextAuth adapter, but we might need to initialize our custom fields
      user = await User.findOneAndUpdate(
        { email: session.user.email },
        {
          $setOnInsert: {
            emailConfig: { gmailAddress: '', appPassword: '' },
            professionalLinks: { resume: '', resumeText: '', portfolio: '', github: '', linkedin: '', twitter: '' },
            apiKeys: { gemini: '' },
            jobPreferences: { roles: [] }
          }
        },
        { new: true, upsert: true }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();
    
    let user = await User.findOne({ email: session.user.email });
    if (!user) {
      user = new User(data);
    } else {
      user.emailConfig = data.emailConfig;
      user.professionalLinks = data.professionalLinks;
      user.apiKeys = data.apiKeys;
      user.jobPreferences = data.jobPreferences;
    }
    
    await user.save();
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
