import { app } from "electron";
import fs from "fs";
import path from "path";
import {
  EffectiveLanguage,
  LanguageState,
  PreferredLanguage,
  isPreferredLanguage,
  resolveEffectiveLanguage,
} from "../shared/language";

interface StoredPreferences {
  preferredLanguage?: PreferredLanguage;
}

export class LanguageManager {
  private preferencesPath: string;
  private preferredLanguage: PreferredLanguage;
  private systemLanguage: EffectiveLanguage;

  constructor() {
    this.preferencesPath = path.join(app.getPath("userData"), "preferences.json");
    this.systemLanguage = resolveEffectiveLanguage("system", getSystemLocale());
    this.preferredLanguage = this.loadPreferredLanguage();
  }

  getState(): LanguageState {
    return {
      effectiveLanguage: resolveEffectiveLanguage(
        this.preferredLanguage,
        this.systemLanguage
      ),
      preferredLanguage: this.preferredLanguage,
      systemLanguage: this.systemLanguage,
    };
  }

  setPreferredLanguage(language: unknown): LanguageState {
    if (!isPreferredLanguage(language)) {
      throw new Error("Unsupported language");
    }

    this.preferredLanguage = language;
    this.savePreferences({ preferredLanguage: language });
    return this.getState();
  }

  private loadPreferredLanguage(): PreferredLanguage {
    try {
      if (!fs.existsSync(this.preferencesPath)) return "system";

      const preferences = JSON.parse(
        fs.readFileSync(this.preferencesPath, "utf8")
      ) as StoredPreferences;

      return isPreferredLanguage(preferences.preferredLanguage)
        ? preferences.preferredLanguage
        : "system";
    } catch {
      return "system";
    }
  }

  private savePreferences(preferences: StoredPreferences): void {
    const directory = path.dirname(this.preferencesPath);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(this.preferencesPath, JSON.stringify(preferences, null, 2));
  }
}

function getSystemLocale(): string {
  return Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
}
