import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { Kpi } from "../ui/Kpi";
import { eur0, pct1 } from "../../lib/utils";
import { INK } from "../../App.constants";

interface RentabiliteProps {
  rendementBrut: number;
  rendementNet: number;
  rendementNetNet: number;
  effetLevier: number;
  tauxCouverture: number;
  rentabiliteFondsPropres: number;
  roiGlobal: number;
  prixM2Achat: number;
  evolutionAnnuelleMoyenne: number;
}

export function Rentabilite({
  rendementBrut,
  rendementNet,
  rendementNetNet,
  effetLevier,
  tauxCouverture,
  rentabiliteFondsPropres,
  roiGlobal,
  prixM2Achat,
  evolutionAnnuelleMoyenne,
}: RentabiliteProps) {
  return (
    <div>
      <SectionLabel eyebrow="Performance" title="Rentabilité" />
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Rendements</div>
          <Kpi label="Rendement brut" value={pct1(rendementBrut)} hint="Loyer annuel / Prix d'achat." />
          <div className="h-3" />
          <Kpi label="Rendement net" value={pct1(rendementNet)} hint="Loyer annuel net de charges / Prix d'achat." />
          <div className="h-3" />
          <Kpi label="Rendement net-net" value={pct1(rendementNetNet)} hint="Loyer annuel net de charges et d'impôts / Prix d'achat." />
        </Card>
        <Card className="p-5">
          <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Effet de levier</div>
          <Kpi label="Effet de levier" value={effetLevier.toFixed(2) + "x"} hint="Prix du bien / Apport. Mesure la puissance de l'emprunt." />
          <div className="h-3" />
          <Kpi label="Taux de couverture" value={pct1(tauxCouverture)} hint="Loyer / Mensualité crédit. > 100% signifie que le loyer paie tout le crédit." />
          <div className="h-3" />
          <Kpi label="Rentabilité / fonds propres" value={pct1(rentabiliteFondsPropres)} hint="Cash-flow annuel / Apport. Votre rendement 'cash' réel." />
        </Card>
        <Card className="p-5">
          <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Global</div>
          <Kpi label="ROI global à date" value={pct1(roiGlobal)} tone={roiGlobal >= 0 ? "pos" : "neg"} hint="(Plus-value + Capital remboursé + Cash-flow cumulé) / Apport." />
          <div className="h-3" />
          <Kpi label="Prix/m² achat" value={eur0(prixM2Achat) + "/m²"} hint="Prix total payé par m² Carrez." />
          <div className="h-3" />
          <Kpi label="Évolution annuelle moy." value={pct1(evolutionAnnuelleMoyenne)} hint="Taux de croissance annuel moyen de la valeur du bien." />
        </Card>
      </div>
    </div>
  );
}
