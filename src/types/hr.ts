export type CandidateStatus = "new" | "rejected" | "interview_invited" | string;

export type Candidate = {
  id: string;
  name: string;
  email: string;
  position: string;
  status: CandidateStatus;
  lastActionBy: string;
  lastActionAt?: string;
  candidateSource?: string;
  address?: string;
  experience?: string;
  skills?: string;
  score?: string;
  recommendation?: string;
  cvFileName?: string;
  cvLink?: string;
  applyTime?: string;
  raw?: Record<string, unknown>;
};

export type CandidateAction = "reject" | "invite_interview" | "onboard";

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

export type JobDescriptionStatus = string;

export type JobDescription = {
  id: string;
  jobCode: string;
  title: string;
  department: string;
  workplace: string;
  status: JobDescriptionStatus;
  content: string;
  requiredSkills: string;
  requiredExperience: string;
  requiredEducation: string;
  certificate: string;
  keywords?: string;
  extraKeywords?: string;
  createdAtTime?: string;
  raw?: Record<string, unknown>;
};

export type JobUploadResponse = {
  success: boolean;
  fileName?: string;
  folderPath?: string;
  itemUrl?: string;
  error?: string;
};
