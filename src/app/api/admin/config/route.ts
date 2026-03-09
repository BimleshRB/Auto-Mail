import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import SystemConfig from "@/models/SystemConfig";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // There should only be one SystemConfig document
    let config = await SystemConfig.findOne();
    if (!config) {
       config = await SystemConfig.create({}); // Generate default if none exists
    }

    return NextResponse.json({ config }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    await dbConnect();

    // Upsert the single config document
    let config = await SystemConfig.findOne();
    if (config) {
       Object.assign(config, body);
       await config.save();
    } else {
       config = await SystemConfig.create(body);
    }

    return NextResponse.json({ message: "Configurations saved securely.", config }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
