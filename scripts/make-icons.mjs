// One-off generator for the PWA icons referenced by app/manifest.ts.
// The PNGs it writes are committed, so this only needs re-running when the
// mark itself changes. `sharp` is intentionally NOT a project dependency
// (CLAUDE.md #11 keeps the dependency list closed) — install it on demand:
//
//   npm i --no-save sharp && node scripts/make-icons.mjs
//
// The "W" is drawn as a stroked path rather than <text> so the output does
// not depend on which fonts happen to be installed on the machine running it.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// --accent (#3D5A80) and --surface (#FFFFFF) from app/globals.css. A manifest
// needs literal colors, so these are the one place the palette is repeated.
const BRAND = "#3D5A80";
const MARK = "#FFFFFF";
const SIZES = [192, 512];
const OUT_DIR = path.join(process.cwd(), "public", "icons");

/** Rounded square in the brand color with a centered white "W". Coordinates
 * are authored against a 512 viewBox and scaled per output size. */
function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" ry="112" fill="${BRAND}"/>
  <path d="M140 176 L205 336 L256 232 L307 336 L372 176"
        fill="none" stroke="${MARK}" stroke-width="34"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const png = await sharp(Buffer.from(iconSvg()))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  await writeFile(file, png);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${png.length} bytes)`);
}
