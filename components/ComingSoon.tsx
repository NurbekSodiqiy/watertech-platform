import { DrawPath } from "@/components/motion/DrawPath";

interface ComingSoonProps {
  title: string;
  description: string;
  /** What will be here — a short list under the description. */
  items?: string[];
}

// A pipe run with an open end, in the hand of the fittings glyphs: flange,
// two walls, a coupling sleeve and a bell socket with nothing joined to it yet.
const PIPE_RUN = "M8 8 V40 M8 16 H104 M8 32 H104 M40 11 H56 V37 H40 Z M96 16 V12 H108 V36 H96 V32";
// Where the run will continue.
const PIPE_TO_COME = "M118 24 H120 M126 24 H128 M134 24 H136";

export function ComingSoon({ title, description, items }: ComingSoonProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-soft">
      <svg viewBox="0 0 144 48" aria-hidden="true" className="mb-5 h-12 w-36 overflow-visible">
        <g strokeLinejoin="round">
          <DrawPath d={PIPE_RUN} className="stroke-text-secondary" />
          <DrawPath d={PIPE_TO_COME} className="stroke-accent" strokeWidth={2} />
        </g>
      </svg>
      <h2 className="mb-2 text-[20px] font-bold text-primary-dark">{title}</h2>
      <p className="text-[15px] text-text-secondary">{description}</p>
      {items && items.length > 0 && (
        <ul className="mt-4 space-y-2 text-left">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14px] leading-relaxed text-text-secondary">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
