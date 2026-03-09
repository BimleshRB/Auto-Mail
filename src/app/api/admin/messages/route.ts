import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import ContactMessage from '@/models/ContactMessage';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Strict Role-Based Access Control (RBAC)
    const userRole = (session?.user as any)?.role?.toLowerCase() || 'user';
    if (!session || userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    await dbConnect();
    
    const messages = await ContactMessage.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('API /admin/messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as any)?.role?.toLowerCase() || 'user';
    if (!session || userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    const { targetIds, status } = await req.json();

    if (!targetIds || !Array.isArray(targetIds) || !status) {
       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await dbConnect();

    await ContactMessage.updateMany(
      { _id: { $in: targetIds } },
      { $set: { status: status } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API /admin/messages update error:', error);
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
  }
}
