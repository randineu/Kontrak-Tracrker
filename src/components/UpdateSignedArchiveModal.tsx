import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSignature,
  FileCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Contract } from '../types/contract';
import { uploadContractToDrive } from '../services/driveSync';

interface UpdateSignedArchiveModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onArchiveUpdated: (updatedContract: Contract) => void;
  accessToken: string | null;
}

export const UpdateSignedArchiveModal: React.FC<UpdateSignedArchiveModalProps> = ({
  contract,
  isOpen,
  onClose,
  onArchiveUpdated,
  accessToken,
}) => {
  if (!isOpen || !contract) return null;

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [advanceStage, setAdvanceStage] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setErrorMessage('Pilih berkas dokumen yang telah ditandatangani dan dibubuhi materai.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);

      let driveResult = null;
      if (accessToken) {
        driveResult = await uploadContractToDrive(
          file,
          file.name,
          true, // isSigned = true
          accessToken,
          contract.arsip?.driveFileId
        );
      }

      const now = new Date().toISOString();
      const updatedContract: Contract = {
        ...contract,
        status:
          advanceStage && contract.status === 'Draft Kontrak'
            ? 'Masa Pekerjaan'
            : contract.status,
        arsip: {
          ...contract.arsip,
          namaFile: file.name,
          tipeFile: file.type || 'application/pdf',
          statusMaterai: 'Sudah TTD & Bermaterai',
          driveFileId: driveResult?.fileId || contract.arsip?.driveFileId,
          driveLink: driveResult?.webViewLink || contract.arsip?.driveLink,
          tanggalUpdateTTD: now,
        },
        riwayatStatus: [
          ...(contract.riwayatStatus || []),
          {
            status:
              advanceStage && contract.status === 'Draft Kontrak'
                ? 'Masa Pekerjaan'
                : contract.status,
            timestamp: now,
            catatan: `Berkas arsip fisik bertandatangan & bermaterai Rp10.000 telah diunggah (${file.name}). Arsip di Google Drive diperbarui.`,
            user: 'Petugas Pengadaan / Rekanan',
          },
        ],
        updatedAt: now,
        syncedWithSheets: false,
      };

      onArchiveUpdated(updatedContract);
      onClose();
    } catch (err: any) {
      console.error('Update archive failed:', err);
      setErrorMessage(err.message || 'Gagal memperbarui arsip berkas di Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Update Berkas Bertandatangan & Bermaterai
              </h3>
              <p className="text-xs text-slate-500">
                Perbarui arsip Google Drive dengan dokumen resmi bertanda tangan
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
          {/* Contract Info Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
              {contract.unitKontrak} • {contract.tipeKontrak}
            </span>
            <p className="font-bold text-slate-900 text-sm">{contract.judulKontrak}</p>
            <p className="text-slate-500 font-mono">No: {contract.nomorKontrak}</p>
            <p className="text-slate-600">
              Arsip Saat Ini:{' '}
              <span className="font-semibold text-amber-800">
                {contract.arsip?.statusMaterai} ({contract.arsip?.namaFile})
              </span>
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {file ? file.name : 'Pilih Berkas Scan TTD & Bermaterai'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Format PDF atau Foto Resolusi Tinggi hasil scan dokumen basah / meterai
              </p>
            </div>
            {file && (
              <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" /> Berkas Siap Diunggah: (
                {(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Advance stage checkbox */}
          {contract.status === 'Draft Kontrak' && (
            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-sky-50 rounded-xl border border-sky-200">
              <input
                type="checkbox"
                checked={advanceStage}
                onChange={(e) => setAdvanceStage(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded-sm focus:ring-sky-500"
              />
              <span className="font-semibold text-sky-900 text-xs">
                Otomatis majukan status kontrak ke "Masa Pekerjaan"
              </span>
            </label>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Batal
          </button>
          <button
            onClick={handleUploadSubmit}
            disabled={isUploading || !file}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengunggah ke GDrive...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Update GDrive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
