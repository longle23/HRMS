import { NextRequest, NextResponse } from "next/server";
import {
  appendEmailTemplateLogInNocoDB,
  getEmailTemplateFromNocoDB,
  updateEmailTemplateInNocoDB,
} from "@/lib/nocodb";
import type { EmailTemplate, EmailTemplateKey } from "@/lib/candidate-utils";

const allowedKeys: EmailTemplateKey[] = [
  "reject_en",
  "reject_vi",
  "invite_interview_en",
  "invite_interview_vi",
  "onboard_en",
  "onboard_vi",
];

function isTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && allowedKeys.includes(value as EmailTemplateKey);
}

function normalizeTemplate(record: Record<string, unknown>): EmailTemplate | null {
  const key = record.key;
  const subject = record.subject;
  const body = record.body;
  if (!isTemplateKey(key) || typeof subject !== "string" || typeof body !== "string") return null;
  return {
    key,
    subject,
    body,
    updateBy: typeof record.updateBy === "string" ? record.updateBy : undefined,
    updateAt: typeof record.updateAt === "string" ? record.updateAt : undefined,
  };
}

export async function GET() {
  try {
    const records = await getEmailTemplateFromNocoDB();
    const templates = records.map((record) => normalizeTemplate(record as Record<string, unknown>)).filter((value): value is EmailTemplate => Boolean(value));
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: unknown; subject?: unknown; body?: unknown; updateBy?: unknown; updateAt?: unknown };

    const key = typeof body.key === "string" ? body.key.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const templateBody = typeof body.body === "string" ? body.body : "";

    if (!isTemplateKey(key) || !subject || !templateBody) {
      return NextResponse.json({ error: "Invalid template payload." }, { status: 400 });
    }

    const payload = {
      key,
      subject,
      body: templateBody,
      updateBy: typeof body.updateBy === "string" ? body.updateBy : "",
      updateAt: typeof body.updateAt === "string" ? body.updateAt : new Date().toISOString(),
    };

    await updateEmailTemplateInNocoDB(payload);
    await appendEmailTemplateLogInNocoDB(payload);

    return NextResponse.json({ template: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
