import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Strict Role-Based Access Control (RBAC)
    const userRole = (session?.user as any)?.role?.toLowerCase() || 'user';
    if (!session || userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    await dbConnect();

    // Fetch all users, excluding sensitive encrypted data like actual API keys or App Passwords
    const users = await User.find({}, {
      'apiKeys.gemini': 0,
      'apiKeys.zerobounce': 0,
      'apiKeys.hunter': 0,
      'apiKeys.abstract': 0,
      'emailConfig.appPassword': 0
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('API /admin/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
