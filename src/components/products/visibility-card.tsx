"use client";

/** "Wool rug visible to agents" card: a real switch that pauses/unpauses a product. */
export function VisibilityCard({
  label,
  hint,
  checked,
  onToggle,
  ariaLabel,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="card flex items-center gap-3 rounded-[20px] px-4 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="text-sm font-medium">{label}</div>
        <div className="mono" aria-live="polite">
          {hint}
        </div>
      </div>
      <button className="sw" type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} onClick={onToggle} />
    </div>
  );
}
