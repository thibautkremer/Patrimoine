import { Info } from "lucide-react";

const INK = "#152238";
const LINE = "#E1DCCC";
const POSITIVE = "#2F6B4F";
const NEGATIVE = "#9B3B3B";

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "pos" | "neg";
  hint?: string;
}

export function Kpi({ label, value, sub, tone, hint }: KpiProps) {
  const color = tone === "pos" ? POSITIVE : tone === "neg" ? NEGATIVE : INK;
  const displayValue = typeof value === "number" ? value.toString() : value;
  return (
    <div className="border-l pl-3 py-1 relative group" style={{ borderColor: LINE }}>
      <div className="text-[10.5px] uppercase tracking-wide text-[#6b7280] mb-1 flex items-center gap-1">
        {label}
        {hint && (
          <span title={hint}>
            <Info size={10} className="text-[#a39a83] opacity-60" />
          </span>
        )}
      </div>
      <div className="font-serif text-[19px] tabular-nums" style={{ color }}>
        {displayValue}
      </div>
      {sub && <div className="text-[11px] text-[#8b8577] mt-0.5">{sub}</div>}
    </div>
  );
}
