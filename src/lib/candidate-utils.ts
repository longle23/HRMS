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

export function mapCandidateRecord(record: AnyRecord) {
  const idValue = record.Id ?? record.id ?? record.ID ?? record.CandidateId;
  const id = String(idValue ?? "");

  const rawStatus = pickString(record, ["status", "Status"], "new").toLowerCase();
  const normalizedStatus =
    rawStatus === "rejected" || rawStatus === "interview_invited" ? rawStatus : "new";

  return {
    id,
    name: pickString(record, ["full_name"], "Unknown"),
    email: pickString(record, ["email"], ""),
    position: pickString(record, ["apply_position"], "Unknown"),
    status: normalizedStatus,
    lastActionBy: pickString(record, ["LastActionBy", "last_action_by"], "None"),
    lastActionAt: pickString(record, ["LastActionAt", "last_action_at"], ""),
    candidateSource: pickString(record, ["candidate_source"], ""),
    address: pickString(record, ["address"], ""),
    experience: pickString(record, ["experience"], ""),
    skills: pickString(record, ["skills"], ""),
    score: pickString(record, ["score"], ""),
    recommendation: pickString(record, ["recommendation"], ""),
    cvFileName: pickString(record, ["cv_file_name"], ""),
    applyTime: pickString(record, ["apply_time"], ""),
    raw: record,
  };
}

export function buildRejectMail(params: {
  candidateName: string;
  position: string;
}) {
  return {
    subject: `SOTRANS GROUP Application Update – ${params.position}`,
    body: `Dear ${params.candidateName},

Thank you for your interest in ${params.position} at SOTRANS.
After careful review, we regret to inform you that your profile is not the best match for this role at this time. However, your journey with SOTRANS doesn’t end here — we will keep your profile in our talent network for future opportunities.
We appreciate your time and wish you all the best ahead.
Warm regards,

Human Resource Department`,
  };
}

export function buildInterviewInviteMail(params: {
  candidateName: string;
  position: string;
}) {
  const fixedInterviewLocation =
    "1B Đường Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh";

  return {
    subject: `SOTRANS LOGISTICS - INTERVIEW INVITATION - ${params.position} POSITION`,
    body: `Dear ${params.candidateName},

Thank you for your concern about opportunity at Sotrans Logistics.
Per our conversation on phone, we would like to invite you to join the interview for the position of ${params.position}.

      - Location: ${fixedInterviewLocation}
      - Time: [HR điền]
      - Contact: [HR điền]

Please arrange your time to join on time.
Thank you.! 
Best regards,
 
Human Resource Department`,
  };
}

export function buildOnboardMail(params: {
  candidateName: string;
  position: string;
}) {
  const fixedInterviewLocation =
    "1B Đường Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh";

  return {
    subject: `SOTRANS LOGISTICS - ONBOARDING - ${params.position} POSITION`,
    body: `Chào ${params.candidateName},

Công ty TNHH Một Thành Viên SOTRANS LOGISTICS vui mừng thông báo:
 
Bạn đã trúng tuyển vị trí ${params.position}.
Ngày nhận việc: [HR điền]
Địa chỉ văn phòng: ${fixedInterviewLocation}

Để chuẩn bị cho buổi nhận việc, bạn vui lòng chuẩn bị các giấy tờ sau:

      - CCCD sao y công chứng
      - Giấy giới thiệu có dấu mộc trường hoặc Bảng điểm có dấu mộc trường
      - Staff Info (file word)
      - Thỏa thuận bảo mật (sẽ được ký trong ngày onboard)

Nếu có bất kỳ thắc mắc nào hoặc cần hỗ trợ thêm, bạn có thể liên hệ trực tiếp với bộ phận Nhân sự qua email hoặc số điện thoại bên dưới.

Chúc mừng bạn đã trở thành một phần của đại gia đình SOTRANS LOGISTICS!
Hẹn gặp bạn vào ngày onboard sắp tới nhé!
 
Trân trọng,
 
Human Resource Department`,
  };
}

export const defaultMailBuilders = {
  reject: buildRejectMail,
  invite_interview: buildInterviewInviteMail,
  onboard: buildOnboardMail,
};

export type EmailTemplateKey = keyof typeof defaultMailBuilders;

export type EmailTemplate = {
  key: EmailTemplateKey;
  subject: string;
  body: string;
  updateBy?: string;
  updateAt?: string;
};

export function interpolateTemplate(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
}

export function buildMailFromTemplate(
  template: EmailTemplate | null | undefined,
  fallback: ReturnType<(typeof defaultMailBuilders)[EmailTemplateKey]>,
  params: Record<string, string>,
) {
  if (!template?.subject || !template?.body) {
    return fallback;
  }

  return {
    subject: interpolateTemplate(template.subject, params),
    body: interpolateTemplate(template.body, params),
  };
}

export function toMailTargets(to: string, subject: string, body: string) {
  const encodedTo = encodeURIComponent(to);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return {
    mailto: `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`,
  };
}

