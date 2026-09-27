import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Building2,
  UserCheck,
  FileText,
  DollarSign,
  AlertTriangle,
  FileSignature,
  Upload,
  CheckCircle2,
  ExternalLink,
  History,
  Send,
  HelpCircle,
  Trash2,
  FileEdit,
  Coins,
  Calculator,
} from 'lucide-react';
import { Contract, ContractStage, PPhType, RealSettlementCalculation } from '../types/contract';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatWaktuWITA,
  getDeadlineStatus,
  PPH_OPTIONS,
  calculateRealSettlement,
} from '../utils/formatters';

interface ContractDetailModalProps {
  contract: Contract | null;
  onClose: () => void;
  onUpdateStage: (contractId: string, newStage: ContractStage, note?: string) => void;
  onOpenUpdateArchive: (contract: Contract) => void;
  onCreateCalendarReminder: (contract: Contract, type: 'deadline' | 'signing') => void;
  onPromptDeleteContract: (contract: Contract) => void;
  onEditContract?: (contract: Contract) => void;
  onPromptProgressUpdate?: (contract: Contract, targetStage: ContractStage) => void;
  onOpenRealSettlement?: (contract: Contract) => void;
  onSaveSettlement?: (contractId: string, calculation: RealSettlementCalculation) => void;
}

const STAGES_ORDER: ContractStage[] = [
  'Draft Kontrak',
  'Masa Pekerjaan',
  'Tanda Tangan Berkas',
  'Upload Tagihan',
  'Lunas',
];

