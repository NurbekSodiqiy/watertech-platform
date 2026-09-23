/** Verbatim port of the former public/products/manifest.json — the image
 * files themselves stay in public/products/ (referenced by `filename`
 * below), but the catalog data itself is now a typed TS source like every
 * other lib/content/ file, instead of a JSON import into a Client
 * Component. */
export interface Product {
  /** Stable slug — the filename without its extension. Primary key once
   * this catalog lives in content_products; telemetry doesn't reference
   * products today, but keep it stable regardless. */
  id: string;
  /** Legacy photo: a file in public/products/. Every seeded product has one;
   * a product created in the admin usually does not, and uses `image_path`. */
  filename?: string;
  /** Photo uploaded from /admin/products: the object key inside the
   * `product-images` Storage bucket (`products/<id>/<sha256-8>.<ext>`). Wins
   * over `filename` when both are set — see productImageSrc. */
  image_path?: string;
  name_ru: string;
  /** Optional Uzbek override — product names are Russian by default (see
   * CLAUDE.md section 1); this is the one field where uz is the addition
   * and ru is the fallback. lib/content/loader.ts's getProducts resolves it
   * into name_ru for locale "uz" and never returns it alongside. */
  name_uz?: string;
  sizes: string[];
  line: "ppr" | "kanalizatsiya";
  category: "truba" | "fiting" | "kran" | "aksessuar";
  material?: "latun";
}

/** Storage bucket for uploaded catalog photos (0018_product_images.sql). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Path of a public object in PRODUCT_IMAGES_BUCKET, relative to the Supabase
 * project URL. Public buckets are served from this endpoint without RLS — the
 * same prefix the CSP img-src (lib/security/csp.ts), next.config.js
 * images.remotePatterns and the service worker's product-images cache
 * (lib/pwa/sw-routes.ts) are keyed on. */
export const PRODUCT_IMAGES_PUBLIC_PATH = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;

/** Public URL of one uploaded photo. `supabaseUrl` is NEXT_PUBLIC_SUPABASE_URL
 * (clientEnv in lib/env.ts), passed in rather than imported so this module
 * stays free of env parsing — the seed CLI and the unit tests import it too. */
export function productStorageUrl(imagePath: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const key = imagePath.split("/").map(encodeURIComponent).join("/");
  return `${base}${PRODUCT_IMAGES_PUBLIC_PATH}${key}`;
}

/** The one place that decides which file a product's photo is: the uploaded
 * object when there is one, else the legacy file in public/products, else
 * null (the catalog shows its "no image" placeholder). Every consumer — the
 * catalog grid, its lightbox, the admin upload preview — goes through here. */
export function productImageSrc(
  product: Pick<Product, "filename" | "image_path">,
  supabaseUrl: string
): string | null {
  if (product.image_path) return productStorageUrl(product.image_path, supabaseUrl);
  if (product.filename) return `/products/${encodeURIComponent(product.filename)}`;
  return null;
}

type SeedProduct = Omit<Product, "id" | "filename" | "image_path"> & { filename: string };

function product(p: SeedProduct): Product {
  return { id: p.filename.replace(/\.[^.]+$/, ""), ...p };
}

