import { NextResponse } from "next/server";
import { getJobDescriptionsFromNocoDB } from "@/lib/nocodb";

export async function GET() {
  try {
    const jobs = await getJobDescriptionsFromNocoDB();
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
