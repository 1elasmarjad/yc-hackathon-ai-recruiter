"use client";

import { FormEvent, useMemo, useState } from "react";

type RunStatus = "idle" | "running" | "success" | "error";
type AgentId = "devpost" | "linkedin" | "linkedin-posts" | "github" | "twitter";
type AgentApiStartResponse = {
  taskId?: string;
  sessionId?: string;
  liveUrl?: string | null;
  error?: string;
};
type AgentApiStatusResponse = {
  status?: "running" | "completed" | "failed";
  taskStatus?: string;
  taskId?: string;
  sessionId?: string;
  liveUrl?: string | null;
  markdown?: string;
  error?: string;
};

type AgentDefinition = {
  id: AgentId;
  title: string;
  subtitle: string;
};

type ParsedMarkdownField = {
  key: string;
  value: string;
};

type ParsedMarkdownEntry = {
  title: string;
  fields: ParsedMarkdownField[];
};

type ParsedMarkdownSection = {
  title: string;
  entries: ParsedMarkdownEntry[];
};

type ParsedLinkedinMarkdown = {
  profileUrl: string | null;
  sections: ParsedMarkdownSection[];
  notes: string[];
};

type DevpostResponse = {
  markdown: string;
  liveUrl: string | null;
  sessionId: string;
};

type BrowserUseSessionResponse = {
  sessionId: string;
  liveUrl: string | null;
};

type LinkedinPostsRejected = {
  url: string;
  slug: string | null;
  reason: "not_linkedin_post_url" | "missing_post_slug" | "username_mismatch";
};

type LinkedinPostsResponse = {
  markdown: string;
  query: string;
  derivedUsername: string;
  searchResultCount: number;
  candidateUrlCount: number;
  verifiedUrls: string[];
  rejected: LinkedinPostsRejected[];
  analyzedUrlCount: number;
  liveUrl: string | null;
  sessionId: string | null;
};

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "devpost",
    title: "Devpost Agent",
    subtitle: "Wins and built projects summary",
  },
  {
    id: "linkedin",
    title: "LinkedIn Agent",
    subtitle: "Profile posts, experience, and projects",
  },
  {
    id: "linkedin-posts",
    title: "LinkedIn Posts Agent",
    subtitle: "Search, verify, and summarize user posts",
  },
  {
    id: "github",
    title: "GitHub Agent",
    subtitle: "Contributions and pinned repos with stars",
  },
  {
    id: "twitter",
    title: "Twitter/X Agent",
    subtitle: "Top posts, replies, and interactions",
  },
];

const toPositiveIntegerOrUndefined = (value: string | null): number | undefined => {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const sleep = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const toStatusLabel = (status: RunStatus): string => {
  if (status === "running") {
    return "Running agent...";
  }

  if (status === "success") {
    return "Done";
  }

  if (status === "error") {
    return "Error";
  }

  return "Ready";
};

const downloadMarkdown = (markdown: string, fileName: string) => {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildLinkedinFileName = (profileUrl: string | null): string => {
  if (!profileUrl) {
    return "linkedin-output.md";
  }

  const username = profileUrl.split("/in/")[1]?.split("/")[0];

  if (!username || username.trim() === "") {
    return "linkedin-output.md";
  }

  return `${username}-linkedin.md`;
};

const buildLinkedinPostsFileName = (profileUrl: string | null): string => {
  if (!profileUrl) {
    return "linkedin-posts-output.md";
  }

  const username = profileUrl.split("/in/")[1]?.split("/")[0];

  if (!username || username.trim() === "") {
    return "linkedin-posts-output.md";
  }

  return `${username}-linkedin-posts.md`;
};

const buildGithubFileName = (profileUrl: string | null): string => {
  if (!profileUrl) {
    return "github-output.md";
  }

  const username = profileUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .split("/")[0];

  if (!username || username.trim() === "") {
    return "github-output.md";
  }

  return `${username}-github.md`;
};

const parseTwitterProfileUrls = (profileUrlsInput: string | null): string[] => {
  if (!profileUrlsInput) {
    return [];
  }

  return profileUrlsInput
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line !== "");
};

const buildTwitterFileName = (profileUrls: string[]): string => {
  if (profileUrls.length === 0) {
    return "twitter-output.md";
  }

  const firstProfile = profileUrls[0];
  const handle = firstProfile.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "").split("/")[0];

  if (!handle || handle.trim() === "") {
    return "twitter-output.md";
  }

  return `${handle}-twitter.md`;
};

