import { browser } from "wxt/browser";

/**
 * Get translated message with optional substitutions
 * @param key - Message key from messages.json
 * @param substitutions - Optional array of substitution strings
 * @returns Translated message or key if not found
 */
export function t(key: string, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key as any, substitutions) || key;
}

/**
 * Get current UI locale (e.g., "en", "zh", "ko", "de")
 */
export function getCurrentLocale(): string {
  return browser.i18n.getUILanguage();
}

/**
 * Check if current locale matches a specific language
 */
export function isLocale(locale: string): boolean {
  return getCurrentLocale().startsWith(locale);
}
