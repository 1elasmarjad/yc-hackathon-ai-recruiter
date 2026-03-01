import "server-only";

import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  parseCoreUserPayload,
  type CoreUserPayload,
} from "@/lib/core/user-payload";

const CAPTURE_DIR_PREFIX = "SCRAPER_PROFILE_CAPTURE_DIR=";
const CAPTURE_STATS_PREFIX = "SCRAPER_CAPTURE_STATS=";
const BROWSER_USE_URL_PREFIX = "SCRAPER_BROWSER_USE_URL=";
const USER_PAYLOAD_PREFIX = "SCRAPER_USER_PAYLOAD=";

type ProcessExitResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export type CoreCrawlInput = {
  targetUrl: string;
  profileId: string;
  totalPages: number;
  onUserPayload: (
    payload: CoreUserPayload,
    rawPayload: unknown
  ) => void | Promise<void>;
  onInvalidUserPayload?: (
    payload: unknown,
    errorMessage: string
  ) => void | Promise<void>;
  onBrowserUseUrl?: (browserUseUrl: string | null) => void | Promise<void>;
  onProfileCaptureDir?: (profileCaptureDir: string) => void | Promise<void>;
};

export type CoreCaptureStats = {
  apiRequests: number;
  searchMatches: number;
  savedSearchResponses: number;
  emittedCandidates: number;
};

