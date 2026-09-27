import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Calculator,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Receipt,
  FileCheck,
  Building2,
  DollarSign,
  Info,
  Layers,
} from 'lucide-react';
import { Contract, PPhType, RealSettlementCalculation } from '../types/contract';
import {
  formatRupiah,
  formatTanggalIndonesia,
  PPH_OPTIONS,
  calculateRealSettlement,
} from '../utils/formatters';

interface RealSettlementModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettlement: (contractId: string, calculation: RealSettlementCalculation) => void;
  onRemoveSettlement?: (contractId: string) => void;
}

export const RealSettlementModal: React.FC<RealSettlementModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSaveSettlement,
  onRemoveSettlement,
}) => {
  if (!isOpen || !contract) return null;

  // Initial values from contract or calculation points
  const initialBoq =
    contract.penerimaanReal?.boqBase ||
    contract.perhitunganTerakhir?.jumlah ||
    contract.nilaiKontrak - (contract.perhitunganTerakhir?.pajak || 0) ||
    contract.nilaiKontrak;

  const initialPpn =
    contract.penerimaanReal?.ppnAmount ??
    (contract.perhitunganTerakhir?.pajak ||
      Math.max(0, contract.nilaiKontrak - initialBoq));

  const [boqAmount, setBoqAmount] = useState<number>(initialBoq);
  const [selectedPphType, setSelectedPphType] = useState<PPhType>(
    contract.penerimaanReal?.pphType || 'pph22'
  );
  const [customRatePercent, setCustomRatePercent] = useState<string>(
    contract.penerimaanReal?.pphType === 'custom'
      ? (contract.penerimaanReal.pphRate * 100).toString()
      : '1.5'
  );
  const [customLabel, setCustomLabel] = useState<string>(
    contract.penerimaanReal?.pphType === 'custom'
      ? contract.penerimaanReal.pphLabel
      : ''
  );
  const [note, setNote] = useState<string>(
    contract.penerimaanReal?.catatan || ''
  );

  // Sync state if contract changes
  useEffect(() => {
    if (contract) {
      const boq =
        contract.penerimaanReal?.boqBase ||
        contract.perhitunganTerakhir?.jumlah ||
        contract.nilaiKontrak - (contract.perhitunganTerakhir?.pajak || 0) ||
        contract.nilaiKontrak;
      setBoqAmount(boq);
      setSelectedPphType(contract.penerimaanReal?.pphType || 'pph22');
      if (contract.penerimaanReal?.pphType === 'custom') {
        setCustomRatePercent((contract.penerimaanReal.pphRate * 100).toString());
        setCustomLabel(contract.penerimaanReal.pphLabel);
      }
      setNote(contract.penerimaanReal?.catatan || '');
    }
  }, [contract]);

  // Determine current rate
  let currentRate = 0.015;
  let currentLabel = 'PPh 22 1,5% (Material)';

  if (selectedPphType === 'custom') {
    const parsed = parseFloat(customRatePercent) || 0;
    currentRate = parsed / 100;
    currentLabel = customLabel.trim() || `PPh Custom ${parsed}%`;
  } else {
    const matched = PPH_OPTIONS.find((opt) => opt.type === selectedPphType);
    if (matched) {
      currentRate = matched.rate;
      currentLabel = matched.label;
    }
  }

  // Calculate live breakdown using the user's exact formula:
  // BOq - (BOq x tipe PPh) = Hasil / Penerimaan Real
  const liveCalculation = calculateRealSettlement(
    boqAmount,
    currentRate,
    initialPpn,
    selectedPphType,
    currentLabel,
    note.trim()
  );

  const handleSave = () => {
    onSaveSettlement(contract.id, liveCalculation);
    onClose();
  };

  const handleResetToContractBoq = () => {
    const originalBoq =
      contract.perhitunganTerakhir?.jumlah ||
      contract.nilaiKontrak - (contract.perhitunganTerakhir?.pajak || 0) ||
      contract.nilaiKontrak;
    setBoqAmount(originalBoq);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                  Status: Lunas
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {contract.unitKontrak}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                Perhitungan Penerimaan Real (Setelah PPN & PPh)
              </h3>
              <p className="text-xs text-slate-600 line-clamp-1">
                {contract.nomorKontrak} • {contract.rekanan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Rumus Banner */}
          <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                Ketentuan Rumus Penerimaan Real:
              </span>
              <p className="text-xs font-mono font-bold text-sky-950 mt-0.5">
                BOq - (BOq × Tipe PPh) = Hasil / Penerimaan Real
              </p>
            </div>
          </div>

          {/* LANGKAH 1: Pengurangan PPN dari Nilai Kontrak */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
                Nilai Kontrak & Pengurangan PPN (Menghasilkan BOQ)
              </h4>
              <button
                type="button"
                onClick={handleResetToContractBoq}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold hover:underline"
              >
                Reset ke BoQ Kontrak
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nilai Kontrak Bruto */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Nilai Kontrak Bruto
                </span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">
                  {formatRupiah(contract.nilaiKontrak)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Total tagihan pengguna jasa</p>
              </div>

              {/* Pengurangan PPN */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">
                  Pengurangan PPN ({contract.perhitunganTerakhir?.persentasePajak || '11%'})
                </span>
                <p className="text-sm font-extrabold text-rose-600 mt-0.5 font-mono">
                  -{formatRupiah(initialPpn)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Dipotong/disetor kas negara</p>
              </div>

              {/* Nilai Dasar BOQ */}
              <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                  Dasar BOQ (DPP Pekerjaan)
                </span>
                <p className="text-sm font-black text-emerald-950 mt-0.5 font-mono">
                  {formatRupiah(boqAmount)}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">Dasar pengenaan PPh</p>
              </div>
            </div>

            {/* Input adjustment for BOQ */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] text-slate-600 font-medium">
                Sesuaikan Nilai Dasar BOQ (Rp) jika ada revisi:
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  Rp
                </span>
                <input
                  type="number"
                  value={boqAmount || ''}
                  onChange={(e) => setBoqAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* LANGKAH 2: Pilih Tipe PPh (3 Jenis) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              Pilih Jenis PPh (3 Opsi Standar Transaksi)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PPH_OPTIONS.map((opt) => {
                const isSelected = selectedPphType === opt.type;
                const samplePotongan = Math.round(boqAmount * opt.rate);
                return (
                  <div
                    key={opt.type}
                    onClick={() => setSelectedPphType(opt.type)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="pph_type_selection"
                          checked={isSelected}
                          onChange={() => setSelectedPphType(opt.type)}
                          className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="font-bold text-xs text-slate-900">{opt.name}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-100 text-emerald-800">
                        {opt.ratePercent}%
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-slate-700">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                      {opt.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Potongan PPh:</span>
                      <span className="font-mono font-bold text-rose-600">
                        -{formatRupiah(samplePotongan)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Opsi Kustom jika ada tarif khusus */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <label
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setSelectedPphType('custom')}
              >
                <input
                  type="radio"
                  name="pph_type_selection"
                  checked={selectedPphType === 'custom'}
                  onChange={() => setSelectedPphType('custom')}
                  className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Opsi Tarif Kustom / Khusus
                </span>
              </label>

              {selectedPphType === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nama / Label (misal: PPh Final 2.65%)"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="p-1.5 text-xs bg-white border border-slate-300 rounded-lg w-44"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      placeholder="1.5"
                      value={customRatePercent}
                      onChange={(e) => setCustomRatePercent(e.target.value)}
                      className="w-16 p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-right font-mono"
                    />
                    <span className="text-xs font-bold text-slate-600">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LANGKAH 3: Rincian Rumus & Hasil Penerimaan Real */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-2 border-emerald-400 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
              Hasil Perhitungan Penerimaan Real
            </h4>

            {/* Calculation Table Breakdown */}
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-xs divide-y divide-slate-100">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">1. Nilai Dasar BOQ</span>
                  <p className="text-[10px] text-slate-400">Subtotal pekerjaan setelah dipotong PPN</p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900">
                  {formatRupiah(liveCalculation.boqBase)}
                </span>
              </div>

              <div className="p-3 flex items-center justify-between bg-rose-50/40">
                <div>
                  <span className="text-xs font-bold text-rose-800">
                    2. Potongan {liveCalculation.pphLabel}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    BOQ × {(liveCalculation.pphRate * 100).toFixed(2)}%
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-rose-600">
                  -{formatRupiah(liveCalculation.pphAmount)}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-100/60 flex items-center justify-between border-t-2 border-emerald-400">
                <div>
                  <span className="text-sm font-black text-emerald-950 uppercase tracking-wider block">
                    Penerimaan Real (Kas Bersih)
                  </span>
                  <span className="text-[11px] text-emerald-800 font-mono">
                    BOQ - (BOQ × {liveCalculation.pphLabel.split(' ')[1] || 'PPh'})
                  </span>
                </div>
                <span className="font-mono text-lg font-black text-emerald-950">
                  {formatRupiah(liveCalculation.penerimaanReal)}
                </span>
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Catatan Penerimaan / Rekening / No. BAP (Opsional):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Pencairan via Bank Mandiri No. SP2D: 00291/SP2D/2026..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {contract.penerimaanReal && onRemoveSettlement ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Hapus kalkulasi penerimaan real dari kontrak ini?')) {
                  onRemoveSettlement(contract.id);
                  onClose();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline"
            >
              Hapus Kalkulasi Real
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              *Tersimpan pada data transaksi kontrak
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Penerimaan Real</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
