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

  return {
    id,
    name: pickString(record, ["full_name"], "Unknown"),
    email: pickString(record, ["email"], ""),
    position: pickString(record, ["apply_position"], "Unknown"),
    status: pickString(record, ["status"], "New"),
    lastActionBy: pickString(record, ["LastActionBy", "last_action_by"], "None"),
    raw: record,
  };
}

export function buildRejectMail(params: {
  candidateName: string;
  position: string;
}) {
  return {
    subject: `[Kết quả ứng tuyển] ${params.position} - Cảm ơn bạn đã ứng tuyển`,
    body: `Chào ${params.candidateName},

Cảm ơn bạn đã dành thời gian ứng tuyển vị trí ${params.position} tại công ty chúng tôi.
Sau khi xem xét hồ sơ, hiện tại chúng tôi chưa thể tiếp tục với hồ sơ của bạn ở vòng này.

Chúng tôi đánh giá cao sự quan tâm của bạn và hy vọng sẽ có cơ hội hợp tác trong tương lai.

Trân trọng,
Phòng Nhân sự`,
  };
}

export function buildInterviewInviteMail(params: {
  candidateName: string;
  position: string;
}) {
  const fixedInterviewLocation =
    "1B Đường Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh";

  return {
    subject: `[Thư mời phỏng vấn] Vị trí ${params.position}`,
    body: `Chào ${params.candidateName},

Chúc mừng bạn đã vượt qua vòng sàng lọc hồ sơ cho vị trí ${params.position}.
Phòng Nhân sự trân trọng mời bạn tham gia buổi phỏng vấn với thông tin như sau:

- Vị trí: ${params.position}
- Địa điểm: ${fixedInterviewLocation}
- Thời gian dự kiến: [HR tự điền]

Vui lòng phản hồi email này để xác nhận tham gia.

Trân trọng,
Phòng Nhân sự`,
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

