import React, { useState } from 'react';
import {
  AlertTriangle,
  FileSignature,
  Clock,
  Calendar,
  ChevronRight,
  ExternalLink,
  Upload,
  CheckCircle,
  X,
  Bell,
  AlertCircle,
  FileWarning,
  FolderSync,
  CloudUpload,
} from 'lucide-react';
import { Contract } from '../types/contract';
import { getDeadlineStatus, isDraftUnsigned, isBeforeMasaPekerjaan } from '../utils/formatters';

interface AlertBannerProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onOpenUpdateArchive: (contract: Contract) => void;
  onCreateCalendarReminder: (contract: Contract, type: 'deadline' | 'signing') => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  contracts,
  onSelectContract,
  onOpenUpdateArchive,
  onCreateCalendarReminder,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'koreksi' | 'unsigned' | 'beforeMasa' | 'deadline'
  >('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Contracts in 'Status Koreksi'
  const koreksiContracts = contracts.filter((c) => c.status === 'Status Koreksi');

  // 2. Contracts whose archive is still Draft / Not Signed with Materai or not yet uploaded to Google Drive
  const unsignedArchiveContracts = contracts.filter(
    (c) => c.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)' || !c.arsip?.driveFileId
  );

  // 3. Contracts that haven't passed into "Masa Pekerjaan" (Still in Draft Kontrak)
  const beforeMasaContracts = contracts.filter((c) => isBeforeMasaPekerjaan(c));

  // 4. Contracts with deadline <= 7 days or overdue
  const deadlineAlertContracts = contracts.filter((c) => {
    const status = getDeadlineStatus(c);
    return status.isOverdue || status.isApproaching;
  });

  const totalAlerts =
    koreksiContracts.length +
    unsignedArchiveContracts.length +
    beforeMasaContracts.length +
    deadlineAlertContracts.length;

  if (totalAlerts === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-indigo-500/10 border border-amber-300/80 rounded-2xl p-4 mb-6 shadow-xs">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Pusat Notifikasi & Peringatan Tindakan
              <span className="px-2 py-0.5 text-[11px] font-extrabold bg-rose-600 text-white rounded-full">
                {totalAlerts} Perhatian
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              Pantau kontrak yang berstatus koreksi, belum upload ulang arsip TTD & materai di Google Drive, belum masuk masa kerja, dan mendekati jatuh tempo.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors"
        >
          {isCollapsed ? 'Tampilkan Rincian ▾' : 'Sembunyikan ▴'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-3">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-amber-200 pb-2 text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-700 hover:bg-amber-100'
              }`}
            >
              Semua Peringatan ({totalAlerts})
            </button>

            {/* 1. Tab Status Koreksi */}
            <button
              onClick={() => setActiveTab('koreksi')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'koreksi'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-rose-900 hover:bg-rose-100'
              }`}
            >
              <FileWarning className="w-3.5 h-3.5" />
              Status Koreksi ({koreksiContracts.length})
            </button>

            {/* 2. Tab Belum Upload Ulang Arsip TTD & Materai */}
            <button
              onClick={() => setActiveTab('unsigned')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'unsigned'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-indigo-900 hover:bg-indigo-100'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              Belum Upload Ulang Arsip TTD & Materai ({unsignedArchiveContracts.length})
            </button>

            {/* 3. Tab Belum Masuk Masa Kerja */}
            <button
              onClick={() => setActiveTab('beforeMasa')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'beforeMasa'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Belum Masuk Masa Kerja ({beforeMasaContracts.length})
            </button>

            {/* 4. Tab Jatuh Tempo */}
            <button
              onClick={() => setActiveTab('deadline')}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'deadline'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-orange-900 hover:bg-orange-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Jatuh Tempo ({deadlineAlertContracts.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {/* 1. KONTRAK YANG BERSTATUS KOREKSI */}
            {(activeTab === 'all' || activeTab === 'koreksi') &&
              koreksiContracts.map((contract) => (
                <div
                  key={`koreksi-${contract.id}`}
                  className="bg-white rounded-xl p-3.5 border-2 border-rose-300 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-rose-100 text-rose-900 border border-rose-300">
                        {contract.tipeKontrak} • {contract.unitKontrak}
                      </span>
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Perlu Koreksi
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {contract.judulKontrak}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      No: {contract.nomorKontrak}
                    </p>

                    <div className="text-xs text-rose-900 mt-2 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-rose-800">
                        <FileWarning className="w-3.5 h-3.5 text-rose-600" />
                        Catatan Koreksi Pemeriksa:
                      </p>
                      <p className="text-[11px] text-rose-950 font-medium italic">
                        "{contract.catatanKoreksi || 'Periksa kembali kelengkapan pasal, BoQ, atau arsip berkas.'}"
                      </p>
                      {contract.statusSebelumKoreksi && (
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-rose-200">
                          Tahap Sebelumnya: <strong>{contract.statusSebelumKoreksi}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => onSelectContract(contract)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1"
                    >
                      Buka Rincian <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onSelectContract(contract)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      Tinjau & Selesaikan Koreksi
                    </button>
                  </div>
                </div>
              ))}

            {/* 2. KONTRAK YANG BELUM UPLOAD ULANG ARSIP BERTANDA TANGAN & MATERAI DI GOOGLE DRIVE */}
            {(activeTab === 'all' || activeTab === 'unsigned') &&
              unsignedArchiveContracts.map((contract) => {
                const isDraft = contract.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)';
                const notInDrive = !contract.arsip?.driveFileId;

                return (
                  <div
                    key={`sign-${contract.id}`}
                    className="bg-white rounded-xl p-3.5 border-2 border-indigo-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                          {contract.tipeKontrak} • {contract.unitKontrak}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                          <CloudUpload className="w-3 h-3 text-indigo-600" />
                          {isDraft ? 'Perlu TTD & Materai' : 'Belum Tersimpan di Drive'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {contract.judulKontrak}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        No: {contract.nomorKontrak}
                      </p>

                      <div className="text-xs text-indigo-950 mt-2 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100 space-y-1">
                        <p className="font-semibold flex items-center gap-1 text-indigo-800">
                          <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
                          {isDraft
                            ? 'Arsip Masih Berstatus Draft'
                            : 'Arsip Belum Tersinkron ke Google Drive'}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Harap tanda tangani kontrak di atas materai Rp10.000, lalu upload ulang berkas resmi ke Google Drive agar arsip sah.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => onCreateCalendarReminder(contract, 'signing')}
                        title="Buat Pengingat Tanda Tangan di Google Calendar"
                        className="px-2 py-1 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 inline-flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-indigo-600" />
                        Jadwalkan TTD
                      </button>
                      <button
                        onClick={() => onOpenUpdateArchive(contract)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <Upload className="w-3 h-3" />
                        Upload Arsip ke Drive
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* 3. BELUM MELEWATI TAHAP MASA PEKERJAAN */}
            {(activeTab === 'all' || activeTab === 'beforeMasa') &&
              beforeMasaContracts.map((contract) => (
                <div
                  key={`before-${contract.id}`}
                  className="bg-white rounded-xl p-3.5 border border-amber-300 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                        {contract.tipeKontrak} • {contract.unitKontrak}
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Tahap: Draft Kontrak
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                      {contract.judulKontrak}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      No: {contract.nomorKontrak}
                    </p>
                    <p className="text-xs text-amber-800 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      ⚠️ <strong>Belum Masuk Masa Pekerjaan</strong>: Menunggu kontrak di verifikasi atau di tanda tangan.
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => onSelectContract(contract)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1"
                    >
                      Buka Rincian <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onSelectContract(contract)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors"
                    >
                      Update ke Masa Pekerjaan
                    </button>
                  </div>
                </div>
              ))}

            {/* 4. JATUH TEMPO MASA PEKERJAAN */}
            {(activeTab === 'all' || activeTab === 'deadline') &&
              deadlineAlertContracts.map((contract) => {
                const deadline = getDeadlineStatus(contract);
                return (
                  <div
                    key={`dead-${contract.id}`}
                    className="bg-white rounded-xl p-3.5 border border-orange-300 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-100 text-orange-900 border border-orange-200">
                          {contract.unitKontrak}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${deadline.badgeClass}`}>
                          {deadline.label}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {contract.judulKontrak}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Batas Akhir: {contract.masaKontrak.tanggalSelesai}
                      </p>
                      <div className="text-xs text-orange-950 mt-2 bg-orange-50/70 p-2 rounded-lg border border-orange-200">
                        <p className="font-semibold">Batas Waktu Pelaksanaan:</p>
                        <p className="text-[11px] text-slate-600">
                          Penyedia: {contract.rekanan}. Pastikan progres BoQ siap BAPP/BAST sebelum masa berakhir.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => onCreateCalendarReminder(contract, 'deadline')}
                        className="px-2 py-1 text-[11px] font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-md border border-orange-200 inline-flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-orange-600" />
                        Jadwalkan di Calendar
                      </button>
                      <button
                        onClick={() => onSelectContract(contract)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                      >
                        Lihat Progres
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