const parseBulletField = (line: string): ParsedMarkdownField | null => {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("- ")) {
    return null;
  }

  const content = trimmedLine.slice(2).trim();
  const separatorIndex = content.indexOf(":");

  if (separatorIndex === -1) {
    return { key: "value", value: content };
  }

  const key = content.slice(0, separatorIndex).trim();
  const value = content.slice(separatorIndex + 1).trim();

  return {
    key: key === "" ? "value" : key,
    value: value === "" ? "N/A" : value,
  };
};

const parseLinkedinMarkdown = (markdown: string | null): ParsedLinkedinMarkdown | null => {
  if (!markdown || markdown.trim() === "") {
    return null;
  }

  const sections: ParsedMarkdownSection[] = [];
  const notes: string[] = [];
  let profileUrl: string | null = null;
  let currentSectionIndex = -1;
  let currentEntry: ParsedMarkdownEntry | null = null;

  const flushCurrentEntry = (): void => {
    if (currentEntry === null || currentSectionIndex < 0) {
      return;
    }

    sections[currentSectionIndex].entries.push(currentEntry);
    currentEntry = null;
  };

  const lines = markdown.split(/\r?\n/g);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "" || line.startsWith("# ")) {
      continue;
    }

    const parsedField = parseBulletField(line);
    if (parsedField && parsedField.key.toLowerCase() === "profile url") {
      profileUrl = parsedField.value;
      continue;
    }

    if (line.startsWith("## ")) {
      flushCurrentEntry();
      sections.push({
        title: line.slice(3).trim(),
        entries: [],
      });
      currentSectionIndex = sections.length - 1;
      continue;
    }

    if (line.startsWith("### ")) {
      if (currentSectionIndex < 0) {
        sections.push({
          title: "Details",
          entries: [],
        });
        currentSectionIndex = 0;
      }

      flushCurrentEntry();
      const entryTitle = line.slice(4).trim();
      currentEntry = {
        title:
          entryTitle === ""
            ? `Entry ${sections[currentSectionIndex].entries.length + 1}`
            : entryTitle,
        fields: [],
      };
      continue;
    }

    if (parsedField) {
      if (currentSectionIndex < 0) {
        sections.push({
          title: "Details",
          entries: [],
        });
        currentSectionIndex = 0;
      }

      if (!currentEntry) {
        currentEntry = {
          title: `Entry ${sections[currentSectionIndex].entries.length + 1}`,
          fields: [],
        };
      }

      currentEntry.fields.push(parsedField);
      continue;
    }

    notes.push(line);
  }

  flushCurrentEntry();

  return {
    profileUrl,
    sections,
    notes,
  };
};

const buildDevpostFileName = (fullName: string | null): string => {
  if (!fullName || fullName.trim() === "") {
    return "devpost-output.md";
  }

  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return "devpost-output.md";
  }

  return `${slug}-devpost.md`;
};

