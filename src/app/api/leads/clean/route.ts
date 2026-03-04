import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import Lead from '@/models/Lead';
import User from '@/models/User';
import dns from 'dns';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided for cleaning' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only process leads belonging to this user
    const leadsToProcess = await Lead.find({ _id: { $in: ids }, userId: user._id });
    
    if (leadsToProcess.length === 0) {
      return NextResponse.json({ message: 'No valid leads found to clean' });
    }

    const invalidIds: string[] = [];
    const BATCH_SIZE = 10; // Process DNS lookups in batches to avoid overwhelming the network
    
    for (let i = 0; i < leadsToProcess.length; i += BATCH_SIZE) {
      const batch = leadsToProcess.slice(i, i + BATCH_SIZE);
      
      const mxPromises = batch.map(async (lead) => {
        try {
          const domain = lead.hrEmail.split('@')[1];
          if (!domain) return lead._id.toString(); // Invalid format is an invalid domain
          
          const records = await dns.promises.resolveMx(domain);
          if (!records || records.length === 0) {
             return lead._id.toString();
          }
          return null; // Valid
        } catch (err) {
          // If DNS lookup itself fails (NXDOMAIN), the domain doesn't exist
          return lead._id.toString();
        }
      });

      const results = await Promise.all(mxPromises);
      const batchInvalidIds = results.filter(id => id !== null) as string[];
      invalidIds.push(...batchInvalidIds);
    }
    
    let deletedCount = 0;
    if (invalidIds.length > 0) {
      const deleteResult = await Lead.deleteMany({ _id: { $in: invalidIds }, userId: user._id });
      deletedCount = deleteResult.deletedCount || 0;
    }

    return NextResponse.json({ 
      message: 'Scrub routine completed', 
      processedCount: leadsToProcess.length,
      invalidCount: invalidIds.length,
      deletedCount
    });

  } catch (error: any) {
    console.error('Error during bulk clean:', error);
    return NextResponse.json({ error: 'Failed to process bulk clean' }, { status: 500 });
  }
}