export type CoreCrawlResult = {
  browserUseUrl: string | null;
  profileCaptureDir: string | null;
  payloadCount: number;
  invalidPayloadCount: number;
  captureStats: CoreCaptureStats | null;
};

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export async function coreCrawl(input: CoreCrawlInput): Promise<CoreCrawlResult> {
  let stdoutBuffer = "";
  let profileCaptureDir: string | null = null;
  let browserUseUrl: string | null = null;
  let captureStats: CoreCaptureStats | null = null;
  let didEmitBrowserUseUrl = false;
  let payloadCount = 0;
  let invalidPayloadCount = 0;
  let lineProcessingError: Error | null = null;
  const processingTasks = new Set<Promise<void>>();
  let childProcess: ReturnType<typeof spawn> | null = null;

  childProcess = spawn(
    "uv",
    [
      "run",
      "python",
      "scraper.py",
      "--target-url",
      input.targetUrl,
      "--profile-id",
      input.profileId,
      "--total-pages",
      input.totalPages.toString(),
    ],
    {
      cwd: join(process.cwd(), "agents/core/py"),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (!childProcess.stdout || !childProcess.stderr) {
    throw new Error("Failed to attach scraper process stdio streams.");
  }

  childProcess.stdout.setEncoding("utf8");
  childProcess.stderr.setEncoding("utf8");

  async function processStdoutLine(rawLine: string): Promise<void> {
    const line = rawLine.replace(/\r$/, "");

    if (!line) {
      return;
    }

    if (line.startsWith(CAPTURE_DIR_PREFIX)) {
      const parsedCaptureDir = line.slice(CAPTURE_DIR_PREFIX.length);
      profileCaptureDir = parsedCaptureDir || null;
      if (parsedCaptureDir && input.onProfileCaptureDir) {
        await input.onProfileCaptureDir(parsedCaptureDir);
      }
      return;
    }

    if (line.startsWith(CAPTURE_STATS_PREFIX)) {
      const serializedStats = line.slice(CAPTURE_STATS_PREFIX.length);
      let parsedStats: unknown;
      try {
        parsedStats = JSON.parse(serializedStats);
      } catch (error: unknown) {
        throw new Error(
          `Failed to parse SCRAPER_CAPTURE_STATS JSON: ${toError(error).message}`
        );
      }

      if (
        typeof parsedStats === "object" &&
        parsedStats !== null &&
        "apiRequests" in parsedStats &&
        "searchMatches" in parsedStats &&
        "savedSearchResponses" in parsedStats &&
        "emittedCandidates" in parsedStats
      ) {
        const statsCandidate = parsedStats as Record<string, unknown>;
        const apiRequests = statsCandidate.apiRequests;
        const searchMatches = statsCandidate.searchMatches;
        const savedSearchResponses = statsCandidate.savedSearchResponses;
        const emittedCandidates = statsCandidate.emittedCandidates;

        if (
          typeof apiRequests === "number" &&
          typeof searchMatches === "number" &&
          typeof savedSearchResponses === "number" &&
          typeof emittedCandidates === "number"
        ) {
          captureStats = {
            apiRequests,
            searchMatches,
            savedSearchResponses,
            emittedCandidates,
          };
        }
      }
      return;
    }

    if (line.startsWith(BROWSER_USE_URL_PREFIX)) {
      const parsedBrowserUseUrl = line.slice(BROWSER_USE_URL_PREFIX.length);
      browserUseUrl = parsedBrowserUseUrl || null;
      if (input.onBrowserUseUrl) {
        await input.onBrowserUseUrl(browserUseUrl);
      }
      didEmitBrowserUseUrl = true;
      return;
    }

    if (!line.startsWith(USER_PAYLOAD_PREFIX)) {
      return;
    }

    const serializedPayload = line.slice(USER_PAYLOAD_PREFIX.length);
    let parsedLinePayload: unknown;
    try {
      parsedLinePayload = JSON.parse(serializedPayload);
    } catch (error: unknown) {
      throw new Error(
        `Failed to parse SCRAPER_USER_PAYLOAD JSON: ${toError(error).message}`
      );
    }

    try {
      const parsedPayload = parseCoreUserPayload(parsedLinePayload);
      await input.onUserPayload(parsedPayload, parsedLinePayload);
      payloadCount += 1;
    } catch (error: unknown) {
      invalidPayloadCount += 1;
      if (input.onInvalidUserPayload) {
        const message = toError(error).message;
        await input.onInvalidUserPayload(parsedLinePayload, message);
      }
    }
  }

  function onLineProcessingError(error: unknown): void {
    if (lineProcessingError) {
      return;
    }

    lineProcessingError = toError(error);
    childProcess?.kill("SIGTERM");
  }

  function trackProcessingTask(task: Promise<void>): void {
    const trackedTask = task.catch(onLineProcessingError);
    processingTasks.add(trackedTask);
    void trackedTask.finally(() => {
      processingTasks.delete(trackedTask);
    });
  }

  function trackLineProcessing(line: string): void {
    trackProcessingTask(processStdoutLine(line));
  }

  function flushStdoutBuffer(flushPartial: boolean): void {
    let newlineIndex = stdoutBuffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex);
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      trackLineProcessing(line);
      newlineIndex = stdoutBuffer.indexOf("\n");
    }

    if (flushPartial && stdoutBuffer.length > 0) {
      trackLineProcessing(stdoutBuffer);
      stdoutBuffer = "";
    }
  }

  childProcess.on("error", (error) => {
    onLineProcessingError(error);
  });

  childProcess.stdout.on("data", (chunk: string) => {
    stdoutBuffer += chunk;
    flushStdoutBuffer(false);
  });

  childProcess.stderr.on("data", (chunk: string) => {
    process.stderr.write(chunk);
  });

  const spawned = await new Promise<boolean>((resolve) => {
    childProcess.once("spawn", () => resolve(true));
    childProcess.once("error", () => resolve(false));
  });

  if (!spawned) {
    throw new Error("Failed to start scraper process.");
  }

  const exitPromise = new Promise<ProcessExitResult>((resolve) => {
    childProcess.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

  const processExit = await exitPromise;

  flushStdoutBuffer(true);
  await Promise.all(processingTasks);

  if (lineProcessingError) {
    throw lineProcessingError;
  }

  if (processExit.code !== 0) {
    throw new Error(
      `Scraper process exited with code ${processExit.code ?? "null"} and signal ${processExit.signal ?? "null"}.`
    );
  }

  if (input.onBrowserUseUrl && !didEmitBrowserUseUrl) {
    await input.onBrowserUseUrl(browserUseUrl);
  }

  return {
    browserUseUrl,
    profileCaptureDir,
    payloadCount,
    invalidPayloadCount,
    captureStats,
  };
}
