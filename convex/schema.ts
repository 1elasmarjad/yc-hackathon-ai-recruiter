import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const workflowStatusValidator = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

const candidateStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

const agentRunStatusValidator = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);

const agentTypeValidator = v.union(
  v.literal("juicebox"),
  v.literal("github"),
  v.literal("linkedin"),
  v.literal("linkedin_posts"),
  v.literal("devpost"),
);

export default defineSchema({
  workflows: defineTable({
    name: v.string(),
    source: v.literal("juicebox"),
    targetUrl: v.string(),
    totalPages: v.number(),
    aiCriteria: v.optional(v.string()),
    status: workflowStatusValidator,
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    candidateConcurrency: v.number(),
    totalCandidates: v.number(),
    processedCandidates: v.number(),
    failedCandidates: v.number(),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  candidates: defineTable({
    workflowId: v.id("workflows"),
    sourceCandidateId: v.string(),
    name: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    status: candidateStatusValidator,
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    assessmentResult: v.optional(
      v.object({
        isFit: v.boolean(),
        criteriaResults: v.array(
          v.object({
            criterion: v.string(),
            isFit: v.boolean(),
            evidence: v.array(v.string()),
          }),
        ),
      }),
    ),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_status", ["workflowId", "status"])
    .index("by_workflow_sourceCandidateId", ["workflowId", "sourceCandidateId"]),

  agentRuns: defineTable({
    workflowId: v.id("workflows"),
    candidateId: v.optional(v.id("candidates")),
    agentType: agentTypeValidator,
    status: agentRunStatusValidator,
    liveUrl: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_workflow_status", ["workflowId", "status"])
    .index("by_workflow_agentType_status", ["workflowId", "agentType", "status"]),
});
