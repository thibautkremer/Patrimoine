import { Info } from "lucide-react";

const INK = "#152238";
const LINE = "#E1DCCC";

interface ThProps {
  children: React.ReactNode;
  right?: boolean;
  hint?: string;
}

export function Th({ children, right, hint }: ThProps) {
  return (
    <th
      className={`text-[10.5px] uppercase tracking-wide font-semibold text-[#6b7280] py-2 px-2 ${
        right ? "text-right" : "text-left"
      }`}
    >
      <div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {children}
        {hint && (
          <span title={hint}>
            <Info size={10} className="text-[#a39a83] opacity-60" />
          </span>
        )}
      </div>
    </th>
  );
}

interface TdProps {
  children: React.ReactNode;
  right?: boolean;
  bold?: boolean;
}

export function Td({ children, right, bold }: TdProps) {
  return (
    <td
      className={`py-1.5 px-2 text-[12.5px] tabular-nums ${right ? "text-right" : "text-left"} ${
        bold ? "font-semibold" : ""
      }`}
      style={{ color: INK }}
    >
      {children}
    </td>
  );
}

export { LINE };
