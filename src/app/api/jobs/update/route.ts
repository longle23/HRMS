import { NextRequest, NextResponse } from "next/server";
import { updateJobDescriptionInNocoDB, createJobLogInNocoDB } from "@/lib/nocodb";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, jobCode, jobTitle, updates, actor, oldValues } = body;

    if (!jobId || !updates || !actor) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin cập nhật." }, { status: 400 });
    }

    // 1. Cập nhật bảng JOB_DESCRIPTION
    const updateFields = {
      ...updates,
      update_by: actor,
      update_time: new Date().toISOString(),
    };
    await updateJobDescriptionInNocoDB(jobId, updateFields);

    // 2. Ghi Log vào bảng LOG_JD
    const modifiedFields = Object.keys(updates);
    if (modifiedFields.length > 0) {
      // Chuyển đổi object sang dạng chuỗi có xuống dòng cho dễ đọc
      const formatLogValue = (obj: Record<string, any>) => {
        return Object.entries(obj)
          .map(([key, value]) => `${key}: ${value || "-"}`)
          .join("\n");
      };

      await createJobLogInNocoDB({
        id_job: jobCode || jobId,
        job_title: jobTitle,
        user: actor,
        action_Time: new Date().toISOString(),
        field_modified: modifiedFields.join("\n"), // Xuống dòng cho danh sách các trường sửa
        old_Value: formatLogValue(oldValues),     // Xuống dòng cho giá trị cũ
        new_Value: formatLogValue(updates),       // Xuống dòng cho giá trị mới
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
