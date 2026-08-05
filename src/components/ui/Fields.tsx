import { Info } from "lucide-react";

const LINE = "#E1DCCC";

interface NumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
}

export function NumField({ label, value, onChange, step = 1, suffix, hint }: NumFieldProps) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1 flex items-center gap-1">
        {label}
        {hint && (
          <span title={hint}>
            <Info size={11} className="text-[#a39a83]" />
          </span>
        )}
      </div>
      <div
        className="flex items-center border rounded-sm bg-[#FBFAF7]"
        style={{ borderColor: LINE }}
      >
        <input
          type="number"
          step={step}
          value={isNaN(value) ? "" : value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) ? 0 : v);
          }}
          className="w-full px-2 py-1.5 bg-transparent outline-none text-[13px] tabular-nums"
        />
        {suffix && <span className="pr-2 text-[12px] text-[#8b8577]">{suffix}</span>}
      </div>
    </label>
  );
}

interface PctFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}

export function PctField({ label, value, onChange, hint }: PctFieldProps) {
  return (
    <NumField
      label={label}
      value={+(value * 100).toFixed(3)}
      onChange={(v) => onChange((isNaN(v) ? 0 : v) / 100)}
      step={0.1}
      suffix="%"
      hint={hint}
    />
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1">{label}</div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px]"
        style={{ borderColor: LINE }}
      />
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px]"
        style={{ borderColor: LINE }}
      />
    </label>
  );
}
