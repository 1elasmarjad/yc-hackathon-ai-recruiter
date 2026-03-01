import { z } from "zod";

const stringArray = z.preprocess((value) => (value == null ? [] : value), z.array(z.string()));
const unknownArray = z.preprocess((value) => (value == null ? [] : value), z.array(z.unknown()));

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const nullableBoolean = z.boolean().nullable().optional();
const nullableStringArray = z.array(z.string()).nullable().optional();

const FirestoreTimestampSchema = z.looseObject({
  _seconds: z.number().optional(),
  _nanoseconds: z.number().optional(),
});

const nullableDateLike = z
  .union([z.string(), z.number(), FirestoreTimestampSchema])
  .nullable()
  .optional();

export const JuiceboxExperienceCompanySchema = z.looseObject({
  id: nullableString,
  name: nullableString,
  website: nullableString,
  linkedin_url: nullableString,
  linkedin_id: nullableString,
  facebook_url: nullableString,
  twitter_url: nullableString,
  founded: nullableString,
  industry: nullableString,
  industry_v2: nullableString,
  headline: nullableString,
  summary: nullableString,
  size: nullableString,
  type: nullableString,
  ticker: nullableString,
  employee_count: nullableNumber,
  average_employee_tenure: nullableNumber,
  alternative_names: nullableStringArray,
  tags: nullableStringArray,
  inferred_tags: nullableStringArray,
  location: z.unknown().nullable().optional(),
});

export const JuiceboxJobTitleSchema = z.looseObject({
  levels: unknownArray.optional(),
  name: nullableString,
  role: nullableString,
  sub_role: nullableString,
});

export const JuiceboxExperienceSchema = z.looseObject({
  company_name: nullableString,
  role_title: nullableString,
  description: nullableString,
  company: JuiceboxExperienceCompanySchema.nullable().optional(),
  title: JuiceboxJobTitleSchema.nullable().optional(),
  start_date: nullableString,
  end_date: nullableString,
  is_primary: nullableBoolean,
  location_names: stringArray.optional(),
  summary: nullableString,
  type: nullableString,
  historical_funding_stages: unknownArray.optional(),
});

export const JuiceboxLocationSchema = z.looseObject({
  continent: nullableString,
  country: nullableString,
  locality: nullableString,
  name: nullableString,
  region: nullableString,
  address_line_2: nullableString,
  geo: nullableString,
  postal_code: nullableString,
  street_address: nullableString,
});

export const JuiceboxSchoolSchema = z.looseObject({
  id: nullableString,
  name: nullableString,
  domain: nullableString,
  facebook_url: nullableString,
  linkedin_id: nullableString,
  linkedin_url: nullableString,
  twitter_url: nullableString,
  type: nullableString,
  website: nullableString,
  location: JuiceboxLocationSchema.nullable().optional(),
});

export const JuiceboxEducationSchema = z.looseObject({
  institution_name: nullableString,
  degree: nullableString,
  field_of_study: nullableString,
  description: nullableString,
  degrees: stringArray.optional(),
  majors: stringArray.optional(),
  minors: stringArray.optional(),
  start_date: nullableString,
  end_date: nullableString,
  gpa: z.union([z.string(), z.number()]).nullable().optional(),
  school: JuiceboxSchoolSchema.nullable().optional(),
  summary: nullableString,
});

export const JuiceboxNetworkProfileSchema = z.looseObject({
  network: nullableString,
  url: nullableString,
});

export const JuiceboxLanguageSchema = z.looseObject({
  name: nullableString,
  proficiency: z.union([z.string(), z.number()]).nullable().optional(),
});

