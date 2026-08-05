import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { Kpi } from "../ui/Kpi";
import { Th, Td } from "../ui/Table";
import { eur0, pct1 } from "../../lib/utils";
import { INK, BRASS, LINE } from "../../App.constants";

interface SimulationsProps {
  simulations: {
    annee: number;
    valeurBien: number;
    crd: number;
    pvBrute: number;
    patrimoineNet: number;
    cfCumule: number;
    capitalRecupere: number;
    rentabiliteAnnualisee: number;
  }[];
  triVan: { tri: number; van: number };
}

export function Simulations({ simulations, triVan }: SimulationsProps) {
  return (
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} />
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
  );
}
