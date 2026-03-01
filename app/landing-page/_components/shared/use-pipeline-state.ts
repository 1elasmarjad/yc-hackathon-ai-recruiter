"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { mockCandidates } from "./mock-data";
import type {
  PipelineCandidate,
  CriterionResult,
  PipelineStats,
  PipelineState,
  StatusFilter,
} from "./types";

/**
 * Simulates a live drip-feed of criteria evaluations.
 * On mount, candidates that are "assessing" or "assessed" have their
 * criteria revealed one at a time with staggered delays.
 * Pending candidates stay untouched.
 */
function useDripFeed(source: PipelineCandidate[]): PipelineCandidate[] {
  // Build a queue of { candidateId, criterionIndex } to reveal
  const queue = useRef<{ cid: string; ci: number; delay: number }[]>([]);
  const [revealed, setRevealed] = useState<Map<string, number>>(new Map());

  // On first mount, build the queue from source data
  useEffect(() => {
    const items: { cid: string; ci: number; delay: number }[] = [];
    let accDelay = 600; // start after 600ms

    for (const c of source) {
      if (c.status === "pending" || c.status === "failed") continue;
      for (let ci = 0; ci < c.criteria.length; ci++) {
        if (c.criteria[ci].met !== null) {
          items.push({ cid: c.id, ci, delay: accDelay });
          accDelay += 400 + Math.random() * 800; // 400-1200ms between each
        }
      }
    }

    queue.current = items;

    // Schedule all reveals
    const timers = items.map((item) =>
      setTimeout(() => {
        setRevealed((prev) => {
          const next = new Map(prev);
          const current = next.get(item.cid) ?? -1;
          if (item.ci > current) next.set(item.cid, item.ci);
          return next;
        });
      }, item.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the reveal mask to produce the live view
  return useMemo(() => {
    return source.map((c) => {
      if (c.status === "pending" || c.status === "failed") return c;

      const revealedIdx = revealed.get(c.id) ?? -1;
      const liveCriteria: CriterionResult[] = c.criteria.map((cr, i) => {
        if (i <= revealedIdx) return cr; // revealed — show real data
        return { criterion: cr.criterion, met: null, reasoning: null }; // hidden
      });

      // Derive live status from how many criteria are revealed
      const allRevealed = liveCriteria.every((cr) => cr.met !== null);
      const liveStatus = allRevealed ? "assessed" as const : "assessing" as const;
      const liveOutcome = allRevealed ? c.outcome : null;

      return { ...c, criteria: liveCriteria, status: liveStatus, outcome: liveOutcome };
    });
  }, [source, revealed]);
}

export function usePipelineState(): PipelineState {
  const [selectedId, setSelectedId] = useState<string | null>(mockCandidates[0]?.id ?? null);
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>("all");

  const candidates = useDripFeed(mockCandidates);

  const stats: PipelineStats = useMemo(() => ({
    total: candidates.length,
    pending: candidates.filter((c) => c.status === "pending").length,
    assessing: candidates.filter((c) => c.status === "assessing").length,
    fit: candidates.filter((c) => c.outcome === "fit").length,
    rejected: candidates.filter((c) => c.outcome === "rejected").length,
    failed: candidates.filter((c) => c.status === "failed").length,
  }), [candidates]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") {
      return candidates;
    }
    if (statusFilter === "pending") {
      return candidates.filter((c) => c.status === "pending");
    }
    if (statusFilter === "assessing") {
      return candidates.filter((c) => c.status === "assessing");
    }
    if (statusFilter === "fit") {
      return candidates.filter((c) => c.outcome === "fit");
    }
    if (statusFilter === "rejected") {
      return candidates.filter((c) => c.outcome === "rejected");
    }
    if (statusFilter === "failed") {
      return candidates.filter((c) => c.status === "failed");
    }
    return candidates;
  }, [candidates, statusFilter]);

  const selectedCandidate: PipelineCandidate | null = useMemo(() => {
    if (!selectedId) return null;
    return candidates.find((c) => c.id === selectedId) ?? null;
  }, [candidates, selectedId]);

  const selectCandidate = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const setStatusFilter = useCallback((next: StatusFilter) => {
    setStatusFilterState(next);
  }, []);

  return {
    candidates: filtered,
    allCandidates: candidates,
    selectedCandidate,
    selectCandidate,
    stats,
    statusFilter,
    setStatusFilter,
  };
}
