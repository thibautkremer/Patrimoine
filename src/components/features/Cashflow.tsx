import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { Th, Td } from "../ui/Table";
import { eur0, eur2, fmtDate } from "../../lib/utils";
import { INK, BRASS, LINE } from "../../App.constants";
import type { LocationParams, Params } from "../../types";

interface CashflowProps {
  cashflowAnnuel: { annee: number; cf: number; enrichissement: number }[];
  cashflowMensuel: { date: Date; cf: number; enrichissement: number }[];
  loc: LocationParams;
  params: Params;
}

export function Cashflow({ cashflowAnnuel, cashflowMensuel, loc, params }: CashflowProps) {
  return (
    <div>
      <SectionLabel eyebrow="Trésorerie" title="Cash-flow" />
      <Card className="p-5 mb-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cashflowAnnuel}>
            <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
            <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} tick={{ fontSize: 11 }} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} />
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
  );
}
