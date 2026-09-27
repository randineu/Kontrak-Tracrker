import React, { useState } from 'react';
import { X, ArrowRight, Check, Coins } from 'lucide-react';
import { Contract, ContractStage } from '../types/contract';

interface ProgressUpdateModalProps {
  contract: Contract | null;
  targetStage: ContractStage | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmProgress: (
    contractId: string,
    newStage: ContractStage,
    note: string,
    picName: string,
    openRealCalculator?: boolean
  ) => void;
  currentUser?: string;
}

const STAGES: ContractStage[] = [
  'Draft Kontrak',
  'Masa Pekerjaan',
  'Tanda Tangan Berkas',
  'Upload Tagihan',
  'Lunas',
  'Status Koreksi',
];

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  contract,
  targetStage,
  isOpen,
  onClose,
  onConfirmProgress,
  currentUser,
}) => {
  if (!isOpen || !contract) return null;

  const [selectedStage, setSelectedStage] = useState<ContractStage>(
    targetStage || contract.status || 'Masa Pekerjaan'
  );
  const [note, setNote] = useState('');
  const [openRealCalc, setOpenRealCalc] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmProgress(
      contract.id,
      selectedStage,
      note.trim() || `Tahap diubah ke ${selectedStage}`,
      currentUser || 'Pengawas Kontrak',
      selectedStage === 'Lunas' && openRealCalc
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Pembaruan Progres</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* 1. Info Nomor Kontrak */}
          <div>
            <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
              Nomor Kontrak:
            </span>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono font-bold text-slate-900">
              {contract.nomorKontrak}
            </div>
          </div>

          {/* 2. Tahap Saat Ini dan Tahap Baru */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <span className="text-[11px] text-slate-500 font-medium block mb-0.5">
                Tahap Saat Ini:
              </span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700 font-semibold border border-slate-200 truncate">
                {contract.status}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-sky-800 font-medium block mb-0.5">
                Tahap Baru:
              </span>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as ContractStage)}
                className="w-full p-2 bg-white border border-sky-300 rounded-lg text-sky-950 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Catatan */}
          <div>
            <label className="text-[11px] text-slate-700 font-semibold block mb-1">
              Catatan:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tuliskan catatan progres atau kendala pekerjaan..."
              rows={3}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              autoFocus
            />
          </div>

          {/* Opsi Khusus jika Tahap Lunas */}
          {selectedStage === 'Lunas' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Kalkulasi Penerimaan Real (PPN & PPh)</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                Tersedia opsi perhitungan penerimaan Real dengan potongan PPN dan 3 tipe PPh (PPh 22 1,5%, PPh Final 1,75%, atau PPh 23 2%).
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={openRealCalc}
                  onChange={(e) => setOpenRealCalc(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span>Langsung buka kalkulator Penerimaan Real setelah simpan</span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
