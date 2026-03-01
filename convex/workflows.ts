import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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

function isTerminalCandidateStatus(status: Doc<"candidates">["status"]): boolean {
  return status === "completed" || status === "failed";
}

function isTerminalAgentRunStatus(status: Doc<"agentRuns">["status"]): boolean {
  return status === "completed" || status === "failed";
}

export const createWorkflow = mutation({
  args: {
    name: v.string(),
    targetUrl: v.string(),
    totalPages: v.number(),
    candidateConcurrency: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("workflows", {
      name: args.name,
      source: "juicebox",
      targetUrl: args.targetUrl,
      totalPages: args.totalPages,
      status: "running",
      startedAt: now,
      candidateConcurrency: args.candidateConcurrency,
      totalCandidates: 0,
      processedCandidates: 0,
      failedCandidates: 0,
    });
  },
});

export const finishWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${args.workflowId} not found.`);
    }

    const updates: Partial<Doc<"workflows">> = {
      status: args.status,
      completedAt: Date.now(),
    };

    if (args.error !== undefined) {
      updates.error = args.error;
    }

    await ctx.db.patch(args.workflowId, updates);
  },
});

export const upsertCandidate = mutation({
  args: {
    workflowId: v.id("workflows"),
    sourceCandidateId: v.string(),
    name: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${args.workflowId} not found.`);
    }

    const existing = await ctx.db
      .query("candidates")
      .withIndex("by_workflow_sourceCandidateId", (q) =>
        q.eq("workflowId", args.workflowId).eq("sourceCandidateId", args.sourceCandidateId),
      )
      .unique();

    if (existing) {
      const updates: Partial<Doc<"candidates">> = {};

      if (args.name !== undefined && args.name !== existing.name) {
        updates.name = args.name;
      }

      if (args.githubUrl !== undefined && args.githubUrl !== existing.githubUrl) {
        updates.githubUrl = args.githubUrl;
      }

      if (args.linkedinUrl !== undefined && args.linkedinUrl !== existing.linkedinUrl) {
        updates.linkedinUrl = args.linkedinUrl;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }

      return {
        candidateId: existing._id,
        wasCreated: false,
      };
    }

    const now = Date.now();

    const candidateId = await ctx.db.insert("candidates", {
      workflowId: args.workflowId,
      sourceCandidateId: args.sourceCandidateId,
      name: args.name,
      githubUrl: args.githubUrl,
      linkedinUrl: args.linkedinUrl,
      status: "pending",
      createdAt: now,
    });

    await ctx.db.patch(args.workflowId, {
      totalCandidates: workflow.totalCandidates + 1,
    });

    return {
      candidateId,
      wasCreated: true,
    };
  },
});

