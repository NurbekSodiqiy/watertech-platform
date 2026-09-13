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
  filename: string;
  name_ru: string;
  sizes: string[];
  line: "ppr" | "kanalizatsiya";
  category: "truba" | "fiting" | "kran" | "aksessuar";
  material?: "latun";
}

function product(p: Omit<Product, "id">): Product {
  return { id: p.filename.replace(/\.[^.]+$/, ""), ...p };
}

export const products: Product[] = [
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
];
