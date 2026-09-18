const GROUP_SEPARATOR = " ";
const DECIMAL_SEPARATOR = ",";

/**
 * Formats a number the way both UI locales write it (uz and ru: non-breaking
 * space between thousands, comma before decimals), e.g. 12500.5 → "12 500,5".
 *
 * Deliberately not Intl.NumberFormat: CountUp renders on the server and then
 * rewrites the same text node every frame in the browser, and ICU data for
 * `uz` differs between Node and browsers (some fall back to "12,500"), which
 * would be a hydration mismatch.
 */
export function formatCount(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "";
  const places = Math.max(0, Math.min(20, Math.trunc(decimals)));
  const fixed = Math.abs(value).toFixed(places);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  // No sign for values that round to zero ("-0,0").
  const sign = value < 0 && Number(fixed) !== 0 ? "-" : "";
  return fraction === undefined ? `${sign}${grouped}` : `${sign}${grouped}${DECIMAL_SEPARATOR}${fraction}`;
}
