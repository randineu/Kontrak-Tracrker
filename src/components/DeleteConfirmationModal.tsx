import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Contract } from '../types/contract';
import { formatRupiah } from '../utils/formatters';

interface DeleteConfirmationModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (contractId: string) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  contract,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !contract) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                Konfirmasi Hapus Kontrak
              </h3>
              <p className="text-xs text-rose-700">
                Pemeriksaan ulang sebelum menghapus (Double Check)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-800">
                {contract.tipeKontrak}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-100 text-sky-800">
                {contract.unitKontrak}
              </span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{contract.judulKontrak}</p>
            <p className="text-slate-500 font-mono">Nomor: {contract.nomorKontrak}</p>
            <p className="text-slate-700 font-semibold">
              Nilai: {formatRupiah(contract.nilaiKontrak)}
            </p>
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Apakah Anda yakin ingin menghapus kontrak ini?</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Tindakan ini akan menghapus seluruh data kontrak, tabel rincian pekerjaan BoQ, 4 poin hitungan, dan riwayat status dari sistem.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal (Simpan Kontrak)
          </button>
          <button
            onClick={() => onConfirmDelete(contract.id)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/25 inline-flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <Trash2 className="w-4 h-4" />
            <span>Ya, Hapus Kontrak Permanen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
