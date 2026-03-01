"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type {
  CriterionResult,
  PipelineCandidate,
  PipelineState,
  PipelineStats,
  StatusFilter,
} from "@/app/landing-page/_components/shared/types";

type WorkflowDoc = Doc<"workflows">;
type CandidateDoc = Doc<"candidates">;
type AgentRunDoc = Doc<"agentRuns">;

type WorkflowPipelineState = PipelineState & {
  workflow: WorkflowDoc | null;
  candidateDocs: CandidateDoc[];
  workflowAgentRuns: AgentRunDoc[];
  isLoading: boolean;
  invalidWorkflow: boolean;
  missingWorkflow: boolean;
};

function mapStatus(status: CandidateDoc["status"]): PipelineCandidate["status"] {
  if (status === "pending") {
    return "pending";
  }

  if (status === "running") {
    return "assessing";
  }

  if (status === "completed") {
    return "assessed";
  }

  return "failed";
}

function extractInitials(name: string | null | undefined): string | null {
  const normalized = name?.trim();
  if (!normalized) {
    return null;
  }

  const parts = normalized.split(/\s+/g).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeEvidence(evidence: string[]): string | null {
  const parts = evidence
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" | ");
}

function buildCriterionCatalog(candidates: CandidateDoc[]): string[] {
  const seen = new Set<string>();
  const criteria: string[] = [];

  for (const candidate of candidates) {
    const criteriaResults = candidate.assessmentResult?.criteriaResults;
    if (!criteriaResults) {
      continue;
    }

    for (const criterionResult of criteriaResults) {
      const criterion = criterionResult.criterion.trim();
      if (criterion.length === 0 || seen.has(criterion)) {
        continue;
      }

      seen.add(criterion);
      criteria.push(criterion);
    }
  }

  return criteria;
}

function buildCandidateCriteria(
  candidate: CandidateDoc,
  criterionCatalog: string[],
): CriterionResult[] {
  const criteriaResults = candidate.assessmentResult?.criteriaResults;
  if (!criteriaResults || criteriaResults.length === 0) {
    return criterionCatalog.map((criterion) => ({
      criterion,
      met: null,
      reasoning: null,
    }));
  }

  const resultByCriterion = new Map(
    criteriaResults.map((entry) => [
      entry.criterion,
      {
        met: entry.isFit,
        reasoning: normalizeEvidence(entry.evidence),
      },
    ]),
  );

  if (criterionCatalog.length === 0) {
    return criteriaResults.map((entry) => ({
      criterion: entry.criterion,
      met: entry.isFit,
      reasoning: normalizeEvidence(entry.evidence),
    }));
  }

  return criterionCatalog.map((criterion) => {
    const result = resultByCriterion.get(criterion);
    if (!result) {
      return {
        criterion,
        met: null,
        reasoning: null,
      };
    }

    return {
      criterion,
      met: result.met,
      reasoning: result.reasoning,
    };
  });
}

function mapCandidate(candidate: CandidateDoc, criterionCatalog: string[]): PipelineCandidate {
  const trimmedName = candidate.name?.trim() ?? null;
  const criteria = buildCandidateCriteria(candidate, criterionCatalog);
  const assessment = candidate.assessmentResult;
  const totalCriteriaCount = assessment?.criteriaResults.length ?? 0;
  const metCriteriaCount =
    assessment?.criteriaResults.filter((entry) => entry.isFit).length ?? 0;

  const outcome: PipelineCandidate["outcome"] = assessment
    ? totalCriteriaCount === 3 && metCriteriaCount === 3
      ? "fit"
      : totalCriteriaCount === 3 && metCriteriaCount === 2
      ? "possible_fit"
      : assessment.isFit
      ? "fit"
      : "rejected"
    : null;

  const summary = (() => {
    if (candidate.status === "failed") {
      return candidate.error?.trim() ?? null;
    }

    if (!assessment) {
      return null;
    }

    return `${metCriteriaCount}/${totalCriteriaCount} criteria met`;
  })();

  return {
    id: candidate._id,
    name: trimmedName,
    sourceCandidateId: candidate.sourceCandidateId,
    headline: null,
    location: null,
    avatar: extractInitials(trimmedName),
    skills: [],
    yearsExperience: null,
    status: mapStatus(candidate.status),
    outcome,
    criteria,
    summary,
    email: null,
    linkedinUrl: candidate.linkedinUrl ?? null,
    githubUrl: candidate.githubUrl ?? null,
    error: candidate.error?.trim() ?? null,
  };
}

function filterCandidates(
  candidates: PipelineCandidate[],
  statusFilter: StatusFilter,
): PipelineCandidate[] {
  if (statusFilter === "all") {
    return candidates;
  }

  if (statusFilter === "pending") {
    return candidates.filter((candidate) => candidate.status === "pending");
  }

  if (statusFilter === "assessing") {
    return candidates.filter((candidate) => candidate.status === "assessing");
  }

  if (statusFilter === "fit") {
    return candidates.filter((candidate) => candidate.outcome === "fit");
  }

  if (statusFilter === "rejected") {
    return candidates.filter((candidate) => candidate.outcome === "rejected");
  }

  return candidates.filter((candidate) => candidate.status === "failed");
}