export default function DevToolsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("devpost");

  const [devpostFullName, setDevpostFullName] = useState<string | null>("");
  const [devpostSessionId, setDevpostSessionId] = useState<string | null>("");
  const [devpostMaxSteps, setDevpostMaxSteps] = useState<string | null>("120");
  const [devpostStatus, setDevpostStatus] = useState<RunStatus>("idle");
  const [devpostError, setDevpostError] = useState<string | null>(null);
  const [devpostMarkdownOutput, setDevpostMarkdownOutput] = useState<string | null>(null);
  const [devpostLiveUrl, setDevpostLiveUrl] = useState<string | null>(null);
  const [devpostResultSessionId, setDevpostResultSessionId] = useState<string | null>(null);

  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState<string | null>("");
  const [linkedinSessionIdInput, setLinkedinSessionIdInput] = useState<string | null>("");
  const [linkedinMaxSteps, setLinkedinMaxSteps] = useState<string | null>("80");
  const [linkedinStatus, setLinkedinStatus] = useState<RunStatus>("idle");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinMarkdownOutput, setLinkedinMarkdownOutput] = useState<string | null>(null);
  const [linkedinTaskId, setLinkedinTaskId] = useState<string | null>(null);
  const [linkedinRunSessionId, setLinkedinRunSessionId] = useState<string | null>(null);
  const [linkedinLiveUrl, setLinkedinLiveUrl] = useState<string | null>(null);

  const [linkedinPostsFullName, setLinkedinPostsFullName] = useState<string | null>("");
  const [linkedinPostsProfileUrl, setLinkedinPostsProfileUrl] = useState<string | null>("");
  const [linkedinPostsSessionId, setLinkedinPostsSessionId] = useState<string | null>("");
  const [linkedinPostsMaxSteps, setLinkedinPostsMaxSteps] = useState<string | null>("80");
  const [linkedinPostsMaxSearchResults, setLinkedinPostsMaxSearchResults] = useState<string | null>(
    "25",
  );
  const [linkedinPostsStatus, setLinkedinPostsStatus] = useState<RunStatus>("idle");
  const [linkedinPostsError, setLinkedinPostsError] = useState<string | null>(null);
  const [linkedinPostsOutput, setLinkedinPostsOutput] = useState<LinkedinPostsResponse | null>(
    null,
  );
  const [linkedinPostsLiveUrl, setLinkedinPostsLiveUrl] = useState<string | null>(null);
  const [linkedinPostsRunSessionId, setLinkedinPostsRunSessionId] = useState<string | null>(null);

  const [githubProfileUrl, setGithubProfileUrl] = useState<string | null>("");
  const [githubSessionId, setGithubSessionId] = useState<string | null>("");
  const [githubMaxSteps, setGithubMaxSteps] = useState<string | null>("80");
  const [githubStatus, setGithubStatus] = useState<RunStatus>("idle");
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubMarkdownOutput, setGithubMarkdownOutput] = useState<string | null>(null);
  const [githubLiveUrl, setGithubLiveUrl] = useState<string | null>(null);
  const [githubRunSessionId, setGithubRunSessionId] = useState<string | null>(null);

  const [twitterProfileUrlsInput, setTwitterProfileUrlsInput] = useState<string | null>("");
  const [twitterSessionIdInput, setTwitterSessionIdInput] = useState<string | null>("");
  const [twitterMaxSteps, setTwitterMaxSteps] = useState<string | null>("120");
  const [twitterStatus, setTwitterStatus] = useState<RunStatus>("idle");
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [twitterMarkdownOutput, setTwitterMarkdownOutput] = useState<string | null>(null);
  const [twitterTaskId, setTwitterTaskId] = useState<string | null>(null);
  const [twitterRunSessionId, setTwitterRunSessionId] = useState<string | null>(null);
  const [twitterLiveUrl, setTwitterLiveUrl] = useState<string | null>(null);

  const devpostIsRunning = devpostStatus === "running";
  const linkedinIsRunning = linkedinStatus === "running";
  const linkedinPostsIsRunning = linkedinPostsStatus === "running";
  const githubIsRunning = githubStatus === "running";
  const twitterIsRunning = twitterStatus === "running";
  const devpostHasOutput = Boolean(devpostMarkdownOutput && devpostMarkdownOutput.trim() !== "");
  const linkedinHasOutput = Boolean(linkedinMarkdownOutput && linkedinMarkdownOutput.trim() !== "");
  const linkedinPostsHasOutput = Boolean(
    linkedinPostsOutput?.markdown && linkedinPostsOutput.markdown.trim() !== "",
  );
  const githubHasOutput = Boolean(githubMarkdownOutput && githubMarkdownOutput.trim() !== "");
  const twitterHasOutput = Boolean(twitterMarkdownOutput && twitterMarkdownOutput.trim() !== "");

  const devpostStatusLabel = useMemo(() => toStatusLabel(devpostStatus), [devpostStatus]);
  const linkedinStatusLabel = useMemo(() => toStatusLabel(linkedinStatus), [linkedinStatus]);
  const linkedinPostsStatusLabel = useMemo(
    () => toStatusLabel(linkedinPostsStatus),
    [linkedinPostsStatus],
  );
  const githubStatusLabel = useMemo(() => toStatusLabel(githubStatus), [githubStatus]);
  const twitterStatusLabel = useMemo(() => toStatusLabel(twitterStatus), [twitterStatus]);
  const linkedinParsedData = useMemo(
    () => parseLinkedinMarkdown(linkedinMarkdownOutput),
    [linkedinMarkdownOutput],
  );

  const pollLinkedinTaskUntilDone = async (taskId: string) => {
    const pollLimit = 240;

    for (let pollIndex = 0; pollIndex < pollLimit; pollIndex += 1) {
      const response = await fetch(
        `/api/agents/linkedin/status?taskId=${encodeURIComponent(taskId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const json = (await response.json()) as AgentApiStatusResponse;

      if (!response.ok) {
        setLinkedinStatus("error");
        setLinkedinError(json.error ?? "Failed while checking Linkedin_agent status.");
        return;
      }

      if (json.sessionId) {
        setLinkedinRunSessionId(json.sessionId);
      }

      if (json.liveUrl) {
        setLinkedinLiveUrl(json.liveUrl);
      }

      if (json.status === "running") {
        await sleep(2500);
        continue;
      }

      if (json.status === "completed" && json.markdown) {
        setLinkedinStatus("success");
        setLinkedinMarkdownOutput(json.markdown);
        return;
      }

      setLinkedinStatus("error");
      setLinkedinError(json.error ?? "Linkedin_agent stopped before completion.");
      return;
    }

    setLinkedinStatus("error");
    setLinkedinError("Linkedin_agent timed out while waiting for completion.");
  };

  const pollTwitterTaskUntilDone = async (taskId: string) => {
    const pollLimit = 240;

    for (let pollIndex = 0; pollIndex < pollLimit; pollIndex += 1) {
      const response = await fetch(
        `/api/agents/twitter/status?taskId=${encodeURIComponent(taskId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const json = (await response.json()) as AgentApiStatusResponse;

      if (!response.ok) {
        setTwitterStatus("error");
        setTwitterError(json.error ?? "Failed while checking Twitter_agent status.");
        return;
      }

      if (json.sessionId) {
        setTwitterRunSessionId(json.sessionId);
      }

      if (json.liveUrl) {
        setTwitterLiveUrl(json.liveUrl);
      }

      if (json.status === "running") {
        await sleep(2500);
        continue;
      }

      if (json.status === "completed" && json.markdown) {
        setTwitterStatus("success");
        setTwitterMarkdownOutput(json.markdown);
        return;
      }

      setTwitterStatus("error");
      setTwitterError(json.error ?? "Twitter_agent stopped before completion.");
      return;
    }

    setTwitterStatus("error");
    setTwitterError("Twitter_agent timed out while waiting for completion.");
  };

  const resolveBrowserSession = async (
    sessionId: string | null,
  ): Promise<BrowserUseSessionResponse> => {
    const response = await fetch("/api/browser-use/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionId ? { sessionId } : {}),
    });

    const json = (await response.json()) as Partial<BrowserUseSessionResponse> & { error?: string };

    if (!response.ok || !json.sessionId) {
      throw new Error(json.error ?? "Failed to prepare Browser Use session.");
    }

    return {
      sessionId: json.sessionId,
      liveUrl: json.liveUrl ?? null,
    };
  };

  const handleRunDevpost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDevpostStatus("running");
    setDevpostError(null);
    setDevpostMarkdownOutput(null);
    setDevpostLiveUrl(null);
    setDevpostResultSessionId(null);

    if (!devpostFullName || devpostFullName.trim() === "") {
      setDevpostStatus("error");
      setDevpostError("Add a full name to run the Devpost search.");
      return;
    }

    try {
      const requestedSessionId =
        devpostSessionId && devpostSessionId.trim() !== "" ? devpostSessionId.trim() : null;
      const preparedSession = await resolveBrowserSession(requestedSessionId);
      setDevpostResultSessionId(preparedSession.sessionId);
      setDevpostLiveUrl(preparedSession.liveUrl);

      const body = {
        fullName: devpostFullName.trim(),
        sessionId: preparedSession.sessionId,
        maxSteps: toPositiveIntegerOrUndefined(devpostMaxSteps),
      };

      const response = await fetch("/api/agents/devpost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as Partial<DevpostResponse> & { error?: string };

      if (!response.ok || !json.markdown) {
        const message = json.error ?? "Failed to run Devpost_agent.";
        setDevpostStatus("error");
        setDevpostError(message);
        return;
      }

      setDevpostStatus("success");
      setDevpostMarkdownOutput(json.markdown);
      setDevpostLiveUrl(json.liveUrl ?? null);
      setDevpostResultSessionId(json.sessionId ?? null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setDevpostStatus("error");
      setDevpostError(message);
    }
  };

  const handleRunLinkedin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkedinStatus("running");
    setLinkedinError(null);
    setLinkedinMarkdownOutput(null);
    setLinkedinTaskId(null);
    setLinkedinRunSessionId(null);
    setLinkedinLiveUrl(null);

    try {
      const body = {
        profileUrl: linkedinProfileUrl ?? "",
        sessionId:
          linkedinSessionIdInput && linkedinSessionIdInput.trim() !== ""
            ? linkedinSessionIdInput
            : undefined,
        maxSteps: toPositiveIntegerOrUndefined(linkedinMaxSteps),
      };

      const response = await fetch("/api/agents/linkedin/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as AgentApiStartResponse;

      if (!response.ok || !json.taskId || !json.sessionId) {
        const message = json.error ?? "Failed to start Linkedin_agent.";
        setLinkedinStatus("error");
        setLinkedinError(message);
        return;
      }

      setLinkedinTaskId(json.taskId);
      setLinkedinRunSessionId(json.sessionId);
      setLinkedinLiveUrl(json.liveUrl ?? null);

      await pollLinkedinTaskUntilDone(json.taskId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setLinkedinStatus("error");
      setLinkedinError(message);
    }
  };

  const handleRunLinkedinPosts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkedinPostsStatus("running");
    setLinkedinPostsError(null);
    setLinkedinPostsOutput(null);
    setLinkedinPostsLiveUrl(null);
    setLinkedinPostsRunSessionId(null);

    if (!linkedinPostsFullName || linkedinPostsFullName.trim() === "") {
      setLinkedinPostsStatus("error");
      setLinkedinPostsError("Add a full name to run LinkedIn posts search.");
      return;
    }

    try {
      const requestedSessionId =
        linkedinPostsSessionId && linkedinPostsSessionId.trim() !== ""
          ? linkedinPostsSessionId.trim()
          : null;
      const preparedSession = await resolveBrowserSession(requestedSessionId);
      setLinkedinPostsRunSessionId(preparedSession.sessionId);
      setLinkedinPostsLiveUrl(preparedSession.liveUrl);

      const body = {
        fullName: linkedinPostsFullName.trim(),
        linkedinProfileUrl: linkedinPostsProfileUrl ?? "",
        sessionId: preparedSession.sessionId,
        maxSteps: toPositiveIntegerOrUndefined(linkedinPostsMaxSteps),
        maxSearchResults: toPositiveIntegerOrUndefined(linkedinPostsMaxSearchResults),
      };

      const response = await fetch("/api/agents/linkedin-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as Partial<LinkedinPostsResponse> & { error?: string };

      if (!response.ok || !json.markdown) {
        const message = json.error ?? "Failed to run Linkedin_posts_agent.";
        setLinkedinPostsStatus("error");
        setLinkedinPostsError(message);
        return;
      }

      setLinkedinPostsStatus("success");
      const completedOutput = json as LinkedinPostsResponse;
      setLinkedinPostsOutput(completedOutput);
      setLinkedinPostsLiveUrl(completedOutput.liveUrl ?? preparedSession.liveUrl);
      setLinkedinPostsRunSessionId(completedOutput.sessionId ?? preparedSession.sessionId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setLinkedinPostsStatus("error");
      setLinkedinPostsError(message);
    }
  };

  const handleRunTwitter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTwitterStatus("running");
    setTwitterError(null);
    setTwitterMarkdownOutput(null);
    setTwitterTaskId(null);
    setTwitterRunSessionId(null);
    setTwitterLiveUrl(null);

    const profileUrls = parseTwitterProfileUrls(twitterProfileUrlsInput);

    if (profileUrls.length === 0) {
      setTwitterStatus("error");
      setTwitterError("Add at least one X/Twitter profile URL.");
      return;
    }

    try {
      const body = {
        profileUrls,
        sessionId:
          twitterSessionIdInput && twitterSessionIdInput.trim() !== ""
            ? twitterSessionIdInput
            : undefined,
        maxSteps: toPositiveIntegerOrUndefined(twitterMaxSteps),
      };

      const response = await fetch("/api/agents/twitter/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as AgentApiStartResponse;

      if (!response.ok || !json.taskId || !json.sessionId) {
        const message = json.error ?? "Failed to start Twitter_agent.";
        setTwitterStatus("error");
        setTwitterError(message);
        return;
      }

      setTwitterTaskId(json.taskId);
      setTwitterRunSessionId(json.sessionId);
      setTwitterLiveUrl(json.liveUrl ?? null);

      await pollTwitterTaskUntilDone(json.taskId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setTwitterStatus("error");
      setTwitterError(message);
    }
  };

  const handleRunGithub = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGithubStatus("running");
    setGithubError(null);
    setGithubMarkdownOutput(null);
    setGithubLiveUrl(null);
    setGithubRunSessionId(null);

    if (!githubProfileUrl || githubProfileUrl.trim() === "") {
      setGithubStatus("error");
      setGithubError("Add a GitHub profile URL.");
      return;
    }

    try {
      const requestedSessionId =
        githubSessionId && githubSessionId.trim() !== "" ? githubSessionId.trim() : null;
      const preparedSession = await resolveBrowserSession(requestedSessionId);
      setGithubRunSessionId(preparedSession.sessionId);
      setGithubLiveUrl(preparedSession.liveUrl);

      const body = {
        profileUrl: githubProfileUrl.trim(),
        sessionId: preparedSession.sessionId,
        maxSteps: toPositiveIntegerOrUndefined(githubMaxSteps),
      };

      const response = await fetch("/api/agents/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as { markdown?: string; error?: string };

      if (!response.ok || !json.markdown) {
        const message = json.error ?? "Failed to run Github_agent.";
        setGithubStatus("error");
        setGithubError(message);
        return;
      }

      setGithubStatus("success");
      setGithubMarkdownOutput(json.markdown);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setGithubStatus("error");
      setGithubError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:w-80">
          <h1 className="text-xl font-semibold tracking-tight">Dev Tools</h1>
          <p className="mt-2 text-sm text-slate-300">
            Pick an agent from the sidebar and run it from this page.
          </p>
          <p className="mt-2 text-xs text-amber-300">
            Required env vars: <code>BROWSER_USE_API_KEY</code> and{" "}
            <code>FIRECRAWL_API_KEY</code> in <code>.env.local</code>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Optional LinkedIn proxy: <code>LINKEDIN_PROXY_COUNTRY_CODE</code> (example:{" "}
            <code>us</code>)
          </p>

          <nav className="mt-4 flex flex-col gap-2">
            {AGENT_DEFINITIONS.map((agent) => {
              const isSelected = selectedAgent === agent.id;

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${isSelected
                      ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
                      : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
                    }`}
                >
                  <div className="text-sm font-semibold">{agent.title}</div>
                  <div className="mt-1 text-xs text-slate-300">{agent.subtitle}</div>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1">
          {selectedAgent === "devpost" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">Devpost Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Searches Devpost by full name and summarizes wins plus built projects.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunDevpost}>
                  <label className="flex flex-col gap-2 text-sm">
                    Full Name
                    <input
                      type="text"
                      value={devpostFullName ?? ""}
                      onChange={(event) => setDevpostFullName(event.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={devpostSessionId ?? ""}
                        onChange={(event) => setDevpostSessionId(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={devpostMaxSteps ?? ""}
                        onChange={(event) => setDevpostMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={devpostIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {devpostIsRunning ? "Running..." : "Run Devpost_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {devpostStatusLabel}</span>
                  </div>
                </form>

                {devpostError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {devpostError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!devpostMarkdownOutput) {
                        return;
                      }

                      downloadMarkdown(devpostMarkdownOutput, buildDevpostFileName(devpostFullName));
                    }}
                    disabled={!devpostHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {devpostMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Browser Live View</h3>
                  {devpostLiveUrl ? (
                    <a
                      href={devpostLiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
                    >
                      Open in new tab
                    </a>
                  ) : null}
                </div>

                {devpostResultSessionId ? (
                  <p className="mb-3 text-xs text-slate-400">Session ID: {devpostResultSessionId}</p>
                ) : null}

                {devpostLiveUrl ? (
                  <iframe
                    title="Devpost Browser Live URL"
                    src={devpostLiveUrl}
                    className="h-[640px] w-full rounded-lg border border-slate-800 bg-slate-950"
                    allow="clipboard-read; clipboard-write"
                  />
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
                    No live URL yet. Run the agent to load the browser session in-frame.
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {selectedAgent === "linkedin" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Scrapes profile posts, experience, and projects into markdown.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunLinkedin}>
                  <label className="flex flex-col gap-2 text-sm">
                    LinkedIn Profile URL
                    <input
                      type="url"
                      value={linkedinProfileUrl ?? ""}
                      onChange={(event) => setLinkedinProfileUrl(event.target.value)}
                      placeholder="https://www.linkedin.com/in/username/"
                      required
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={linkedinSessionIdInput ?? ""}
                        onChange={(event) => setLinkedinSessionIdInput(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={linkedinMaxSteps ?? ""}
                        onChange={(event) => setLinkedinMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={linkedinIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {linkedinIsRunning ? "Running..." : "Run Linkedin_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {linkedinStatusLabel}</span>
                  </div>
                </form>

                {linkedinError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {linkedinError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold">Live Session</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Session ID: {linkedinRunSessionId ?? "Not started yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Task ID: {linkedinTaskId ?? "N/A"}</p>

                {linkedinLiveUrl ? (
                  <>
                    <a
                      href={linkedinLiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs text-cyan-300 underline underline-offset-2"
                    >
                      Open live session in a new tab
                    </a>
                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <iframe
                        title="LinkedIn live session viewer"
                        src={linkedinLiveUrl}
                        className="h-[460px] w-full"
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">
                    Start a run to load the live session viewer.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() =>
                      linkedinMarkdownOutput
                        ? downloadMarkdown(
                          linkedinMarkdownOutput,
                          buildLinkedinFileName(linkedinProfileUrl),
                        )
                        : null
                    }
                    disabled={!linkedinHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {linkedinMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold">Data From .md</h3>

                {linkedinParsedData ? (
                  <div className="mt-3 flex flex-col gap-4">
                    <p className="text-sm text-slate-300">
                      Profile URL: {linkedinParsedData.profileUrl ?? "Not found in markdown"}
                    </p>

                    {linkedinParsedData.sections.length === 0 ? (
                      <p className="text-sm text-slate-300">
                        No structured sections found yet in markdown.
                      </p>
                    ) : (
                      linkedinParsedData.sections.map((section, sectionIndex) => (
                        <div
                          key={`${section.title}-${sectionIndex}`}
                          className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                        >
                          <h4 className="text-sm font-semibold text-cyan-200">{section.title}</h4>

                          {section.entries.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-400">No entries found in this section.</p>
                          ) : (
                            <div className="mt-3 grid gap-3">
                              {section.entries.map((entry, entryIndex) => (
                                <div
                                  key={`${entry.title}-${entryIndex}`}
                                  className="rounded-md border border-slate-800 bg-slate-900/70 p-3"
                                >
                                  <p className="text-xs font-semibold text-slate-200">{entry.title}</p>

                                  {entry.fields.length === 0 ? (
                                    <p className="mt-2 text-xs text-slate-400">No fields found.</p>
                                  ) : (
                                    <dl className="mt-2 grid gap-1 text-xs">
                                      {entry.fields.map((field, fieldIndex) => (
                                        <div key={`${field.key}-${fieldIndex}`} className="flex flex-wrap gap-1">
                                          <dt className="font-semibold text-slate-300">{field.key}:</dt>
                                          <dd className="text-slate-100">{field.value}</dd>
                                        </div>
                                      ))}
                                    </dl>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {linkedinParsedData.notes.length > 0 ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs font-semibold text-slate-300">Other extracted lines</p>
                        <pre className="mt-2 overflow-x-auto text-xs leading-6 text-slate-200">
                          {linkedinParsedData.notes.join("\n")}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">
                    No data yet. Run the agent to generate markdown, then this panel will parse it.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          {selectedAgent === "linkedin-posts" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">LinkedIn Posts Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Searches LinkedIn posts by full name, verifies ownership by username slug, and
                  summarizes posting topics.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunLinkedinPosts}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Full Name
                      <input
                        type="text"
                        value={linkedinPostsFullName ?? ""}
                        onChange={(event) => setLinkedinPostsFullName(event.target.value)}
                        placeholder="Jane Doe"
                        required
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      LinkedIn Profile URL
                      <input
                        type="url"
                        value={linkedinPostsProfileUrl ?? ""}
                        onChange={(event) => setLinkedinPostsProfileUrl(event.target.value)}
                        placeholder="https://www.linkedin.com/in/username/"
                        required
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={linkedinPostsSessionId ?? ""}
                        onChange={(event) => setLinkedinPostsSessionId(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={linkedinPostsMaxSteps ?? ""}
                        onChange={(event) => setLinkedinPostsMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Search Results (optional)
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={linkedinPostsMaxSearchResults ?? ""}
                        onChange={(event) => setLinkedinPostsMaxSearchResults(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={linkedinPostsIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {linkedinPostsIsRunning ? "Running..." : "Run Linkedin_posts_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {linkedinPostsStatusLabel}</span>
                  </div>
                </form>

                {linkedinPostsError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {linkedinPostsError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!linkedinPostsOutput?.markdown) {
                        return;
                      }

                      downloadMarkdown(
                        linkedinPostsOutput.markdown,
                        buildLinkedinPostsFileName(linkedinPostsProfileUrl),
                      );
                    }}
                    disabled={!linkedinPostsHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {linkedinPostsOutput?.markdown ??
                    "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Browser Live View</h3>
                  {linkedinPostsOutput?.liveUrl || linkedinPostsLiveUrl ? (
                    <a
                      href={linkedinPostsOutput?.liveUrl ?? linkedinPostsLiveUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
                    >
                      Open in new tab
                    </a>
                  ) : null}
                </div>

                {linkedinPostsOutput?.sessionId || linkedinPostsRunSessionId ? (
                  <p className="mb-3 text-xs text-slate-400">
                    Session ID: {linkedinPostsOutput?.sessionId ?? linkedinPostsRunSessionId}
                  </p>
                ) : null}

                {linkedinPostsOutput?.liveUrl || linkedinPostsLiveUrl ? (
                  <iframe
                    title="LinkedIn Posts Browser Live URL"
                    src={linkedinPostsOutput?.liveUrl ?? linkedinPostsLiveUrl ?? ""}
                    className="h-[640px] w-full rounded-lg border border-slate-800 bg-slate-950"
                    allow="clipboard-read; clipboard-write"
                  />
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
                    No live URL yet. Run the agent to load the browser session in-frame.
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold">Diagnostics</h3>
                {linkedinPostsOutput ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-200">
                    <p>
                      Verified URLs: {linkedinPostsOutput.verifiedUrls.length} | Rejected URLs:{" "}
                      {linkedinPostsOutput.rejected.length} | Analyzed URLs:{" "}
                      {linkedinPostsOutput.analyzedUrlCount}
                    </p>

                    <div>
                      <p className="font-medium text-slate-100">Verified</p>
                      {linkedinPostsOutput.verifiedUrls.length === 0 ? (
                        <p className="text-slate-400">No verified URLs.</p>
                      ) : (
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {linkedinPostsOutput.verifiedUrls.map((url) => (
                            <li key={url} className="break-all">
                              {url}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-slate-100">Rejected</p>
                      {linkedinPostsOutput.rejected.length === 0 ? (
                        <p className="text-slate-400">No rejected URLs.</p>
                      ) : (
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {linkedinPostsOutput.rejected.map((item) => (
                            <li key={`${item.url}-${item.reason}`} className="break-all">
                              {item.url} ({item.reason}, slug: {item.slug ?? "N/A"})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No diagnostics yet. Run the agent to inspect verified and rejected URLs.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          {selectedAgent === "github" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">GitHub Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Scrapes profile contributions summary and pinned repositories with stars.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunGithub}>
                  <label className="flex flex-col gap-2 text-sm">
                    GitHub Profile URL
                    <input
                      type="url"
                      value={githubProfileUrl ?? ""}
                      onChange={(event) => setGithubProfileUrl(event.target.value)}
                      placeholder="https://github.com/username"
                      required
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={githubSessionId ?? ""}
                        onChange={(event) => setGithubSessionId(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={githubMaxSteps ?? ""}
                        onChange={(event) => setGithubMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={githubIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {githubIsRunning ? "Running..." : "Run Github_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {githubStatusLabel}</span>
                  </div>
                </form>

                {githubError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {githubError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!githubMarkdownOutput) {
                        return;
                      }

                      downloadMarkdown(githubMarkdownOutput, buildGithubFileName(githubProfileUrl));
                    }}
                    disabled={!githubHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {githubMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Browser Live View</h3>
                  {githubLiveUrl ? (
                    <a
                      href={githubLiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
                    >
                      Open in new tab
                    </a>
                  ) : null}
                </div>

                {githubRunSessionId ? (
                  <p className="mb-3 text-xs text-slate-400">Session ID: {githubRunSessionId}</p>
                ) : null}

                {githubLiveUrl ? (
                  <iframe
                    title="GitHub Browser Live URL"
                    src={githubLiveUrl}
                    className="h-[640px] w-full rounded-lg border border-slate-800 bg-slate-950"
                    allow="clipboard-read; clipboard-write"
                  />
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
                    No live URL yet. Run the agent to load the browser session in-frame.
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {selectedAgent === "twitter" ? (
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h2 className="text-2xl font-semibold tracking-tight">Twitter/X Agent</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Scrapes top posts, replies, comments, and interactions into markdown.
                </p>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <form className="flex flex-col gap-4" onSubmit={handleRunTwitter}>
                  <label className="flex flex-col gap-2 text-sm">
                    X/Twitter Profile URLs (one per line)
                    <textarea
                      value={twitterProfileUrlsInput ?? ""}
                      onChange={(event) => setTwitterProfileUrlsInput(event.target.value)}
                      placeholder={"https://x.com/user_one\nhttps://x.com/user_two"}
                      required
                      rows={5}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      Session ID (optional)
                      <input
                        type="text"
                        value={twitterSessionIdInput ?? ""}
                        onChange={(event) => setTwitterSessionIdInput(event.target.value)}
                        placeholder="reuse Browser Use session id"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                      Max Steps (optional)
                      <input
                        type="number"
                        min={1}
                        value={twitterMaxSteps ?? ""}
                        onChange={(event) => setTwitterMaxSteps(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-cyan-400/40 focus:ring-2"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={twitterIsRunning}
                      className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                    >
                      {twitterIsRunning ? "Running..." : "Run Twitter_agent"}
                    </button>

                    <span className="text-sm text-slate-300">Status: {twitterStatusLabel}</span>
                  </div>
                </form>

                {twitterError ? (
                  <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    {twitterError}
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <h3 className="text-lg font-semibold">Live Session</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Session ID: {twitterRunSessionId ?? "Not started yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Task ID: {twitterTaskId ?? "N/A"}</p>

                {twitterLiveUrl ? (
                  <>
                    <a
                      href={twitterLiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs text-cyan-300 underline underline-offset-2"
                    >
                      Open live session in a new tab
                    </a>
                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <iframe
                        title="Twitter live session viewer"
                        src={twitterLiveUrl}
                        className="h-[460px] w-full"
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">
                    Start a run to load the live session viewer.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Markdown Output</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!twitterMarkdownOutput) {
                        return;
                      }

                      const twitterProfileUrls = parseTwitterProfileUrls(twitterProfileUrlsInput);
                      downloadMarkdown(
                        twitterMarkdownOutput,
                        buildTwitterFileName(twitterProfileUrls),
                      );
                    }}
                    disabled={!twitterHasOutput}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Download .md
                  </button>
                </div>

                <pre className="min-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {twitterMarkdownOutput ?? "No output yet. Run the agent to generate markdown."}
                </pre>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
