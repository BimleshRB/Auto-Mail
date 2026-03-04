import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use `URL` to extract the campaignName from the request
    const { searchParams } = new URL(req.url);
    const campaignName = searchParams.get('campaignName');

    // Fetch leads for this specific user, newest first. If a campaign is specified, filter by it.
    const query: any = { userId: user._id };
    
    if (campaignName && campaignName !== 'Default Campaign') {
      query.campaignName = campaignName;
    } else if (campaignName === 'Default Campaign') {
      // For the Default Campaign, also include legacy leads that have no campaignName
      query.$or = [
        { campaignName: 'Default Campaign' },
        { campaignName: { $exists: false } },
        { campaignName: null },
        { campaignName: "" }
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leads, campaignName } = await req.json(); // Expecting an array of lead objects and an optional campaign name

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Valid leads array is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Default to 'Default Campaign' if user doesn't provide one
    const targetCampaign = campaignName && campaignName.trim() !== '' ? campaignName.trim() : 'Default Campaign';

    const leadsWithUserId = leads.map(lead => ({
      ...lead,
      userId: user._id,
      campaignName: targetCampaign,
      status: 'pending' // Force status to pending on creation
    }));

    // Bulk insert
    const insertedLeads = await Lead.insertMany(leadsWithUserId);

    return NextResponse.json({ success: true, count: insertedLeads.length });
  } catch (error: any) {
    console.error('Error creating leads:', error);
    return NextResponse.json({ error: 'Failed to save leads to database' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, generatedTemplate, subject } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    
    const updatePayload: any = { status };
    if (generatedTemplate) updatePayload.generatedTemplate = generatedTemplate;
    if (subject) updatePayload.subject = subject;

    // We explicitly check the userId matches the session user to prevent modifying other users' leads
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: updatePayload },
      { new: true }
    );

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Array of valid lead IDs is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await Lead.deleteMany({
      _id: { $in: ids },
      userId: user._id 
    });

    return NextResponse.json({ success: true, count: result.deletedCount });
  } catch (error: any) {
    console.error('Error deleting leads:', error);
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 });
  }
}
