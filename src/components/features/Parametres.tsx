import React from "react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { NumField, DateField, PctField } from "../ui/Fields";
import { eur0 } from "../../lib/utils";
import { INK, BRASS } from "../../App.constants";
import type { Params, RegimeFiscal } from "../../types";

interface ParametresProps {
  params: Params;
  setParams: (v: Params | ((p: Params) => Params)) => void;
  addLog: (msg: string, level?: "info" | "success" | "warning" | "error") => void;
  updatePin: (pin: string) => void;
  pinEnabled: boolean;
}


export function Parametres({ params, setParams, addLog, updatePin, pinEnabled }: ParametresProps) {
  const [newPin, setNewPin] = React.useState("");

  return (
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
          <label className="block mb-3">
            <div className="text-[12px] text-[#3D4A63] mb-1">Régime Fiscal LMNP</div>
            <select
              value={params.regimeFiscal}
              onChange={(e) => setParams((p) => ({ ...p, regimeFiscal: e.target.value as RegimeFiscal }))}
              className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px] h-[31px]"
              style={{ borderColor: "#E1DCCC" }}
            >

              <option value="micro-bic">Micro-BIC (Abattement 50%)</option>
              <option value="reel">Régime Réel (Amortissements)</option>
            </select>
          </label>
          <PctField label="Tranche marginale (TMI)" value={params.tmi} onChange={(v) => setParams((p) => ({ ...p, tmi: v }))} />
          <PctField label="Prélèvements sociaux" value={params.ps} onChange={(v) => setParams((p) => ({ ...p, ps: v }))} />
          {params.regimeFiscal === "micro-bic" ? (
            <PctField label="Abattement micro-BIC" value={params.abattementMicroBIC} onChange={(v) => setParams((p) => ({ ...p, abattementMicroBIC: v }))} />
          ) : (
            <div className="space-y-3 pt-2 border-t mt-2">
              <div className="text-[11px] font-bold text-[#8C6A2F] uppercase">Paramètres Amortissement</div>
              <PctField label="Part Terrain (non amortissable)" value={params.valeurTerrainPct} onChange={(v) => setParams((p) => ({ ...p, valeurTerrainPct: v }))} />
              <NumField label="Durée amort. bien (ans)" value={params.dureeAmortissementBien} onChange={(v) => setParams((p) => ({ ...p, dureeAmortissementBien: v }))} />
              <NumField label="Valeur mobilier (€)" value={params.valeurMobilier} onChange={(v) => setParams((p) => ({ ...p, valeurMobilier: v }))} />
              <NumField label="Durée amort. mobilier (ans)" value={params.dureeAmortissementMobilier} onChange={(v) => setParams((p) => ({ ...p, dureeAmortissementMobilier: v }))} />
            </div>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-6 mt-6">
        <Card className="p-5">
           <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Frais de revente</div>
           <PctField label="Frais d'agence" value={params.fraisAgenceVente} onChange={(v) => setParams((p) => ({ ...p, fraisAgenceVente: v }))} />
           <NumField label="Frais divers" value={params.fraisDiversVente} suffix="€" onChange={(v) => setParams((p) => ({ ...p, fraisDiversVente: v }))} />
        </Card>

        <Card className="p-5">
          <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Sécurité (Code PIN)</div>
          <p className="text-[12px] text-[#8b8577] mb-4">Verrouillez l'accès à l'application par un code PIN.</p>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Nouveau code PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-2 py-1.5 border rounded-sm bg-[#FBFAF7] outline-none text-[13px]"
              style={{ borderColor: "#E1DCCC" }}
            />
            <button
              onClick={() => { updatePin(newPin); setNewPin(""); addLog("Code PIN mis à jour"); }}
              className="w-full py-1.5 bg-[#152238] text-white text-[12px] rounded-sm"
            >
              {pinEnabled ? "Changer le PIN" : "Activer le PIN"}
            </button>
            {pinEnabled && (
              <button
                onClick={() => { updatePin(""); addLog("Code PIN désactivé", "warning"); }}
                className="w-full py-1.5 border border-red-200 text-red-700 text-[12px] rounded-sm"
              >
                Désactiver le PIN
              </button>
            )}
          </div>
        </Card>
      </div>


      <div className="mt-6 text-[11.5px] text-[#8b8577] max-w-2xl">
        Toutes les feuilles se recalculent instantanément à partir de ces paramètres. Le barème d'abattement pour durée de détention (plus-value) applique la règle légale : 6 %/an d'IR de la 6ᵉ à la 21ᵉ année, 4 % la 22ᵉ ; 1,65 %/an de prélèvements sociaux de la 6ᵉ à la 21ᵉ, 1,60 % la 22ᵉ, puis 9 %/an de la 23ᵉ à la 30ᵉ.
      </div>
    </div>
  );
}