export const ContractDetailModal: React.FC<ContractDetailModalProps> = ({
  contract,
  onClose,
  onUpdateStage,
  onOpenUpdateArchive,
  onCreateCalendarReminder,
  onPromptDeleteContract,
  onEditContract,
  onPromptProgressUpdate,
  onOpenRealSettlement,
  onSaveSettlement,
}) => {
  if (!contract) return null;

  const [koreksiNote, setKoreksiNote] = useState('');
  const [showKoreksiInput, setShowKoreksiInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'boq' | 'calculation' | 'real' | 'archive' | 'history'>('boq');

  // State for real calculation inside modal
  const initialBoq =
    contract.penerimaanReal?.boqBase ||
    contract.perhitunganTerakhir?.jumlah ||
    contract.nilaiKontrak - (contract.perhitunganTerakhir?.pajak || 0) ||
    contract.nilaiKontrak;

  const initialPpn =
    contract.penerimaanReal?.ppnAmount ??
    (contract.perhitunganTerakhir?.pajak ||
      Math.max(0, contract.nilaiKontrak - initialBoq));

  const [detailPphType, setDetailPphType] = useState<PPhType>(
    contract.penerimaanReal?.pphType || 'pph22'
  );
  const [detailBoq, setDetailBoq] = useState<number>(initialBoq);
  const [detailNote, setDetailNote] = useState<string>(
    contract.penerimaanReal?.catatan || ''
  );
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  const deadline = getDeadlineStatus(contract);
  const isUnsigned = contract.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)';

  // Calculate live numbers
  let detailRate = 0.015;
  let detailLabel = 'PPh 22 1,5% (Material)';
  const matchedOpt = PPH_OPTIONS.find((o) => o.type === detailPphType);
  if (matchedOpt) {
    detailRate = matchedOpt.rate;
    detailLabel = matchedOpt.label;
  }

  const liveCalculation = calculateRealSettlement(
    detailBoq,
    detailRate,
    initialPpn,
    detailPphType,
    detailLabel,
    detailNote.trim()
  );

  const handleSaveRealSettlement = () => {
    if (onSaveSettlement) {
      onSaveSettlement(contract.id, liveCalculation);
      setSavedSuccessMsg(true);
      setTimeout(() => setSavedSuccessMsg(false), 3000);
    } else if (onOpenRealSettlement) {
      onOpenRealSettlement(contract);
    }
  };

  const handleApplyCorrection = () => {
    if (!koreksiNote.trim()) {
      alert('Mohon masukkan catatan koreksi.');
      return;
    }
    onUpdateStage(contract.id, 'Status Koreksi', koreksiNote.trim());
    setShowKoreksiInput(false);
    setKoreksiNote('');
  };

  const handleResolveCorrection = (targetStage: ContractStage) => {
    if (onPromptProgressUpdate) {
      onPromptProgressUpdate(contract, targetStage);
    } else {
      onUpdateStage(contract.id, targetStage, 'Koreksi telah diperbaiki dan diverifikasi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-black bg-slate-800 text-white rounded-md">
                {contract.tipeKontrak}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-sky-100 text-sky-800 rounded-md border border-sky-200">
                {contract.unitKontrak}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                  contract.status === 'Status Koreksi'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {contract.status}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {contract.judulKontrak}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
              <span>No: {contract.nomorKontrak}</span>
              <span>•</span>
              <span>Rekanan: {contract.rekanan}</span>
              <span>•</span>
              <span>Tgl: {formatTanggalIndonesia(contract.tanggalKontrak)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Timeline Stepper */}
        <div className="px-5 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Alur Progres Tahapan Kontrak:
            </span>
            {contract.status !== 'Status Koreksi' ? (
              <button
                onClick={() => setShowKoreksiInput(!showKoreksiInput)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Laporkan Kesalahan / Status Koreksi
              </button>
            ) : (
              <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Dalam Status Koreksi
              </span>
            )}
          </div>

          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STAGES_ORDER.map((stageName, idx) => {
              const currentIdx = STAGES_ORDER.indexOf(contract.status);
              const isCurrent = contract.status === stageName;
              const isPast = currentIdx >= 0 && idx < currentIdx;

              return (
                <button
                  key={stageName}
                  onClick={() => {
                    if (onPromptProgressUpdate) {
                      onPromptProgressUpdate(contract, stageName);
                    } else {
                      onUpdateStage(contract.id, stageName);
                    }
                  }}
                  className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold ring-2 ring-sky-300'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono opacity-80">Tahap {idx + 1}</span>
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <span className="truncate mt-0.5">{stageName}</span>
                </button>
              );
            })}
          </div>

          {/* If under correction status */}
          {contract.status === 'Status Koreksi' && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-900">
                    Catatan Koreksi / Masalah:
                  </p>
                  <p className="text-xs text-rose-800 mt-0.5">{contract.catatanKoreksi}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-rose-200 flex items-center justify-end gap-2">
                <button
                  onClick={() =>
                    handleResolveCorrection(
                      contract.statusSebelumKoreksi || 'Masa Pekerjaan'
                    )
                  }
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  ✓ Masalah Telah Diperbaiki (Kembalikan ke{' '}
                  {contract.statusSebelumKoreksi || 'Masa Pekerjaan'})
                </button>
              </div>
            </div>
          )}

          {/* Input for triggering Status Koreksi */}
          {showKoreksiInput && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
              <p className="text-xs font-bold text-amber-900">
                Masukkan Alasan / Catatan Koreksi untuk Kontrak Ini:
              </p>
              <textarea
                value={koreksiNote}
                onChange={(e) => setKoreksiNote(e.target.value)}
                placeholder="Contoh: Volume pada tabel BoQ item 2 tidak sesuai spesifikasi lapangan, atau berkas BAST belum diteken pengawas..."
                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowKoreksiInput(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyCorrection}
                  className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
                >
                  Terapkan Status Koreksi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Highlights Bar: Nilai, Masa, Arsip Materai, & Penerimaan Real jika Lunas */}
        <div
          className={`px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 ${
            contract.status === 'Lunas' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          } gap-3 text-xs`}
        >
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Total Nilai Kontrak
            </span>
            <p className="text-base font-black text-slate-900">
              {formatRupiah(contract.nilaiKontrak)}
            </p>
          </div>

          {contract.status === 'Lunas' && (
            <div className="bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Coins className="w-3 h-3 text-emerald-600" />
                  Penerimaan Real
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('real')}
                  className="text-[10px] text-emerald-700 font-bold underline"
                >
                  Hitung / Ubah
                </button>
              </div>
              <p className="text-base font-black text-emerald-950 font-mono">
                {contract.penerimaanReal
                  ? formatRupiah(contract.penerimaanReal.penerimaanReal)
                  : 'Belum dihitung'}
              </p>
              <p className="text-[10px] text-emerald-700 truncate">
                {contract.penerimaanReal
                  ? contract.penerimaanReal.pphLabel
                  : 'Klik tab untuk kalkulasi'}
              </p>
            </div>
          )}

          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Masa Kontrak & Batas Waktu
            </span>
            <p className="text-xs font-bold text-slate-800">
              {contract.masaKontrak.durasiHari} Hari Kalender
            </p>
            <p className="text-[11px] text-slate-500">
              Batas: {formatTanggalIndonesia(contract.masaKontrak.tanggalSelesai)} (
              <span className={deadline.isOverdue ? 'text-rose-600 font-bold' : ''}>
                {deadline.label}
              </span>
              )
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Status Arsip Materai
              </span>
              <p
                className={`text-xs font-bold ${
                  isUnsigned ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {contract.arsip?.statusMaterai}
              </p>
            </div>
            {isUnsigned ? (
              <button
                onClick={() => onOpenUpdateArchive(contract)}
                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Upload TTD
              </button>
            ) : (
              contract.arsip?.driveLink && (
                <a
                  href={contract.arsip.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg border border-sky-200 inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> GDrive
                </a>
              )
            )}
          </div>
        </div>

        {/* Modal Body Tabs */}
        <div className="px-5 border-b border-slate-200 flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('boq')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'boq'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Isi-Isi Pekerjaan (Tabel BoQ Mentahan)
          </button>
          <button
            onClick={() => setActiveTab('calculation')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'calculation'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🧮 4 Poin Hitungan Terakhir
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'archive'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📁 Arsip Berkas & GDrive
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⏱️ Log Riwayat Status ({contract.riwayatStatus?.length || 0})
          </button>

          {contract.status === 'Lunas' && (
            <button
              onClick={() => setActiveTab('real')}
              className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'real'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 px-2 rounded-t-md font-semibold'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>💰 Penerimaan Real (PPN & PPh)</span>
              {contract.penerimaanReal && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* 1. BoQ Items Tab */}
          {activeTab === 'boq' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Rincian Item Pekerjaan & Harga Satuan ({contract.isiPekerjaan.length} Item)
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  Subtotal: {formatRupiah(contract.perhitunganTerakhir.jumlah)}
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3">Uraian / Deskripsi Pekerjaan</th>
                      <th className="py-2.5 px-3 text-right">Volume</th>
                      <th className="py-2.5 px-3 text-center">Satuan</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Subtotal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contract.isiPekerjaan.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {item.no || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.deskripsi}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {item.volume.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                          {item.satuan}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {item.hargaSatuan.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {item.subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-700">
                        Total Subtotal Pekerjaan (Sebelum Pajak):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                        {formatRupiah(contract.perhitunganTerakhir.jumlah)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 2. 4 Poin Hitungan Terakhir Tab */}
          {activeTab === 'calculation' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-sky-900 mb-1">
                  Empat (4) Poin Hitungan Terakhir Kontrak
                </h4>
                <p className="text-xs text-sky-700">
                  Perhitungan resmi sesuai tabel kalkulasi mentahan kontrak pengadaan:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Poin 1: Jumlah (Subtotal BoQ)
                  </span>
                  <p className="text-xl font-black text-slate-900">
                    {formatRupiah(contract.perhitunganTerakhir.jumlah)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Akumulasi nilai seluruh volume x harga satuan barang/jasa.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Poin 2: DPP Nilai Lain
                  </span>
                  <p className="text-xl font-black text-slate-900">
                    {formatRupiah(contract.perhitunganTerakhir.dppNilaiLain)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Dasar Pengenaan Pajak (DPP) sesuai regulasi perpajakan yang berlaku.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Poin 3: Pajak ({contract.perhitunganTerakhir.persentasePajak})
                  </span>
                  <p className="text-xl font-black text-slate-900">
                    {formatRupiah(contract.perhitunganTerakhir.pajak)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Kewajiban PPN / PPh yang dipungut atau disetorkan.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Poin 4: Total Akhir Kontrak
                  </span>
                  <p className="text-2xl font-black text-emerald-900">
                    {formatRupiah(contract.perhitunganTerakhir.total)}
                  </p>
                  <p className="text-xs text-emerald-800">
                    Grand total nilai kontrak yang ditagihkan kepada pengguna jasa.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2b. Penerimaan Real (Setelah PPN & PPh) Tab for Lunas Contracts */}
          {activeTab === 'real' && (
            <div className="space-y-4">
              {/* Rumus Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                      Rumus Perhitungan Penerimaan Real (Status Lunas)
                    </span>
                    <p className="text-sm sm:text-base font-mono font-black mt-0.5">
                      BOq - (BOq × Tipe PPh) = Hasil / Penerimaan Real
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenRealSettlement && (
                    <button
                      type="button"
                      onClick={() => onOpenRealSettlement(contract)}
                      className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                    >
                      Buka Modal Lengkap ↗
                    </button>
                  )}
                </div>
              </div>

              {/* Step 1: Pengurangan PPN dari Nilai Kontrak -> Nilai BOQ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                      1
                    </span>
                    Pengurangan PPN dari Nilai Kontrak (Dasar BOQ)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const orig =
                        contract.perhitunganTerakhir?.jumlah ||
                        contract.nilaiKontrak - (contract.perhitunganTerakhir?.pajak || 0) ||
                        contract.nilaiKontrak;
                      setDetailBoq(orig);
                    }}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold hover:underline"
                  >
                    Reset ke BoQ Kontrak
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Nilai Kontrak (Bruto)
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">
                      {formatRupiah(contract.nilaiKontrak)}
                    </p>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">
                      Pengurangan PPN ({contract.perhitunganTerakhir?.persentasePajak || '11%'})
                    </span>
                    <p className="text-sm font-extrabold text-rose-600 mt-0.5 font-mono">
                      -{formatRupiah(initialPpn)}
                    </p>
                  </div>

                  <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                      Dasar BOQ (DPP Pekerjaan)
                    </span>
                    <p className="text-sm font-black text-emerald-950 mt-0.5 font-mono">
                      {formatRupiah(detailBoq)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[11px] text-slate-600 font-medium">
                    Nilai Dasar BOQ (Rp):
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={detailBoq || ''}
                      onChange={(e) => setDetailBoq(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: 3 Pilihan Jenis Tipe PPh */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                    2
                  </span>
                  Pilih Tipe PPh (3 Jenis):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PPH_OPTIONS.map((opt) => {
                    const isSelected = detailPphType === opt.type;
                    const potongan = Math.round(detailBoq * opt.rate);
                    return (
                      <div
                        key={opt.type}
                        onClick={() => setDetailPphType(opt.type)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="detail_pph_choice"
                              checked={isSelected}
                              onChange={() => setDetailPphType(opt.type)}
                              className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                            />
                            <span className="font-bold text-xs text-slate-900">{opt.name}</span>
                          </div>
                          <span className="px-1.5 py-0.5 text-[10px] font-black rounded bg-emerald-100 text-emerald-800">
                            {opt.ratePercent}%
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-700">{opt.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Potongan PPh:</span>
                          <span className="font-mono font-bold text-rose-600">
                            -{formatRupiah(potongan)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Rincian Hasil & Rumus */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                    3
                  </span>
                  Rincian Rumus & Penerimaan Real:
                </h4>

                <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden divide-y divide-slate-100">
                  <div className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">1. Nilai Dasar BOQ:</span>
                      <p className="text-[10px] text-slate-400">Subtotal pekerjaan setelah PPN</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(liveCalculation.boqBase)}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between text-xs bg-rose-50/40">
                    <div>
                      <span className="font-bold text-rose-800">
                        2. Potongan {liveCalculation.pphLabel}:
                      </span>
                      <p className="text-[10px] text-slate-400">
                        BOQ × {(liveCalculation.pphRate * 100).toFixed(2)}%
                      </p>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      -{formatRupiah(liveCalculation.pphAmount)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-100/60 flex items-center justify-between border-t-2 border-emerald-400">
                    <div>
                      <span className="text-sm font-black text-emerald-950 uppercase tracking-wider block">
                        Penerimaan Real Kas
                      </span>
                      <span className="text-[11px] text-emerald-800 font-mono">
                        BOQ - (BOQ × {liveCalculation.pphLabel.split(' ')[1] || 'PPh'})
                      </span>
                    </div>
                    <span className="font-mono text-xl font-black text-emerald-950">
                      {formatRupiah(liveCalculation.penerimaanReal)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Catatan Penerimaan / No. BAP / Tanggal Cair:
                  </label>
                  <input
                    type="text"
                    value={detailNote}
                    onChange={(e) => setDetailNote(e.target.value)}
                    placeholder="Contoh: Rekening Mandiri PT Celebes, BAP-0482..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  {savedSuccessMsg ? (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Penerimaan Real berhasil diperbarui!
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      {contract.penerimaanReal
                        ? `Tersimpan: ${formatRupiah(contract.penerimaanReal.penerimaanReal)} (${contract.penerimaanReal.pphLabel})`
                        : 'Belum disimpan ke database kontrak'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveRealSettlement}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Penerimaan Real</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Arsip Berkas & GDrive Tab */}
          {activeTab === 'archive' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500">Nama File Arsip:</span>
                    <p className="text-sm font-black text-slate-900 font-mono">
                      {contract.arsip?.namaFile || 'Belum ada nama file'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Diunggah pada: {contract.arsip?.tanggalUpload || '-'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      isUnsigned
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {contract.arsip?.statusMaterai}
                  </span>
                </div>

                {isUnsigned ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <FileSignature className="w-4 h-4 text-amber-600" />
                      Peringatan: Berkas Masih Berbentuk Draft Tanpa Materai
                    </p>
                    <p>
                      Untuk keabsahan hukum audit dan pembayaran di loket keuangan, pastikan berkas fisik ditandatangani di atas materai Rp10.000, lalu scan dan perbarui berkas arsip ke Google Drive.
                    </p>
                    <button
                      onClick={() => onOpenUpdateArchive(contract)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Update / Upload Ulang Berkas Bertandatangan
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Berkas Kontrak Lengkap, Bertandatangan & Bermaterai
                    </p>
                    {contract.arsip?.driveLink && (
                      <a
                        href={contract.arsip.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-700 font-bold hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Buka Arsip di Google Drive
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Google Calendar Reminder Section */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  Integrasi Notifikasi Google Calendar
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onCreateCalendarReminder(contract, 'deadline')}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Pasang Pengingat Jatuh Tempo Pekerjaan
                  </button>

                  <button
                    onClick={() => onCreateCalendarReminder(contract, 'signing')}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                    Pasang Pengingat Update Materai & TTD
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. History Logs Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Catatan Riwayat Alur Status Kontrak (Timestamped)
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                {(contract.riwayatStatus || []).map((log, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.status}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {formatWaktuWITA(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.catatan || 'Perubahan status dicatat sistem.'}</p>
                      {log.user && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Oleh: {log.user}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Terakhir diupdate: <span className="font-semibold text-slate-700">{formatWaktuWITA(contract.updatedAt || contract.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            {onEditContract && (
              <button
                onClick={() => {
                  onEditContract(contract);
                  onClose();
                }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                <span>Edit Kontrak & BoQ</span>
              </button>
            )}
            <button
              onClick={() => onPromptDeleteContract(contract)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Kontrak</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
