type AnyRecord = Record<string, unknown>;

function pickString(record: AnyRecord, aliases: string[], fallback = ""): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function normalizeStatus(status: string) {
  const value = status.toLowerCase();
  if (["open", "active", "recruiting", "published", "available"].includes(value)) {
    return "active";
  }
  return value || "active";
}

export function mapJobDescriptionRecord(record: AnyRecord) {
  const idValue = record.Id ?? record.id ?? record.ID ?? record.job_id ?? record.job_code;
  const id = String(idValue ?? "");
  const status = normalizeStatus(pickString(record, ["status", "Status"], "active"));

  return {
    id,
    jobCode: pickString(record, ["job_code", "jobCode", "job_no", "job_id"], id),
    title: pickString(record, ["job_title", "jobTitle", "title", "position"], "Untitled JD"),
    department: pickString(record, ["department", "Department"], "-"),
    workplace: pickString(record, ["workplace", "Workplace", "location"], "-"),
    status,
    content: pickString(record, ["job_content", "jobContent", "content", "description"], ""),
    requiredSkills: pickString(record, ["required_skills", "requiredSkills", "skills"], "-"),
    requiredExperience: pickString(record, ["required_experience", "requiredExperience", "experience"], "-"),
    requiredEducation: pickString(record, ["required_education", "requiredEducation", "education"], "-"),
    certificate: pickString(record, ["certificate", "required_certificate"], "-"),
    keywords: pickString(record, ["keywords"], ""),
    extraKeywords: pickString(record, ["extra_keywords"], ""),
    createdAtTime: pickString(record, ["created_at_time"], ""),
    raw: record,
  };
}

export function isActiveJob(status: string) {
  const normalized = status.toLowerCase();
  return ["active", "open", "recruiting", "published", "available"].includes(normalized);
}
