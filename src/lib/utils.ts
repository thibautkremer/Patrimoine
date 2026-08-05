export const eur0 = (n: number | string | unknown) => {
  const num = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : NaN;
  return isFinite(num)
    ? num.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      })
    : "—";
};

export const eur2 = (n: number | string | unknown) => {
  const num = typeof n === "string" ? parseFloat(n) : typeof n === "number" ? n : NaN;
  return isFinite(num)
    ? num.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      })
    : "—";
};

export const pct1 = (n: number) => (isFinite(n) ? (n * 100).toFixed(1) + " %" : "—");
export const num1 = (n: number) => (isFinite(n) ? n.toFixed(1) : "—");
export const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