function buildStats(candidates: PipelineCandidate[]): PipelineStats {
  return {
    total: candidates.length,
    pending: candidates.filter((candidate) => candidate.status === "pending").length,
    assessing: candidates.filter((candidate) => candidate.status === "assessing").length,
    fit: candidates.filter((candidate) => candidate.outcome === "fit").length,
    rejected: candidates.filter((candidate) => candidate.outcome === "rejected").length,
    failed: candidates.filter((candidate) => candidate.status === "failed").length,
  };
}

export function useWorkflowPipelineState(workflowId: string): WorkflowPipelineState {
  const workflowsQuery = useQuery(api.workflows.listWorkflows, {});
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("all");

  const workflows = useMemo(() => workflowsQuery ?? [], [workflowsQuery]);
  const isWorkflowListLoading = workflowsQuery === undefined;

  const validatedWorkflowId = useMemo<Id<"workflows"> | null>(() => {
    const matched = workflows.find((workflow) => workflow._id === workflowId);
    return matched?._id ?? null;
  }, [workflowId, workflows]);

  const invalidWorkflow = !isWorkflowListLoading && validatedWorkflowId === null;

  const workflowQuery = useQuery(
    api.workflows.getWorkflow,
    validatedWorkflowId ? { workflowId: validatedWorkflowId } : "skip",
  );

  const workflowCandidatesQuery = useQuery(
    api.workflows.listCandidatesByWorkflow,
    validatedWorkflowId ? { workflowId: validatedWorkflowId } : "skip",
  );
  const workflowAgentRunsQuery = useQuery(
    api.workflows.listWorkflowAgentRuns,
    validatedWorkflowId ? { workflowId: validatedWorkflowId } : "skip",
  );

  const isWorkflowDetailsLoading =
    validatedWorkflowId !== null &&
    (workflowQuery === undefined ||
      workflowCandidatesQuery === undefined ||
      workflowAgentRunsQuery === undefined);

  const isLoading = isWorkflowListLoading || isWorkflowDetailsLoading;

  const workflow = workflowQuery ?? null;
  const workflowAgentRuns = useMemo(
    () => workflowAgentRunsQuery ?? [],
    [workflowAgentRunsQuery],
  );
  const missingWorkflow =
    !isWorkflowListLoading && validatedWorkflowId !== null && workflowQuery === null;

  const sortedCandidates = useMemo<CandidateDoc[]>(() => {
    const candidates = workflowCandidatesQuery ?? [];

    return [...candidates].sort((candidateA, candidateB) => {
      if (candidateA.createdAt === candidateB.createdAt) {
        return candidateA._creationTime - candidateB._creationTime;
      }

      return candidateA.createdAt - candidateB.createdAt;
    });
  }, [workflowCandidatesQuery]);

  const criterionCatalog = useMemo(
    () => buildCriterionCatalog(sortedCandidates),
    [sortedCandidates],
  );

  const allCandidates = useMemo(
    () => sortedCandidates.map((candidate) => mapCandidate(candidate, criterionCatalog)),
    [criterionCatalog, sortedCandidates],
  );

  const stats = useMemo(() => buildStats(allCandidates), [allCandidates]);

  const activeSelectedCandidateId = useMemo(() => {
    if (allCandidates.length === 0) {
      return null;
    }

    const selectedCandidateIsValid = selectedCandidateId
      ? allCandidates.some((candidate) => candidate.id === selectedCandidateId)
      : false;

    if (selectedCandidateIsValid) {
      return selectedCandidateId;
    }

    return allCandidates[0].id;
  }, [allCandidates, selectedCandidateId]);

  const candidates = useMemo(
    () => filterCandidates(allCandidates, statusFilter),
    [allCandidates, statusFilter],
  );

  const selectedCandidate = useMemo(() => {
    if (!activeSelectedCandidateId) {
      return null;
    }

    return allCandidates.find((candidate) => candidate.id === activeSelectedCandidateId) ?? null;
  }, [activeSelectedCandidateId, allCandidates]);

  const selectCandidate = useCallback((id: string | null) => {
    setSelectedCandidateId(id);
  }, []);

  const setStatusFilter = useCallback((next: StatusFilter) => {
    setStatusFilterState(next);
  }, []);

  return {
    workflow,
    candidateDocs: sortedCandidates,
    workflowAgentRuns,
    isLoading,
    invalidWorkflow,
    missingWorkflow,
    candidates,
    allCandidates,
    selectedCandidate,
    selectCandidate,
    stats,
    statusFilter,
    setStatusFilter,
  };
}
