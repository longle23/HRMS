export type CandidateStatus = "new" | "rejected" | "interview_invited" | string;

export type Candidate = {
  id: string;
  name: string;
  email: string;
  position: string;
  status: CandidateStatus;
  lastActionBy: string;
  raw?: Record<string, unknown>;
};

export type CandidateAction = "reject" | "invite_interview";

export type CandidateActionPayload = {
  candidateId: string;
  candidateName: string;
  actor: string;
  action: CandidateAction;
};

export type AccountUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
};

