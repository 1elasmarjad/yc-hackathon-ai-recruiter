export const WORKFLOW_SOURCE_VALUES = ["juicebox"] as const;
export type WorkflowSource = (typeof WORKFLOW_SOURCE_VALUES)[number];

export const WORKFLOW_STATUS_VALUES = ["running", "completed", "failed"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUS_VALUES)[number];

export const CANDIDATE_STATUS_VALUES = ["pending", "running", "completed", "failed"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUS_VALUES)[number];

export const AGENT_RUN_STATUS_VALUES = ["running", "completed", "failed"] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUS_VALUES)[number];

export const WORKFLOW_AGENT_TYPE_VALUES = [
  "juicebox",
  "github",
  "linkedin",
  "linkedin_posts",
  "devpost",
] as const;
export type WorkflowAgentType = (typeof WORKFLOW_AGENT_TYPE_VALUES)[number];

export const WORKFLOW_AGENT_FILTER_VALUES = ["all", ...WORKFLOW_AGENT_TYPE_VALUES] as const;
export type WorkflowAgentFilter = (typeof WORKFLOW_AGENT_FILTER_VALUES)[number];

export const WORKFLOW_DEFAULT_CANDIDATE_CONCURRENCY = 5;

export const WORKFLOW_AGENT_LABELS: Record<WorkflowAgentType, string> = {
  juicebox: "Juicebox",
  github: "GitHub",
  linkedin: "LinkedIn",
  linkedin_posts: "LinkedIn Posts",
  devpost: "Devpost",
};
