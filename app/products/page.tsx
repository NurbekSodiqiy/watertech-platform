"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import manifest from "../../public/products/manifest.json";
import { Search, ImageOff, X, ZoomIn } from "lucide-react";
import { PageHeader } from "@/components/DocPageTemplate";

// Turlari va ularning yorliqlari
const CATEGORIES = [
  { id: "all", label: "Barchasi" },
  { id: "truba", label: "Trubalar" },
  { id: "fiting", label: "Fitinglar" },
  { id: "kran", label: "Kranlar" },
  { id: "aksessuar", label: "Aksessuarlar" }
];

export default function ProductsPage() {
  const [activeLine, setActiveLine] = useState<"ppr" | "kanalizatsiya">("ppr");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Xato bo'lgan rasmlarni kuzatib borish (fallback uchun)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Kattalashtirilgan rasm ko'rinishi (lightbox)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  const filteredProducts = manifest.filter((product) => {
    // 1. Line filtri
    if (product.line !== activeLine) return false;
    
    // 2. Qidiruv filtri
    if (searchQuery.trim() !== "") {
      if (!product.name_ru.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // 3. Kategoriya filtri
    if (activeCategory !== "all" && product.category !== activeCategory) {
      return false;
    }

    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products"
        title="Mahsulotlar katalogi"
        description="To'liq mahsulot bazasi. PPR va Kanalizatsiya liniyalari bo'yicha turkum, nom va o'lchamlar."
      />

      <div className="space-y-6">
        {/* Liniya Tablari */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveLine("ppr")}
            className={`px-4 py-3 font-medium transition-none text-[15px] ${
              activeLine === "ppr"
                ? "border-b-2 border-primary text-primary-dark"
                : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            PPR liniyasi
          </button>
          <button
            onClick={() => setActiveLine("kanalizatsiya")}
            className={`px-4 py-3 font-medium transition-none text-[15px] ${
              activeLine === "kanalizatsiya"
                ? "border-b-2 border-primary text-primary-dark"
                : "text-text-secondary hover:text-primary-dark"
            }`}
          >
            Kanalizatsiya liniyasi
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Qidiruv */}
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-text-secondary" />
            </div>
            <input
              type="text"
              className="w-full bg-surface border border-border text-primary-dark text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 p-2.5"
              placeholder="Mahsulot nomi bo'yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Kategoriya Chiplari */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-full border transition-none ${
                  activeCategory === cat.id
                    ? "bg-primary-light/20 border-primary text-primary-dark"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-alt hover:text-primary-dark"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid (Desktop 4, Tablet 2-3, Mobile 1) */}
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            Ushbu filtrlarga mos mahsulot topilmadi.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product, idx) => (
              <div
                key={`${product.filename}-${idx}`}
                className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
              >
                {/* Rasm qismi */}
                <button
                  type="button"
                  onClick={() =>
                    !imgErrors[product.filename] &&
                    setLightbox({ src: `/products/${product.filename}`, alt: product.name_ru })
                  }
                  disabled={imgErrors[product.filename]}
                  className="group relative h-48 w-full bg-surface-alt flex items-center justify-center p-4 border-b border-border cursor-zoom-in disabled:cursor-default"
                  aria-label={`${product.name_ru} rasmini kattalashtirish`}
                >
                  {imgErrors[product.filename] ? (
                    <div className="flex flex-col items-center justify-center text-text-secondary gap-2">
                      <ImageOff className="w-8 h-8 opacity-50" />
                      <span className="text-xs">Rasm topilmadi</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={`/products/${product.filename}`}
                        alt={product.name_ru}
                        className="object-contain w-full h-full"
                        onError={() => setImgErrors(prev => ({ ...prev, [product.filename]: true }))}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/0 group-hover:bg-primary-dark/10 transition-none">
                        <span className="rounded-full bg-surface/90 border border-border p-2 opacity-0 group-hover:opacity-100 shadow-sm">
                          <ZoomIn className="w-4 h-4 text-primary-dark" />
                        </span>
                      </div>
                    </>
                  )}
                  {/* Latun belgisi */}
                  {product.material === "latun" && (
                    <div className="absolute top-3 right-3 bg-accent/10 border border-accent/20 text-accent text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Latun
                    </div>
                  )}
                </button>

                {/* Ma'lumot qismi */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="text-[15px] font-semibold text-primary-dark leading-snug">
                    {product.name_ru}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kattalashtirilgan rasm modali */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setLightbox(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              className="relative max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-[15px] font-semibold text-primary-dark leading-snug pr-4">
                  {lightbox.alt}
                </h3>
                <button
                  onClick={() => setLightbox(null)}
                  className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-primary/10"
                  aria-label="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center justify-center bg-surface-alt p-4">
                <img
                  src={lightbox.src}
                  alt={lightbox.alt}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
