import React, { useMemo, useState, useCallback } from "react";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { ChevronRight, Menu, X } from "lucide-react";

import {
  loadAllAppData,
  saveAllAppData,
  createDefaultProperty,
  exportDataAsJson,
  importDataFromJson,
  clearAllAppData
} from "./lib/storage";



import {
  buildAmortization,
  combineAmortizations,
  crdAt,
  venteCalc,
  irr,
  npvExcel,
  calculateTaxLMNP,
  bareme
} from "./lib/finance";


import { eur0 } from "./lib/utils";

import {
  INK,
  PAPER,
  BRASS,
  BRASS_LIGHT,
  POSITIVE,
  NEGATIVE,
  NAV,
  SCENARIOS,
  SIM_YEARS,
  LINE
} from "./App.constants";

import type {
  Params,
  Bien,
  Credit,
  Assurance,
  LocationParams,
  VenteParams,
  ScoreParams,
  FranceUsaRates,
  LogEntry,
  Property,
  AppData
} from "./types";

import { Card } from "./components/ui/Card";
import { Dashboard } from "./components/features/Dashboard";
import { Bien as BienFeature } from "./components/features/Bien";

import { Credit as CreditFeature } from "./components/features/Credit";
import { Location as LocationFeature } from "./components/features/Location";
import { Cashflow as CashflowFeature } from "./components/features/Cashflow";
import { Rentabilite as RentabiliteFeature } from "./components/features/Rentabilite";
import { Vente as VenteFeature } from "./components/features/Vente";
import { Simulations as SimulationsFeature } from "./components/features/Simulations";
import { FranceUsa as FranceUsaFeature } from "./components/features/FranceUsa";
import { Parametres as ParametresFeature } from "./components/features/Parametres";
import { Assurance as AssuranceFeature } from "./components/features/Assurance";
import { Admin as AdminFeature } from "./components/features/Admin";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(() => !!appData.settings.pin);



  const [pinInput, setPinInput] = useState("");

  const [appData, setAppData] = useState<AppData>(() => loadAllAppData());

  const currentProperty = useMemo(() => {
    return appData.properties.find(p => p.id === appData.currentPropertyId) || appData.properties[0];
  }, [appData]);

  const { params, bien, credits, assurances, loc, vente, score, fu } = currentProperty;
  const logs = appData.logs;

  const updateCurrentProperty = useCallback((updates: Partial<Property>) => {
    setAppData(prev => {
      const next = {
        ...prev,
        properties: prev.properties.map(p => p.id === prev.currentPropertyId ? { ...p, ...updates } : p)
      };
      saveAllAppData(next);
      return next;
    });
  }, [setAppData]);

  const setParams = (v: Params | ((p: Params) => Params)) => {
    const next = typeof v === "function" ? v(params) : v;
    updateCurrentProperty({ params: next });
  };
  const setBien = (v: Bien | ((p: Bien) => Bien)) => {
    const next = typeof v === "function" ? v(bien) : v;
    updateCurrentProperty({ bien: next });
  };
  const setCredits = (v: Credit[] | ((p: Credit[]) => Credit[])) => {
    const next = typeof v === "function" ? v(credits) : v;
    updateCurrentProperty({ credits: next });
  };
  const setAssurances = (v: Assurance[] | ((p: Assurance[]) => Assurance[])) => {
    const next = typeof v === "function" ? v(assurances) : v;
    updateCurrentProperty({ assurances: next });
  };
  const setLoc = (v: LocationParams | ((p: LocationParams) => LocationParams)) => {
    const next = typeof v === "function" ? v(loc) : v;
    updateCurrentProperty({ loc: next });
  };
  const setVente = (v: VenteParams | ((p: VenteParams) => VenteParams)) => {
    const next = typeof v === "function" ? v(vente) : v;
    updateCurrentProperty({ vente: next });
  };
  const setScore = (v: ScoreParams | ((p: ScoreParams) => ScoreParams)) => {
    const next = typeof v === "function" ? v(score) : v;
    updateCurrentProperty({ score: next });
  };
  const setFu = (v: FranceUsaRates | ((p: FranceUsaRates) => FranceUsaRates)) => {
    const next = typeof v === "function" ? v(fu) : v;
    updateCurrentProperty({ fu: next });
  };
  const setLogs = useCallback((v: LogEntry[] | ((p: LogEntry[]) => LogEntry[])) => {
    setAppData(prev => {
      const nextLogs = typeof v === "function" ? v(prev.logs) : v;
      const n = { ...prev, logs: nextLogs };
      saveAllAppData(n);
      return n;
    });
  }, [setAppData]);



  const switchProperty = (id: string) => {
    setIsLocked(!!appData.settings.pin);
    setAppData(prev => {
      const next = { ...prev, currentPropertyId: id };
      saveAllAppData(next);
      return next;
    });
  };


  const addProperty = () => {
    const name = prompt("Nom du nouveau bien ?", "Nouveau bien");
    if (!name) return;
    const newProp = createDefaultProperty(crypto.randomUUID(), name);
    setAppData(prev => {
      const next = {
        ...prev,
        properties: [...prev.properties, newProp],
        currentPropertyId: newProp.id
      };
      saveAllAppData(next);
      return next;
    });
    addLog(`Nouveau bien créé : ${name}`);
  };

  const deleteProperty = (id: string) => {
    if (appData.properties.length <= 1) return;
    const prop = appData.properties.find(p => p.id === id);
    if (!confirm(`Supprimer le bien "${prop?.name}" ?`)) return;

    setAppData(prev => {
      const remaining = prev.properties.filter(p => p.id !== id);
      const nextId = id === prev.currentPropertyId ? remaining[0].id : prev.currentPropertyId;
      const next = {
        ...prev,
        properties: remaining,
        currentPropertyId: nextId
      };
      saveAllAppData(next);
      return next;
    });
  };

  const updatePin = (newPin: string) => {
    setAppData(prev => {
      const next = { ...prev, settings: { ...prev.settings, pin: newPin } };
      saveAllAppData(next);
      return next;
    });
  };

  const handlePinSubmit = (e: React.FormEvent) => {

    e.preventDefault();
    if (pinInput === appData.settings.pin) {
      setIsLocked(false);
    } else {
      alert("Code PIN incorrect");
      setPinInput("");
    }
  };


  const [importText, setImportText] = useState("");

  const addLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    const newLog: LogEntry = { timestamp: new Date().toISOString(), message, level };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, [setLogs]);

  const parseValue = (text: string, regex: RegExp, parser: (v: string) => number | null = parseFloat) => {
    const match = text.match(regex);
    return match ? parser(match[1].replace(/\s/g, "").replace(",", ".")) : null;
  };

  const triggerAnalysis = (textToAnalyze: string) => {
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      addLog("Erreur : Aucune donnée à analyser.", "error");
      return;
    }

    addLog(`Analyse de ${textToAnalyze.length} caractères...`, "info");
    let count = 0;

    try {
      // Credit parsing
      const cap = parseValue(textToAnalyze, /(?:capital|montant|prêt|emprunt)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);
      const rate = parseValue(textToAnalyze, /(?:taux|nominal)\s*[:=]?\s*(\d[\d\s,.]*)%/i, (v) => {
        const p = parseFloat(v);
        return isNaN(p) ? null : p / 100;
      });
      const dur = parseValue(textToAnalyze, /(?:durée|mois)\s*[:=]?\s*(\d+)\s*(?:mois)/i, (v) => {
        const p = parseInt(v);
        return isNaN(p) ? null : p;
      });
      const pmt = parseValue(textToAnalyze, /(?:mensualité|échéance)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);

      if (cap || rate || dur || pmt) {
        const id = crypto.randomUUID();
        const newCredit: Credit = {
          id,
          nom: `Prêt Importé ${credits.length + 1}`,
          capital: cap ?? 0,
          dateDebut: new Date().toISOString().slice(0, 10),
          taux: rate ?? 0.04,
          dureeMois: dur ?? 240,
          mensualite: pmt ?? 0,
          differeMois: 0,
          dateFin: null
        };
        setCredits(prev => [...prev, newCredit]);
        addLog(`Crédit ajouté : ${cap ? eur0(cap) : "Cap. inconnu"}`, "success");
        count++;
      } else {
        addLog("Aucune donnée de crédit trouvée.", "warning");
      }

      // Bien / Params parsing
      const prix = parseValue(textToAnalyze, /(?:prix d'achat|net vendeur|montant de la vente)\s*[:=]?\s*(\d[\d\s,.]*)\b/i);
      if (prix) {
        setParams(p => ({ ...p, prixAchat: prix }));
        addLog(`Prix d'achat mis à jour : ${eur0(prix)}`, "success");
        count++;
      }

      if (count > 0) {
        addLog(`Analyse terminée avec succès (${count} élément(s)).`, "success");
      } else {
        addLog("Analyse terminée, aucune donnée reconnue.", "warning");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      addLog(`Erreur critique : ${message}`, "error");
    }
    setImportText("");
  };

  const handleImport = () => triggerAnalysis(importText);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      addLog(`Lecture du PDF : ${file.name}...`, "info");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items as { str?: string }[]).map((item) => item.str || "").join(" ");
        text += pageText + "\n";
      }
      addLog(`PDF lu, ${text.length} chars extraits (${file.name})`, "success");
      triggerAnalysis(text);
      e.target.value = "";
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          triggerAnalysis(event.target.result);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  const resetData = () => {
    if (confirm("Réinitialiser toutes les données ? Cette action est irréversible (tous les biens seront effacés).")) {
      clearAllAppData();
      const fresh = loadAllAppData();
      setAppData(fresh);
      addLog("Réinitialisation complète effectuée.", "warning");
    }
  };

  const handleExport = () => {

    const json = exportDataAsJson(appData);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patrimoine_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Export des données réussi.", "success");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = importDataFromJson(evt.target?.result as string);
      if (data) {
        setAppData(data);
        saveAllAppData(data);
        addLog("Import des données réussi.", "success");
      } else {
        addLog("Erreur lors de l'import JSON : Format invalide.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };


  const today = useMemo(() => new Date(), []);


  /* ---------- derived model ---------- */

  const individualAmorts = useMemo(() => credits.map(c => buildAmortization(c)), [credits]);
  const amort = useMemo(() => combineAmortizations(individualAmorts, assurances), [individualAmorts, assurances]);

  const crdToday = useMemo(() => crdAt(amort, today), [amort, today]);
  const monthsElapsed = useMemo(() => amort.filter((r) => r.date <= today).length, [amort, today]);
  const totalCapitalEmprunte = useMemo(() => {
    return credits.reduce((sum, credit) => {
      if (credit.refinancesCreditId) return sum;
      return sum + credit.capital;
    }, 0);
  }, [credits]);

  const capitalRembourse = totalCapitalEmprunte - crdToday;
  const interetsPayes = useMemo(() => amort.filter((r) => r.date <= today).reduce((s, r) => s + r.interet, 0), [amort, today]);
  const interetsRestants = useMemo(() => amort.filter((r) => r.date > today).reduce((s, r) => s + r.interet, 0), [amort, today]);
  const coutTotalCredit = useMemo(() => amort.reduce((s, r) => s + r.interet, 0) + amort.reduce((s, r) => s + r.assurance, 0), [amort]);
  const totalMensualiteActuelle = useMemo(() => {
    const row = amort.find((m) => m.date.getFullYear() === today.getFullYear() && m.date.getMonth() === today.getMonth());
    return row ? row.mensualiteTotale : 0;
  }, [amort, today]);
  const dureeRestante = amort.filter(r => r.date > today).length;

  const reneg = useMemo(() => {
    const rates = [0.04, 0.0375, 0.035, 0.0325, 0.03, 0.0275, 0.025];
    const iraEstimee = Math.min(crdToday * 0.03, (crdToday * 0.03) / 2);

    return rates.map((taux) => {
      const r = taux / 12;
      const n = Math.max(1, dureeRestante);
      const pmt = r === 0 ? crdToday / n : (crdToday * r) / (1 - Math.pow(1 + r, -n));
      const mensualiteActuelle = amort.find(m => m.date > today)?.mensualiteTotale ?? 0;
      const economieMensuelle = mensualiteActuelle - pmt;
      const economieTotaleBrute = economieMensuelle * n;
      const economieTotaleNette = economieTotaleBrute - iraEstimee;
      return { taux, mensualite: pmt, economieMensuelle, economieTotale: economieTotaleNette, duree: n, ira: iraEstimee };
    });
  }, [crdToday, dureeRestante, amort, today]);

  const loyerAnnuelBrut = (loc.loyerHC + loc.chargesRecuperees) * 12;
  const perteVacance = -loyerAnnuelBrut * params.vacance;
  const revenuEncaisse = loyerAnnuelBrut + perteVacance;
  const coutGestion = -revenuEncaisse * params.gestionLocativePct;
  const chargesCoproAn = -loc.chargesCopro * 12;
  const chargesNonRecupAn = -loc.chargesNonRecup * 12;
  const taxeFonciereAn = -loc.taxeFonciere;
  const travauxAn = -loc.travaux;
  const assurancePNOAn = -loc.assurancePNO;
  const chargesAnnuellesTotal = -(coutGestion + chargesCoproAn + chargesNonRecupAn + taxeFonciereAn + travauxAn + assurancePNOAn);
  const revenuNetAvantImpot = revenuEncaisse - chargesAnnuellesTotal;

  const fiscalite = useMemo(() => {
    return calculateTaxLMNP(revenuEncaisse, interetsPayes / (monthsElapsed / 12 || 1), chargesAnnuellesTotal, params);
  }, [revenuEncaisse, interetsPayes, monthsElapsed, chargesAnnuellesTotal, params]);

  const revenuNetNet = revenuNetAvantImpot + fiscalite.impot;

  const cashflowMensuel = useMemo(() => {
    const delivery = new Date(params.dateLivraison + "T00:00:00");
    return amort.map((row) => {
      const isDelivered = row.date >= delivery;
      const loyer = isDelivered ? loc.loyerHC * (1 - params.vacance) : 0;
      const chargesRecup = isDelivered ? loc.chargesRecuperees * (1 - params.vacance) : 0;
      const entrees = loyer + chargesRecup;
      const sorties = row.mensualiteTotale + (isDelivered ? (loc.taxeFonciere / 12 + loc.chargesCopro + loc.chargesNonRecup + loc.travaux / 12 + loc.assurancePNO / 12) : 0);
      const cf = entrees - sorties;
      return { date: row.date, cf, enrichissement: cf + row.capAmorti };
    });
  }, [amort, loc, params.vacance, params.dateLivraison]);


  const cashflowAnnuel = useMemo(() => {
    const byYear: Record<number, { annee: number; cf: number; enrichissement: number }> = {};
    cashflowMensuel.forEach((m) => {
      const y = m.date.getFullYear();
      if (!byYear[y]) {
        byYear[y] = { annee: y, cf: 0, enrichissement: 0 };
      }
      byYear[y].cf += m.cf;
      byYear[y].enrichissement += m.enrichissement;
    });
    return Object.values(byYear).sort((a, b) => a.annee - b.annee);
  }, [cashflowMensuel]);

  const cashflowAnnuelCourant = cashflowAnnuel.find((y) => y.annee === today.getFullYear())?.cf ?? 0;
  const cashflowMensuelActuel = useMemo(() => {
    const row = cashflowMensuel.find((m) => m.date.getFullYear() === today.getFullYear() && m.date.getMonth() === today.getMonth());
    return row ? row.cf : (cashflowMensuel[monthsElapsed - 1]?.cf ?? 0);
  }, [cashflowMensuel, today, monthsElapsed]);

  const rendementBrut = loyerAnnuelBrut / params.prixAchat;
  const rendementNet = revenuNetAvantImpot / params.prixAchat;
  const rendementNetNet = revenuNetNet / params.prixAchat;
  const prixM2Achat = params.prixAchat / bien.surfaceCarrez;
  const prixM2Actuel = bien.valeurActuelle / bien.surfaceCarrez;
  const anciennete = (today.getTime() - new Date(params.dateAcquisition).getTime()) / (365.25 * 86400000);
  const evolutionAnnuelleMoyenne = Math.pow(bien.valeurActuelle / params.prixAchat, 1 / (anciennete || 1)) - 1;
  const effetLevier = params.prixAchat / (params.apport || 1);
  const tauxCouverture = loc.loyerHC / (totalMensualiteActuelle || 1);
  const rentabiliteFondsPropres = cashflowAnnuelCourant / (params.apport || 1);
  const plusValueBruteLatente = bien.valeurActuelle - params.prixAchat;

  const venteMain = useMemo(
    () => venteCalc({ prixVenteVal: vente.prixVente, dateVenteVal: new Date(params.dateVente), params, amort }),
    [vente.prixVente, params, amort]
  );

  const venteScenarios = useMemo(
    () => SCENARIOS.map((p) => ({ prix: p, ...venteCalc({ prixVenteVal: p, dateVenteVal: new Date(params.dateVente), params, amort }) })),
    [params, amort]
  );

  const roiGlobal = ((bien.valeurActuelle - params.prixAchat) + capitalRembourse + cashflowMensuel.filter(m => m.date <= today).reduce((s, m) => s + m.cf, 0)) / (params.apport || 1);

  const simulations = useMemo(() => {
    return SIM_YEARS.map((yr) => {
      const dateFin = new Date(yr, 11, 31);
      const valeurBien = bien.valeurActuelle * Math.pow(1 + params.hausseMarche, yr - today.getFullYear());
      const crd = crdAt(amort, dateFin);
      const pvBrute = valeurBien - params.prixAchat;
      const patrimoineNet = valeurBien - crd;
      const cfCumule = cashflowMensuel.filter((m) => m.date >= today && m.date <= dateFin).reduce((s, m) => s + m.cf, 0);
      const { ir: abIR, ps: psBareme } = bareme((dateFin.getTime() - new Date(params.dateAcquisition).getTime()) / (365.25 * 86400000));
      const impot = Math.max(0, pvBrute * (1 - abIR)) * 0.19 + Math.max(0, pvBrute * (1 - psBareme)) * params.ps;
      const capitalRecupere = valeurBien * (1 - params.fraisAgenceVente) - params.fraisDiversVente - crd - impot;
      const nYears = Math.max(1, yr - today.getFullYear());
      const rentabiliteAnnualisee = Math.pow(Math.max(0.0001, (capitalRecupere + cfCumule) / (params.apport || 1)), 1 / nYears) - 1;
      return { annee: yr, valeurBien, crd, pvBrute, patrimoineNet, cfCumule, capitalRecupere, rentabiliteAnnualisee };
    });
  }, [amort, bien, params, cashflowMensuel, today]);

  const triVan = useMemo(() => {
    const startYear = today.getFullYear();
    const endYear = new Date(params.dateVente).getFullYear();
    if (endYear < startYear) return { flows: [], tri: NaN, van: NaN };

    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);

    const flows = years.map((yr) => {
      let f = cashflowAnnuel.filter((m) => m.annee === yr).reduce((s, m) => s + m.cf, 0);
      if (yr === startYear) f -= params.apport;
      if (yr === endYear) {
        const v = venteCalc({ prixVenteVal: vente.prixVente, dateVenteVal: new Date(params.dateVente), params, amort });
        f += v.capitalDispo;
      }
      return f;
    });
    const tri = irr(flows, 0.08);
    const van = npvExcel(params.inflation, flows);
    return { flows, tri, van };
  }, [cashflowAnnuel, vente, params, amort, today]);

  const scoreAuto = {
    rentabilite: Math.min(10, Math.max(0, (rendementNetNet / 0.08) * 10)),
    effetLevier: Math.min(10, Math.max(0, 10 - (effetLevier - 5))),
    potentielPV: Math.min(10, Math.max(0, (params.hausseMarche / 0.04) * 10)),
    fiscalite: Math.min(10, Math.max(0, 10 - ((params.tmi + params.ps) / 0.30) * 10)),
    cashflow: Math.min(10, Math.max(0, 5 + cashflowAnnuelCourant / 1000)),
  };
  const scoreTotal =
    score.emplacement + score.etat + scoreAuto.rentabilite + score.liquidite + scoreAuto.effetLevier +
    score.risque + scoreAuto.potentielPV + scoreAuto.fiscalite + scoreAuto.cashflow + score.qualite;
  const appreciation = scoreTotal >= 85 ? "Excellent" : scoreTotal >= 70 ? "Très bon" : scoreTotal >= 55 ? "Bon" : scoreTotal >= 40 ? "Moyen" : "Faible";
  const recommandation = (scoreTotal >= 65 && rendementNetNet >= 0.03) ? "CONSERVER"
    : (scoreTotal >= 50 || (scoreTotal >= 40 && rendementNetNet >= 0.02)) ? "SURVEILLER"
    : "VENDRE";
  const recoColor = recommandation === "CONSERVER" ? POSITIVE : recommandation === "SURVEILLER" ? BRASS : NEGATIVE;

  const franceUsaStrategies = useMemo(() => {
    const base = [
      { name: "Conserver le bien", capital: bien.valeurActuelle, rate: fu.conserver, key: "conserver" },
      { name: "Vendre + ETF monde", capital: venteMain.capitalDispo, rate: fu.etf, key: "etf" },
      { name: "Vendre + Immobilier USA", capital: venteMain.capitalDispo, rate: fu.immoUsa, key: "immoUsa" },
      { name: "Vendre + Placement bancaire", capital: venteMain.capitalDispo, rate: fu.banque, key: "banque" },
      { name: "Vendre + Actions", capital: venteMain.capitalDispo, rate: fu.actions, key: "actions" },
    ];
    return base.map((s) => ({
      ...s,
      y10: s.capital * Math.pow(1 + s.rate, 10),
      y20: s.capital * Math.pow(1 + s.rate, 20),
      y30: s.capital * Math.pow(1 + s.rate, 30),
    }));
  }, [bien.valeurActuelle, venteMain.capitalDispo, fu]);

  return (
    <div className="flex min-h-screen w-full relative" style={{ background: PAPER, fontFamily: "ui-sans-serif, system-ui" }}>
      <style>{`
        .font-serif { font-family: Georgia, Cambria, 'Times New Roman', serif; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      {/* Lock Screen */}
      {isLocked && appData.settings.pin && (
        <div className="fixed inset-0 z-[100] bg-[#152238] flex items-center justify-center p-4">
          <Card className="p-8 max-w-sm w-full text-center">
            <h1 className="font-serif text-2xl mb-4" style={{ color: INK }}>Accès sécurisé</h1>
            <p className="text-sm text-[#8b8577] mb-6">Veuillez saisir votre code PIN pour accéder à votre patrimoine.</p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] py-2 border-b-2 outline-none focus:border-[#8C6A2F]"
                style={{ borderColor: LINE }}
              />
              <button
                type="submit"
                className="w-full py-2 bg-[#152238] text-white uppercase tracking-wider font-semibold rounded-sm hover:bg-[#20314f] transition-colors"
              >
                Déverrouiller
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#152238] flex items-center px-4 justify-between z-50 text-white">
        <div className="font-serif text-[16px]">Patrimoine</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-[220px] shrink-0 text-[#EDE7D6] flex flex-col fixed lg:relative inset-y-0 left-0 z-40 transition-transform lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: INK }}>
        <div className="px-5 pt-6 pb-3 border-b border-white/10 hidden lg:block">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#C7A94F]">Patrimoine</div>
          <div className="font-serif text-[17px] leading-snug mt-1">Expertise Immobilière</div>
        </div>

        {/* Property Selector */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="text-[9px] uppercase tracking-widest text-[#B7BECF]/50 mb-2 px-1">Mes Biens</div>
          <div className="space-y-1">
            {appData.properties.map(p => (
              <div key={p.id} className="group flex items-center gap-2">
                <button
                  onClick={() => { switchProperty(p.id); setMobileMenuOpen(false); }}
                  className={`flex-1 text-left px-2 py-1.5 rounded-sm text-[12px] transition-colors truncate ${p.id === appData.currentPropertyId ? "bg-[#C7A94F] text-[#152238] font-bold" : "text-[#B7BECF] hover:bg-white/5"}`}
                >
                  {p.name}
                </button>
                {appData.properties.length > 1 && (
                  <button onClick={() => deleteProperty(p.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addProperty}
              className="w-full text-left px-2 py-1.5 text-[11px] text-[#C7A94F] hover:text-white transition-colors"
            >
              + Ajouter un bien
            </button>
          </div>
        </div>

        <nav className="flex-1 py-3 mt-14 lg:mt-0 overflow-y-auto">

          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[13px] transition-colors ${active ? "bg-white/10 text-white" : "text-[#B7BECF] hover:bg-white/5 hover:text-white"}`}
                style={active ? { borderLeft: `3px solid ${BRASS_LIGHT}` } : { borderLeft: "3px solid transparent" }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {active && <ChevronRight size={13} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 text-[10.5px] text-[#7c8499] border-t border-white/10">
          Outil de pilotage patrimonial — usage personnel.
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-4 lg:px-8 py-20 lg:py-7 max-w-[1180px] overflow-hidden">

        {tab === "dashboard" && (
          <Dashboard
            bien={bien}
            params={params}
            loc={loc}
            plusValueBruteLatente={plusValueBruteLatente}
            crdToday={crdToday}
            rendementBrut={rendementBrut}
            rendementNet={rendementNet}
            rendementNetNet={rendementNetNet}
            cashflowMensuelActuel={cashflowMensuelActuel}
            cashflowAnnuelCourant={cashflowAnnuelCourant}
            triVan={triVan}
            capitalRembourse={capitalRembourse}
            interetsRestants={interetsRestants}
            credits={credits}
            score={score}
            scoreAuto={scoreAuto}
            recommandation={recommandation}
            recoColor={recoColor}
            appreciation={appreciation}
            scoreTotal={scoreTotal}
            setScore={setScore}
            amort={amort}
            cashflowAnnuel={cashflowAnnuel}
          />
        )}

        {tab === "bien" && (
          <BienFeature
            bien={bien}
            setBien={setBien}
            params={params}
            setParams={setParams}
            prixM2Actuel={prixM2Actuel}
            prixM2Achat={prixM2Achat}
            anciennete={anciennete}
            plusValueBruteLatente={plusValueBruteLatente}
            addLog={addLog}
          />
        )}
        {tab === "credit" && (
          <CreditFeature
            credits={credits}
            setCredits={setCredits}
            totalCapitalEmprunte={totalCapitalEmprunte}
            crdToday={crdToday}
            capitalRembourse={capitalRembourse}
            totalMensualiteActuelle={totalMensualiteActuelle}
            interetsPayes={interetsPayes}
            interetsRestants={interetsRestants}
            coutTotalCredit={coutTotalCredit}
            amort={amort}
            today={today}
            reneg={reneg}
            addLog={addLog}
            DEFAULT_CREDITS={[]}
          />
        )}

        {tab === "location" && (
          <LocationFeature
            loc={loc}
            setLoc={setLoc}
            loyerAnnuelBrut={loyerAnnuelBrut}
            perteVacance={perteVacance}
            revenuEncaisse={revenuEncaisse}
            coutGestion={coutGestion}
            chargesCoproAn={chargesCoproAn}
            chargesNonRecupAn={chargesNonRecupAn}
            taxeFonciereAn={taxeFonciereAn}
            travauxAn={travauxAn}
            assurancePNOAn={assurancePNOAn}
            revenuNetAvantImpot={revenuNetAvantImpot}
            baseImposable={fiscalite.baseImposable}
            impotLocation={fiscalite.impot}

            revenuNetNet={revenuNetNet}
          />
        )}
        {tab === "cashflow" && (
          <CashflowFeature
            cashflowAnnuel={cashflowAnnuel}
            cashflowMensuel={cashflowMensuel}
            loc={loc}
            params={params}
          />
        )}
        {tab === "rentabilite" && (
          <RentabiliteFeature
            rendementBrut={rendementBrut}
            rendementNet={rendementNet}
            rendementNetNet={rendementNetNet}
            effetLevier={effetLevier}
            tauxCouverture={tauxCouverture}
            rentabiliteFondsPropres={rentabiliteFondsPropres}
            roiGlobal={roiGlobal}
            prixM2Achat={prixM2Achat}
            evolutionAnnuelleMoyenne={evolutionAnnuelleMoyenne}
          />
        )}
        {tab === "vente" && (
          <VenteFeature
            vente={vente}
            setVente={setVente}
            params={params}
            setParams={setParams}
            venteMain={venteMain}
            venteScenarios={venteScenarios}
          />
        )}
        {tab === "simulations" && (
          <SimulationsFeature
            simulations={simulations}
            triVan={triVan}
          />
        )}
        {tab === "france-usa" && (
          <FranceUsaFeature
            franceUsaStrategies={franceUsaStrategies}
            fu={fu}
            setFu={setFu}
          />
        )}
        {tab === "parametres" && (
          <ParametresFeature
            params={params}
            setParams={setParams}
            addLog={addLog}
            updatePin={updatePin}
            pinEnabled={!!appData.settings.pin}
          />
        )}

        {tab === "assurance" && (
          <AssuranceFeature
            assurances={assurances}
            setAssurances={setAssurances}
            amort={amort}
            today={today}
          />
        )}
        {tab === "admin" && (
          <AdminFeature
            handleFileImport={handleFileImport}
            importText={importText}
            setImportText={setImportText}
            handleImport={handleImport}
            logs={logs}
            setLogs={setLogs}
            resetData={resetData}
            onExport={handleExport}
            onImport={handleImportJson}
          />
        )}


      </main>
    </div>
  );
}
