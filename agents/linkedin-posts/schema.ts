import { z } from "zod";
import { LINKEDIN_POSTS_MAX_SEARCH_LIMIT } from "./query";

const RejectedReasonSchema = z.enum([
  "not_linkedin_post_url",
  "missing_post_slug",
  "username_mismatch",
]);

export const LinkedinPostsRejectedSchema = z.object({
  url: z.url(),
  slug: z.string().nullable(),
  reason: RejectedReasonSchema,
});

export const LinkedinPostsAgentInputSchema = z.object({
  fullName: z.string().trim().min(1),
  linkedinProfileUrl: z.url(),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxSearchResults: z.number().int().positive().max(LINKEDIN_POSTS_MAX_SEARCH_LIMIT).optional(),
});

export const LinkedinPostsVerificationSchema = z.object({
  query: z.string(),
  derivedUsername: z.string(),
  searchResultCount: z.number().int().nonnegative(),
  candidateUrlCount: z.number().int().nonnegative(),
  verifiedUrls: z.array(z.url()),
  rejected: z.array(LinkedinPostsRejectedSchema),
});

export const LinkedinPostTopicSchema = z.object({
  url: z.url(),
  summary: z.string(),
  topics: z.array(z.string()),
});

export const LinkedinPostsBrowserUseOutputSchema = z.object({
  overallTopics: z.array(z.string()),
  posts: z.array(LinkedinPostTopicSchema),
});

export const LinkedinPostsAgentResultSchema = LinkedinPostsVerificationSchema.extend({
  markdown: z.string(),
  analyzedUrlCount: z.number().int().nonnegative(),
  liveUrl: z.url().nullable(),
  sessionId: z.string().nullable(),
});

export type LinkedinPostsAgentInput = z.input<typeof LinkedinPostsAgentInputSchema>;
export type LinkedinPostsAgentResult = z.output<typeof LinkedinPostsAgentResultSchema>;
export type LinkedinPostsVerification = z.output<typeof LinkedinPostsVerificationSchema>;
export type LinkedinPostsBrowserUseOutput = z.output<typeof LinkedinPostsBrowserUseOutputSchema>;
export type LinkedinPostsRejected = z.output<typeof LinkedinPostsRejectedSchema>;
