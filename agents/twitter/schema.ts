import { z } from "zod";

const TwitterCommentSchema = z.object({
  commenterHandle: z.string(),
  text: z.string(),
  publishedAt: z.string().nullable(),
  likeCount: z.number().int().nonnegative().nullable(),
  replyCount: z.number().int().nonnegative().nullable(),
});

const TwitterPostBaseSchema = z.object({
  postUrl: z.url().nullable(),
  text: z.string(),
  publishedAt: z.string().nullable(),
  likeCount: z.number().int().nonnegative().nullable(),
  replyCount: z.number().int().nonnegative().nullable(),
  repostCount: z.number().int().nonnegative().nullable(),
  quoteCount: z.number().int().nonnegative().nullable(),
  bookmarkCount: z.number().int().nonnegative().nullable(),
  viewCount: z.number().int().nonnegative().nullable(),
  interactionTotal: z.number().int().nonnegative().nullable(),
});

const TwitterTopPostSchema = TwitterPostBaseSchema.extend({
  comments: z.array(TwitterCommentSchema).max(10),
});

const TwitterReplySchema = TwitterPostBaseSchema;

const TwitterProfileSchema = z.object({
  profileUrl: z.url(),
  displayName: z.string(),
  handle: z.string(),
  bio: z.string().nullable(),
  followersCount: z.number().int().nonnegative().nullable(),
  followingCount: z.number().int().nonnegative().nullable(),
  postCount: z.number().int().nonnegative().nullable(),
  topPosts: z.array(TwitterTopPostSchema).max(10),
  replies: z.array(TwitterReplySchema).max(10),
});

export const TwitterAgentInputSchema = z.object({
  profileUrls: z.array(z.url()).min(1),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

export const TwitterAgentStructuredOutputSchema = z.object({
  status: z.enum(["success", "failed"]),
  failureReason: z.string().nullable(),
  profiles: z.array(TwitterProfileSchema),
});

export type TwitterAgentInput = z.input<typeof TwitterAgentInputSchema>;
export type TwitterAgentStructuredOutput = z.output<typeof TwitterAgentStructuredOutputSchema>;