// Built inside a pure IIFE so a bundle that imports only the helpers above
// (the catalog grid, the admin editor) can drop the whole array: 28 calls to
// product() are not provably side-effect free on their own.
export const products: Product[] = /* @__PURE__ */ (() => [
  product({ filename: "truba-ppr.jpg", name_ru: "Труба ППР", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "truba" }),
  product({ filename: "rakor-naruzhnoy-rezboy.jpg", name_ru: "Ракор с наружной резьбой", sizes: ["Ø20 1/2","Ø25*1/2","Ø25 3/4","Ø25 *1","Ø32 *1","Ø40*1/4","Ø50*1-1/2","Ø63 *2"], line: "ppr", category: "fiting" }),
  product({ filename: "truba-kanalizatsionnaya-premium-comfort.jpg", name_ru: "Труба канализационная тип 3х слойный PREMIUM и COMFORT", sizes: ["Ø50/250","Ø50/500","Ø50/1000","Ø50/2000","Ø50/3000"], line: "kanalizatsiya", category: "truba" }),
  product({ filename: "truba-ppr-armirovannaya-steklovoloknom.jpg", name_ru: "Труба ППР армированная стекловолокном", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "truba" }),
  product({ filename: "adapter-vnutrenney-rezboy.jpg", name_ru: "Адаптер с внутренней резьбой", sizes: ["Ø20 1/2","Ø25 1/2","Ø25 3/4","Ø32 3/4","Ø32*1","Ø40*1/4","Ø50*1-1/2","Ø63*2"], line: "ppr", category: "fiting" }),
  product({ filename: "truba-kanalizatsionnaya-premium-luxury.jpg", name_ru: "Труба канализационная тип 3х слойный PREMIUM и LUXURY", sizes: ["Ø50/250","Ø50/500","Ø50/1000","Ø50/2000","Ø50/3000"], line: "kanalizatsiya", category: "truba" }),
  product({ filename: "perehodnik-ppr.jpg", name_ru: "Переходник", sizes: ["Ø25/20","Ø32/20","Ø32/25","Ø40/20","Ø40/32","Ø50/20","Ø50/25","Ø50/32","Ø50/40","Ø63/40","Ø63/50"], line: "ppr", category: "fiting" }),
  product({ filename: "adapter-naruzhnoy-rezboy.jpg", name_ru: "Адаптер с наружной резьбой", sizes: ["Ø20,5","Ø25,5","Ø25,75","Ø32.75","Ø32 *1","Ø40*1/4","Ø50*1-1/2","Ø63*2"], line: "ppr", category: "fiting" }),
  product({ filename: "mufta.jpg", name_ru: "Муфта", sizes: ["Ø50","Ø75","Ø110","Ø160"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "poluotvod-45-ppr.jpg", name_ru: "Полуотвод 45 градусов", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "fiting" }),
  product({ filename: "otvod-vneshney-rezboy.jpg", name_ru: "Отвод с внешней резьбой", sizes: [], line: "ppr", category: "fiting" }),
  product({ filename: "perehodnik-kanalizatsiya.jpg", name_ru: "Переходник", sizes: ["Ø75x50","Ø110x50","Ø110x75","Ø160x110"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "otvod-90.jpg", name_ru: "Отвод 90 градусов", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "fiting" }),
  product({ filename: "vintel-ppr.jpg", name_ru: "Винтель ППР (Кранбукса ЛАТУН поршневая)", sizes: ["Ø20","Ø25","Ø32*1","Ø32*3/4"], line: "ppr", category: "kran" }),
  product({ filename: "poluotvod-45-kanalizatsiya.jpg", name_ru: "Полуотвод 45°", sizes: ["Ø50","Ø75","Ø110","Ø160"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "troynik.jpg", name_ru: "Тройник", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "fiting" }),
  product({ filename: "ushastik-vnutrenney-rezboy.jpg", name_ru: "Ушастик с внутренней резьбой", sizes: ["Ø20","Ø25"], line: "ppr", category: "fiting" }),
  product({ filename: "troynik-45.jpg", name_ru: "Тройник 45°", sizes: ["Ø50x50","Ø75x50","Ø75x75","Ø110x50","Ø110x75","Ø110x110","Ø160x110","Ø160x160"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "latunnyy-sharovoy-kran.jpg", name_ru: "Латунный Шаровой кран", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "kran", material: "latun" }),
  product({ filename: "filtr-setchatyy.jpg", name_ru: "Фильтр сетчатый", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "aksessuar" }),
  product({ filename: "krestovina-90.jpg", name_ru: "Крестовина 90°", sizes: ["Ø50x50x50","Ø50x110x50","Ø110x110x110","Ø110x160x110"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "obvod.jpg", name_ru: "Обвод", sizes: ["Ø20","Ø25","Ø32"], line: "ppr", category: "fiting" }),
  product({ filename: "ushastik-dvoynoy-s-krep.jpg", name_ru: "Ушастик двойной с креп", sizes: ["Ø20 1/2","Ø25 1/2"], line: "ppr", category: "fiting" }),
  product({ filename: "krestovina-45.jpg", name_ru: "Крестовина 45°", sizes: ["Ø50x50x50","Ø50x110x50","Ø110x110x110","Ø110x160x110"], line: "kanalizatsiya", category: "fiting" }),
  product({ filename: "klipsa-s-brasletom.jpg", name_ru: "Клипса с браслетом", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "aksessuar" }),
  product({ filename: "sifon.jpg", name_ru: "Сифон", sizes: ["Ø100"], line: "kanalizatsiya", category: "aksessuar" }),
  product({ filename: "zaglushka-dlya-ppr-trub.jpg", name_ru: "Заглушка для ППР труб", sizes: ["Ø20","Ø25","Ø32","Ø40","Ø50","Ø63"], line: "ppr", category: "fiting" }),
  product({ filename: "reviziya.jpg", name_ru: "Ревизия", sizes: ["Ø50","Ø76","Ø100"], line: "kanalizatsiya", category: "aksessuar" }),
])();
