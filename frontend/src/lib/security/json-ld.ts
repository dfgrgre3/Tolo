/**
 * Safe JSON-LD serialization for `dangerouslySetInnerHTML` script blocks.
 *
 * `JSON.stringify()` alone is NOT safe inside `<script>`: it leaves `<`, `>`,
 * `&`, and U+2028/U+2029 verbatim, so a single `</script>` sequence in any
 * value (site config today, CMS content tomorrow) terminates the block and
 * turns the rest of the payload into executable HTML/JS.
 *
 * Escaping to \uXXXX sequences keeps the JSON byte-identical after
 * `JSON.parse` (consumers see the original characters) while making block
 * breakout impossible: `<` can never appear literally in the output.
 */
export function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
