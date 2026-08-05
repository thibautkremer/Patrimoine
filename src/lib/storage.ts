import type {
  AppData,
  Params,
  Bien,
  Credit,
  Assurance,
  LocationParams,
  VenteParams,
  ScoreParams,
  FranceUsaRates,
  Property,
} from "../types";


export const DEFAULT_PARAMS: Params = {
  prixAchat: 280000,
  apport: 30000,
  dateAcquisition: "2019-06-01",
  dateLivraison: "2019-06-01",
  dateVente: "2026-12-31",
  inflation: 0.02,
  hausseLoyers: 0.015,
  hausseMarche: 0.02,
  vacance: 0.05,
  gestionLocativePct: 0.0,
  tmi: 0.30,
  ps: 0.172,
  abattementMicroBIC: 0.50,
  fraisAgenceVente: 0.05,
  fraisDiversVente: 2000,
  // Advanced Fiscal
  regimeFiscal: "micro-bic",
  valeurTerrainPct: 0.20,
  dureeAmortissementBien: 30,
  valeurMobilier: 15000,
  dureeAmortissementMobilier: 7,
};

export const DEFAULT_BIEN: Bien = {
  adresse: "9 avenue Descartes",
  ville: "92350 Le Plessis-Robinson",
  residence: "Sérénissime",
  type: "Appartement Duplex",
  surfaceCarrez: 65,
  surfaceSol: 70,
  balcon: 7,
  parkings: 2,
  exposition: "Nord",
  statut: "LMNP",
  valeurActuelle: 480000,
  dpe: "C",
};

export const DEFAULT_CREDITS: Credit[] = [
  {
    id: "1",
    nom: "Prêt Initial (Racheté)",
    capital: 300000,
    dateDebut: "2019-06-01",
    taux: 0.018,
    dureeMois: 240,
    mensualite: 1450,
    differeMois: 12,
    dateFin: "2025-10-31",
  },
  {
    id: "2",
    nom: "Prêt Renégocié",
    capital: 299920.05,
    dateDebut: "2025-11-01",
    taux: 0.04,
    dureeMois: 287,
    mensualite: 1625.01,
    differeMois: 0,
    dateFin: null,
    refinancesCreditId: "1",
  },
];

export const DEFAULT_ASSURANCES: Assurance[] = [
  {
    id: "1",
    creditId: "1",
    nom: "Assurance Prêt Initial",
    primeMensuelle: 30,
    dateDebut: "2019-06-01",
    dateFin: "2025-10-31",
  },
  {
    id: "2",
    creditId: "2",
    nom: "Assurance Prêt Renégocié",
    primeMensuelle: 31.11,
    dateDebut: "2025-11-01",
    dateFin: null,
  },
];

export const DEFAULT_LOC: LocationParams = {
  loyerHC: 1485,
  chargesRecuperees: 203,
  taxeFonciere: 1529,
  chargesCopro: 180,
  chargesNonRecup: 40,
  travaux: 600,
  assurancePNO: 150,
};

export const DEFAULT_VENTE: VenteParams = {
  prixVente: 500000,
};

export const DEFAULT_SCORE: ScoreParams = {
  emplacement: 8,
  etat: 8,
  liquidite: 7,
  risque: 6,
  qualite: 8,
};

export const DEFAULT_FU: FranceUsaRates = {
  conserver: 0.055,
  etf: 0.06,
  immoUsa: 0.05,
  banque: 0.025,
  actions: 0.07,
};

export function createDefaultProperty(id: string = "default", name: string = "Résidence Sérénissime"): Property {
  return {
    id,
    name,
    params: { ...DEFAULT_PARAMS },
    bien: { ...DEFAULT_BIEN },
    credits: [...DEFAULT_CREDITS],
    assurances: [...DEFAULT_ASSURANCES],
    loc: { ...DEFAULT_LOC },
    vente: { ...DEFAULT_VENTE },
    score: { ...DEFAULT_SCORE },
    fu: { ...DEFAULT_FU },
  };
}

const STORAGE_KEY = "patrimoine_expert_data";
const LEGACY_PREFIX = "appartement_";

export function loadAllAppData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AppData;
    } catch {
      // Corrupted data, fall back to migration or defaults
    }
  }

  // Check for legacy data to migrate
  const legacyParams = localStorage.getItem(LEGACY_PREFIX + "params");
  if (legacyParams) {
    return migrateLegacyData();
  }

  // No data at all, return fresh default AppData
  const defaultProperty = createDefaultProperty();
  return {
    properties: [defaultProperty],
    currentPropertyId: defaultProperty.id,
    settings: {},
    logs: [],
  };
}

function migrateLegacyData(): AppData {
  const getLegacy = <T>(key: string, def: T): T => {
    const s = localStorage.getItem(LEGACY_PREFIX + key);
    if (!s) return def;
    try { return JSON.parse(s) as T; } catch { return def; }
  };

  const property: Property = {
    id: "legacy",
    name: "Mon Bien (Migré)",
    params: { ...DEFAULT_PARAMS, ...getLegacy("params", {}) },
    bien: { ...DEFAULT_BIEN, ...getLegacy("bien", {}) },
    credits: getLegacy("credits", DEFAULT_CREDITS),
    assurances: getLegacy("assurances", DEFAULT_ASSURANCES),
    loc: getLegacy("loc", DEFAULT_LOC),
    vente: getLegacy("vente", DEFAULT_VENTE),
    score: getLegacy("score", DEFAULT_SCORE),
    fu: getLegacy("fu", DEFAULT_FU),
  };

  const data: AppData = {
    properties: [property],
    currentPropertyId: property.id,
    settings: {},
    logs: getLegacy("logs", []),
  };

  saveAllAppData(data);
  // Optional: clear legacy keys if desired, but safer to keep for a while
  return data;
}

export function saveAllAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Erreur sauvegarde localStorage:", err);
  }
}

export function clearAllAppData(): void {
  localStorage.removeItem(STORAGE_KEY);
  // Also clear legacy keys
  const keys = ["params", "bien", "credits", "assurances", "loc", "vente", "score", "fu", "logs"];
  keys.forEach(k => localStorage.removeItem(LEGACY_PREFIX + k));
}

export function exportDataAsJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importDataFromJson(jsonStr: string): AppData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.properties) && parsed.currentPropertyId) {
      return parsed as AppData;
    }
    return null;
  } catch {
    return null;
  }
}

// Deprecated helpers for compatibility if needed during refactor
export function getStoredData<T>(key: string, defaultValue: T): T {
  if (!key) return defaultValue;
  return defaultValue;
}
export function setStoredData(key: string, value: unknown): void {
  if (!key || !value) return;
  return;
}











