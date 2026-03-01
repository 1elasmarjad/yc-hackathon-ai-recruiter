import "server-only";

import { BrowserUse } from "browser-use-sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Devpost_agent,
  Github_agent,
  Linkedin_agent,
  Linkedin_posts_agent,
} from "@/agents";
import { ZodError } from "zod";
import Firecrawl from "@/lib/firecrawl/client";
import { coreCrawl } from "@/lib/core/core-crawl";
import type { CoreUserPayload } from "@/lib/core/user-payload";
import { findFirstDevpostProfileByName } from "@/lib/firecrawl/devpost-search";
import type { WorkflowAgentType } from "@/lib/workflows/constants";

type WorkflowId = Id<"workflows">;
type CandidateId = Id<"candidates">;
type AgentRunId = Id<"agentRuns">;

type CandidateSnapshot = {
  sourceCandidateId: string;
  name: string | null;
  fullName: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
};

type RunWorkflowPipelineInput = {
  convexUrl: string;
  workflowId: WorkflowId;
  targetUrl: string;
  totalPages: number;
  candidateConcurrency: number;
  aiCriteria?: string;
};

type AgentCriterionResult = {
  criterion: string;
  isFit: boolean;
  evidence: string[];
};

type AgentExecutionResult = {
  agentType: WorkflowAgentType;
  success: boolean;
  error: string | null;
  resultMarkdown: string | null;
  criteriaResults: AgentCriterionResult[] | null;
};

type BrowserUseRunContext = {
  client: BrowserUse;
  sessionId: string;
};

type BrowserUseRunOutput = {
  result: string;
  liveUrl?: string | null;
  targetUrl?: string;
};

type ExecuteBrowserUseAgentRunInput = {
  convex: ConvexHttpClient;
  workflowId: WorkflowId;
  candidateId: CandidateId;
  agentType: Exclude<WorkflowAgentType, "juicebox">;
  targetUrl?: string;
  browserUseApiKey: string;
  criteria?: string[];
  runWithSession: (context: BrowserUseRunContext) => Promise<BrowserUseRunOutput>;
};

class StreamingTaskQueue {
  private readonly limit: number;

  private readonly tasks: Array<() => Promise<void>> = [];

  private runningCount = 0;

  private closed = false;

  private readonly idlePromise: Promise<void>;

  private resolveIdle: (() => void) | null = null;

  constructor(limit: number) {
    this.limit = limit;
    this.idlePromise = new Promise<void>((resolve) => {
      this.resolveIdle = resolve;
    });
  }

  add(task: () => Promise<void>): void {
    if (this.closed) {
      throw new Error("Cannot add task to a closed queue.");
    }

    this.tasks.push(task);
    this.pump();
  }

  close(): void {
    this.closed = true;
    this.tryResolveIdle();
  }

  async waitForIdle(): Promise<void> {
    this.pump();
    await this.idlePromise;
  }

  private pump(): void {
    while (this.runningCount < this.limit && this.tasks.length > 0) {
      const nextTask = this.tasks.shift();

      if (!nextTask) {
        continue;
      }

      this.runningCount += 1;

      void nextTask()
        .catch((error: unknown) => {
          console.error("[workflow] queued task failed", error);
        })
        .finally(() => {
          this.runningCount -= 1;
          this.pump();
          this.tryResolveIdle();
        });
    }
  }

