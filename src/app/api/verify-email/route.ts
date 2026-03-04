import { NextResponse } from 'next/server';
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

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user || (!user.apiKeys?.zerobounce?.length && !user.apiKeys?.hunter?.length && !user.apiKeys?.abstract?.length)) {
      return NextResponse.json({ error: 'No Email Verification API Keys configured in System Settings.' }, { status: 400 });
    }

    let status = 'unknown';
    let errorMessage = '';

    // Provider 1: ZeroBounce (Highest Accuracy)
    const zbKeys = (user.apiKeys.zerobounce || []).map((k: string) => decryptData(k)).filter(Boolean);
    if (zbKeys.length > 0) {
      for (const key of zbKeys) {
        try {
          const res = await fetch(`https://api.zerobounce.net/v2/validate?api_key=${key}&email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          
          if (data.status === 'valid') return NextResponse.json({ status: 'valid', provider: 'zerobounce' });
          if (data.status === 'invalid') return NextResponse.json({ status: 'bounced', provider: 'zerobounce' });
          if (data.status === 'catch-all') return NextResponse.json({ status: 'catch-all', provider: 'zerobounce' });
          if (data.status === 'do_not_mail') return NextResponse.json({ status: 'bounced', provider: 'zerobounce' });
          
          return NextResponse.json({ status: 'unknown', provider: 'zerobounce', detail: data.sub_status });
        } catch (err: any) {
          console.error("[VERIFY] ZeroBounce Key Exhausted/Failed:", err.message);
          errorMessage = err.message;
          continue; // Try next key
        }
      }
    }

    // Provider 2: Hunter.io (Tier 2 Fallback)
    const hunterKeys = (user.apiKeys.hunter || []).map((k: string) => decryptData(k)).filter(Boolean);
    if (hunterKeys.length > 0) {
      for (const key of hunterKeys) {
        try {
          const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`);
          const data = await res.json();
          if (data.errors) throw new Error(data.errors[0].details);
          
          const result = data.data.status; // valid, invalid, accept_all, disposable, unknown
          if (result === 'valid') return NextResponse.json({ status: 'valid', provider: 'hunter' });
          if (result === 'invalid' || result === 'disposable') return NextResponse.json({ status: 'bounced', provider: 'hunter' });
          if (result === 'accept_all') return NextResponse.json({ status: 'catch-all', provider: 'hunter' });
          
          return NextResponse.json({ status: 'unknown', provider: 'hunter' });
        } catch (err: any) {
          console.error("[VERIFY] Hunter Key Exhausted/Failed:", err.message);
          errorMessage = err.message;
          continue;
        }
      }
    }

    // Provider 3: AbstractAPI (Tier 3 Fallback)
    const absKeys = (user.apiKeys.abstract || []).map((k: string) => decryptData(k)).filter(Boolean);
    if (absKeys.length > 0) {
      for (const key of absKeys) {
        try {
          const res = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${key}&email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          
          if (data.deliverability === 'DELIVERABLE') return NextResponse.json({ status: 'valid', provider: 'abstract' });
          if (data.deliverability === 'UNDELIVERABLE') return NextResponse.json({ status: 'bounced', provider: 'abstract' });
          if (data.is_catchall_email.value === true) return NextResponse.json({ status: 'catch-all', provider: 'abstract' });
          
          return NextResponse.json({ status: 'unknown', provider: 'abstract' });
        } catch (err: any) {
          console.error("[VERIFY] Abstract Key Exhausted/Failed:", err.message);
          errorMessage = err.message;
          continue;
        }
      }
    }

    return NextResponse.json({ error: `All provided API Keys across all configured Verification Providers failed or ran out of quota. Last Error: ${errorMessage}` }, { status: 429 });

  } catch (error: any) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ error: error.message || 'Verification engine failed' }, { status: 500 });
  }
}
