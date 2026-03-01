import type { ProxyCountryCode, SessionSettings } from "browser-use-sdk";
import { z } from "zod";

const ProxyCountryCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}$/);

type BuildLinkedinSessionSettingsInput = {
  profileId?: string;
  proxyCountryCode?: string;
};

export const buildLinkedinSessionSettings = (
  input: BuildLinkedinSessionSettingsInput,
): SessionSettings | undefined => {
  const profileId = input.profileId?.trim();
  const proxyCountryCode = input.proxyCountryCode?.trim();

  if (!profileId && !proxyCountryCode) {
    return undefined;
  }

  const sessionSettings: SessionSettings = {};

  if (profileId) {
    sessionSettings.profileId = profileId;
  }

  if (proxyCountryCode) {
    sessionSettings.proxyCountryCode = ProxyCountryCodeSchema.parse(
      proxyCountryCode,
    ) as ProxyCountryCode;
  }

  return sessionSettings;
};
