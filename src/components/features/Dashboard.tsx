import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Kpi } from "../ui/Kpi";
import { Card } from "../ui/Card";
import { NumField } from "../ui/Fields";
import { eur0, eur2, pct1, fmtDate } from "../../lib/utils";
import { LINE, INK, BRASS } from "../../App.constants";
import type { Bien, Params, ScoreParams, Credit, CombinedAmortizationRow, LocationParams } from "../../types";

interface DashboardProps {
  bien: Bien;
  params: Params;
  loc: LocationParams;
  plusValueBruteLatente: number;


  crdToday: number;
  rendementBrut: number;
  rendementNet: number;
  rendementNetNet: number;
  cashflowMensuelActuel: number;
  cashflowAnnuelCourant: number;
  triVan: { tri: number; van: number };
  capitalRembourse: number;
  interetsRestants: number;
  credits: Credit[];
  score: ScoreParams;
  scoreAuto: { rentabilite: number; effetLevier: number; potentielPV: number; fiscalite: number; cashflow: number };
  recommandation: string;
  recoColor: string;
  appreciation: string;
  scoreTotal: number;
  setScore: (v: ScoreParams | ((p: ScoreParams) => ScoreParams)) => void;
  amort: CombinedAmortizationRow[];
  cashflowAnnuel: { annee: number; cf: number; enrichissement: number }[];
}

export function Dashboard({
  bien,
  params,
  plusValueBruteLatente,
  crdToday,
  rendementBrut,
  rendementNet,
  rendementNetNet,
  cashflowMensuelActuel,
  cashflowAnnuelCourant,
  triVan,
  capitalRembourse,
  interetsRestants,
  credits,
  score,
  scoreAuto,
  recommandation,
  recoColor,
  appreciation,
  scoreTotal,
  setScore,
  amort,
  cashflowAnnuel,
}: DashboardProps) {
  const dpeAlert = bien.dpe === "G" ? "Interdit à la location en 2025" : bien.dpe === "F" ? "Interdit à la location en 2028" : bien.dpe === "E" ? "Interdit à la location en 2034" : null;

  return (
    <div className="space-y-6">
      {(dpeAlert || (params.regimeFiscal === "micro-bic" && (params.prixAchat > 0 && 1))) && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0" size={20} />
          <div className="text-[13px] text-red-900">
            <div className="font-bold">Alertes de vigilance</div>
            {dpeAlert && <p>Classe DPE {bien.dpe} : {dpeAlert}. Prévoyez des travaux de rénovation énergétique.</p>}
          </div>
        </Card>
      )}



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
              <div key={label as string} className="flex justify-between border-b py-1" style={{ borderColor: LINE }}>
                <span className="text-[#3D4A63]">{label as string}</span>
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} labelFormatter={(label: any) => label instanceof Date ? fmtDate(label) : String(label)} />
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} />
              <Bar dataKey="cf" fill={INK} name="Cash-flow" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
