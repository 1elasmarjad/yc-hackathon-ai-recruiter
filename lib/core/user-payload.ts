export type CoreUserPayload = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCoreUserPayload(payload: unknown): CoreUserPayload {
  if (!isObject(payload)) {
    throw new Error("SCRAPER_USER_PAYLOAD must be a JSON object.");
  }

  return payload;
}
