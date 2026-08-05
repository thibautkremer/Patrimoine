import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Trash2 } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { NumField, DateField, PctField } from "../ui/Fields";
import { Kpi } from "../ui/Kpi";
import { Th, Td } from "../ui/Table";
import { eur0, eur2, pct1, fmtDate } from "../../lib/utils";
import { INK, BRASS, LINE } from "../../App.constants";
import type { Credit as CreditType, CombinedAmortizationRow } from "../../types";

interface CreditProps {
  credits: CreditType[];
  setCredits: React.Dispatch<React.SetStateAction<CreditType[]>>;
  totalCapitalEmprunte: number;
  crdToday: number;
  capitalRembourse: number;
  totalMensualiteActuelle: number;
  interetsPayes: number;
  interetsRestants: number;
  coutTotalCredit: number;
  amort: CombinedAmortizationRow[];
  today: Date;
  reneg: {
    taux: number;
    mensualite: number;
    economieMensuelle: number;
    economieTotale: number;
    duree: number;
    ira: number;
  }[];

  addLog: (msg: string, level?: "info" | "success" | "warning" | "error") => void;
  DEFAULT_CREDITS: CreditType[];
}

export function Credit({
  credits,
  setCredits,
  totalCapitalEmprunte,
  crdToday,
  capitalRembourse,
  totalMensualiteActuelle,
  interetsPayes,
  interetsRestants,
  coutTotalCredit,
  amort,
  today,
  reneg,
  addLog,
  DEFAULT_CREDITS,
}: CreditProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <SectionLabel eyebrow="Financement" title="Crédit immobilier" />
        <button
          onClick={() => {
            const id = crypto.randomUUID();
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
                  setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, nom: e.target.value } : cr));
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
              <NumField label="Capital" value={c.capital} suffix="€" onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, capital: v } : cr))} />
              <DateField label="Date début" value={c.dateDebut} onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, dateDebut: v } : cr))} />
              <PctField label="Taux nominal" value={c.taux} onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, taux: v } : cr))} />
              <NumField label="Durée (mois)" value={c.dureeMois} onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, dureeMois: v } : cr))} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <NumField label="Mensualité" value={c.mensualite} suffix="€" onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, mensualite: v } : cr))} />
              <NumField label="Mois de différé" value={c.differeMois} onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, differeMois: v } : cr))} hint="Période où vous ne remboursez que les intérêts (VEFA)." />
              <DateField label="Date de fin" value={c.dateFin || ""} onChange={(v) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, dateFin: v || null } : cr))} />
              <label className="block">
                <div className="text-[12px] text-[#3D4A63] mb-1">Rachat/Refinancement</div>
                <select
                  value={c.refinancesCreditId || ""}
                  onChange={(e) => setCredits(credits.map((cr) => cr.id === c.id ? { ...cr, refinancesCreditId: e.target.value || null } : cr))}
                  className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px] h-[31px]"
                  style={{ borderColor: LINE }}
                >
                  <option value="">Aucun (Prêt initial)</option>
                  {credits.filter(other => other.id !== c.id).map(other => (
                    <option key={other.id} value={other.id}>Remplace {other.nom}</option>
                  ))}
                </select>
              </label>
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} labelFormatter={(label: any) => label instanceof Date ? fmtDate(label) : String(label)} />
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
            <Th right hint="Gain total sur la durée restante, net des Indemnités de Remboursement Anticipé (IRA) estimées.">Économie totale nette</Th>
            <Th right>Estimation IRA</Th>
          </tr></thead>
          <tbody>
            {reneg.map((r) => (
              <tr key={r.taux} className="border-t" style={{ borderColor: LINE }}>
                <Td>{pct1(r.taux)}</Td>
                <Td right>{eur2(r.mensualite)}</Td>
                <Td right bold>{eur2(r.economieMensuelle)}</Td>
                <Td right>{eur0(r.economieTotale)}</Td>
                <Td right>{eur0(r.ira)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-[#8b8577] mt-3">
          Note : Les IRA sont estimées au plus bas entre 3 % du capital restant dû et 6 mois d'intérêts.
        </p>
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
  );
}
