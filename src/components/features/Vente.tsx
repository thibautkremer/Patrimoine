import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Info } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { NumField, DateField } from "../ui/Fields";
import { Th, Td } from "../ui/Table";
import { eur0, pct1 } from "../../lib/utils";
import { INK, BRASS, LINE } from "../../App.constants";
import type { VenteParams, Params, VenteCalcResult } from "../../types";

interface VenteProps {
  vente: VenteParams;
  setVente: React.Dispatch<React.SetStateAction<VenteParams>>;
  params: Params;
  setParams: React.Dispatch<React.SetStateAction<Params>>;
  venteMain: VenteCalcResult;
  venteScenarios: (VenteCalcResult & { prix: number })[];
}

export function Vente({
  vente,
  setVente,
  params,
  setParams,
  venteMain,
  venteScenarios,
}: VenteProps) {
  return (
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
            ].map(([l, v, h]) => (
              <div key={l as string} className="flex justify-between border-b py-1 text-[12.5px]" style={{ borderColor: LINE }}>
                <span className="text-[#3D4A63] flex items-center gap-1">
                  {l as string}
                  {h && <span title={h as string}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
                </span>
                <span className="tabular-nums font-medium" style={{ color: INK }}>
                  {l === "Abattement IR" ? pct1(venteMain.abIR) : l === "Abattement PS" ? pct1(venteMain.abPS) : eur0(v as number)}
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} labelFormatter={(label: any) => typeof label === "number" || typeof label === "string" ? eur0(label) : String(label)} />
            <Bar dataKey="capitalDispo" fill={BRASS} name="Capital disponible net" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
