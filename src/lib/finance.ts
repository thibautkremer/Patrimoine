import { IR_BRACKETS_2024 } from "../App.constants";
import type {
  Params,
  Credit,
  Assurance,
  AmortizationRow,
  CombinedAmortizationRow,
  VenteCalcResult,
} from "../types";

export function calculateTaxByBrackets(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const bracket of IR_BRACKETS_2024) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
  }
  return tax;
}

export function calculateTaxLMNP(
  revenuEncaisse: number,
  interestsAnnuels: number,
  chargesAnnuelles: number,
  params: Params
): { impot: number; baseImposable: number; amortization: number } {
  if (params.regimeFiscal === "micro-bic") {
    const baseImposable = revenuEncaisse * (1 - params.abattementMicroBIC);
    const impot = baseImposable * (params.tmi + params.ps);
    return { impot: -impot, baseImposable, amortization: 0 };
  } else {
    // Régime Réel
    const amortissementBien =
      (params.prixAchat * (1 - params.valeurTerrainPct)) / params.dureeAmortissementBien;
    const amortissementMobilier = params.valeurMobilier / params.dureeAmortissementMobilier;
    const totalAmortization = amortissementBien + amortissementMobilier;

    // Base imposable = Revenus - Charges - Intérêts - Amortissements
    // Note: Les amortissements ne peuvent pas créer un déficit, ils sont reportables.
    const chargesEtInterets = chargesAnnuelles + interestsAnnuels;
    const resultAvantAmort = revenuEncaisse - chargesEtInterets;

    let baseImposable = 0;

    if (resultAvantAmort > 0) {
      const amortizationUsed = Math.min(resultAvantAmort, totalAmortization);
      baseImposable = resultAvantAmort - amortizationUsed;
    }


    const impot = baseImposable * (params.tmi + params.ps);
    return { impot: -impot, baseImposable, amortization: totalAmortization };
  }
}