export const JuiceboxCandidateSchema = z.looseObject({
  id: z.string().min(1),

  pdlSource: nullableString,
  lastContacted: nullableString,
  lastContactedOnLinkedin: nullableString,
  lastEmailed: nullableString,
  lastReplied: nullableString,
  lastSequenceRun: nullableString,
  lastContactInfoRefresh: nullableString,
  lastExported: nullableString,
  lastActivityDate: nullableDateLike,
  saved: nullableBoolean,
  savedAt: nullableDateLike,
  l_invalid: nullableBoolean,

  work_email: nullableString,
  recommended_personal_email: nullableString,
  personal_emails: stringArray.optional(),
  phone_numbers: stringArray.optional(),
  mobile_phone: nullableString,
  manualEmails: stringArray.optional(),
  manualPhoneNumbers: stringArray.optional(),
  supplemented_emails: stringArray.optional(),
  supplemented_phone_number: nullableString,
  contact_info_availability: z.record(z.string(), z.boolean()).nullable().optional(),

  first_name: nullableString,
  last_name: nullableString,
  full_name: nullableString,
  summary: nullableString,
  profileHighlight: nullableString,
  text: nullableString,

  location_name: nullableString,
  location_country: nullableString,
  location_locality: nullableString,

  job_title: nullableString,
  job_company_name: nullableString,
  job_company_id: nullableString,
  job_company_website: nullableString,
  job_start_date: nullableString,
  job_end_date: nullableString,

  ai_skills: stringArray.optional(),
  sd_skills: stringArray.optional(),
  skills: stringArray.optional(),
  languages: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxLanguageSchema)
  ).optional(),
  tags: unknownArray.optional(),
  _tags: unknownArray.optional(),
  average_tenure: nullableNumber,
  total_experience_months: nullableNumber,
  open_to_work_reasons: stringArray.optional(),
  highlights: unknownArray.optional(),
  other_notes: unknownArray.optional(),

  education: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxEducationSchema)
  ).optional(),
  experience: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxExperienceSchema)
  ).optional(),
  experiences: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxExperienceSchema)
  ).optional(),
  profiles: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxNetworkProfileSchema)
  ).optional(),
  network_profiles: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(JuiceboxNetworkProfileSchema)
  ).optional(),
  publications: unknownArray.optional(),
  competitions: unknownArray.optional(),
  links: unknownArray.optional(),
  isConnectedTo: unknownArray.optional(),

  juicebox_profile_url: nullableString,
  juicebox_profile_api_url: nullableString,
  linkedin_url: nullableString,
  linkedin_id: nullableString,
  github_url: nullableString,
  twitter_url: nullableString,
  facebook_url: nullableString,
  github_data: z.unknown().nullable().optional(),
  autopilot: z.unknown().nullable().optional(),
});

export const JuiceboxRawProfileSchema = z.looseObject({
  id: nullableString,
  full_name: nullableString,
});

export const JuiceboxPaginationReportSchema = z.object({
  traversalPage: z.number().int().min(1),
  currentPage: z.number().int().min(1).nullable(),
  finalVisiblePage: z.number().int().min(1).nullable(),
  hasNextPage: z.boolean().nullable(),
});

export const JuiceboxPaginationSchema = z.object({
  requestedStartPage: z.number().int().min(1),
  requestedTotalPages: z.number().int().min(1),
  firstCapturePage: z.number().int().min(1),
  lastCapturePage: z.number().int().min(1),
  pagesToTraverse: z.number().int().min(1),
  stoppedAtPage: z.number().int().min(1).nullable(),
  stopReason: z.enum(["no_next_page", "requested_limit_reached"]),
  currentPage: z.number().int().min(1).nullable(),
  finalVisiblePage: z.number().int().min(1).nullable(),
  hasNextPage: z.boolean().nullable(),
  pageReports: z.array(JuiceboxPaginationReportSchema),
});

export const JuiceboxAgentOutputSchema = z.object({
  sourceUrl: z.url(),
  scrapedAt: z.string(),
  profiles: z.array(JuiceboxRawProfileSchema).optional(),
  candidates: z.array(JuiceboxCandidateSchema),
  pagination: JuiceboxPaginationSchema,
});

export const JuiceboxRawAgentOutputSchema = z.object({
  sourceUrl: z.url(),
  scrapedAt: z.string(),
  profiles: z.array(JuiceboxRawProfileSchema),
});

export type JuiceboxCandidate = z.infer<typeof JuiceboxCandidateSchema>;
export type JuiceboxAgentOutput = z.infer<typeof JuiceboxAgentOutputSchema>;
export type JuiceboxExperienceCompany = z.infer<typeof JuiceboxExperienceCompanySchema>;
export type JuiceboxPagination = z.infer<typeof JuiceboxPaginationSchema>;

export function isJuiceboxAgentOutput(value: unknown): value is JuiceboxAgentOutput {
  return JuiceboxAgentOutputSchema.safeParse(value).success;
}

