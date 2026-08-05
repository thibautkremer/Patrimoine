import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { TextField, NumField, DateField } from "../ui/Fields";
import { Kpi } from "../ui/Kpi";
import { eur0, num1, pct1 } from "../../lib/utils";
import { INK } from "../../App.constants";
import type { Bien as BienType, Params, DpeClass } from "../../types";



interface BienProps {
  bien: BienType;
  setBien: (v: BienType | ((p: BienType) => BienType)) => void;
  params: Params;
  setParams: (v: Params | ((p: Params) => Params)) => void;
  prixM2Actuel: number;
  prixM2Achat: number;
  anciennete: number;
  plusValueBruteLatente: number;
  addLog: (msg: string, level?: "info" | "success" | "warning" | "error") => void;
}


export function Bien({
  bien,
  setBien,
  params,
  setParams,
  prixM2Actuel,
  prixM2Achat,
  anciennete,
  plusValueBruteLatente,
  addLog,
}: BienProps) {
  return (
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
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Statut fiscal" value={bien.statut} onChange={(v) => setBien((b) => ({ ...b, statut: v }))} />
            <label className="block mb-3">
              <div className="text-[12px] text-[#3D4A63] mb-1">Classe DPE</div>
              <select
                value={bien.dpe || "C"}
                onChange={(e) => setBien((b) => ({ ...b, dpe: e.target.value as DpeClass }))}
                className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px] h-[31px]"
                style={{ borderColor: "#E1DCCC" }}
              >
                {["A", "B", "C", "D", "E", "F", "G"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>


          </div>
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
  );
}