export function addMonths(date: Date, n: number): Date {

  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

export function buildAmortization(credit: Credit): AmortizationRow[] {
  const { capital, dateDebut, taux, dureeMois, mensualite, differeMois = 0, dateFin = null } = credit;
  const rows: AmortizationRow[] = [];
  let crd = capital;
  const start = new Date(dateDebut + "T00:00:00");
  const endDate = dateFin ? new Date(dateFin + "T00:00:00") : null;

  let totalIndex = 0;

  // 1. Phase de différé (intérêts intercalaires)
  for (let i = 0; i < differeMois; i++) {
    const date = addMonths(start, totalIndex);
    if (endDate && date > endDate) break;
    const interet = crd * (taux / 12);
    const capAmorti = 0;
    const crdFin = crd;
    rows.push({
      n: totalIndex + 1,
      date,
      crdDebut: crd,
      interet,
      capAmorti,
      crdFin,
      mensualiteTotale: interet,
      isDiffere: true,
    });
    totalIndex++;
  }

  // 2. Phase d'amortissement
  for (let i = 0; i < dureeMois; i++) {
    const date = addMonths(start, totalIndex);
    if (endDate && date > endDate) break;
    const interet = crd * (taux / 12);
    // Plancher à 0 pour éviter l'amortissement négatif
    const capAmorti = Math.max(0, Math.min(mensualite - interet, crd));
    const crdFin = Math.max(0, crd - capAmorti);
    rows.push({
      n: totalIndex + 1,
      date,
      crdDebut: crd,
      interet,
      capAmorti,
      crdFin,
      mensualiteTotale: mensualite,
      isDiffere: false,
    });
    crd = crdFin;
    totalIndex++;
    if (crd <= 0) break;
  }

  return rows;
}

export function combineAmortizations(
  credits: Credit[],
  allAssurances: Assurance[]
): CombinedAmortizationRow[] {
  if (!credits.length) return [];

  const individualAmorts = credits.map((c) => ({
    id: c.id,
    refinances: c.refinancesCreditId,
    rows: buildAmortization(c),
  }));

  const map = new Map<string, CombinedAmortizationRow>();

  individualAmorts.forEach((amort) => {
    amort.rows.forEach((row) => {
      const k = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(k)) {
        map.set(k, {
          n: 0,
          date: row.date,
          crdDebut: row.crdDebut,
          interet: row.interet,
          capAmorti: row.capAmorti,
          crdFin: row.crdFin,
          assurance: 0,
          mensualiteTotale: row.mensualiteTotale,
          credits: 1,
          isDiffere: row.isDiffere,
        });
      } else {
        const existing = map.get(k)!;
        existing.interet += row.interet;
        existing.capAmorti += row.capAmorti;
        existing.mensualiteTotale += row.mensualiteTotale;

        // Logic check: is this loan a replacement of an already processed loan?
        // If loan B refinances loan A, we take the successor's CRD.
        // If they are just two parallel loans (e.g., PTZ + Main), we sum them.
        const isRefinance = individualAmorts.some(
          (other) => other.refinances === amort.id || amort.refinances === other.id
        );

        if (isRefinance) {
          existing.crdDebut = Math.max(existing.crdDebut, row.crdDebut);
          existing.crdFin = Math.max(existing.crdFin, row.crdFin);
        } else {
          existing.crdDebut += row.crdDebut;
          existing.crdFin += row.crdFin;
        }
        existing.credits += 1;
      }
    });
  });


  allAssurances.forEach((assur) => {
    map.forEach((data, k) => {
      const d = new Date(k + "-01T00:00:00");
      const dStart = new Date(assur.dateDebut + "T00:00:00");
      const dEnd = assur.dateFin ? new Date(assur.dateFin + "T00:00:00") : new Date(2100, 0, 1);
      if (d >= dStart && d <= dEnd) {
        data.assurance += assur.primeMensuelle;
        data.mensualiteTotale += assur.primeMensuelle;
      }
    });
  });

  return Array.from(map.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((v, i) => ({ ...v, n: i + 1 }));
}

export function crdAt(amort: CombinedAmortizationRow[], date: Date): number {
  if (!amort.length) return 0;
  if (date < amort[0].date) return amort[0].crdDebut;
  let res = 0;
  for (const row of amort) {
    if (row.date <= date) res = row.crdFin;
    else break;
  }
  return res;
}

export function bareme(years: number): { ir: number; ps: number } {
  let ir = 0,
    ps = 0;
  const Y = Math.min(Math.floor(years), 30);
  for (let y = 1; y <= Y; y++) {
    if (y < 6) continue;
    else if (y <= 21) {
      ir += 0.06;
      ps += 0.0165;
    } else if (y === 22) {
      ir += 0.04;
      ps += 0.016;
    } else {
      ps += 0.09;
    }
  }
  return { ir: Math.min(ir, 1), ps: Math.min(ps, 1) };
}

export interface VenteCalcParams {
  prixVenteVal: number;
  dateVenteVal: Date;
  params: Params;
  amort: CombinedAmortizationRow[];
}

export function venteCalc({
  prixVenteVal,
  dateVenteVal,
  params,
  amort,
}: VenteCalcParams): VenteCalcResult {
  const dureeDetention =
    (dateVenteVal.getTime() - new Date(params.dateAcquisition).getTime()) / (365.25 * 86400000);
  const { ir: abIR, ps: psBareme } = bareme(dureeDetention);
  const crd = crdAt(amort, dateVenteVal);

  const fraisAcquisitionForfait = params.prixAchat * 0.075;
  const travauxForfait = dureeDetention >= 5 ? params.prixAchat * 0.15 : 0;
  const prixAchatCorrige = params.prixAchat + fraisAcquisitionForfait + travauxForfait;

  const pvBrute = prixVenteVal - prixAchatCorrige;
  const fraisAgence = -prixVenteVal * params.fraisAgenceVente;
  const fraisDivers = -params.fraisDiversVente;
  const pvImpIR = Math.max(0, pvBrute * (1 - abIR));
  const pvImpPS = Math.max(0, pvBrute * (1 - psBareme));
  const impot = -(pvImpIR * 0.19 + pvImpPS * params.ps);
  const pvNette = pvBrute + impot;
  const argentRecupere = prixVenteVal + fraisAgence + fraisDivers - crd;
  const capitalDispo = argentRecupere + impot;

  return {
    dureeDetention,
    abIR,
    abPS: psBareme,
    crd,
    pvBrute,
    fraisAgence,
    fraisDivers,
    pvImpIR,
    pvImpPS,
    impot,
    pvNette,
    argentRecupere,
    capitalDispo,
  };
}

export function irr(flows: number[], guess = 0.1): number {
  let rate = guess;
  for (let i = 0; i < 200; i++) {
    let npv = 0,
      dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      npv += flows[t] / Math.pow(1 + rate, t);
      dnpv += (-t * flows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-9) break;
    const next = rate - npv / dnpv;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-8) {
      rate = next;
      break;
    }
    rate = next;
  }
  return isFinite(rate) && Math.abs(rate) < 5 ? rate : NaN;
}

export function npvExcel(rate: number, flows: number[]): number {
  let v = flows[0];
  for (let t = 1; t < flows.length; t++) v += flows[t] / Math.pow(1 + rate, t);
  return v;
}
