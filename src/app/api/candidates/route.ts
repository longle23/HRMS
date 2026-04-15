import { NextResponse } from "next/server";
import { mapCandidateRecord } from "@/lib/candidate-utils";
import { getCandidatesFromNocoDB } from "@/lib/nocodb";

export async function GET() {
  try {
    const records = await getCandidatesFromNocoDB();
    const candidates = records.map((record) => mapCandidateRecord(record));
    return NextResponse.json({ candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

