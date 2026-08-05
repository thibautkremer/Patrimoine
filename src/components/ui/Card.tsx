
const LINE = "#E1DCCC";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={`bg-white border rounded-sm relative group/card ${className}`}
      style={{ borderColor: LINE, ...style }}
    >
      {children}
    </div>
  );
}
