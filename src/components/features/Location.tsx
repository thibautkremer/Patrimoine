import React from "react";
import { Info } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { NumField } from "../ui/Fields";
import { eur0 } from "../../lib/utils";
import { INK, LINE } from "../../App.constants";
import type { LocationParams } from "../../types";

interface LocationProps {
  loc: LocationParams;
  setLoc: React.Dispatch<React.SetStateAction<LocationParams>>;
  loyerAnnuelBrut: number;
  perteVacance: number;
  revenuEncaisse: number;
  coutGestion: number;
  chargesCoproAn: number;
  chargesNonRecupAn: number;
  taxeFonciereAn: number;
  travauxAn: number;
  assurancePNOAn: number;
  revenuNetAvantImpot: number;
  baseImposable: number;
  impotLocation: number;
  revenuNetNet: number;
}

export function Location({
  loc,
  setLoc,
  loyerAnnuelBrut,
  perteVacance,
  revenuEncaisse,
  coutGestion,
  chargesCoproAn,
  chargesNonRecupAn,
  taxeFonciereAn,
  travauxAn,
  assurancePNOAn,
  revenuNetAvantImpot,
  baseImposable,
  impotLocation,
  revenuNetNet,
}: LocationProps) {
  return (
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
              <div key={l as string} className="flex justify-between border-b py-1" style={{ borderColor: LINE }}>
                <span className="text-[#3D4A63] flex items-center gap-1">
                  {l as string}
                  {h && <span title={h as string}><Info size={10} className="text-[#a39a83] opacity-60" /></span>}
                </span>
                <span className="tabular-nums" style={{ color: INK }}>{eur0(v as number)}</span>
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
  );
}
