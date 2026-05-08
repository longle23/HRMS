import { NextRequest, NextResponse } from "next/server";
import { uploadJobDescriptionToOneDrive } from "@/lib/nocodb";
import type { JobUploadResponse } from "@/types/hr";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folderPath = formData.get("folderPath");

    if (!(file instanceof File)) {
      return NextResponse.json<JobUploadResponse>({ success: false, error: "Vui lòng chọn file PDF JD." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json<JobUploadResponse>({ success: false, error: "Chỉ chấp nhận file PDF." }, { status: 400 });
    }

    const result = await uploadJobDescriptionToOneDrive(file, typeof folderPath === "string" ? folderPath.trim() : "");

    return NextResponse.json<JobUploadResponse>({
      success: true,
      fileName: result.fileName ?? file.name,
      folderPath: result.folderPath ?? (typeof folderPath === "string" ? folderPath : ""),
      itemUrl: result.itemUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json<JobUploadResponse>({ success: false, error: message }, { status: 500 });
  }
}
