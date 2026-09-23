// Leading bytes of each format — enough for lib/admin/product-image.ts's
// sniffer, not decodable images. Shared by the validation and the upload
// action tests.

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

function pad(head: number[], length = 64): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(Math.max(length, head.length));
  bytes.set(head);
  return bytes;
}

export const JPEG_BYTES = pad([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...ascii("JFIF")]);
export const PNG_BYTES = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const WEBP_BYTES = pad([...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBPVP8 ")]);
/** ftyp box of 28 bytes: major brand avif, compatible avif/mif1/miaf. */
export const AVIF_BYTES = pad([0x00, 0x00, 0x00, 0x1c, ...ascii("ftypavif"), 0, 0, 0, 0, ...ascii("avifmif1miaf")]);
/** Major brand mif1; `avif` only among the compatible brands. */
export const AVIF_COMPATIBLE_BYTES = pad([
  0x00, 0x00, 0x00, 0x20, ...ascii("ftypmif1"), 0, 0, 0, 0, ...ascii("mif1miafavifMA1B"),
]);
export const HEIC_BYTES = pad([0x00, 0x00, 0x00, 0x18, ...ascii("ftypheic"), 0, 0, 0, 0, ...ascii("mif1heic")]);
export const GIF_BYTES = pad(ascii("GIF89a"));
export const HTML_BYTES = pad(ascii("<!doctype html><script>alert(1)</script>"));
export const SVG_BYTES = pad(ascii('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'));
