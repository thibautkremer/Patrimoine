export type RegimeFiscal = "micro-bic" | "reel";
export type DpeClass = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface Params {
  prixAchat: number;
  apport: number;
  dateAcquisition: string;
  dateLivraison: string;
  dateVente: string;
  inflation: number;
  hausseLoyers: number;
  hausseMarche: number;
  vacance: number;
  gestionLocativePct: number;
  tmi: number;
  ps: number;
  abattementMicroBIC: number;
  fraisAgenceVente: number;
  fraisDiversVente: number;
  // Advanced Fiscal
  regimeFiscal: RegimeFiscal;
  valeurTerrainPct: number;
  dureeAmortissementBien: number;
  valeurMobilier: number;
  dureeAmortissementMobilier: number;
}

export interface Bien {
  adresse: string;
  ville: string;
  residence: string;
  type: string;
  surfaceCarrez: number;
  surfaceSol: number;
  balcon: number;
  parkings: number;
  exposition: string;
  statut: string;
  valeurActuelle: number;
  dpe?: DpeClass;
}

export interface Credit {
  id: string;
  nom: string;
  capital: number;
  dateDebut: string;
  taux: number;
  dureeMois: number;
  mensualite: number;
  differeMois: number;
  dateFin: string | null;
  /** Identifiant optionnel d'un prêt refinancé par ce prêt */
  refinancesCreditId?: string | null;
}

export interface Assurance {
  id: string;
  creditId: string | null;
  nom: string;
  primeMensuelle: number;
  dateDebut: string;
  dateFin: string | null;
}

export interface LocationParams {
  loyerHC: number;
  chargesRecuperees: number;
  taxeFonciere: number;
  chargesCopro: number;
  chargesNonRecup: number;
  travaux: number;
  assurancePNO: number;
}

export interface VenteParams {
  prixVente: number;
}

export interface ScoreParams {
  emplacement: number;
  etat: number;
  liquidite: number;
  risque: number;
  qualite: number;
  [key: string]: number;
}

export interface FranceUsaRates {
  conserver: number;
  etf: number;
  immoUsa: number;
  banque: number;
  actions: number;
  [key: string]: number;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}

export interface AmortizationRow {
  n: number;
  date: Date;
  crdDebut: number;
  interet: number;
  capAmorti: number;
  crdFin: number;
  mensualiteTotale: number;
  isDiffere: boolean;
  assurance?: number;
  credits?: number;
}

export interface CombinedAmortizationRow extends AmortizationRow {
  assurance: number;
  credits: number;
}

export interface VenteCalcResult {
  dureeDetention: number;
  abIR: number;
  abPS: number;
  crd: number;
  pvBrute: number;
  fraisAgence: number;
  fraisDivers: number;
  pvImpIR: number;
  pvImpPS: number;
  impot: number;
  pvNette: number;
  argentRecupere: number;
  capitalDispo: number;
}

export interface Property {
  id: string;
  name: string;
  params: Params;
  bien: Bien;
  credits: Credit[];
  assurances: Assurance[];
  loc: LocationParams;
  vente: VenteParams;
  score: ScoreParams;
  fu: FranceUsaRates;
}

export interface AppSettings {
  pin?: string;
}

export interface AppData {
  properties: Property[];
  currentPropertyId: string;
  settings: AppSettings;
  logs: LogEntry[];
}


