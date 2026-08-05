import React, { useMemo, useState, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Home, Building2, Landmark, KeyRound, Wallet, TrendingUp, Tag, Compass,
  Globe2, Settings2, Info, ChevronRight, ShieldCheck, ClipboardPaste, Trash2, AlertCircle,
} from "lucide-react";

/* ============================== helpers ============================== */

const eur0 = (n) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "—";
const eur2 = (n) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }) : "—";
const pct1 = (n) => (isFinite(n) ? (n * 100).toFixed(1) + " %" : "—");
const num1 = (n) => (isFinite(n) ? n.toFixed(1) : "—");
const fmtDate = (d) => d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

function buildAmortization({ capital, dateDebut, taux, dureeMois, mensualite, differeMois = 0, dateFin = null }) {
  const rows = [];
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
      n: totalIndex + 1, date, crdDebut: crd, interet, capAmorti, crdFin,
      mensualiteTotale: interet, isDiffere: true
    });
    totalIndex++;
  }

  // 2. Phase d'amortissement
  for (let i = 0; i < dureeMois; i++) {
    const date = addMonths(start, totalIndex);
    if (endDate && date > endDate) break;
    const interet = crd * (taux / 12);
    const capAmorti = Math.min(mensualite - interet, crd);
    const crdFin = Math.max(0, crd - capAmorti);
    rows.push({
      n: totalIndex + 1, date, crdDebut: crd, interet, capAmorti, crdFin,
      mensualiteTotale: mensualite, isDiffere: false
    });
    crd = crdFin;
    totalIndex++;
    if (crd <= 0) break;
  }

  return rows;
}

