import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

    const { hrName, companyName, targetRole } = await req.json();

    if (!hrName || !companyName || !targetRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User profile not found. Please save your profile settings first.' }, { status: 404 });
    }

    const { professionalLinks, apiKeys } = user;

    // Use user provided array. Decrypt before handing to Google SDK.
    const rawKeys = Array.isArray(apiKeys?.gemini) ? apiKeys.gemini : [];
    const decryptedKeys = rawKeys.map((k: string) => decryptData(k)).filter(Boolean) as string[];

    console.log(`[DEBUG GENERATE] Found ${decryptedKeys.length} Gemini API keys in user profile for ${session.user.email}`);

    // STRICT PRIORITY: Use user profile keys FIRST. Only fallback to env if they explicitly have 0 keys in their profile.
    const geminiKeys: string[] = decryptedKeys.length > 0
      ? decryptedKeys 
      : process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];

    if (geminiKeys.length === 0) {
      console.error("[DEBUG GENERATE] No Gemini API keys available. Aborting generation.");
      return NextResponse.json({ error: 'No Gemini API Keys found. Please configure them in your System Config or set GEMINI_API_KEY globally.' }, { status: 500 });
    }

    console.log(`[DEBUG GENERATE] Using Gemini API key starting with ${geminiKeys[0].substring(0, 5)}...`);

    const prompt = `
      You are an expert software engineer writing a highly professional, concise, and compelling cold email to a recruiter/HR manager.
      
      Target HR Name: ${hrName}
      Target Company: ${companyName}
      Target Role: ${targetRole}
      
      My Raw Resume Context (Use this to highly personalize the email to my actual experience):
      ${professionalLinks?.resumeText ? professionalLinks.resumeText : 'No raw resume provided.'}

      My Professional Links (Include relevant ones as a signature or call to action):
      - Resume URL: ${professionalLinks?.resume || 'N/A'}
      - Portfolio: ${professionalLinks?.portfolio || 'N/A'}
      - GitHub: ${professionalLinks?.github || 'N/A'}
      - LinkedIn: ${professionalLinks?.linkedin || 'N/A'}
      - Twitter: ${professionalLinks?.twitter || 'N/A'}
      
      Requirements:
      - Keep it under 150 words.
      - Be highly professional and confident.
      - Extract relevant framing from my "Raw Resume Context" to prove I am a perfect fit for the "${targetRole}" role at "${companyName}".
      - Mention the target role and company name clearly.
      - End with a call to action.
      - Do not include placeholders like "[Your Name]". Assume the sender will review it. Just write the email body.
      - No subject line in the output, just the body of the email.
    `;

    let generatedText = '';
    let lastError = null;

    // Try each key sequentially
    for (const key of geminiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const result = await model.generateContent(prompt);
        generatedText = result.response.text().trim();
        break; // Success! Break out of the loop
      } catch (err: any) {
        console.error(`Gemini API Error with key ending in ...${key.slice(-4)}:`, err);
        lastError = err;
        
        // Typical HTTP 429 means Rate Limit - continue to next key. 
        // If it's a different error (like a 400 Bad Request on the prompt itself), 
        // we might still want to just try the next key just in case, but usually 429 is the main rotation trigger.
        continue;
      }
    }

    if (!generatedText) {
      return NextResponse.json({ error: lastError?.message || 'Failed to generate template across all provided API keys. You may have hit rate limits.' }, { status: 500 });
    }

    return NextResponse.json({ template: generatedText });
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
