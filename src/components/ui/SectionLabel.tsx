
const INK = "#152238";

interface SectionLabelProps {
  eyebrow?: string;
  title: string;
}

export function SectionLabel({ eyebrow, title }: SectionLabelProps) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="text-[11px] tracking-[0.18em] uppercase text-[#8C6A2F] font-semibold mb-1">
          {eyebrow}
        </div>
      )}
      <h2 className="font-serif text-xl text-[#152238]" style={{ color: INK }}>
        {title}
      </h2>
    </div>
  );
}
