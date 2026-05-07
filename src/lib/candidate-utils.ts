type AnyRecord = Record<string, unknown>;

export type MailLanguage = "en" | "vi";
export type CandidateMailType = "reject" | "invite_interview" | "onboard";
export type EmailTemplateKey = `${CandidateMailType}_${MailLanguage}`;

const emailLanguages: MailLanguage[] = ["vi", "en"];
const candidateMailTypes: CandidateMailType[] = ["reject", "invite_interview", "onboard"];

function pickString(record: AnyRecord, aliases: string[], fallback = ""): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function buildTemplateKey(type: CandidateMailType, language: MailLanguage): EmailTemplateKey {
  return `${type}_${language}`;
}

function buildLocalizedMail(
  language: MailLanguage,
  english: { subject: string; body: string },
  vietnamese: { subject: string; body: string },
) {
  return language === "vi" ? vietnamese : english;
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

export function buildRejectMail(params: { candidateName: string; position: string }, language: MailLanguage = "en") {
  return buildLocalizedMail(
    language,
    {
      subject: `SOTRANS GROUP Application Update – ${params.position}`,
      body: `Dear ${params.candidateName},

Thank you for your interest in ${params.position} at SOTRANS.
After careful review, we regret to inform you that your profile is not the best match for this role at this time. However, your journey with SOTRANS doesn’t end here — we will keep your profile in our talent network for future opportunities.
We appreciate your time and wish you all the best ahead.
Warm regards,

Human Resource Department`,
    },
    {
      subject: `SOTRANS GROUP - Cập nhật kết quả ứng tuyển – ${params.position}`,
      body: `Chào ${params.candidateName},

Cảm ơn bạn đã quan tâm đến vị trí ${params.position} tại SOTRANS.
Sau khi xem xét hồ sơ, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn hiện chưa phù hợp nhất với vị trí này. Tuy nhiên, hành trình của bạn với SOTRANS chưa dừng lại tại đây — chúng tôi sẽ lưu hồ sơ của bạn vào nguồn ứng viên tiềm năng cho các cơ hội trong tương lai.
Cảm ơn bạn đã dành thời gian và chúc bạn mọi điều tốt đẹp nhất.

Trân trọng,
Phòng Nhân sự`,
    },
  );
}

export function buildInterviewInviteMail(params: { candidateName: string; position: string }, language: MailLanguage = "en") {
  const fixedInterviewLocation = "1B Đường Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh";

  return buildLocalizedMail(
    language,
    {
      subject: `SOTRANS LOGISTICS - INTERVIEW INVITATION - ${params.position} POSITION`,
      body: `Dear ${params.candidateName},

Thank you for your interest in the opportunity at Sotrans Logistics.
As discussed by phone, we would like to invite you to the interview for the position of ${params.position}.

- Location: ${fixedInterviewLocation}
- Time: [HR to fill]
- Contact: [HR to fill]

Please arrange your schedule to join on time.
Thank you.

Best regards,
Human Resource Department`,
    },
    {
      subject: `SOTRANS LOGISTICS - THƯ MỜI PHỎNG VẤN - ${params.position}`,
      body: `Chào ${params.candidateName},

Cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại Sotrans Logistics.
Theo trao đổi qua điện thoại, chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn cho vị trí ${params.position}.

- Địa điểm: ${fixedInterviewLocation}
- Thời gian: [HR điền]
- Liên hệ: [HR điền]

Bạn vui lòng sắp xếp thời gian để tham dự đúng giờ.
Xin cảm ơn.

Trân trọng,
Phòng Nhân sự`,
    },
  );
}

export function buildOnboardMail(params: { candidateName: string; position: string }, language: MailLanguage = "en") {
  const fixedInterviewLocation = "1B Đường Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh";

  return buildLocalizedMail(
    language,
    {
      subject: `SOTRANS LOGISTICS - ONBOARDING - ${params.position} POSITION`,
      body: `Dear ${params.candidateName},

We are pleased to inform you that you have been selected for the position of ${params.position}.
Onboarding date: [HR to fill]
Office location: ${fixedInterviewLocation}

Please prepare the following documents for your onboarding day:
- Notarized copy of ID card / passport
- University introduction letter with seal or transcript with school seal
- Staff Info (Word file)
- Confidentiality agreement (to be signed on onboarding day)

If you have any questions or need support, please contact our Human Resources team via email or phone.

Congratulations and welcome to the SOTRANS LOGISTICS family!
We look forward to seeing you on your onboarding day.

Best regards,
Human Resource Department`,
    },
    {
      subject: `SOTRANS LOGISTICS - THÔNG BÁO NHẬN VIỆC - ${params.position}`,
      body: `Chào ${params.candidateName},

Công ty TNHH Một Thành Viên SOTRANS LOGISTICS vui mừng thông báo:

Bạn đã trúng tuyển vị trí ${params.position}.
Ngày nhận việc: [HR điền]
Địa chỉ văn phòng: ${fixedInterviewLocation}

Để chuẩn bị cho ngày nhận việc, bạn vui lòng chuẩn bị các giấy tờ sau:
- CCCD sao y công chứng
- Giấy giới thiệu có dấu mộc trường hoặc Bảng điểm có dấu mộc trường
- Staff Info (file Word)
- Thỏa thuận bảo mật (sẽ được ký trong ngày onboard)

Nếu có bất kỳ thắc mắc nào hoặc cần hỗ trợ thêm, bạn có thể liên hệ trực tiếp với bộ phận Nhân sự qua email hoặc số điện thoại bên dưới.

Chúc mừng bạn đã trở thành một phần của đại gia đình SOTRANS LOGISTICS!
Hẹn gặp bạn vào ngày onboard sắp tới nhé!

Trân trọng,
Phòng Nhân sự`,
    },
  );
}

export const defaultMailBuilders = {
  [buildTemplateKey("reject", "en")]: (params: { candidateName: string; position: string }) => buildRejectMail(params, "en"),
  [buildTemplateKey("reject", "vi")]: (params: { candidateName: string; position: string }) => buildRejectMail(params, "vi"),
  [buildTemplateKey("invite_interview", "en")]: (params: { candidateName: string; position: string }) => buildInterviewInviteMail(params, "en"),
  [buildTemplateKey("invite_interview", "vi")]: (params: { candidateName: string; position: string }) => buildInterviewInviteMail(params, "vi"),
  [buildTemplateKey("onboard", "en")]: (params: { candidateName: string; position: string }) => buildOnboardMail(params, "en"),
  [buildTemplateKey("onboard", "vi")]: (params: { candidateName: string; position: string }) => buildOnboardMail(params, "vi"),
};

export const emailTemplateKeys = Object.keys(defaultMailBuilders) as EmailTemplateKey[];
export const supportedMailLanguages = emailLanguages;
export const supportedCandidateMailTypes = candidateMailTypes;

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
  const source = template?.subject && template?.body ? template : fallback;

  return {
    subject: interpolateTemplate(source.subject, params).toUpperCase(),
    body: interpolateTemplate(source.body, params),
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

