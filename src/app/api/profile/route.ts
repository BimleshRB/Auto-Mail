
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { encryptData, decryptData } from '@/lib/encryption';

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
            apiKeys: { gemini: [] },
            jobPreferences: { roles: [] }
          }
        },
        { new: true, upsert: true }
      );
    }

    // DECRYPT before sending to frontend
    const uiData = {
      ...user.toObject(),
      emailConfig: {
        ...user.emailConfig,
        appPassword: user.emailConfig?.appPassword ? decryptData(user.emailConfig.appPassword) : ""
      },
      apiKeys: {
        ...user.apiKeys,
        gemini: (user.apiKeys?.gemini || []).map((key: string) => decryptData(key)).filter(Boolean)
      }
    };

    return NextResponse.json(uiData);
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

    const { emailConfig, professionalLinks, apiKeys, jobPreferences } = await req.json();
    await dbConnect();
    
    const user = await User.findOne({ email: session.user?.email });

    const updatePayload: any = {};
    if (emailConfig) {
      if (emailConfig.appPassword && emailConfig.appPassword.trim() !== '') {
        updatePayload['emailConfig.appPassword'] = encryptData(emailConfig.appPassword);
      }
      if (emailConfig.gmailAddress !== undefined) {
        updatePayload['emailConfig.gmailAddress'] = emailConfig.gmailAddress;
      }
    }
    if (professionalLinks) updatePayload.professionalLinks = professionalLinks;
    if (apiKeys && apiKeys.gemini) {
      // ENCRYPT keys before saving
      updatePayload['apiKeys.gemini'] = apiKeys.gemini.map((key: string) => encryptData(key)).filter(Boolean);
    }
    if (jobPreferences) updatePayload.jobPreferences = jobPreferences;

    await User.findOneAndUpdate(
      { email: session.user?.email },
      { $set: updatePayload },
      { new: true, upsert: true }
    );
    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

