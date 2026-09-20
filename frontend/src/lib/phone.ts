/**
 * Phone normalization to E.164.
 *
 * Egyptian users type local numbers (`01xxxxxxxxx`) while the backend
 * requires E.164 (`+201xxxxxxxxx`). This helper accepts both plus common
 * variants (spaces, dashes, `0020` prefix, Arabic-Indic digits) and returns
 * the canonical E.164 form, or `null` when the input is not a valid number.
 */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const E164_RE = /^\+[1-9]\d{7,14}$/;

/** Egyptian mobile prefixes after the country code (010/011/012/015). */
const EG_MOBILE_RE = /^\+20(10|11|12|15)\d{8}$/;

function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * Normalize a user-typed phone number to E.164.
 * @param raw free-form input, e.g. `01012345678`, `+201012345678`, `00201012345678`
 * @param defaultCountryCode country code assumed for local numbers (default Egypt `20`)
 * @returns E.164 string like `+201012345678`, or `null` if invalid.
 */
export function normalizePhoneToE164(raw: string, defaultCountryCode = "20"): string | null {
  if (!raw) return null;
  let s = toAsciiDigits(raw).trim().replace(/[\s\-().]/g, "");
  if (!s) return null;

  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    return E164_RE.test(s) ? s : null;
  }
  // Local format: strip trunk zero, prepend country code.
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  const withoutTrunk = digits.startsWith("0") ? digits.slice(1) : digits;
  const candidate = `+${defaultCountryCode}${withoutTrunk}`;
  return E164_RE.test(candidate) ? candidate : null;
}

/** Strict check for Egyptian mobile numbers in E.164 form. */
export function isValidEgyptMobileE164(value: string): boolean {
  return EG_MOBILE_RE.test(value);
}
