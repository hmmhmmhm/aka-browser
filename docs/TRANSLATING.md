# Translating aka-browser

aka-browser keeps user-interface strings in JSON-like TypeScript resources at:

- `apps/browser/src/renderer/i18n/translations.ts`

## Add Or Update A Language

1. Add the language code to `apps/browser/src/shared/language.ts`.
2. Add every translation key to `translations.ts`.
3. Add the language to the Settings language list.
4. Run `pnpm check-types` and `pnpm build`.

English names should stay visible in the language picker so users can identify
languages even when they cannot read the native name yet.
