import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { Th, Td } from "../ui/Table";
import { eur0 } from "../../lib/utils";
import { INK, BRASS, LINE } from "../../App.constants";
import type { FranceUsaRates } from "../../types";

interface FranceUsaProps {
  franceUsaStrategies: { name: string; capital: number; rate: number; key: string; y10: number; y20: number; y30: number }[];
  fu: FranceUsaRates;
  setFu: React.Dispatch<React.SetStateAction<FranceUsaRates>>;
}

export function FranceUsa({ franceUsaStrategies, fu, setFu }: FranceUsaProps) {
  return (
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur0(v)} />
            <Legend />
            <Bar dataKey="y10" fill="#C7A94F" name="10 ans" radius={[2, 2, 0, 0]} />
            <Bar dataKey="y20" fill={BRASS} name="20 ans" radius={[2, 2, 0, 0]} />
            <Bar dataKey="y30" fill={INK} name="30 ans" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
