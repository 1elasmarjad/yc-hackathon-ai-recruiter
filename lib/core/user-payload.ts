import { ZodError } from "zod";
import {
  JuiceboxCandidateSchema,
  type JuiceboxCandidate,
} from "@/agents/core/jb-schema";

export type CoreUserPayload = JuiceboxCandidate;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickFirst(
  payload: Record<string, unknown>,
  keys: string[]
): unknown | undefined {
  for (const key of keys) {
    if (key in payload) {
      return payload[key];
    }
  }
  return undefined;
}

function pickFirstString(
  payload: Record<string, unknown>,
  keys: string[]
): string | undefined {
  const value = pickFirst(payload, keys);
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized;
}

function normalizeExperience(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const normalizedTitle = isRecord(entry.title)
      ? entry.title
      : pickFirstString(entry, ["role_title", "title", "jobTitle"])
        ? {
            name: pickFirstString(entry, ["role_title", "title", "jobTitle"]),
          }
        : undefined;

    const companyValue = entry.company;
    const companyName = pickFirstString(entry, [
      "company_name",
      "companyName",
      "organization",
    ]);
    const normalizedCompany = isRecord(companyValue)
      ? companyValue
      : companyName
        ? { name: companyName }
        : undefined;

    return {
      ...entry,
      start_date: pickFirstString(entry, ["start_date", "startDate"]),
      end_date: pickFirstString(entry, ["end_date", "endDate"]),
      summary: pickFirstString(entry, ["summary", "description"]),
      title: normalizedTitle,
      company: normalizedCompany,
      location_names:
        pickFirst(entry, ["location_names", "locationNames", "locations"]) ??
        entry.location_names,
    };
  });
}

function normalizeEducation(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const schoolValue = entry.school;
    const schoolName = pickFirstString(entry, ["institution_name", "schoolName", "name"]);
    const normalizedSchool = isRecord(schoolValue)
      ? schoolValue
      : schoolName
        ? { name: schoolName }
        : undefined;

    const degreeValue = pickFirst(entry, ["degrees", "degree"]);
    const majorValue = pickFirst(entry, ["majors", "field_of_study", "fieldOfStudy"]);

    return {
      ...entry,
      start_date: pickFirstString(entry, ["start_date", "startDate"]),
      end_date: pickFirstString(entry, ["end_date", "endDate"]),
      summary: pickFirstString(entry, ["summary", "description"]),
      school: normalizedSchool,
      degrees: Array.isArray(degreeValue)
        ? degreeValue
        : typeof degreeValue === "string"
          ? [degreeValue]
          : undefined,
      majors: Array.isArray(majorValue)
        ? majorValue
        : typeof majorValue === "string"
          ? [majorValue]
          : undefined,
    };
  });
}

function normalizeProfiles(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    return {
      network: pickFirstString(entry, ["network", "type", "label"]) ?? "Profile",
      url: pickFirstString(entry, ["url", "link", "href"]) ?? "",
    };
  });
}

function normalizePayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const candidatePayload = isRecord(payload.result)
    ? { ...payload, ...payload.result }
    : payload;

  const id =
    pickFirstString(candidatePayload, [
      "id",
      "candidateId",
      "candidate_id",
      "profileId",
      "profile_id",
      "publicId",
      "public_id",
      "person_id",
      "linkedin_id",
      "linkedinId",
    ]) ?? candidatePayload.id;

  const educationValue = pickFirst(candidatePayload, ["education", "educations"]);
  const experienceValue = pickFirst(candidatePayload, ["experience", "experiences"]);
  const normalizedExperience = normalizeExperience(experienceValue);
  const profilesValue = pickFirst(candidatePayload, [
    "profiles",
    "network_profiles",
    "networkProfiles",
  ]);
  const normalizedProfiles = normalizeProfiles(profilesValue);

  return {
    ...candidatePayload,
    id,
    first_name: pickFirstString(candidatePayload, ["first_name", "firstName"]),
    last_name: pickFirstString(candidatePayload, ["last_name", "lastName"]),
    full_name: pickFirstString(candidatePayload, ["full_name", "fullName"]),
    summary: pickFirstString(candidatePayload, ["summary", "description", "bio"]),
    profileHighlight: pickFirstString(candidatePayload, [
      "profileHighlight",
      "profile_highlight",
    ]),
    location_name: pickFirstString(candidatePayload, [
      "location_name",
      "locationName",
      "location",
    ]),
    location_country: pickFirstString(candidatePayload, [
      "location_country",
      "locationCountry",
      "country",
    ]),
    location_locality: pickFirstString(candidatePayload, [
      "location_locality",
      "locationLocality",
      "locality",
      "city",
    ]),
    job_title: pickFirstString(candidatePayload, [
      "job_title",
      "jobTitle",
      "title",
      "headline",
    ]),
    job_company_name: pickFirstString(candidatePayload, [
      "job_company_name",
      "jobCompanyName",
      "company",
      "companyName",
    ]),
    linkedin_url: pickFirstString(candidatePayload, [
      "linkedin_url",
      "linkedinUrl",
      "linkedin",
    ]),
    linkedin_id: pickFirstString(candidatePayload, ["linkedin_id", "linkedinId"]),
    github_url: pickFirstString(candidatePayload, ["github_url", "githubUrl"]),
    work_email: pickFirstString(candidatePayload, ["work_email", "workEmail", "email"]),
    personal_emails:
      pickFirst(candidatePayload, ["personal_emails", "personalEmails"]) ??
      candidatePayload.personal_emails,
    phone_numbers:
      pickFirst(candidatePayload, ["phone_numbers", "phoneNumbers"]) ??
      candidatePayload.phone_numbers,
    mobile_phone: pickFirstString(candidatePayload, ["mobile_phone", "mobilePhone"]),
    skills: pickFirst(candidatePayload, ["skills", "skill_set"]) ?? candidatePayload.skills,
    ai_skills: pickFirst(candidatePayload, ["ai_skills", "aiSkills"]) ?? candidatePayload.ai_skills,
    sd_skills: pickFirst(candidatePayload, ["sd_skills", "sdSkills"]) ?? candidatePayload.sd_skills,
    languages: pickFirst(candidatePayload, ["languages", "language"]),
    education: normalizeEducation(educationValue),
    experience: normalizedExperience,
    experiences: normalizedExperience,
    profiles: normalizedProfiles,
    network_profiles: normalizedProfiles,
  };
}

function formatZodError(error: ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return "Unknown schema validation error.";
  }

  const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "root";
  return `${path}: ${firstIssue.message}`;
}

export function parseCoreUserPayload(payload: unknown): CoreUserPayload {
  const normalizedPayload = normalizePayload(payload);
  const parsedPayload = JuiceboxCandidateSchema.safeParse(normalizedPayload);
  if (!parsedPayload.success) {
    throw new Error(
      `SCRAPER_USER_PAYLOAD failed schema validation: ${formatZodError(parsedPayload.error)}`
    );
  }

  return parsedPayload.data;
}
