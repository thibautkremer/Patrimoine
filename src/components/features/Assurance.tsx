import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Trash2 } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { TextField, NumField, DateField } from "../ui/Fields";
import { eur2, fmtDate } from "../../lib/utils";
import { INK, LINE, NEGATIVE } from "../../App.constants";
import type { Assurance as AssuranceType, CombinedAmortizationRow } from "../../types";

interface AssuranceProps {
  assurances: AssuranceType[];
  setAssurances: React.Dispatch<React.SetStateAction<AssuranceType[]>>;
  amort: CombinedAmortizationRow[];
  today: Date;
}

export function Assurance({ assurances, setAssurances, amort, today }: AssuranceProps) {
  return (
    <div className="space-y-6">
      <SectionLabel eyebrow="Protection" title="Assurance emprunteur" />
      <div className="grid grid-cols-1 gap-6">
        <Card className="p-5">
          <div className="font-serif text-[14px] mb-4" style={{ color: INK }}>Contrats d'assurance</div>
          {assurances.map((a) => (
            <div key={a.id} className="grid grid-cols-5 gap-4 items-end mb-4 pb-4 border-b border-[#E1DCCC]">
              <TextField label="Nom du contrat" value={a.nom} onChange={(v) => setAssurances(assurances.map((as) => as.id === a.id ? { ...as, nom: v } : as))} />
              <NumField label="Prime mensuelle" value={a.primeMensuelle} suffix="€" onChange={(v) => setAssurances(assurances.map((as) => as.id === a.id ? { ...as, primeMensuelle: v } : as))} />
              <DateField label="Début" value={a.dateDebut} onChange={(v) => setAssurances(assurances.map((as) => as.id === a.id ? { ...as, dateDebut: v } : as))} />
              <DateField label="Fin" value={a.dateFin || ""} onChange={(v) => setAssurances(assurances.map((as) => as.id === a.id ? { ...as, dateFin: v || null } : as))} />
              <button onClick={() => setAssurances(assurances.filter(as => as.id !== a.id))} className="text-[#9B3B3B] p-2 hover:bg-red-50 rounded-sm">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button onClick={() => setAssurances([...assurances, { id: crypto.randomUUID(), creditId: "1", nom: "Nouveau contrat", primeMensuelle: 0, dateDebut: today.toISOString().slice(0, 10), dateFin: null }])}
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={(v: any) => eur2(v)} labelFormatter={(label: any) => label instanceof Date ? fmtDate(label) : String(label)} />
              <Line type="stepAfter" dataKey="assurance" stroke={NEGATIVE} name="Prime Assurance" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
