const suspiciousEncodingPattern = /[\uFFFD\u00D8\u00D9\u00C3\u00C2\u00E2]/u;
const arabicPattern = /[\u0600-\u06FF]/u;

/** Repair legacy UTF-8 text that was decoded as Latin-1 at an external-data boundary. */
export function repairMojibake(value: string): string {
  let repaired = value;

  // Some legacy values were decoded more than once, so a single pass can
  // still leave a visible mojibake string in the UI.
  for (let attempt = 0; attempt < 3 && suspiciousEncodingPattern.test(repaired); attempt += 1) {
    const codePoints = Array.from(repaired, (character) => character.codePointAt(0) ?? 0);
    if (codePoints.some((codePoint) => codePoint > 0xff)) break;

    const candidate = new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(codePoints));
    if (candidate === repaired || !arabicPattern.test(candidate)) break;
    repaired = candidate;
  }

  return repaired;
}