export const setCandidateStatus = mutation({
  args: {
    candidateId: v.id("candidates"),
    status: candidateStatusValidator,
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId);

    if (!candidate) {
      throw new Error(`Candidate ${args.candidateId} not found.`);
    }

    const now = Date.now();
    const updates: Partial<Doc<"candidates">> = {
      status: args.status,
    };

    if (args.error !== undefined) {
      updates.error = args.error;
    }

    if (args.status === "running" && candidate.startedAt === undefined) {
      updates.startedAt = now;
    }

    if (isTerminalCandidateStatus(args.status)) {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.candidateId, updates);

    const wasTerminal = isTerminalCandidateStatus(candidate.status);
    const isNowTerminal = isTerminalCandidateStatus(args.status);

    if (!isNowTerminal || wasTerminal) {
      return;
    }

    const workflow = await ctx.db.get(candidate.workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${candidate.workflowId} not found.`);
    }

    const workflowUpdates: Partial<Doc<"workflows">> = {
      processedCandidates: workflow.processedCandidates + 1,
    };

    if (args.status === "failed") {
      workflowUpdates.failedCandidates = workflow.failedCandidates + 1;
    }

    await ctx.db.patch(candidate.workflowId, workflowUpdates);
  },
});

export const createAgentRun = mutation({
  args: {
    workflowId: v.id("workflows"),
    candidateId: v.optional(v.id("candidates")),
    agentType: agentTypeValidator,
    targetUrl: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("agentRuns", {
      workflowId: args.workflowId,
      candidateId: args.candidateId,
      agentType: args.agentType,
      status: "running",
      targetUrl: args.targetUrl,
      sessionId: args.sessionId,
      liveUrl: args.liveUrl,
      startedAt: now,
    });
  },
});

export const updateAgentRun = mutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.optional(agentRunStatusValidator),
    sessionId: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    targetUrl: v.optional(v.string()),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);

    if (!run) {
      throw new Error(`Agent run ${args.runId} not found.`);
    }

    const updates: Partial<Doc<"agentRuns">> = {};

    if (args.status !== undefined) {
      updates.status = args.status;
      if (isTerminalAgentRunStatus(args.status)) {
        updates.completedAt = Date.now();
      }
    }

    if (args.sessionId !== undefined) {
      updates.sessionId = args.sessionId;
    }

    if (args.liveUrl !== undefined) {
      updates.liveUrl = args.liveUrl;
    }

    if (args.targetUrl !== undefined) {
      updates.targetUrl = args.targetUrl;
    }

    if (args.result !== undefined) {
      updates.result = args.result;
    }

    if (args.error !== undefined) {
      updates.error = args.error;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await ctx.db.patch(args.runId, updates);
  },
});

export const listWorkflows = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workflows").withIndex("by_startedAt").order("desc").collect();
  },
});

export const getWorkflow = query({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workflowId);
  },
});

export const listCandidatesByWorkflow = query({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("candidates")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});

export const listActiveLiveRuns = query({
  args: {
    workflowId: v.id("workflows"),
    agentType: v.optional(agentTypeValidator),
  },
  handler: async (ctx, args) => {
    let runningRuns: Doc<"agentRuns">[];

    if (args.agentType !== undefined) {
      const selectedAgentType = args.agentType;
      runningRuns = await ctx.db
        .query("agentRuns")
        .withIndex("by_workflow_agentType_status", (q) =>
          q
            .eq("workflowId", args.workflowId)
            .eq("agentType", selectedAgentType)
            .eq("status", "running"),
        )
        .collect();
    } else {
      runningRuns = await ctx.db
        .query("agentRuns")
        .withIndex("by_workflow_status", (q) =>
          q.eq("workflowId", args.workflowId).eq("status", "running"),
        )
        .collect();
    }

    const runsWithLiveUrl = runningRuns.filter(
      (run) => typeof run.liveUrl === "string" && run.liveUrl.trim().length > 0,
    );

    return await Promise.all(
      runsWithLiveUrl.map(async (run) => {
        const candidate = run.candidateId ? await ctx.db.get(run.candidateId) : null;

        return {
          ...run,
          candidateName: candidate?.name ?? null,
          sourceCandidateId: candidate?.sourceCandidateId ?? null,
        };
      }),
    );
  },
});

export const listRunHistory = query({
  args: {
    workflowId: v.id("workflows"),
    agentType: v.optional(agentTypeValidator),
  },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("agentRuns")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();

    const filtered = runs
      .filter((run) => run.status !== "running")
      .filter((run) => (args.agentType ? run.agentType === args.agentType : true))
      .sort((a, b) => b.startedAt - a.startedAt);

    return await Promise.all(
      filtered.map(async (run) => {
        const candidate = run.candidateId ? await ctx.db.get(run.candidateId) : null;

        return {
          ...run,
          candidateName: candidate?.name ?? null,
          sourceCandidateId: candidate?.sourceCandidateId ?? null,
        };
      }),
    );
  },
});

export const listWorkflowAgentRuns = query({
  args: {
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentRuns")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .collect();
  },
});
