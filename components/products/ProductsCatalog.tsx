"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { m, useReducedMotion } from "framer-motion";
import { Search, ImageOff, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { productImageSrc, type Product } from "@/lib/content/products";
import { clientEnv } from "@/lib/env";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/EmptyState";
import { PinButton } from "@/components/ui/PinButton";
import { useRecordRecent } from "@/hooks/useRecordRecent";
import { EMPTY_STATES } from "@/lib/empty-states";
import { noTransition, springs } from "@/lib/motion/tokens";

const LIGHTBOX_TITLE_ID = "product-lightbox-title";

/** Uploaded photo, else the legacy /products file, else null — see
 * productImageSrc. */
function imageOf(product: Product): string | null {
  return productImageSrc(product, clientEnv.NEXT_PUBLIC_SUPABASE_URL);
}

/** Sliding active mark, same pattern as Sidebar's ActivePill. Each group
 * passes its own layoutId so the line tabs and the category chips never
 * animate into one another. */
function ActiveMark({ layoutId, className }: { layoutId: string; className: string }) {
  const reduce = useReducedMotion();
  return (
    <m.span
      layoutId={layoutId}
      className={className}
      transition={reduce ? noTransition : springs.snappy}
      aria-hidden
    />
  );
}

// Category ids; the chip labels are messages under pages.products.catalog.categories.
const CATEGORY_IDS = ["all", "truba", "fiting", "kran", "aksessuar"] as const;

/** Opens the product named by `?product=<id>` (a pinned or recent product,
 * from the home page or the palette). Its own Suspense leaf so only this
 * renders on the client — the catalog itself stays in the prerendered HTML. */
function ProductParamWatcher({ onProduct }: { onProduct: (id: string) => void }) {
  const id = useSearchParams().get("product");
  useEffect(() => {
    if (id) onProduct(id);
  }, [id, onProduct]);
  return null;
}

export function ProductsCatalog({ products }: { products: Product[] }) {
  const t = useTranslations("emptyState.productsNoMatch");
  const tCatalog = useTranslations("pages.products.catalog");
  const tCommon = useTranslations("common");
  const [activeLine, setActiveLine] = useState<"ppr" | "kanalizatsiya">("ppr");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  function resetFilters() {
    setSearchQuery("");
    setActiveCategory("all");
  }

  // Xato bo'lgan rasmlarni kuzatib borish (fallback uchun), mahsulot id si bo'yicha
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Kattalashtirilgan rasm ko'rinishi (lightbox)
  const [lightbox, setLightbox] = useState<{ id: string; src: string; alt: string } | null>(null);
  useRecordRecent(lightbox ? { kind: "product", id: lightbox.id } : null);

  // <Dialog> keeps the panel mounted while it fades out, so the last opened
  // image is held here — otherwise the card would blank out mid-animation.
  const lastOpened = useRef<{ id: string; src: string; alt: string } | null>(null);
  if (lightbox) lastOpened.current = lightbox;
  const shownImage = lightbox ?? lastOpened.current;

  const openProduct = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      setActiveLine(product.line);
      const src = imageOf(product);
      if (src) setLightbox({ id: product.id, src, alt: product.name_ru });
    },
    [products]
  );

  // Drops `?product=` again so choosing the same product a second time (from
  // the palette, say) is a change the watcher can see.
  function closeLightbox() {
    setLightbox(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("product")) {
      url.searchParams.delete("product");
      window.history.replaceState(null, "", url);
    }
  }

  const filteredProducts = products.filter((product) => {
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
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ProductParamWatcher onProduct={openProduct} />
      </Suspense>

      {/* Liniya Tablari */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveLine("ppr")}
          className={`relative border-b-2 border-transparent px-4 py-3 font-medium transition-none text-[15px] ${
            activeLine === "ppr" ? "text-primary-dark" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          {activeLine === "ppr" && (
            <ActiveMark layoutId="products-line-tab" className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />
          )}
          {tCatalog("lines.ppr")}
        </button>
        <button
          onClick={() => setActiveLine("kanalizatsiya")}
          className={`relative border-b-2 border-transparent px-4 py-3 font-medium transition-none text-[15px] ${
            activeLine === "kanalizatsiya" ? "text-primary-dark" : "text-text-secondary hover:text-primary-dark"
          }`}
        >
          {activeLine === "kanalizatsiya" && (
            <ActiveMark layoutId="products-line-tab" className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />
          )}
          {tCatalog("lines.kanalizatsiya")}
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
            placeholder={tCatalog("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Kategoriya Chiplari */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`relative px-3 py-1.5 text-[13px] font-medium rounded-full border transition-none ${
                activeCategory === id
                  ? "border-transparent text-primary-dark"
                  : "bg-surface border-border text-text-secondary hover:bg-surface-alt hover:text-primary-dark"
              }`}
            >
              {activeCategory === id && (
                <ActiveMark
                  layoutId="products-category-chip"
                  className="absolute -inset-px rounded-full border border-primary bg-primary-light/20"
                />
              )}
              <span className="relative">{tCatalog(`categories.${id}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid (Desktop 4, Tablet 2-3, Mobile 1) */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={EMPTY_STATES.productsNoMatch.icon}
          title={t("title")}
          reason={t("reason")}
          action={{ label: t("cta"), onClick: resetFilters }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            // null: no photo at all, or one that failed to load.
            const src = imgErrors[product.id] ? null : imageOf(product);
            return (
              <div
                key={product.id}
                className="relative flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-sm"
              >
                {/* Rasm qismi */}
                <button
                  type="button"
                  onClick={() => src !== null && setLightbox({ id: product.id, src, alt: product.name_ru })}
                  disabled={src === null}
                  className="group relative h-48 w-full bg-surface-alt flex items-center justify-center p-4 border-b border-border cursor-zoom-in disabled:cursor-default"
                  aria-label={tCatalog("zoomLabel", { name: product.name_ru })}
                >
                  {src === null ? (
                    <div className="flex flex-col items-center justify-center text-text-secondary gap-2">
                      <ImageOff className="w-8 h-8 opacity-50" />
                      <span className="text-xs">{tCatalog("imageMissing")}</span>
                    </div>
                  ) : (
                    <>
                      <Image
                        src={src}
                        alt={product.name_ru}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-contain p-4"
                        onError={() => setImgErrors(prev => ({ ...prev, [product.id]: true }))}
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
                      {tCatalog("brass")}
                    </div>
                  )}
                </button>

                <span className="absolute left-3 top-3 rounded-lg border border-border bg-surface/90">
                  <PinButton kind="product" id={product.id} />
                </span>

                {/* Ma'lumot qismi */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="text-[15px] font-semibold text-primary-dark leading-snug">
                    {product.name_ru}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kattalashtirilgan rasm modali — Esc, fon bosilishi va fokus
          tuzog'i <Dialog> ichida. */}
      <Dialog
        open={lightbox !== null}
        onClose={closeLightbox}
        labelledBy={LIGHTBOX_TITLE_ID}
        containerClassName="z-50 flex items-center justify-center p-6"
        panelClassName="flex h-[520px] w-[640px] max-h-[85vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
      >
        {shownImage && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 id={LIGHTBOX_TITLE_ID} className="text-[15px] font-semibold text-primary-dark leading-snug pr-4">
                {shownImage.alt}
              </h3>
              <button
                type="button"
                onClick={closeLightbox}
                className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-primary/10"
                aria-label={tCommon("close")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {/* Har bir mahsulot uchun bir xil qat'iy o'lcham — rasmning
                o'zi (turlicha en-bo'y nisbatiga qaramay) shu ramka ichida
                object-contain bilan joylashadi, cho'zilmaydi/kesilmaydi. */}
            <div className="relative w-full flex-1 bg-surface-alt p-4">
              <Image
                src={shownImage.src}
                alt={shownImage.alt}
                fill
                sizes="640px"
                className="object-contain"
              />
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
