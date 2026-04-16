import { NextRequest, NextResponse } from "next/server";
import { createActionLogInNocoDB, updateCandidateInNocoDB } from "@/lib/nocodb";
import type { CandidateActionPayload } from "@/types/hr";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CandidateActionPayload;
    const { action, actor, candidateId, candidateName } = body;

    if (!candidateId || !candidateName || !actor || !action) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const statusAfter = action === "reject" ? "rejected" : "interview_invited";

    await updateCandidateInNocoDB(candidateId, {
      Status: statusAfter,
      status: statusAfter,
      LastActionBy: actor,
      last_action_by: actor,
      LastActionAt: now,
      last_action_at: now,
    });

    await createActionLogInNocoDB({
      candidate_name: candidateName,
      cadidate_name: candidateName,
      actor,
      action,
      action_time: now,
      status_after: statusAfter,
    });

    return NextResponse.json({ success: true, statusAfter, actionTime: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