  private tryResolveIdle(): void {
    if (!this.closed) {
      return;
    }

    if (this.runningCount > 0 || this.tasks.length > 0) {
      return;
    }

    if (this.resolveIdle) {
      this.resolveIdle();
      this.resolveIdle = null;
    }
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    if (!firstIssue) {
      return "Schema validation failed.";
    }

    const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "root";
    return `${path}: ${firstIssue.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function toOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

function toNullableString(value: string | null | undefined): string | null {
  return toOptionalString(value) ?? null;
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  const normalized = toOptionalString(value);
  if (!normalized) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(normalized)
    ? normalized
    : `https://${normalized}`;

  try {
    const parsedUrl = new URL(withProtocol);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name} environment variable.`);
  }

  return value;
}

function buildCandidateSnapshot(payload: CoreUserPayload): CandidateSnapshot {
  const normalizedName = toOptionalString(payload.full_name);
  const firstName = toOptionalString(payload.first_name);
  const lastName = toOptionalString(payload.last_name);

  const derivedFullName =
    normalizedName ??
    [firstName, lastName]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .trim();

  return {
    sourceCandidateId: payload.id,
    name: toNullableString(normalizedName ?? null),
    fullName: toNullableString(derivedFullName || null),
    linkedinUrl: normalizeHttpUrl(payload.linkedin_url),
    githubUrl: normalizeHttpUrl(payload.github_url),
  };
}

async function executeBrowserUseAgentRun(
  input: ExecuteBrowserUseAgentRunInput,
): Promise<AgentExecutionResult> {
  let runId: AgentRunId | null = null;

  try {
    runId = await input.convex.mutation(api.workflows.createAgentRun, {
      workflowId: input.workflowId,
      candidateId: input.candidateId,
      agentType: input.agentType,
      targetUrl: input.targetUrl,
    });

    const browserUseClient = new BrowserUse({ apiKey: input.browserUseApiKey });
    const session = await browserUseClient.sessions.create();

    await input.convex.mutation(api.workflows.updateAgentRun, {
      runId,
      sessionId: session.id,
      liveUrl: session.liveUrl ?? undefined,
    });

    const result = await input.runWithSession({
      client: browserUseClient,
      sessionId: session.id,
    });

    await input.convex.mutation(api.workflows.updateAgentRun, {
      runId,
      status: "completed",
      liveUrl: toOptionalString(result.liveUrl ?? session.liveUrl ?? undefined),
      result: result.result,
      targetUrl: result.targetUrl ?? input.targetUrl,
    });

    let criteriaResults: AgentCriterionResult[] | null = null;

    if (input.criteria && input.criteria.length > 0 && result.result.trim().length > 0) {
      criteriaResults = await input.convex.action(api.assessment.assessAgentMarkdown, {
        criteria: input.criteria,
        agentMarkdown: result.result,
      });
    }

    return {
      agentType: input.agentType,
      success: true,
      error: null,
      resultMarkdown: result.result,
      criteriaResults,
    };
  } catch (error: unknown) {
    const message = toErrorMessage(error);

    if (runId) {
      await input.convex.mutation(api.workflows.updateAgentRun, {
        runId,
        status: "failed",
        error: message,
      });
    }

    return {
      agentType: input.agentType,
      success: false,
      error: message,
      resultMarkdown: null,
      criteriaResults: null,
    };
  }
}

function mergeCriteriaResults(
  allAgentResults: AgentCriterionResult[][],
  criteria: string[],
): AgentCriterionResult[] {
  const byCriterion = new Map<string, AgentCriterionResult>();

  for (const criterion of criteria) {
    byCriterion.set(criterion, { criterion, isFit: false, evidence: [] });
  }

  for (const agentResults of allAgentResults) {
    for (const result of agentResults) {
      const existing = byCriterion.get(result.criterion);
      if (!existing) {
        continue;
      }

      if (result.isFit) {
        existing.isFit = true;
        existing.evidence.push(...result.evidence);
      }
    }
  }

  return criteria.map((criterion) => byCriterion.get(criterion)!);
}

async function processCandidate(
  convex: ConvexHttpClient,
  input: {
    workflowId: WorkflowId;
    candidateId: CandidateId;
    candidate: CandidateSnapshot;
    browserUseApiKey: string;
    firecrawlClient: Firecrawl;
    criteria?: string[];
  },
): Promise<void> {
  await convex.mutation(api.workflows.setCandidateStatus, {
    candidateId: input.candidateId,
    status: "running",
  });

  const executions: Promise<AgentExecutionResult>[] = [];

  if (input.candidate.githubUrl) {
    executions.push(
      executeBrowserUseAgentRun({
        convex,
        workflowId: input.workflowId,
        candidateId: input.candidateId,
        agentType: "github",
        targetUrl: input.candidate.githubUrl,
        browserUseApiKey: input.browserUseApiKey,
        criteria: input.criteria,
        runWithSession: async ({ client, sessionId }) => {
          const markdown = await Github_agent(
            {
              profileUrl: input.candidate.githubUrl!,
              sessionId,
            },
            client,
          );

          return {
            result: markdown,
            targetUrl: input.candidate.githubUrl!,
          };
        },
      }),
    );
  }

  if (input.candidate.linkedinUrl) {
    executions.push(
      executeBrowserUseAgentRun({
        convex,
        workflowId: input.workflowId,
        candidateId: input.candidateId,
        agentType: "linkedin",
        targetUrl: input.candidate.linkedinUrl,
        browserUseApiKey: input.browserUseApiKey,
        criteria: input.criteria,
        runWithSession: async ({ client, sessionId }) => {
          const markdown = await Linkedin_agent(
            {
              linkedinUrl: input.candidate.linkedinUrl!,
              sessionId,
            },
            client,
          );

          return {
            result: markdown,
            targetUrl: input.candidate.linkedinUrl!,
          };
        },
      }),
    );

    executions.push(
      executeBrowserUseAgentRun({
        convex,
        workflowId: input.workflowId,
        candidateId: input.candidateId,
        agentType: "linkedin_posts",
        targetUrl: input.candidate.linkedinUrl,
        browserUseApiKey: input.browserUseApiKey,
        criteria: input.criteria,
        runWithSession: async ({ client, sessionId }) => {
          if (!input.candidate.fullName) {
            throw new Error("Cannot run linkedin_posts agent without candidate full name.");
          }

          const result = await Linkedin_posts_agent(
            {
              fullName: input.candidate.fullName,
              linkedinProfileUrl: input.candidate.linkedinUrl!,
              sessionId,
            },
            {
              browserUseClient: client,
              firecrawlClient: input.firecrawlClient,
            },
          );

          return {
            result: result.markdown,
            liveUrl: result.liveUrl,
            targetUrl: input.candidate.linkedinUrl!,
          };
        },
      }),
    );
  }

  if (input.candidate.fullName) {
    const fullName = input.candidate.fullName;

    executions.push(
      findFirstDevpostProfileByName(fullName).then(async (devpostProfileUrl) => {
        if (!devpostProfileUrl) {
          return { agentType: "devpost" as const, success: true, error: null, resultMarkdown: null, criteriaResults: null };
        }

        return executeBrowserUseAgentRun({
          convex,
          workflowId: input.workflowId,
          candidateId: input.candidateId,
          agentType: "devpost",
          targetUrl: devpostProfileUrl,
          browserUseApiKey: input.browserUseApiKey,
          criteria: input.criteria,
          runWithSession: async ({ client, sessionId }) => {
            const result = await Devpost_agent(
              {
                fullName,
                profileUrl: devpostProfileUrl,
                sessionId,
              },
              client,
            );

            return {
              result: result.markdown,
              liveUrl: result.liveUrl,
              targetUrl: devpostProfileUrl,
            };
          },
        });
      }),
    );
  }

  if (executions.length === 0) {
    await convex.mutation(api.workflows.setCandidateStatus, {
      candidateId: input.candidateId,
      status: "completed",
    });
    return;
  }

  const results = await Promise.all(executions);
  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    const errorMessage = failures
      .map((failure) => `${failure.agentType}: ${failure.error ?? "Unknown error"}`)
      .join(" | ");

    await convex.mutation(api.workflows.setCandidateStatus, {
      candidateId: input.candidateId,
      status: "failed",
      error: errorMessage,
    });

    return;
  }

  if (input.criteria && input.criteria.length > 0) {
    const allAgentCriteriaResults = results
      .filter((r): r is AgentExecutionResult & { criteriaResults: AgentCriterionResult[] } =>
        r.success && r.criteriaResults !== null && r.criteriaResults.length > 0,
      )
      .map((r) => r.criteriaResults);

    if (allAgentCriteriaResults.length > 0) {
      const merged = mergeCriteriaResults(allAgentCriteriaResults, input.criteria);
      const isFit = merged.every((r) => r.isFit);

      await convex.mutation(api.workflows.setCandidateAssessment, {
        candidateId: input.candidateId,
        assessment: { isFit, criteriaResults: merged },
      });
    }
  }

  await convex.mutation(api.workflows.setCandidateStatus, {
    candidateId: input.candidateId,
    status: "completed",
  });
}

export async function runWorkflowPipeline(input: RunWorkflowPipelineInput): Promise<void> {
  const convex = new ConvexHttpClient(input.convexUrl);
  const profileId = getRequiredEnv("CORE_PROFILE_ID");
  const browserUseApiKey = getRequiredEnv("BROWSER_USE_API_KEY");
  const firecrawlApiKey = getRequiredEnv("FIRECRAWL_API_KEY");
  const firecrawlClient = new Firecrawl({ apiKey: firecrawlApiKey });

  let criteria: string[] | undefined;

  if (input.aiCriteria) {
    criteria = await convex.action(api.assessment.splitCriteria, {
      aiCriteria: input.aiCriteria,
    });
  }

  const seenCandidateIds = new Set<string>();
  const candidateQueue = new StreamingTaskQueue(input.candidateConcurrency);

  let juiceboxRunId: AgentRunId | null = null;
  let workflowFailureMessage: string | null = null;

  try {
    juiceboxRunId = await convex.mutation(api.workflows.createAgentRun, {
      workflowId: input.workflowId,
      agentType: "juicebox",
      targetUrl: input.targetUrl,
    });

    await coreCrawl({
      targetUrl: input.targetUrl,
      profileId,
      totalPages: input.totalPages,
      onUserPayload: async (payload) => {
        const candidate = buildCandidateSnapshot(payload);

        if (seenCandidateIds.has(candidate.sourceCandidateId)) {
          return;
        }

        seenCandidateIds.add(candidate.sourceCandidateId);

        const created = await convex.mutation(api.workflows.upsertCandidate, {
          workflowId: input.workflowId,
          sourceCandidateId: candidate.sourceCandidateId,
          name: candidate.name ?? undefined,
          linkedinUrl: candidate.linkedinUrl ?? undefined,
          githubUrl: candidate.githubUrl ?? undefined,
        });

        candidateQueue.add(async () => {
          try {
            await processCandidate(convex, {
              workflowId: input.workflowId,
              candidateId: created.candidateId,
              candidate,
              browserUseApiKey,
              firecrawlClient,
              criteria,
            });
          } catch (error: unknown) {
            await convex.mutation(api.workflows.setCandidateStatus, {
              candidateId: created.candidateId,
              status: "failed",
              error: toErrorMessage(error),
            });
          }
        });
      },
      onBrowserUseUrl: async (browserUseUrl) => {
        if (!juiceboxRunId) {
          return;
        }

        await convex.mutation(api.workflows.updateAgentRun, {
          runId: juiceboxRunId,
          liveUrl: toOptionalString(browserUseUrl),
        });
      },
    });

    if (juiceboxRunId) {
      await convex.mutation(api.workflows.updateAgentRun, {
        runId: juiceboxRunId,
        status: "completed",
      });
    }
  } catch (error: unknown) {
    workflowFailureMessage = toErrorMessage(error);

    if (juiceboxRunId) {
      await convex.mutation(api.workflows.updateAgentRun, {
        runId: juiceboxRunId,
        status: "failed",
        error: workflowFailureMessage,
      });
    }
  } finally {
    candidateQueue.close();
    await candidateQueue.waitForIdle();
  }

  if (workflowFailureMessage) {
    await convex.mutation(api.workflows.finishWorkflow, {
      workflowId: input.workflowId,
      status: "failed",
      error: workflowFailureMessage,
    });
    return;
  }

  await convex.mutation(api.workflows.finishWorkflow, {
    workflowId: input.workflowId,
    status: "completed",
  });
}
