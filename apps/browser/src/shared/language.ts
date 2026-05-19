export type PreferredLanguage = "system" | "en" | "ko";
export type EffectiveLanguage = "en" | "ko";

export interface LanguageOption {
  code: PreferredLanguage;
  englishName: string;
  nativeName: string;
}

export interface LanguageState {
  effectiveLanguage: EffectiveLanguage;
  preferredLanguage: PreferredLanguage;
  systemLanguage: EffectiveLanguage;
}

export const languageOptions: LanguageOption[] = [
  { code: "system", englishName: "System Default", nativeName: "System Default" },
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
];

export function resolveEffectiveLanguage(
  preferredLanguage: PreferredLanguage,
  systemLocale: string
): EffectiveLanguage {
  if (preferredLanguage === "en" || preferredLanguage === "ko") {
    return preferredLanguage;
  }

  return systemLocale.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function toChromiumLocale(language: EffectiveLanguage): string {
  return language === "ko" ? "ko-KR" : "en-US";
}

export function toAcceptLanguage(language: EffectiveLanguage): string {
  return language === "ko" ? "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" : "en-US,en;q=0.9";
}

export function isPreferredLanguage(value: unknown): value is PreferredLanguage {
  return value === "system" || value === "en" || value === "ko";
}
