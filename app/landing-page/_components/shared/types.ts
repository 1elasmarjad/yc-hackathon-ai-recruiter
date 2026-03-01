export type CriterionResult = {
  criterion: string;
  met: boolean | null; // null = not yet assessed
  reasoning: string | null;
};

export type CandidateStatus = "pending" | "assessing" | "assessed";

export type AssessmentOutcome = "fit" | "rejected" | null; // null = not yet assessed

export type PipelineCandidate = {
  id: string;
  name: string;
  headline: string;
  location: string;
  avatar: string; // initials-based
  skills: string[];
  yearsExperience: number;
  status: CandidateStatus;
  outcome: AssessmentOutcome;
  criteria: CriterionResult[];
  summary: string;
  email: string;
};

export type PipelineStats = {
  total: number;
  pending: number;
  fit: number;
  rejected: number;
};

export type StatusFilter = "all" | "pending" | "fit" | "rejected";
