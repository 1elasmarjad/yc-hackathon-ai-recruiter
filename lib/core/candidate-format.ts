import type { JuiceboxCandidate } from "@/agents/core/jb-schema";

type ExperienceItem = NonNullable<JuiceboxCandidate["experience"]>[number];
type EducationItem = NonNullable<JuiceboxCandidate["education"]>[number];
type LanguageItem = NonNullable<JuiceboxCandidate["languages"]>[number];

export type CandidateTimelineItem = {
  heading: string;
  subheading: string | null;
  dateRange: string | null;
  location: string | null;
  summary: string | null;
};

export type CandidateEducationItem = {
  heading: string;
  subheading: string | null;
  dateRange: string | null;
  summary: string | null;
};

export type CandidateLinkItem = {
  label: string;
  url: string;
};

export type FormattedJuiceboxCandidate = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  summary: string | null;
  profileHighlight: string | null;
  emails: string[];
  phones: string[];
  skills: string[];
  languages: string[];
  totalExperienceMonths: number | null;
  experience: CandidateTimelineItem[];
  education: CandidateEducationItem[];
  links: CandidateLinkItem[];
};

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

function compactStrings(values: Array<string | null | undefined>): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function formatDate(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalized;
  }

  return MONTH_YEAR_FORMATTER.format(parsedDate);
}

function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string | null {
  const startLabel = formatDate(startDate);
  const endLabel = formatDate(endDate);

  if (!startLabel && !endLabel) {
    return null;
  }

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  if (startLabel) {
    return `${startLabel} - Present`;
  }

  return endLabel;
}

function formatName(candidate: JuiceboxCandidate): string {
  const fullName = candidate.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const builtName = compactStrings([candidate.first_name, candidate.last_name]).join(" ");
  if (builtName) {
    return builtName;
  }

  return candidate.id;
}

function formatHeadline(candidate: JuiceboxCandidate): string | null {
  const title = candidate.job_title?.trim();
  const company = candidate.job_company_name?.trim();

  if (title && company) {
    return `${title} at ${company}`;
  }

  return title ?? company ?? null;
}

function formatLocation(candidate: JuiceboxCandidate): string | null {
  const locationParts = compactStrings([
    candidate.location_name,
    candidate.location_locality,
    candidate.location_country,
  ]);

  if (locationParts.length === 0) {
    return null;
  }

  return locationParts.join(", ");
}

function formatLanguage(language: LanguageItem): string | null {
  const name = language.name?.trim();
  if (!name) {
    return null;
  }

  if (language.proficiency === null || language.proficiency === undefined) {
    return name;
  }

  const proficiency = String(language.proficiency).trim();
  if (!proficiency) {
    return name;
  }

  return `${name} (${proficiency})`;
}

function formatExperienceItem(item: ExperienceItem): CandidateTimelineItem | null {
  const titleName = compactStrings([
    item.role_title,
    item.title?.name,
    item.title?.role,
    item.title?.sub_role,
  ])[0];
  const companyName = item.company?.name?.trim() || item.company_name?.trim() || null;
  const heading = titleName ?? companyName;

  if (!heading) {
    return null;
  }

  const subheading = titleName && companyName ? companyName : null;
  const location = compactStrings(item.location_names ?? []).join(", ") || null;

  return {
    heading,
    subheading,
    dateRange: formatDateRange(item.start_date, item.end_date),
    location,
    summary: item.summary?.trim() || item.description?.trim() || null,
  };
}

function formatEducationItem(item: EducationItem): CandidateEducationItem | null {
  const schoolName = item.school?.name?.trim() || item.institution_name?.trim() || null;
  const degreeValues = item.degrees ?? (item.degree ? [item.degree] : []);
  const majorValues = item.majors ?? (item.field_of_study ? [item.field_of_study] : []);
  const degree = compactStrings(degreeValues).join(", ") || null;
  const major = compactStrings(majorValues).join(", ") || null;
  const heading = schoolName ?? degree ?? major;

  if (!heading) {
    return null;
  }

  const detailParts = compactStrings([degree, major]);
  const subheading = schoolName && detailParts.length > 0 ? detailParts.join(" | ") : null;

  return {
    heading,
    subheading,
    dateRange: formatDateRange(item.start_date, item.end_date),
    summary: item.summary?.trim() || item.description?.trim() || null,
  };
}

function isUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function formatLinks(candidate: JuiceboxCandidate): CandidateLinkItem[] {
  const output: CandidateLinkItem[] = [];
  const seen = new Set<string>();

  const pushLink = (label: string, rawUrl: string | null | undefined): void => {
    const normalized = rawUrl?.trim();
    if (!normalized || seen.has(normalized) || !isUrl(normalized)) {
      return;
    }

    seen.add(normalized);
    output.push({ label, url: normalized });
  };

  for (const profile of [...(candidate.profiles ?? []), ...(candidate.network_profiles ?? [])]) {
    const label = profile.network?.trim() || "Profile";
    pushLink(label, profile.url);
  }

  pushLink("LinkedIn", candidate.linkedin_url);
  pushLink("GitHub", candidate.github_url);

  return output;
}

export function formatJuiceboxCandidate(
  candidate: JuiceboxCandidate
): FormattedJuiceboxCandidate {
  const emails = compactStrings([
    candidate.work_email,
    candidate.recommended_personal_email,
    ...compactStrings(candidate.personal_emails ?? []),
    ...compactStrings(candidate.manualEmails ?? []),
    ...compactStrings(candidate.supplemented_emails ?? []),
  ]);

  const phones = compactStrings([
    candidate.mobile_phone,
    candidate.supplemented_phone_number,
    ...compactStrings(candidate.phone_numbers ?? []),
    ...compactStrings(candidate.manualPhoneNumbers ?? []),
  ]);

  const skills = compactStrings([
    ...compactStrings(candidate.ai_skills ?? []),
    ...compactStrings(candidate.sd_skills ?? []),
    ...compactStrings(candidate.skills ?? []),
  ]);

  const languages = compactStrings(
    (candidate.languages ?? [])
      .map((language) => formatLanguage(language))
      .filter((value): value is string => value !== null)
  );

  const experience = (candidate.experience ?? candidate.experiences ?? [])
    .map((item) => formatExperienceItem(item))
    .filter((item): item is CandidateTimelineItem => item !== null);

  const education = (candidate.education ?? [])
    .map((item) => formatEducationItem(item))
    .filter((item): item is CandidateEducationItem => item !== null);

  return {
    id: candidate.id,
    name: formatName(candidate),
    headline: formatHeadline(candidate),
    location: formatLocation(candidate),
    summary: candidate.summary?.trim() || null,
    profileHighlight: candidate.profileHighlight?.trim() || null,
    emails,
    phones,
    skills,
    languages,
    totalExperienceMonths: candidate.total_experience_months ?? null,
    experience,
    education,
    links: formatLinks(candidate),
  };
}
