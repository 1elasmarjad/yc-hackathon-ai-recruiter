export type CriterionResult = {
  criterion: string;
  met: boolean | null; // null = not yet assessed
  reasoning: string | null;
};

export type CandidateStatus = "pending" | "assessing" | "assessed" | "failed";

export type AssessmentOutcome = "fit" | "possible_fit" | "rejected" | null; // null = not yet assessed

export type PipelineCandidate = {
  id: string;
  name: string | null;
  sourceCandidateId?: string | null;
  headline: string | null;
  location: string | null;
  avatar: string | null; // initials-based
  skills: string[];
  yearsExperience: number | null;
  status: CandidateStatus;
  outcome: AssessmentOutcome;
  criteria: CriterionResult[];
  summary: string | null;
  email: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  error?: string | null;
};

export type PipelineStats = {
  total: number;
  pending: number;
  assessing: number;
  fit: number;
  rejected: number;
  failed: number;
};

export type StatusFilter =
  | "all"
  | "pending"
  | "assessing"
  | "fit"
  | "rejected"
  | "failed";

export type PipelineState = {
  candidates: PipelineCandidate[];
  allCandidates: PipelineCandidate[];
  selectedCandidate: PipelineCandidate | null;
  selectCandidate: (id: string | null) => void;
  stats: PipelineStats;
  statusFilter: StatusFilter;
  setStatusFilter: (next: StatusFilter) => void;
};
