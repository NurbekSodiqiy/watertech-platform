"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/useToast";
import { useOnline } from "@/hooks/useOnline";
import { useActionError } from "@/hooks/useActionError";
import { validationText } from "@/lib/admin/validation";
import { PRODUCT_IMAGE_ACCEPT, checkImageFile, type ImageUploadResult } from "@/lib/admin/product-image";

export interface ImageUploadFieldProps {
  inputId: string;
  label: string;
  /** The row the photo belongs to, or null while it is being created — an
   * upload writes the row's `image_path`, so there has to be a row first. */
  rowId: string | null;
  /** The photo the row has now (lib/content/products.ts, productImageSrc). */
  currentSrc: string | null;
  currentAlt: string;
  /** The row version the form holds; the upload is a guarded write too. */
  getVersion: () => number | null;
  upload: (form: FormData) => Promise<ImageUploadResult>;
  onUploaded: (result: { imagePath: string; version: number }) => void;
  onBusyChange: (busy: boolean) => void;
}

/** Nothing picked, a picked file waiting for "Upload", or that file on its
 * way. `error` is the last failure, in the manager's locale. */
type UploadState =
  | { phase: "idle"; error: string | null }
  | { phase: "staged"; file: File; previewUrl: string; error: string | null }
  | { phase: "uploading"; file: File; previewUrl: string };


/** Catalog photo picker for the product editor: pick or drop a file, see it
 * before it is sent, upload it on an explicit click. The file is checked here
 * first (type, extension, 2 MB — lib/admin/product-image.ts) so a wrong file
 * never makes the round trip; the Server Action checks it again, bytes
 * included. The upload is saved at once and does not wait for the form's
 * "Save": it bumps the row version, which `onUploaded` hands back to the form. */
export function ImageUploadField({
  inputId,
  label,
  rowId,
  currentSrc,
  currentAlt,
  getVersion,
  upload,
  onUploaded,
  onBusyChange,
}: ImageUploadFieldProps) {
  const t = useTranslations("admin.image");
  const tValidation = useTranslations("admin.validation");
  const tToast = useTranslations("toast");
  const describeError = useActionError();
  const { toast } = useToast();
  const router = useRouter();
  const online = useOnline();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(currentSrc);
  const [state, setState] = useState<UploadState>({ phase: "idle", error: null });
  const [dragOver, setDragOver] = useState(false);

  // Each staged preview is an object URL; it is released when it is replaced,
  // cancelled, uploaded or the field unmounts.
  const previewUrl = state.phase === "idle" ? null : state.previewUrl;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const uploading = state.phase === "uploading";

  function stage(file: File) {
    const issue = checkImageFile(file);
    if (issue) {
      setState({ phase: "idle", error: validationText(tValidation, issue) });
      return;
    }
    setState({ phase: "staged", file, previewUrl: URL.createObjectURL(file), error: null });
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again after a cancel still fires.
    event.target.value = "";
    if (file) stage(file);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (uploading || !rowId) return;
    const file = event.dataTransfer.files[0];
    if (file) stage(file);
  }

  function onDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (uploading || !rowId) return;
    event.preventDefault();
    setDragOver(true);
  }

  async function send() {
    if (state.phase !== "staged" || !rowId) return;
    if (!online) {
      toast({ kind: "error", title: tToast("offline") });
      return;
    }
    const version = getVersion();
    if (version === null) return;

    const { file, previewUrl: stagedUrl } = state;
    const form = new FormData();
    form.set("id", rowId);
    form.set("expectedVersion", String(version));
    form.set("file", file);

    setState({ phase: "uploading", file, previewUrl: stagedUrl });
    onBusyChange(true);
    try {
      const result = await upload(form);
      if (!result.ok) {
        const { title, details, isConflict } = describeError(result);
        setState({
          phase: "staged",
          file,
          previewUrl: stagedUrl,
          error: details.length > 0 ? `${title}: ${details.join(", ")}` : title,
        });
        toast({
          kind: "error",
          title: isConflict ? tToast("conflict") : title,
          action: isConflict ? { label: tToast("refresh"), onClick: () => router.refresh() } : undefined,
        });
        return;
      }
      setCurrent(result.imageSrc);
      setState({ phase: "idle", error: null });
      onUploaded({ imagePath: result.imagePath, version: result.version });
      toast({ kind: "success", title: t("uploaded") });
    } catch {
      // A rejected action call: the network dropped, or the request was
      // refused before the action ran (the body size limit in next.config.js).
      const { title } = describeError({ ok: false, code: "unknown" });
      setState({ phase: "staged", file, previewUrl: stagedUrl, error: title });
      toast({ kind: "error", title });
    } finally {
      onBusyChange(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return t("sizeKb", { value: Math.max(1, Math.round(bytes / 1024)) });
    return t("sizeMb", { value: (bytes / (1024 * 1024)).toFixed(1) });
  }

  const shownSrc = previewUrl ?? current;
  const error = state.phase === "uploading" ? null : state.error;
  const pickLabel = current || state.phase !== "idle" ? t("replace") : t("choose");

  return (
    <div className="space-y-1.5">
      {rowId ? (
        <label className="block text-[13px] font-medium text-primary-dark" htmlFor={inputId}>
          {label}
        </label>
      ) : (
        <p className="text-[13px] font-medium text-primary-dark">{label}</p>
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-busy={uploading}
        className={`relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-surface-alt ${
          dragOver ? "border-primary" : "border-border"
        }`}
      >
        {shownSrc ? (
          <Image
            src={shownSrc}
            alt={previewUrl ? t("preview") : currentAlt}
            fill
            sizes="(min-width: 768px) 672px, 100vw"
            // An object URL exists only in this tab — there is nothing for the
            // optimizer to fetch.
            unoptimized={previewUrl !== null}
            className="object-contain p-4"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center text-text-secondary">
            <ImageOff className="h-8 w-8 opacity-50" aria-hidden="true" />
            <span className="text-[12px]">{rowId ? t("dropHint") : t("none")}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <Loader2 size={20} className="animate-spin text-primary-dark" aria-hidden="true" />
          </div>
        )}
      </div>

      <p className="text-[11px] text-text-secondary">
        {previewUrl ? t("preview") : t("current")} · {t("requirements")}
      </p>

      {rowId ? (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={PRODUCT_IMAGE_ACCEPT}
            onChange={onPick}
            disabled={uploading}
            className="sr-only"
          />
          <div className="flex flex-wrap items-center gap-2">
            {state.phase === "idle" ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
              >
                <Upload size={14} aria-hidden="true" />
                {pickLabel}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={send}
                  disabled={uploading || !online}
                  aria-busy={uploading}
                  className="inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload size={14} aria-hidden="true" />
                      {t("upload")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
                >
                  {t("replace")}
                </button>
                <button
                  type="button"
                  onClick={() => setState({ phase: "idle", error: null })}
                  disabled={uploading}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-alt disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <span className="min-w-0 truncate text-[12px] text-text-secondary">
                  {t("selected", { name: state.file.name, size: formatSize(state.file.size) })}
                </span>
              </>
            )}
          </div>
          <p role="status" aria-live="polite" className="text-[11px] text-text-secondary">
            {uploading ? t("uploading") : t("savesImmediately")}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-text-secondary">
          {t("saveFirst")}
        </p>
      )}

      {error && <p className="text-[11px] text-status-outdated">{error}</p>}
    </div>
  );
}
