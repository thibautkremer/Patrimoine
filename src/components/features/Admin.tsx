import React from "react";
import { ClipboardPaste, AlertCircle, Trash2, Download, Upload } from "lucide-react";
import { SectionLabel } from "../ui/SectionLabel";
import { Card } from "../ui/Card";
import { INK, LINE } from "../../App.constants";
import type { LogEntry } from "../../types";

interface AdminProps {
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importText: string;
  setImportText: (v: string) => void;
  handleImport: () => void;
  logs: LogEntry[];
  setLogs: (logs: LogEntry[]) => void;
  resetData: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Admin({
  handleFileImport,
  importText,
  setImportText,
  handleImport,
  logs,
  setLogs,
  resetData,
  onExport,
  onImport,
}: AdminProps) {
  return (
    <div className="space-y-6">
      <SectionLabel eyebrow="Administration" title="Contrôle & Automatisation" />

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col">
          <div className="font-serif text-[14px] mb-3 flex items-center gap-2" style={{ color: INK }}>
            <ClipboardPaste size={16} />
            <span>Import intelligent (Paste & Parse)</span>
          </div>
          <p className="text-[12px] text-[#8b8577] mb-4">
            Copiez le texte ou importez un fichier (.txt, .csv) d'un échéancier, acte de vente ou contrat d'assurance.
          </p>
          <input type="file" accept=".txt,.csv,.pdf" onChange={handleFileImport} className="mb-4 text-[12px]" />
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Collez votre document ici..."
            className="flex-1 w-full h-40 p-3 text-[12.5px] border rounded-sm bg-[#FBFAF7] outline-none font-mono"
            style={{ borderColor: LINE }}
          />
          <button
            onClick={handleImport}
            className="mt-4 px-4 py-2 bg-[#152238] text-white text-[13px] rounded-sm hover:bg-[#1e2f4d] transition-colors"
          >
            Analyser et Appliquer
          </button>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card className="p-5 flex-1 flex flex-col">
            <div className="font-serif text-[14px] mb-3 flex items-center justify-between" style={{ color: INK }}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Console de Logs</span>
              </div>
              <button onClick={() => setLogs([])} className="text-[10px] uppercase tracking-wider text-[#8b8577] hover:text-[#152238]">Effacer</button>
            </div>
            <div className="flex-1 overflow-auto bg-[#1e2f4d] p-3 rounded-sm font-mono text-[11px] min-h-[150px]">
              {logs.length === 0 ? (
                <div className="text-[#4a5d7e] italic">Aucun événement enregistré...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 border-b border-white/5 pb-1">
                    <span className="text-[#7c8499] mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={log.level === "error" ? "text-red-400" : log.level === "warning" ? "text-yellow-400" : log.level === "success" ? "text-green-400" : "text-[#B7BECF]"}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-serif text-[14px] mb-3" style={{ color: INK }}>Sauvegarde & Transfert</div>
            <p className="text-[12px] text-[#8b8577] mb-4">
              Exportez l'intégralité de vos données dans un fichier JSON pour sauvegarde ou importez une sauvegarde existante.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#F4F2EC] text-[#152238] border border-[#E1DCCC] text-[12.5px] rounded-sm hover:bg-[#E1DCCC] transition-colors"
              >
                <Download size={14} />
                <span>Exporter JSON</span>
              </button>
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#F4F2EC] text-[#152238] border border-[#E1DCCC] text-[12.5px] rounded-sm hover:bg-[#E1DCCC] cursor-pointer transition-colors">
                <Upload size={14} />
                <span>Importer JSON</span>
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5 border-red-100 bg-red-50/30">
        <div className="font-serif text-[14px] mb-3 text-red-900">Zone de danger</div>
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-red-800/70 max-w-md">
            Effacer toutes les données sauvegardées localement et réinitialiser l'application aux valeurs d'usine.
          </p>
          <button
            onClick={resetData}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 text-[13px] rounded-sm hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} />
            Réinitialiser tout
          </button>
        </div>
      </Card>
    </div>
  );
}

