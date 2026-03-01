import { z } from "zod";
import {
  WORKFLOW_AGENT_FILTER_VALUES,
  WORKFLOW_DEFAULT_CANDIDATE_CONCURRENCY,
} from "@/lib/workflows/constants";

export const WorkflowStartRequestSchema = z.object({
  targetUrl: z.url(),
  totalPages: z.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  candidateConcurrency: z.number().int().positive().max(25).optional(),
});

export const WorkflowStartResponseSchema = z.object({
  workflowId: z.string().min(1),
});

export const WorkflowAgentFilterSchema = z.enum(WORKFLOW_AGENT_FILTER_VALUES);

export function resolveWorkflowConcurrency(value: number | undefined): number {
  if (typeof value !== "number") {
    return WORKFLOW_DEFAULT_CANDIDATE_CONCURRENCY;
  }

  return value;
}

export type WorkflowStartRequest = z.output<typeof WorkflowStartRequestSchema>;
export type WorkflowStartResponse = z.output<typeof WorkflowStartResponseSchema>;
export type WorkflowAgentFilter = z.output<typeof WorkflowAgentFilterSchema>;