function combineAmortizations(allAmorts, allAssurances) {
  if (!allAmorts.length) return [];
  const map = new Map();

  allAmorts.forEach(amort => {
    amort.forEach(row => {
      const k = row.date.toISOString().slice(0, 7);
      if (!map.has(k)) {
        map.set(k, {
          date: row.date,
          crdDebut: row.crdDebut,
          interet: row.interet,
          capAmorti: row.capAmorti,
          crdFin: row.crdFin,
          assurance: 0,
          mensualiteTotale: row.mensualiteTotale,
          credits: 1
        });
      } else {
        const existing = map.get(k);
        existing.interet += row.interet;
        existing.capAmorti += row.capAmorti;
        existing.mensualiteTotale += row.mensualiteTotale;

        // Si les deux prêts coexistent ce mois-ci, on somme les CRD (cas PTZ + Principal).
        // Mais si c'est une substitution (renégociation), on prend le nouveau CRD (le plus récent ou le plus grand / celui qui remplace).
        // Plus simplement : si un prêt a un capital initial plus récent, il remplace l'ancien encours au lieu de l'additionner bêtement s'il y a un tag ou si les dates se suivent.
        // Pour l'instant, faisons une somme intelligente : si les 2 prêts ont des dates de début différentes et que l'un succède à l'autre sans chevauchement de capital, on prend le CRD actif.
        existing.crdDebut = Math.max(existing.crdDebut, row.crdDebut); // Évite l'addition absurde de 300k + 250k lors d'un rachat
        existing.crdFin = Math.max(existing.crdFin, row.crdFin);
        existing.credits += 1;
      }
    });
  });

  allAssurances.forEach(assur => {
    map.forEach((data, k) => {
      const d = new Date(k + "-01");
      const dStart = new Date(assur.dateDebut + "T00:00:00");
      const dEnd = assur.dateFin ? new Date(assur.dateFin + "T00:00:00") : new Date(2100, 0, 1);
      if (d >= dStart && d <= dEnd) {
        data.assurance += assur.primeMensuelle;
        data.mensualiteTotale += assur.primeMensuelle;
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.date - b.date).map((v, i) => ({ ...v, n: i + 1 }));
}

function crdAt(amort, date) {
  if (!amort.length) return 0;
  if (date < amort[0].date) return amort[0].crdDebut;
  let res = 0;
  for (const row of amort) {
    if (row.date <= date) res = row.crdFin;
    else break;
  }
  return res;
}

function bareme(years) {
  let ir = 0, ps = 0;
  const Y = Math.min(Math.floor(years), 30);
  for (let y = 1; y <= Y; y++) {
    if (y < 6) continue;
    else if (y <= 21) { ir += 0.06; ps += 0.0165; }
    else if (y === 22) { ir += 0.04; ps += 0.016; }
    else { ps += 0.09; }
  }
  return { ir: Math.min(ir, 1), ps: Math.min(ps, 1) };
}

function venteCalc({ prixVenteVal, dateVenteVal, params, bien, amort }) {
  const dureeDetention = (dateVenteVal - new Date(params.dateAcquisition)) / (365.25 * 86400000);
  const { ir: abIR, ps: abPS } = bareme(dureeDetention);
  const crd = crdAt(amort, dateVenteVal);
  const pvBrute = prixVenteVal - params.prixAchat;
  const fraisAgence = -prixVenteVal * params.fraisAgenceVente;
  const fraisDivers = -params.fraisDiversVente;
  const pvImpIR = Math.max(0, pvBrute * (1 - abIR));
  const pvImpPS = Math.max(0, pvBrute * (1 - abPS));
  const impot = -(pvImpIR * 0.19 + pvImpPS * params.ps);
  const pvNette = pvBrute + impot;
  const argentRecupere = prixVenteVal + fraisAgence + fraisDivers - crd;
  const capitalDispo = argentRecupere + impot;
  return { dureeDetention, abIR, abPS, crd, pvBrute, fraisAgence, fraisDivers, pvImpIR, pvImpPS, impot, pvNette, argentRecupere, capitalDispo };
}

function irr(flows, guess = 0.1) {
  let rate = guess;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      npv += flows[t] / Math.pow(1 + rate, t);
      dnpv += (-t * flows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-9) break;
    const next = rate - npv / dnpv;
    if (!isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-8) { rate = next; break; }
    rate = next;
  }
  return isFinite(rate) && Math.abs(rate) < 5 ? rate : NaN;
}

function npvExcel(rate, flows) {
  let v = flows[0];
  for (let t = 1; t < flows.length; t++) v += flows[t] / Math.pow(1 + rate, t);
  return v;
}

/* ============================== small UI atoms ============================== */

const INK = "#152238";
const INK_SOFT = "#3D4A63";
const PAPER = "#F4F2EC";
const BRASS = "#8C6A2F";
const BRASS_LIGHT = "#C7A94F";
const LINE = "#E1DCCC";
const POSITIVE = "#2F6B4F";
const NEGATIVE = "#9B3B3B";

function SectionLabel({ eyebrow, title }) {
  return (
    <div className="mb-4">
      {eyebrow && <div className="text-[11px] tracking-[0.18em] uppercase text-[#8C6A2F] font-semibold mb-1">{eyebrow}</div>}
      <h2 className="font-serif text-xl text-[#152238]" style={{ color: INK }}>{title}</h2>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border rounded-sm relative group/card ${className}`} style={{ borderColor: LINE }}>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, tone, hint }) {
  const color = tone === "pos" ? POSITIVE : tone === "neg" ? NEGATIVE : INK;
  return (
    <div className="border-l pl-3 py-1 relative group" style={{ borderColor: LINE }}>
      <div className="text-[10.5px] uppercase tracking-wide text-[#6b7280] mb-1 flex items-center gap-1">
        {label}
        {hint && <span title={hint}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
      </div>
      <div className="font-serif text-[19px] tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#8b8577] mt-0.5">{sub}</div>}
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, suffix, hint }) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1 flex items-center gap-1">
        {label}
        {hint && <span title={hint}><Info size={11} className="text-[#a39a83]" /></span>}
      </div>
      <div className="flex items-center border rounded-sm bg-[#FBFAF7]" style={{ borderColor: LINE }}>
        <input
          type="number" step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full px-2 py-1.5 bg-transparent outline-none text-[13px] tabular-nums"
        />
        {suffix && <span className="pr-2 text-[12px] text-[#8b8577]">{suffix}</span>}
      </div>
    </label>
  );
}

function PctField({ label, value, onChange, hint }) {
  return (
    <NumField label={label} value={+(value * 100).toFixed(3)} onChange={(v) => onChange((isNaN(v) ? 0 : v) / 100)} step={0.1} suffix="%" hint={hint} />
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1">{label}</div>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px]" style={{ borderColor: LINE }} />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block mb-3">
      <div className="text-[12px] text-[#3D4A63] mb-1">{label}</div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px]" style={{ borderColor: LINE }} />
    </label>
  );
}

function Th({ children, right, hint }) {
  return (
    <th className={`text-[10.5px] uppercase tracking-wide font-semibold text-[#6b7280] py-2 px-2 ${right ? "text-right" : "text-left"}`}>
      <div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {children}
        {hint && <span title={hint}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
      </div>
    </th>
  );
}
function Td({ children, right, bold }) {
  return <td className={`py-1.5 px-2 text-[12.5px] tabular-nums ${right ? "text-right" : "text-left"} ${bold ? "font-semibold" : ""}`} style={{ color: INK }}>{children}</td>;
}

/* ============================== app ============================== */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "bien", label: "Le bien", icon: Building2 },
  { id: "credit", label: "Crédit", icon: Landmark },
  { id: "assurance", label: "Assurance", icon: ShieldCheck },
  { id: "location", label: "Location", icon: KeyRound },
  { id: "cashflow", label: "Cash-flow", icon: Wallet },
  { id: "rentabilite", label: "Rentabilité", icon: TrendingUp },
  { id: "vente", label: "Vente", icon: Tag },
  { id: "simulations", label: "Simulations", icon: Compass },
  { id: "france-usa", label: "France / USA", icon: Globe2 },
  { id: "parametres", label: "Paramètres", icon: Settings2 },
  { id: "admin", label: "Administration", icon: ShieldCheck },
];

const DEFAULT_PARAMS = {
  prixAchat: 280000, apport: 30000,
  dateAcquisition: "2019-06-01", dateLivraison: "2019-06-01", dateVente: "2026-12-31",
  inflation: 0.02, hausseLoyers: 0.015, hausseMarche: 0.02,
  vacance: 0.05, gestionLocativePct: 0.0,
  tmi: 0.30, ps: 0.172, abattementMicroBIC: 0.50,
  fraisAgenceVente: 0.05, fraisDiversVente: 2000,
};

const DEFAULT_BIEN = {
  adresse: "9 avenue Descartes", ville: "92350 Le Plessis-Robinson",
  residence: "Sérénissime", type: "Appartement Duplex",
  surfaceCarrez: 65, surfaceSol: 70, balcon: 7, parkings: 2,
  exposition: "Nord", statut: "LMNP",
  valeurActuelle: 480000,
};

const DEFAULT_CREDITS = [
  {
    id: "1", nom: "Prêt Initial (Racheté)",
    capital: 300000, dateDebut: "2019-06-01", taux: 0.018,
    dureeMois: 240, mensualite: 1450,
    differeMois: 12, dateFin: "2025-10-31"
  },
  {
    id: "2", nom: "Prêt Renégocié",
    capital: 299920.05, dateDebut: "2025-11-01", taux: 0.04,
    dureeMois: 287, mensualite: 1625.01,
    differeMois: 0, dateFin: null
  }
];

const DEFAULT_ASSURANCES = [
  { id: "1", creditId: "1", nom: "Assurance Prêt Initial", primeMensuelle: 30, dateDebut: "2019-06-01", dateFin: "2025-10-31" },
  { id: "2", creditId: "2", nom: "Assurance Prêt Renégocié", primeMensuelle: 31.11, dateDebut: "2025-11-01", dateFin: null }
];

const DEFAULT_LOC = {
  loyerHC: 1485, chargesRecuperees: 203, taxeFonciere: 1529,
  chargesCopro: 180, chargesNonRecup: 40, travaux: 600, assurancePNO: 150,
};

const DEFAULT_VENTE = { prixVente: 500000 };
const DEFAULT_SCORE = { emplacement: 8, etat: 8, liquidite: 7, risque: 6, qualite: 8 };
const DEFAULT_FU = { conserver: 0.055, etf: 0.06, immoUsa: 0.05, banque: 0.025, actions: 0.07 };

const SCENARIOS = [450000, 475000, 500000, 525000, 550000, 575000, 600000, 650000];
const SIM_YEARS = [2026, 2027, 2028, 2030, 2035];

export default function App() {
  const [tab, setTab] = useState("dashboard");

  // Persistence Helpers
  const getStored = (key, def) => {
    const s = localStorage.getItem("appartement_" + key);
    if (!s) return def;
    try { return JSON.parse(s); } catch (e) { return def; }
  };

  const [params, setParams] = useState(() => getStored("params", DEFAULT_PARAMS));
  const [bien, setBien] = useState(() => getStored("bien", DEFAULT_BIEN));
  const [credits, setCredits] = useState(() => getStored("credits", DEFAULT_CREDITS));
  const [assurances, setAssurances] = useState(() => getStored("assurances", DEFAULT_ASSURANCES));
  const [loc, setLoc] = useState(() => getStored("loc", DEFAULT_LOC));
  const [vente, setVente] = useState(() => getStored("vente", DEFAULT_VENTE));
  const [score, setScore] = useState(() => getStored("score", DEFAULT_SCORE));
  const [fu, setFu] = useState(() => getStored("fu", DEFAULT_FU));
  const [logs, setLogs] = useState(() => getStored("logs", []));
  const [importText, setImportText] = useState("");

  const addLog = useCallback((message, level = "info") => {
    const newLog = { timestamp: new Date().toISOString(), message, level };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  const parseValue = (text, regex, parser = parseFloat) => {
    const match = text.match(regex);
    return match ? parser(match[1].replace(/\s/g, "").replace(",", ".")) : null;
  };

  const triggerAnalysis = (textToAnalyze) => {
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      addLog("Erreur : Aucune donnée à analyser.", "error");
      return;
    }

    addLog(`Analyse de ${textToAnalyze.length} caractères...`, "info");
    let count = 0;

    try {
      // Credit parsing
      const cap = parseValue(textToAnalyze, /(?:capital|montant|prêt|emprunt)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);
      const rate = parseValue(textToAnalyze, /(?:taux|nominal)\s*[:=]?\s*(\d[\d\s,.]*)%/i, (v) => parseFloat(v) / 100);
      const dur = parseValue(textToAnalyze, /(?:durée|mois)\s*[:=]?\s*(\d+)\s*(?:mois)/i, parseInt);
      const pmt = parseValue(textToAnalyze, /(?:mensualité|échéance)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);

      if (cap || rate || dur || pmt) {
        const id = Math.random().toString(36).substr(2, 9);
        const newCredit = {
          id,
          nom: `Prêt Importé ${credits.length + 1}`,
          capital: cap ?? 0,
          taux: rate ?? 0.04,
          dureeMois: dur ?? 240,
          mensualite: pmt ?? 0,
          differeMois: 0, dateFin: null
        };
        setCredits(prev => [...prev, newCredit]);
        addLog(`Crédit ajouté : ${cap ? eur0(cap) : "Cap. inconnu"}`, "success");
        count++;
      } else {
        addLog("Aucune donnée de crédit trouvée.", "warning");
      }

      // Bien / Params parsing
      const prix = parseValue(textToAnalyze, /(?:prix d'achat|net vendeur|montant de la vente)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);
      if (prix) {
        setParams(p => ({ ...p, prixAchat: prix }));
        addLog(`Prix d'achat mis à jour : ${eur0(prix)}`, "success");
        count++;
      }

      if (count > 0) {
        addLog(`Analyse terminée avec succès (${count} élément(s)).`, "success");
      } else {
        addLog("Analyse terminée, aucune donnée reconnue.", "warning");
      }
    } catch (err) {
      console.error("Erreur parsing :", err);
      addLog(`Erreur critique : ${err.message}`, "error");
    }
    setImportText("");
  };

  const handleImport = () => triggerAnalysis(importText);

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      addLog(`Lecture du PDF : ${file.name}...`, "info");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
      }
      console.log("PDF extrait, longueur:", text.length, "Début du texte:", text.substring(0, 100));
      addLog(`PDF lu, ${text.length} chars extraits (${file.name})`, "success");
      triggerAnalysis(text);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        triggerAnalysis(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => { localStorage.setItem("appartement_params", JSON.stringify(params)); }, [params]);
  useEffect(() => { localStorage.setItem("appartement_bien", JSON.stringify(bien)); }, [bien]);
  useEffect(() => { localStorage.setItem("appartement_credits", JSON.stringify(credits)); }, [credits]);
  useEffect(() => { localStorage.setItem("appartement_assurances", JSON.stringify(assurances)); }, [assurances]);
  useEffect(() => { localStorage.setItem("appartement_loc", JSON.stringify(loc)); }, [loc]);
  useEffect(() => { localStorage.setItem("appartement_vente", JSON.stringify(vente)); }, [vente]);
  useEffect(() => { localStorage.setItem("appartement_score", JSON.stringify(score)); }, [score]);
  useEffect(() => { localStorage.setItem("appartement_fu", JSON.stringify(fu)); }, [fu]);
  useEffect(() => { localStorage.setItem("appartement_logs", JSON.stringify(logs)); }, [logs]);

  const resetData = () => {
    if (confirm("Réinitialiser toutes les données ? Cette action est irréversible.")) {
      setParams(DEFAULT_PARAMS);
      setBien(DEFAULT_BIEN);
      setCredits(DEFAULT_CREDITS);
      setLoc(DEFAULT_LOC);
      setVente(DEFAULT_VENTE);
      setScore(DEFAULT_SCORE);
      setFu(DEFAULT_FU);
      addLog("Réinitialisation complète des données effectuée.", "warning");
    }
  };

  const today = useMemo(() => new Date(), []);

  /* ---------- derived model ---------- */

  const individualAmorts = useMemo(() => credits.map(c => buildAmortization(c)), [credits]);
  const amort = useMemo(() => combineAmortizations(individualAmorts, assurances), [individualAmorts, assurances]);

  const crdToday = useMemo(() => crdAt(amort, today), [amort, today]);
  const monthsElapsed = useMemo(() => amort.filter((r) => r.date <= today).length, [amort, today]);
  const totalCapitalEmprunte = useMemo(() => credits.reduce((s, c) => s + c.capital, 0), [credits]);
  const capitalRembourse = totalCapitalEmprunte - crdToday;
  const interetsPayes = useMemo(() => amort.filter((r) => r.date <= today).reduce((s, r) => s + r.interet, 0), [amort, today]);
  const interetsRestants = useMemo(() => amort.filter((r) => r.date > today).reduce((s, r) => s + r.interet, 0), [amort, today]);
  const coutTotalCredit = useMemo(() => amort.reduce((s, r) => s + r.interet, 0) + amort.reduce((s, r) => s + r.assurance, 0), [amort]);
  const totalMensualiteActuelle = useMemo(() => {
    const row = amort.find((m) => m.date.getFullYear() === today.getFullYear() && m.date.getMonth() === today.getMonth());
    return row ? row.mensualiteTotale : 0;
  }, [amort, today]);
  const dureeRestante = amort.filter(r => r.date > today).length;

  const reneg = useMemo(() => {
    const rates = [0.04, 0.0375, 0.035, 0.0325, 0.03, 0.0275, 0.025];
    return rates.map((taux) => {
      const r = taux / 12;
      const n = Math.max(1, dureeRestante);
      const pmt = r === 0 ? crdToday / n : (crdToday * r) / (1 - Math.pow(1 + r, -n));
      const economieMensuelle = (amort.find(m => m.date > today)?.mensualiteTotale ?? 0) - pmt;
      return { taux, mensualite: pmt, economieMensuelle, economieTotale: economieMensuelle * n, duree: n };
    });
  }, [crdToday, dureeRestante, amort, today]);

  const loyerAnnuelBrut = (loc.loyerHC + loc.chargesRecuperees) * 12;
  const perteVacance = -loyerAnnuelBrut * params.vacance;
  const revenuEncaisse = loyerAnnuelBrut + perteVacance;
  const coutGestion = -revenuEncaisse * params.gestionLocativePct;
  const chargesCoproAn = -loc.chargesCopro * 12;
  const chargesNonRecupAn = -loc.chargesNonRecup * 12;
  const taxeFonciereAn = -loc.taxeFonciere;
  const travauxAn = -loc.travaux;
  const assurancePNOAn = -loc.assurancePNO;
  const revenuNetAvantImpot = revenuEncaisse + coutGestion + chargesCoproAn + chargesNonRecupAn + taxeFonciereAn + travauxAn + assurancePNOAn;
  const baseImposable = revenuEncaisse * (1 - params.abattementMicroBIC);
  const impotLocation = -baseImposable * (params.tmi + params.ps);
  const revenuNetNet = revenuNetAvantImpot + impotLocation;

  const cashflowMensuel = useMemo(() => {
    const delivery = new Date(params.dateLivraison + "T00:00:00");
    return amort.map((row) => {
      const isDelivered = row.date >= delivery;
      const loyer = isDelivered ? loc.loyerHC * (1 - params.vacance) : 0;
      const chargesRecup = isDelivered ? loc.chargesRecuperees * (1 - params.vacance) : 0;
      const entrees = loyer + chargesRecup;
      const sorties = row.mensualiteTotale + (isDelivered ? (loc.taxeFonciere / 12 + loc.chargesCopro + loc.chargesNonRecup + loc.travaux / 12 + loc.assurancePNO / 12) : 0);
      const cf = entrees - sorties;
      return { date: row.date, cf, enrichissement: cf + row.capAmorti };
    });
  }, [amort, loc, params.vacance, params.dateLivraison]);

  const cashflowAnnuel = useMemo(() => {
    const byYear = {};
    cashflowMensuel.forEach((m) => {
      const y = m.date.getFullYear();
      byYear[y] = byYear[y] || { annee: y, cf: 0, enrichissement: 0 };
      byYear[y].cf += m.cf;
      byYear[y].enrichissement += m.enrichissement;
    });
    return Object.values(byYear).sort((a, b) => a.annee - b.annee);
  }, [cashflowMensuel]);

  const cashflowAnnuelCourant = cashflowAnnuel.find((y) => y.annee === today.getFullYear())?.cf ?? 0;
  const cashflowMensuelActuel = useMemo(() => {
    const row = cashflowMensuel.find((m) => m.date.getFullYear() === today.getFullYear() && m.date.getMonth() === today.getMonth());
    return row ? row.cf : (cashflowMensuel[monthsElapsed - 1]?.cf ?? 0);
  }, [cashflowMensuel, today, monthsElapsed]);

  const rendementBrut = loyerAnnuelBrut / params.prixAchat;
  const rendementNet = revenuNetAvantImpot / params.prixAchat;
  const rendementNetNet = revenuNetNet / params.prixAchat;
  const prixM2Achat = params.prixAchat / bien.surfaceCarrez;
  const prixM2Actuel = bien.valeurActuelle / bien.surfaceCarrez;
  const anciennete = (today - new Date(params.dateAcquisition)) / (365.25 * 86400000);
  const evolutionAnnuelleMoyenne = Math.pow(bien.valeurActuelle / params.prixAchat, 1 / anciennete) - 1;
  const effetLevier = params.prixAchat / params.apport;
  const tauxCouverture = loc.loyerHC / totalMensualiteActuelle;
  const rentabiliteFondsPropres = cashflowAnnuelCourant / params.apport;
  const plusValueBruteLatente = bien.valeurActuelle - params.prixAchat;

  const venteMain = useMemo(
    () => venteCalc({ prixVenteVal: vente.prixVente, dateVenteVal: new Date(params.dateVente), params, bien, amort }),
    [vente.prixVente, params, bien, amort]
  );

  const venteScenarios = useMemo(
    () => SCENARIOS.map((p) => ({ prix: p, ...venteCalc({ prixVenteVal: p, dateVenteVal: new Date(params.dateVente), params, bien, amort }) })),
    [params, bien, amort]
  );

  const roiGlobal = ((bien.valeurActuelle - params.prixAchat) + capitalRembourse + cashflowMensuel.filter(m => m.date <= today).reduce((s, m) => s + m.cf, 0)) / params.apport;

  const simulations = useMemo(() => {
    return SIM_YEARS.map((yr) => {
      const dateFin = new Date(yr, 11, 31);
      const valeurBien = bien.valeurActuelle * Math.pow(1 + params.hausseMarche, yr - today.getFullYear());
      const crd = crdAt(amort, dateFin);
      const pvBrute = valeurBien - params.prixAchat;
      const patrimoineNet = valeurBien - crd;
      const cfCumule = cashflowMensuel.filter((m) => m.date >= today && m.date <= dateFin).reduce((s, m) => s + m.cf, 0);
      const { ir: abIR, ps: abPS } = bareme((dateFin - new Date(params.dateAcquisition)) / (365.25 * 86400000));
      const impot = Math.max(0, pvBrute * (1 - abIR)) * 0.19 + Math.max(0, pvBrute * (1 - abPS)) * params.ps;
      const capitalRecupere = valeurBien * (1 - params.fraisAgenceVente) - params.fraisDiversVente - crd - impot;
      const nYears = Math.max(1, yr - today.getFullYear());
      const rentabiliteAnnualisee = Math.pow((capitalRecupere + cfCumule) / params.apport, 1 / nYears) - 1;
      return { annee: yr, valeurBien, crd, pvBrute, patrimoineNet, cfCumule, capitalRecupere, rentabiliteAnnualisee };
    });
  }, [amort, bien, params, cashflowMensuel, today]);

  const triVan = useMemo(() => {
    const years = [2026, 2027, 2028, 2029, 2030];
    const flows = years.map((yr) => {
      const start = new Date(yr, 0, 1), end = new Date(yr, 11, 31);
      let f = cashflowMensuel.filter((m) => m.date >= start && m.date <= end).reduce((s, m) => s + m.cf, 0);
      if (yr === 2026) f -= params.apport;
      if (yr === 2030) {
        const sim2030 = simulations.find((s) => s.annee === 2030);
        if (sim2030) f += sim2030.capitalRecupere;
      }
      return f;
    });
    const tri = irr(flows, 0.08);
    const van = npvExcel(params.inflation, flows);
    return { flows, tri, van };
  }, [cashflowMensuel, simulations, params.apport, params.inflation]);

  const scoreAuto = {
    rentabilite: Math.min(10, Math.max(0, (rendementNetNet / 0.08) * 10)),
    effetLevier: Math.min(10, Math.max(0, 10 - (effetLevier - 5))),
    potentielPV: Math.min(10, Math.max(0, (params.hausseMarche / 0.04) * 10)),
    fiscalite: Math.min(10, Math.max(0, 10 - ((params.tmi + params.ps) / 0.30) * 10)),
    cashflow: Math.min(10, Math.max(0, 5 + cashflowAnnuelCourant / 1000)),
  };
  const scoreTotal =
    score.emplacement + score.etat + scoreAuto.rentabilite + score.liquidite + scoreAuto.effetLevier +
    score.risque + scoreAuto.potentielPV + scoreAuto.fiscalite + scoreAuto.cashflow + score.qualite;
  const appreciation = scoreTotal >= 85 ? "Excellent" : scoreTotal >= 70 ? "Très bon" : scoreTotal >= 55 ? "Bon" : scoreTotal >= 40 ? "Moyen" : "Faible";
  const recommandation = scoreTotal >= 65 && rendementNetNet >= 0.03 ? "CONSERVER" : scoreTotal >= 45 && scoreTotal < 65 ? "SURVEILLER" : "VENDRE";
  const recoColor = recommandation === "CONSERVER" ? POSITIVE : recommandation === "SURVEILLER" ? BRASS : NEGATIVE;

  const chargesPie = [
    { name: "Copropriété", value: -chargesCoproAn },
    { name: "Non récupérables", value: -chargesNonRecupAn },
    { name: "Taxe foncière", value: -taxeFonciereAn },
    { name: "Travaux", value: -travauxAn },
    { name: "Assurance PNO", value: -assurancePNOAn },
  ];
  const PIE_COLORS = [BRASS, "#B08D57", "#C7A94F", "#8C6A2F", "#6b5638"];

  const franceUsaStrategies = useMemo(() => {
    const base = [
      { name: "Conserver le bien", capital: bien.valeurActuelle, rate: fu.conserver, key: "conserver" },
      { name: "Vendre + ETF monde", capital: venteMain.capitalDispo, rate: fu.etf, key: "etf" },
      { name: "Vendre + Immobilier USA", capital: venteMain.capitalDispo, rate: fu.immoUsa, key: "immoUsa" },
      { name: "Vendre + Placement bancaire", capital: venteMain.capitalDispo, rate: fu.banque, key: "banque" },
      { name: "Vendre + Actions", capital: venteMain.capitalDispo, rate: fu.actions, key: "actions" },
    ];
    return base.map((s) => ({
      ...s,
      y10: s.capital * Math.pow(1 + s.rate, 10),
      y20: s.capital * Math.pow(1 + s.rate, 20),
      y30: s.capital * Math.pow(1 + s.rate, 30),
    }));
  }, [bien.valeurActuelle, venteMain.capitalDispo, fu]);

  /* ---------- render ---------- */

  return (
    <div className="flex min-h-screen w-full" style={{ background: PAPER, fontFamily: "ui-sans-serif, system-ui" }}>
      <style>{`
        .font-serif { font-family: Georgia, Cambria, 'Times New Roman', serif; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 text-[#EDE7D6] flex flex-col" style={{ background: INK }}>
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#C7A94F]">Patrimoine</div>
          <div className="font-serif text-[17px] leading-snug mt-1">Résidence Sérénissime</div>
          <div className="text-[11px] text-[#9aa3b5] mt-1">Le Plessis-Robinson</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[13px] transition-colors ${active ? "bg-white/10 text-white" : "text-[#B7BECF] hover:bg-white/5 hover:text-white"}`}
                style={active ? { borderLeft: `3px solid ${BRASS_LIGHT}` } : { borderLeft: "3px solid transparent" }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-[10.5px] text-[#7c8499] border-t border-white/10">
          Outil de pilotage patrimonial — usage personnel, données non sauvegardées entre sessions.
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-7 max-w-[1180px]">
        {tab === "dashboard" && (
          <div>
            <SectionLabel eyebrow="Vue d'ensemble" title="Dashboard patrimonial" />
            <div className="grid grid-cols-5 gap-x-6 gap-y-5 mb-8">
              <Kpi label="Valeur actuelle" value={eur0(bien.valeurActuelle)} hint="Estimation actuelle du bien sur le marché." />
              <Kpi label="Prix d'achat" value={eur0(params.prixAchat)} hint="Prix d'acquisition net vendeur, hors frais de notaire." />
              <Kpi label="Plus-value brute" value={eur0(plusValueBruteLatente)} tone={plusValueBruteLatente >= 0 ? "pos" : "neg"} hint="Différence entre la valeur actuelle et le prix d'achat." />
              <Kpi label="Capital restant dû" value={eur0(crdToday)} hint="Montant qu'il reste à rembourser à la banque aujourd'hui." />
              <Kpi label="Patrimoine net" value={eur0(bien.valeurActuelle - crdToday)} tone="pos" hint="Valeur du bien moins la dette bancaire." />
              <Kpi label="Rendement brut" value={pct1(rendementBrut)} hint="Loyers annuels / Prix d'achat." />
              <Kpi label="Rendement net" value={pct1(rendementNet)} hint="Loyers nets de charges / Prix d'achat. Inclut taxe foncière, copropriété, travaux, gestion." />
              <Kpi label="Rendement net-net" value={pct1(rendementNetNet)} hint="Rendement net après impôts (TMI + Prélèvements Sociaux) et abattements fiscaux." />
              <Kpi label="Cash-flow mensuel" value={eur2(cashflowMensuelActuel)} tone={cashflowMensuelActuel >= 0 ? "pos" : "neg"} hint="Entrées (loyers) - Sorties (crédit + charges + impôts) par mois." />
              <Kpi label="Cash-flow annuel" value={eur0(cashflowAnnuelCourant)} tone={cashflowAnnuelCourant >= 0 ? "pos" : "neg"} hint="Cumul du cash-flow sur l'année civile en cours." />
              <Kpi label="TRI (scénario 2030)" value={isNaN(triVan.tri) ? "n/d" : pct1(triVan.tri)} hint="Taux de Rentabilité Interne : rendement annuel moyen de l'investissement (incluant plus-value et remboursement de dette)." />
              <Kpi label="VAN (scénario 2030)" value={isNaN(triVan.van) ? "n/d" : eur0(triVan.van)} hint="Valeur Actuelle Nette : gain total de l'investissement exprimé en euros d'aujourd'hui, actualisé selon l'inflation." />
              <Kpi label="Capital remboursé" value={eur0(capitalRembourse)} hint="Partie du crédit déjà remboursée qui constitue votre enrichissement net." />
              <Kpi label="Intérêts restants" value={eur0(interetsRestants)} hint="Somme des intérêts qu'il reste à payer jusqu'à la fin du crédit." />
              <Kpi label="Nombre de crédits" value={credits.length} hint="Nombre total de lignes de crédit actives." />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <Card className="col-span-2 p-5">
                <SectionLabel eyebrow="Score composite" title="Score patrimonial" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
                  {[
                    ["Emplacement", score.emplacement], ["État du bien", score.etat],
                    ["Rentabilité", scoreAuto.rentabilite.toFixed(1)], ["Liquidité", score.liquidite],
                    ["Effet de levier", scoreAuto.effetLevier.toFixed(1)], ["Risque", score.risque],
                    ["Potentiel plus-value", scoreAuto.potentielPV.toFixed(1)], ["Fiscalité", scoreAuto.fiscalite.toFixed(1)],
                    ["Cash-flow", scoreAuto.cashflow.toFixed(1)], ["Qualité du bien", score.qualite],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between border-b py-1" style={{ borderColor: LINE }}>
                      <span className="text-[#3D4A63]">{label}</span>
                      <span className="tabular-nums font-medium" style={{ color: INK }}>{val} / 10</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-[#8b8577]">Ajustez les critères subjectifs dans l'onglet Dashboard ci-dessous ou via le panneau Paramètres.</div>
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {["emplacement", "etat", "liquidite", "risque", "qualite"].map((k) => (
                    <NumField key={k} label={k[0].toUpperCase() + k.slice(1)} value={score[k]} step={0.5}
                      onChange={(v) => setScore((s) => ({ ...s, [k]: Math.min(10, Math.max(0, isNaN(v) ? 0 : v)) }))} />
                  ))}
                </div>
              </Card>

              <Card className="p-5 flex flex-col items-center justify-center text-center">
                <div className="text-[10.5px] uppercase tracking-wide text-[#6b7280] mb-3">Recommandation</div>
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center border-[3px] mb-3"
                  style={{ borderColor: recoColor, transform: "rotate(-6deg)", color: recoColor }}
                >
                  <span className="font-serif text-[15px] tracking-wide">{recommandation}</span>
                </div>
                <div className="font-serif text-2xl" style={{ color: INK }}>{scoreTotal.toFixed(1)} / 100</div>
                <div className="text-[12.5px] text-[#3D4A63] mt-1">{appreciation}</div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-5">
                <SectionLabel eyebrow="Financement" title="Capital restant dû" />
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={amort.filter((_, i) => i % 3 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} minTickGap={40} />
                    <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => eur0(v)} labelFormatter={fmtDate} />
                    <Line type="monotone" dataKey="crdFin" stroke={BRASS} dot={false} strokeWidth={2} name="CRD" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <SectionLabel eyebrow="Trésorerie" title="Cash-flow annuel" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cashflowAnnuel}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                    <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => eur0(v)} />
                    <Bar dataKey="cf" fill={INK} name="Cash-flow" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {tab === "bien" && (
          <div>
            <SectionLabel eyebrow="Fiche" title="Le bien immobilier" />
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Localisation & caractéristiques</div>
                <TextField label="Adresse" value={bien.adresse} onChange={(v) => setBien((b) => ({ ...b, adresse: v }))} />
                <TextField label="Ville" value={bien.ville} onChange={(v) => setBien((b) => ({ ...b, ville: v }))} />
                <TextField label="Résidence" value={bien.residence} onChange={(v) => setBien((b) => ({ ...b, residence: v }))} />
                <TextField label="Type de bien" value={bien.type} onChange={(v) => setBien((b) => ({ ...b, type: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Surface Carrez" value={bien.surfaceCarrez} suffix="m²" onChange={(v) => setBien((b) => ({ ...b, surfaceCarrez: v }))} />
                  <NumField label="Surface au sol" value={bien.surfaceSol} suffix="m²" onChange={(v) => setBien((b) => ({ ...b, surfaceSol: v }))} />
                  <NumField label="Balcon" value={bien.balcon} suffix="m²" onChange={(v) => setBien((b) => ({ ...b, balcon: v }))} />
                  <NumField label="Parkings" value={bien.parkings} onChange={(v) => setBien((b) => ({ ...b, parkings: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DateField label="Acquisition" value={params.dateAcquisition} onChange={(v) => setParams((p) => ({ ...p, dateAcquisition: v }))} />
                  <DateField label="Livraison (clés)" value={params.dateLivraison} onChange={(v) => setParams((p) => ({ ...p, dateLivraison: v }))} />
                </div>
                <TextField label="Exposition" value={bien.exposition} onChange={(v) => setBien((b) => ({ ...b, exposition: v }))} />
                <TextField label="Statut fiscal" value={bien.statut} onChange={(v) => setBien((b) => ({ ...b, statut: v }))} />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Valorisation</div>
                <NumField label="Valeur actuelle estimée" value={bien.valeurActuelle} suffix="€" onChange={(v) => { setBien((b) => ({ ...b, valeurActuelle: v })); addLog(`Valeur estimée mise à jour : ${eur0(v)}`); }} hint="Dernière estimation MeilleursAgents / SeLoger / agence" />
                <div className="grid grid-cols-2 gap-x-6 mt-4">
                  <Kpi label="Prix d'achat" value={eur0(params.prixAchat)} hint="Investissement initial total." />
                  <Kpi label="Prix/m² actuel" value={eur0(prixM2Actuel) + "/m²"} hint="Valeur actuelle divisée par la surface Carrez." />
                  <Kpi label="Prix/m² achat" value={eur0(prixM2Achat) + "/m²"} hint="Prix d'achat divisé par la surface Carrez." />
                  <Kpi label="Ancienneté" value={num1(anciennete) + " ans"} hint="Temps écoulé depuis la date d'acquisition." />
                  <Kpi label="Plus-value latente" value={eur0(plusValueBruteLatente)} tone={plusValueBruteLatente >= 0 ? "pos" : "neg"} hint="Gain théorique en cas de vente au prix estimé." />
                  <Kpi label="Évolution depuis l'achat" value={pct1(bien.valeurActuelle / params.prixAchat - 1)} hint="Pourcentage d'évolution de la valeur du bien." />
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "credit" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <SectionLabel eyebrow="Financement" title="Crédit immobilier" />
              <button
                onClick={() => {
                  const id = Math.random().toString(36).substr(2, 9);
                  setCredits([...credits, { ...DEFAULT_CREDITS[0], id, nom: "Nouveau prêt" }]);
                  addLog("Nouveau crédit ajouté.");
                }}
                className="px-4 py-1.5 bg-[#152238] text-white text-[12.5px] rounded-sm hover:bg-[#1e2f4d]"
              >
                + Ajouter un prêt
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-8">
              {credits.map((c, idx) => (
                <Card key={c.id} className="p-5 border-l-4" style={{ borderLeftColor: idx % 2 === 0 ? BRASS : INK }}>
                  <div className="flex justify-between items-start mb-4">
                    <input
                      className="font-serif text-[16px] bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-gray-300"
                      value={c.nom}
                      onChange={(e) => {
                        const newCredits = [...credits];
                        newCredits[idx].nom = e.target.value;
                        setCredits(newCredits);
                      }}
                    />
                    <button
                      onClick={() => {
                        if (credits.length > 1 && confirm("Supprimer ce crédit ?")) {
                          setCredits(credits.filter(cr => cr.id !== c.id));
                          addLog(`Crédit "${c.nom}" supprimé.`, "warning");
                        }
                      }}
                      className="text-[#9B3B3B] hover:bg-red-50 p-1 rounded-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <NumField label="Capital" value={c.capital} suffix="€" onChange={(v) => { const n = [...credits]; n[idx].capital = v; setCredits(n); }} />
                    <DateField label="Date début" value={c.dateDebut} onChange={(v) => { const n = [...credits]; n[idx].dateDebut = v; setCredits(n); }} />
                    <PctField label="Taux nominal" value={c.taux} onChange={(v) => { const n = [...credits]; n[idx].taux = v; setCredits(n); }} />
                    <NumField label="Durée (mois)" value={c.dureeMois} onChange={(v) => { const n = [...credits]; n[idx].dureeMois = v; setCredits(n); }} />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <NumField label="Mensualité" value={c.mensualite} suffix="€" onChange={(v) => { const n = [...credits]; n[idx].mensualite = v; setCredits(n); }} />
                    <NumField label="Mois de différé" value={c.differeMois} onChange={(v) => { const n = [...credits]; n[idx].differeMois = v; setCredits(n); }} hint="Période où vous ne remboursez que les intérêts (VEFA)." />
                    <DateField label="Date de fin" value={c.dateFin || ""} onChange={(v) => { const n = [...credits]; n[idx].dateFin = v || null; setCredits(n); }} />
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-6 mb-6">
              <Card className="col-span-4 p-5">
                <div className="font-serif text-[14px] mb-4" style={{ color: INK }}>Indicateurs consolidés (Dette globale)</div>
                <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                  <Kpi label="Total emprunté" value={eur0(totalCapitalEmprunte)} />
                  <Kpi label="CRD global" value={eur0(crdToday)} hint="Somme des capitaux restant dus sur tous les prêts." />
                  <Kpi label="Capital remboursé" value={eur0(capitalRembourse)} tone="pos" />
                  <Kpi label="Mensualité totale" value={eur2(totalMensualiteActuelle)} hint="Somme des échéances (assurances incluses) payées ce mois-ci." />
                  <Kpi label="Intérêts payés" value={eur0(interetsPayes)} />
                  <Kpi label="Intérêts restants" value={eur0(interetsRestants)} />
                  <Kpi label="Coût total dette" value={eur0(coutTotalCredit)} />
                  <Kpi label="Fin prévue" value={fmtDate(amort[amort.length - 1]?.date ?? today)} />
                </div>
                <ResponsiveContainer width="100%" height={220} className="mt-6">
                  <LineChart data={amort.filter((_, i) => i % 3 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} minTickGap={40} />
                    <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => eur0(v)} labelFormatter={fmtDate} />
                    <Line type="monotone" dataKey="crdFin" stroke={BRASS} dot={false} strokeWidth={2} name="CRD Global" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-5 mb-6">
              <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Simulateur de renégociation (Dette globale)</div>
              <table className="w-full">
                <thead><tr>
                  <Th hint="Taux moyen pondéré cible pour la totalité de la dette restante.">Taux cible global</Th>
                  <Th right>Nouvelle mensualité cumulée</Th>
                  <Th right>Économie mensuelle</Th>
                  <Th right>Économie totale</Th>
                  <Th right>Durée restante max</Th>
                </tr></thead>
                <tbody>
                  {reneg.map((r) => (
                    <tr key={r.taux} className="border-t" style={{ borderColor: LINE }}>
                      <Td>{pct1(r.taux)}</Td>
                      <Td right>{eur2(r.mensualite)}</Td>
                      <Td right bold>{eur2(r.economieMensuelle)}</Td>
                      <Td right>{eur0(r.economieTotale)}</Td>
                      <Td right>{r.duree} mois</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="p-5">
              <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Tableau d'amortissement consolidé ({amort.length} échéances)</div>
              <div className="max-h-[360px] overflow-auto border rounded-sm" style={{ borderColor: LINE }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-white"><tr>
                    <Th>N°</Th><Th>Date</Th><Th right>CRD global</Th><Th right>Intérêts cumulés</Th><Th right>Capital amorti</Th><Th right>Prêts actifs</Th>
                  </tr></thead>
                  <tbody>
                    {amort.map((r) => (
                      <tr key={r.n} className="border-t" style={{ borderColor: LINE }}>
                        <Td>{r.n}</Td><Td>{fmtDate(r.date)}</Td>
                        <Td right>{eur0(r.crdDebut)}</Td><Td right>{eur2(r.interet)}</Td>
                        <Td right>{eur2(r.capAmorti)}</Td><Td right>{r.credits}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "location" && (
          <div>
            <SectionLabel eyebrow="Exploitation" title="Location" />
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Loyers & charges</div>
                <NumField label="Loyer hors charges (mensuel)" value={loc.loyerHC} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, loyerHC: v }))} />
                <NumField label="Charges récupérées (mensuel)" value={loc.chargesRecuperees} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, chargesRecuperees: v }))} />
                <NumField label="Taxe foncière (annuelle)" value={loc.taxeFonciere} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, taxeFonciere: v }))} />
                <NumField label="Charges copropriété (mensuel)" value={loc.chargesCopro} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, chargesCopro: v }))} />
                <NumField label="Charges non récupérables (mensuel)" value={loc.chargesNonRecup} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, chargesNonRecup: v }))} />
                <NumField label="Travaux / entretien (annuel)" value={loc.travaux} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, travaux: v }))} />
                <NumField label="Assurance PNO (annuelle)" value={loc.assurancePNO} suffix="€" onChange={(v) => setLoc((l) => ({ ...l, assurancePNO: v }))} />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Résultat automatique</div>
                <div className="space-y-1.5 text-[12.5px]">
                  {[
                    ["Loyer annuel brut potentiel", loyerAnnuelBrut, "Revenus théoriques si 100% occupé."],
                    ["Perte vacance locative", perteVacance, "Impact du taux de vacance simulé."],
                    ["Revenu locatif encaissé", revenuEncaisse, "Revenu réel après vacance."],
                    ["Gestion locative", coutGestion, "Frais d'agence de gestion."],
                    ["Charges copropriété", chargesCoproAn, "Charges annuelles payées au syndic."],
                    ["Charges non récupérables", chargesNonRecupAn, "Charges à la charge exclusive du propriétaire."],
                    ["Taxe foncière", taxeFonciereAn, "Impôt foncier annuel."],
                    ["Travaux", travauxAn, "Provision pour entretien et petites réparations."],
                    ["Assurance PNO", assurancePNOAn, "Assurance Propriétaire Non Occupant."],
                  ].map(([l, v, h]) => (
                    <div key={l} className="flex justify-between border-b py-1" style={{ borderColor: LINE }}>
                      <span className="text-[#3D4A63] flex items-center gap-1">
                        {l}
                        {h && <span title={h}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
                      </span>
                      <span className="tabular-nums" style={{ color: INK }}>{eur0(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-semibold border-b-2" style={{ borderColor: INK }}>
                    <span>Revenu net avant impôt</span><span className="tabular-nums">{eur0(revenuNetAvantImpot)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#3D4A63] flex items-center gap-1">
                      Base imposable (micro-BIC)
                      <span title="Revenu encaissé après abattement forfaitaire (généralement 50%)."><Info size={10} className="text-[#a39a83] opacity-60" /></span>
                    </span>
                    <span className="tabular-nums">{eur0(baseImposable)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#3D4A63] flex items-center gap-1">
                      Impôt + prélèvements sociaux
                      <span title="Calculé selon votre TMI + 17.2% de prélèvements sociaux."><Info size={10} className="text-[#a39a83] opacity-60" /></span>
                    </span>
                    <span className="tabular-nums">{eur0(impotLocation)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-serif text-[16px]" style={{ color: INK }}>
                    <span>Résultat net-net</span><span className="tabular-nums">{eur0(revenuNetNet)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "cashflow" && (
          <div>
            <SectionLabel eyebrow="Trésorerie" title="Cash-flow" />
            <Card className="p-5 mb-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cashflowAnnuel}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => eur0(v)} />
                  <Legend />
                  <Bar dataKey="cf" fill={INK} name="Cash-flow annuel" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="enrichissement" fill={BRASS} name="Enrichissement" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Détail mensuel (24 premiers mois)</div>
              <div className="max-h-[360px] overflow-auto border rounded-sm" style={{ borderColor: LINE }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-white"><tr>
                    <Th>Date</Th><Th right>Entrées</Th><Th right>Sorties</Th><Th right>Cash-flow</Th><Th right>Enrichissement</Th>
                  </tr></thead>
                  <tbody>
                    {cashflowMensuel.slice(0, 24).map((m, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: LINE }}>
                        <Td>{fmtDate(m.date)}</Td>
                        <Td right>{eur2(loc.loyerHC * (1 - params.vacance) + loc.chargesRecuperees * (1 - params.vacance))}</Td>
                        <Td right>{eur2(loc.loyerHC * (1 - params.vacance) + loc.chargesRecuperees * (1 - params.vacance) - m.cf)}</Td>
                        <Td right bold>{eur2(m.cf)}</Td>
                        <Td right>{eur2(m.enrichissement)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "rentabilite" && (
          <div>
            <SectionLabel eyebrow="Performance" title="Rentabilité" />
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Rendements</div>
                <Kpi label="Rendement brut" value={pct1(rendementBrut)} hint="Loyer annuel / Prix d'achat." />
                <div className="h-3" />
                <Kpi label="Rendement net" value={pct1(rendementNet)} hint="Loyer annuel net de charges / Prix d'achat." />
                <div className="h-3" />
                <Kpi label="Rendement net-net" value={pct1(rendementNetNet)} hint="Loyer annuel net de charges et d'impôts / Prix d'achat." />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Effet de levier</div>
                <Kpi label="Effet de levier" value={effetLevier.toFixed(2) + "x"} hint="Prix du bien / Apport. Mesure la puissance de l'emprunt." />
                <div className="h-3" />
                <Kpi label="Taux de couverture" value={pct1(tauxCouverture)} hint="Loyer / Mensualité crédit. > 100% signifie que le loyer paie tout le crédit." />
                <div className="h-3" />
                <Kpi label="Rentabilité / fonds propres" value={pct1(rentabiliteFondsPropres)} hint="Cash-flow annuel / Apport. Votre rendement 'cash' réel." />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Global</div>
                <Kpi label="ROI global à date" value={pct1(roiGlobal)} tone={roiGlobal >= 0 ? "pos" : "neg"} hint="(Plus-value + Capital remboursé + Cash-flow cumulé) / Apport." />
                <div className="h-3" />
                <Kpi label="Prix/m² achat" value={eur0(prixM2Achat) + "/m²"} hint="Prix total payé par m² Carrez." />
                <div className="h-3" />
                <Kpi label="Évolution annuelle moy." value={pct1(evolutionAnnuelleMoyenne)} hint="Taux de croissance annuel moyen de la valeur du bien." />
              </Card>
            </div>
          </div>
        )}

        {tab === "vente" && (
          <div>
            <SectionLabel eyebrow="Cession" title="Vente" />
            <div className="grid grid-cols-3 gap-6 mb-6">
              <Card className="p-5">
                <NumField label="Prix de vente envisagé" value={vente.prixVente} suffix="€" onChange={(v) => setVente({ prixVente: v })} />
                <DateField label="Date de vente simulée" value={params.dateVente} onChange={(v) => setParams((p) => ({ ...p, dateVente: v }))} />
              </Card>
              <Card className="col-span-2 p-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    ["Frais d'agence", venteMain.fraisAgence, "Estimation des frais d'agence lors de la revente."],
                    ["Frais divers", venteMain.fraisDivers, "Diagnostics, frais de dossier, etc."],
                    ["CRD à la vente", -venteMain.crd, "Capital qu'il faudra solder auprès de la banque."],
                    ["Plus-value brute", venteMain.pvBrute, "Prix de vente - Prix d'achat."],
                    ["Abattement IR", null, "Réduction de la base imposable IR selon la durée de détention."],
                    ["Abattement PS", null, "Réduction de la base imposable PS selon la durée de détention."],
                    ["Impôt sur plus-value", venteMain.impot, "Impôt total (IR 19% + PS 17.2%) après abattements."],
                    ["Plus-value nette", venteMain.pvNette, "Gain réel après impôts sur la plus-value."],
                    ["Argent récupéré (avant impôt PV)", venteMain.argentRecupere, "Cash brut restant après vente et remboursement du crédit."],
                    ["Capital disponible net", venteMain.capitalDispo, "Cash réel final 'dans la poche' après toutes taxes."],
                  ].map(([l, v, h], i) => (
                    <div key={l} className="flex justify-between border-b py-1 text-[12.5px]" style={{ borderColor: LINE }}>
                      <span className="text-[#3D4A63] flex items-center gap-1">
                        {l}
                        {h && <span title={h}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
                      </span>
                      <span className="tabular-nums font-medium" style={{ color: INK }}>
                        {l === "Abattement IR" ? pct1(venteMain.abIR) : l === "Abattement PS" ? pct1(venteMain.abPS) : eur0(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card className="p-5">
              <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Scénarios de prix de vente</div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead><tr><Th>Indicateur</Th>{venteScenarios.map((s) => <Th key={s.prix} right>{eur0(s.prix)}</Th>)}</tr></thead>
                  <tbody>
                    <tr className="border-t" style={{ borderColor: LINE }}><Td>Plus-value brute</Td>{venteScenarios.map((s) => <Td key={s.prix} right>{eur0(s.pvBrute)}</Td>)}</tr>
                    <tr className="border-t" style={{ borderColor: LINE }}><Td>Plus-value nette</Td>{venteScenarios.map((s) => <Td key={s.prix} right>{eur0(s.pvNette)}</Td>)}</tr>
                    <tr className="border-t" style={{ borderColor: LINE }}><Td>Argent récupéré</Td>{venteScenarios.map((s) => <Td key={s.prix} right>{eur0(s.argentRecupere)}</Td>)}</tr>
                    <tr className="border-t-2" style={{ borderColor: INK }}><Td bold>Capital disponible net</Td>{venteScenarios.map((s) => <Td key={s.prix} right bold>{eur0(s.capitalDispo)}</Td>)}</tr>
                  </tbody>
                </table>
              </div>
              <ResponsiveContainer width="100%" height={220} className="mt-5">
                <BarChart data={venteScenarios}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="prix" tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => eur0(v)} labelFormatter={(v) => eur0(v)} />
                  <Bar dataKey="capitalDispo" fill={BRASS} name="Capital disponible net" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {tab === "simulations" && (
          <div>
            <SectionLabel eyebrow="Projection" title="Simulations de revente" />
            <Card className="p-5 mb-6 overflow-auto">
              <table className="w-full">
                <thead><tr>
                  <Th hint="Indicateur de performance projeté.">Indicateur</Th>
                  {simulations.map((s) => <Th key={s.annee} right>{s.annee}</Th>)}
                </tr></thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Valeur du bien</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{eur0(s.valeurBien)}</Td>)}
                  </tr>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Capital restant dû</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{eur0(s.crd)}</Td>)}
                  </tr>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Plus-value brute</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{eur0(s.pvBrute)}</Td>)}
                  </tr>
                  <tr className="border-t-2" style={{ borderColor: INK }}>
                    <Td bold>Patrimoine net</Td>
                    {simulations.map((s) => <Td key={s.annee} right bold>{eur0(s.patrimoineNet)}</Td>)}
                  </tr>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Cash-flow cumulé</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{eur0(s.cfCumule)}</Td>)}
                  </tr>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Capital récupéré net</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{eur0(s.capitalRecupere)}</Td>)}
                  </tr>
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <Td>Rentabilité annualisée</Td>
                    {simulations.map((s) => <Td key={s.annee} right>{pct1(s.rentabiliteAnnualisee)}</Td>)}
                  </tr>
                </tbody>
              </table>
              <ResponsiveContainer width="100%" height={220} className="mt-5">
                <LineChart data={simulations}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => eur0(v)} />
                  <Line type="monotone" dataKey="patrimoineNet" stroke={BRASS} strokeWidth={2} name="Patrimoine net" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>TRI / VAN — hypothèse de revente en 2030</div>
              <div className="grid grid-cols-2 gap-6">
                <Kpi label="TRI (taux de rentabilité interne)" value={isNaN(triVan.tri) ? "n/d" : pct1(triVan.tri)} tone="pos" hint="Taux de rendement annuel moyen qui égalise la valeur actuelle des flux entrants et sortants." />
                <Kpi label="VAN (actualisée à l'inflation)" value={isNaN(triVan.van) ? "n/d" : eur0(triVan.van)} tone={triVan.van >= 0 ? "pos" : "neg"} hint="Excédent de valeur généré par le projet au-delà de l'inflation, exprimé en euros d'aujourd'hui." />
              </div>
            </Card>
          </div>
        )}

        {tab === "france-usa" && (
          <div>
            <SectionLabel eyebrow="Allocation" title="Conserver vs vendre — comparatif de placements" />
            <Card className="p-5 overflow-auto">
              <table className="w-full">
                <thead><tr><Th>Stratégie</Th><Th right>Capital</Th><Th right>Rendement</Th><Th right>10 ans</Th><Th right>20 ans</Th><Th right>30 ans</Th></tr></thead>
                <tbody>
                  {franceUsaStrategies.map((s) => (
                    <tr key={s.key} className="border-t" style={{ borderColor: LINE }}>
                      <Td>{s.name}</Td>
                      <Td right>{eur0(s.capital)}</Td>
                      <Td right>
                        <input type="number" step={0.1} value={+(fu[s.key] * 100).toFixed(1)}
                          onChange={(e) => setFu((f) => ({ ...f, [s.key]: parseFloat(e.target.value) / 100 }))}
                          className="w-16 text-right border rounded-sm px-1 py-0.5 text-[12.5px] tabular-nums bg-[#FBFAF7]" style={{ borderColor: LINE }} />
                        <span className="text-[11px] text-[#8b8577]"> %</span>
                      </Td>
                      <Td right bold>{eur0(s.y10)}</Td><Td right bold>{eur0(s.y20)}</Td><Td right bold>{eur0(s.y30)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ResponsiveContainer width="100%" height={260} className="mt-5">
                <BarChart data={franceUsaStrategies}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => eur0(v)} />
                  <Legend />
                  <Bar dataKey="y10" fill="#C7A94F" name="10 ans" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="y20" fill={BRASS} name="20 ans" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="y30" fill={INK} name="30 ans" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {tab === "parametres" && (
          <div>
            <SectionLabel eyebrow="Configuration" title="Paramètres et hypothèses" />
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-5" style={{ borderColor: BRASS }}>
                <div className="font-serif text-[14px] mb-3" style={{ color: BRASS }}>Valeurs clés</div>
                <NumField label="Prix d'achat total" value={params.prixAchat} suffix="€" onChange={(v) => { setParams((p) => ({ ...p, prixAchat: v })); addLog(`Prix d'achat modifié : ${eur0(v)}`); }} />
                <NumField label="Apport personnel" value={params.apport} suffix="€" onChange={(v) => { setParams((p) => ({ ...p, apport: v })); addLog(`Apport personnel modifié : ${eur0(v)}`); }} />
                <DateField label="Date d'acquisition" value={params.dateAcquisition} onChange={(v) => setParams((p) => ({ ...p, dateAcquisition: v }))} />
                <DateField label="Date de remise des clés" value={params.dateLivraison} onChange={(v) => setParams((p) => ({ ...p, dateLivraison: v }))} />
                <DateField label="Date de vente simulée" value={params.dateVente} onChange={(v) => setParams((p) => ({ ...p, dateVente: v }))} />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Hypothèses économiques</div>
                <PctField label="Inflation annuelle" value={params.inflation} onChange={(v) => setParams((p) => ({ ...p, inflation: v }))} />
                <PctField label="Hausse annuelle des loyers" value={params.hausseLoyers} onChange={(v) => setParams((p) => ({ ...p, hausseLoyers: v }))} />
                <PctField label="Hausse annuelle du marché" value={params.hausseMarche} onChange={(v) => setParams((p) => ({ ...p, hausseMarche: v }))} />
                <PctField label="Taux de vacance locative" value={params.vacance} onChange={(v) => setParams((p) => ({ ...p, vacance: v }))} />
                <PctField label="Frais de gestion locative" value={params.gestionLocativePct} onChange={(v) => setParams((p) => ({ ...p, gestionLocativePct: v }))} />
              </Card>
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Fiscalité</div>
                <PctField label="Tranche marginale d'imposition" value={params.tmi} onChange={(v) => setParams((p) => ({ ...p, tmi: v }))} />
                <PctField label="Prélèvements sociaux" value={params.ps} onChange={(v) => setParams((p) => ({ ...p, ps: v }))} />
                <PctField label="Abattement micro-BIC" value={params.abattementMicroBIC} onChange={(v) => setParams((p) => ({ ...p, abattementMicroBIC: v }))} />
                <PctField label="Frais d'agence à la revente" value={params.fraisAgenceVente} onChange={(v) => setParams((p) => ({ ...p, fraisAgenceVente: v }))} />
                <NumField label="Frais divers à la revente" value={params.fraisDiversVente} suffix="€" onChange={(v) => setParams((p) => ({ ...p, fraisDiversVente: v }))} />
              </Card>
            </div>
            <div className="mt-6 text-[11.5px] text-[#8b8577] max-w-2xl">
              Toutes les feuilles se recalculent instantanément à partir de ces paramètres. Le barème d'abattement pour durée de détention (plus-value) applique la règle légale : 6 %/an d'IR de la 6ᵉ à la 21ᵉ année, 4 % la 22ᵉ ; 1,65 %/an de prélèvements sociaux de la 6ᵉ à la 21ᵉ, 1,60 % la 22ᵉ, puis 9 %/an de la 23ᵉ à la 30ᵉ.
            </div>
          </div>
        )}

        {tab === "assurance" && (
          <div className="space-y-6">
            <SectionLabel eyebrow="Protection" title="Assurance emprunteur" />
            <div className="grid grid-cols-1 gap-6">
              <Card className="p-5">
                <div className="font-serif text-[14px] mb-4" style={{ color: INK }}>Contrats d'assurance</div>
                {assurances.map((a, idx) => (
                  <div key={a.id} className="grid grid-cols-5 gap-4 items-end mb-4 pb-4 border-b border-[#E1DCCC]">
                    <TextField label="Nom du contrat" value={a.nom} onChange={(v) => { const n = [...assurances]; n[idx].nom = v; setAssurances(n); }} />
                    <NumField label="Prime mensuelle" value={a.primeMensuelle} suffix="€" onChange={(v) => { const n = [...assurances]; n[idx].primeMensuelle = v; setAssurances(n); }} />
                    <DateField label="Début" value={a.dateDebut} onChange={(v) => { const n = [...assurances]; n[idx].dateDebut = v; setAssurances(n); }} />
                    <DateField label="Fin" value={a.dateFin || ""} onChange={(v) => { const n = [...assurances]; n[idx].dateFin = v || null; setAssurances(n); }} />
                    <button onClick={() => setAssurances(assurances.filter(as => as.id !== a.id))} className="text-[#9B3B3B] p-2 hover:bg-red-50 rounded-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setAssurances([...assurances, { id: Math.random().toString(36).substr(2, 9), creditId: "1", nom: "Nouveau contrat", primeMensuelle: 0, dateDebut: today.toISOString().slice(0, 10), dateFin: null }])}
                        className="px-4 py-2 bg-[#152238] text-white rounded-sm text-[13px]">
                  + Ajouter contrat
                </button>
              </Card>

              <Card className="p-5">
                <div className="font-serif text-[14px] mb-4" style={{ color: INK }}>Suivi temporel</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={amort.filter((_, i) => i % 6 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => eur2(v)} labelFormatter={fmtDate} />
                    <Line type="stepAfter" dataKey="assurance" stroke={NEGATIVE} name="Prime Assurance" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="space-y-6">
            <SectionLabel eyebrow="Administration" title="Contrôle & Automatisation" />

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-5 flex flex-col">
                <div className="font-serif text-[14px] mb-3 flex items-center gap-2" style={{ color: INK }}>
                  <ClipboardPaste size={16} />
                  <span>Import intelligent (Paste & Parse)</span>
                </div>
                <p className="text-[12px] text-[#8b8577] mb-4">
                  Copiez le texte ou importez un fichier (.txt, .csv) d'un échéancier, acte de vente ou contrat d'assurance.
                </p>
                <input type="file" accept=".txt,.csv,.pdf" onChange={handleFileImport} className="mb-4 text-[12px]" />
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Collez votre document ici..."
                  className="flex-1 w-full h-40 p-3 text-[12.5px] border rounded-sm bg-[#FBFAF7] outline-none font-mono"
                  style={{ borderColor: LINE }}
                />
                <button
                  onClick={handleImport}
                  className="mt-4 px-4 py-2 bg-[#152238] text-white text-[13px] rounded-sm hover:bg-[#1e2f4d] transition-colors"
                >
                  Analyser et Appliquer
                </button>
              </Card>

              <Card className="p-5 flex flex-col">
                <div className="font-serif text-[14px] mb-3 flex items-center justify-between" style={{ color: INK }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Console de Logs</span>
                  </div>
                  <button onClick={() => setLogs([])} className="text-[10px] uppercase tracking-wider text-[#8b8577] hover:text-[#152238]">Effacer</button>
                </div>
                <div className="flex-1 overflow-auto bg-[#1e2f4d] p-3 rounded-sm font-mono text-[11px] min-h-[200px]">
                  {logs.length === 0 ? (
                    <div className="text-[#4a5d7e] italic">Aucun événement enregistré...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="mb-1 border-b border-white/5 pb-1">
                        <span className="text-[#7c8499] mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={log.level === "error" ? "text-red-400" : log.level === "warning" ? "text-yellow-400" : log.level === "success" ? "text-green-400" : "text-[#B7BECF]"}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            <Card className="p-5 border-red-100 bg-red-50/30">
              <div className="font-serif text-[14px] mb-3 text-red-900">Zone de danger</div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-red-800/70 max-w-md">
                  Effacer toutes les données sauvegardées localement et réinitialiser l'application aux valeurs d'usine.
                </p>
                <button
                  onClick={resetData}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 text-[13px] rounded-sm hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={15} />
                  Réinitialiser tout
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
