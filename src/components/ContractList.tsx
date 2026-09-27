import React, { useState } from 'react';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Clock,
  ArrowUpRight,
  FileSignature,
  Upload,
  Receipt,
  CheckCircle2,
  AlertOctagon,
  Building2,
  ChevronRight,
  ExternalLink,
  Layers,
  Trash2,
  FileEdit,
  Coins,
} from 'lucide-react';
import { Contract, ContractStage } from '../types/contract';
import { formatRupiah, formatTanggalIndonesia, getDeadlineStatus } from '../utils/formatters';

interface ContractListProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onOpenUpdateArchive: (contract: Contract) => void;
  onCreateCalendarReminder: (contract: Contract, type: 'deadline' | 'signing') => void;
  onQuickChangeStage: (contract: Contract, newStage: ContractStage) => void;
  onPromptDeleteContract: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onOpenRealSettlement?: (contract: Contract) => void;
}

export const ContractList: React.FC<ContractListProps> = ({
  contracts,
  onSelectContract,
  onOpenUpdateArchive,
  onCreateCalendarReminder,
  onQuickChangeStage,
  onPromptDeleteContract,
  onEditContract,
  onOpenRealSettlement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedSpecialFilter, setSelectedSpecialFilter] = useState<string>('all');

  // Extract unique Units and Types
  const units = Array.from(new Set(contracts.map((c) => c.unitKontrak))).filter(Boolean);
  const types = Array.from(new Set(contracts.map((c) => c.tipeKontrak))).filter(Boolean);

  const filteredContracts = contracts.filter((c) => {
    // Search query
    const matchSearch =
      c.nomorKontrak.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.judulKontrak.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.rekanan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.unitKontrak.toLowerCase().includes(searchTerm.toLowerCase());

    // Filters
    const matchUnit = selectedUnit === 'all' || c.unitKontrak === selectedUnit;
    const matchType = selectedType === 'all' || c.tipeKontrak === selectedType;
    const matchStage = selectedStage === 'all' || c.status === selectedStage;

    // Special filters
    let matchSpecial = true;
    if (selectedSpecialFilter === 'unsigned') {
      matchSpecial = c.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)';
    } else if (selectedSpecialFilter === 'beforeMasa') {
      matchSpecial = c.status === 'Draft Kontrak';
    } else if (selectedSpecialFilter === 'deadlineNear') {
      const status = getDeadlineStatus(c);
      matchSpecial = status.isOverdue || status.isApproaching;
    }

    return matchSearch && matchUnit && matchType && matchStage && matchSpecial;
  });

  const getStageBadge = (stage: ContractStage) => {
    switch (stage) {
      case 'Draft Kontrak':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Masa Pekerjaan':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Tanda Tangan Berkas':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Upload Tagihan':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Lunas':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Status Koreksi':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor kontrak, judul pekerjaan, rekanan, atau unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Unit Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all">Semua Unit</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipe Kontrak */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all">Semua Tipe (SPBJ/SPBL/SPK)</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="Draft Kontrak">Draft Kontrak</option>
                <option value="Masa Pekerjaan">Masa Pekerjaan</option>
                <option value="Tanda Tangan Berkas">Tanda Tangan Berkas</option>
                <option value="Upload Tagihan">Upload Tagihan</option>
                <option value="Lunas">Lunas</option>
                <option value="Status Koreksi">Status Koreksi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Special quick filter pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Filter Khusus:</span>
          <button
            onClick={() =>
              setSelectedSpecialFilter(selectedSpecialFilter === 'all' ? 'all' : 'all')
            }
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              selectedSpecialFilter === 'all'
                ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Semua ({contracts.length})
          </button>
          <button
            onClick={() =>
              setSelectedSpecialFilter(
                selectedSpecialFilter === 'beforeMasa' ? 'all' : 'beforeMasa'
              )
            }
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              selectedSpecialFilter === 'beforeMasa'
                ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            ⏳ Belum Masa Kerja ({contracts.filter((c) => c.status === 'Draft Kontrak').length})
          </button>
          <button
            onClick={() =>
              setSelectedSpecialFilter(
                selectedSpecialFilter === 'unsigned' ? 'all' : 'unsigned'
              )
            }
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              selectedSpecialFilter === 'unsigned'
                ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            📝 Draft Belum Materai (
            {
              contracts.filter(
                (c) => c.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)'
              ).length
            }
            )
          </button>
          <button
            onClick={() =>
              setSelectedSpecialFilter(
                selectedSpecialFilter === 'deadlineNear' ? 'all' : 'deadlineNear'
              )
            }
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              selectedSpecialFilter === 'deadlineNear'
                ? 'bg-rose-600 text-white border-rose-600 font-semibold'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            ⚠️ Jatuh Tempo Segera / Terlambat
          </button>
        </div>
      </div>

      {/* Contract Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Kontrak & Unit</th>
              <th className="py-3 px-4">Pekerjaan & Rekanan</th>
              <th className="py-3 px-4">Nilai & 4 Poin Hitungan</th>
              <th className="py-3 px-4">Masa Kontrak & Batas</th>
              <th className="py-3 px-4">Status & Alur</th>
              <th className="py-3 px-4">Arsip Dokumen</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold">Tidak ada kontrak yang sesuai kriteria.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Coba sesuaikan kata kunci pencarian atau ubah filter di atas.
                  </p>
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => {
                const deadline = getDeadlineStatus(contract);
                const isUnsigned = contract.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)';

                return (
                  <tr
                    key={contract.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectContract(contract)}
                  >
                    {/* 1. Tipe & Nomor Kontrak & Unit */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-slate-200 text-slate-800">
                            {contract.tipeKontrak}
                          </span>
                          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {contract.unitKontrak}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                          {contract.nomorKontrak}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Tgl: {formatTanggalIndonesia(contract.tanggalKontrak)}
                        </span>
                      </div>
                    </td>

                    {/* 2. Judul & Rekanan */}
                    <td className="py-3.5 px-4 align-top max-w-[260px]">
                      <p className="font-bold text-slate-900 line-clamp-2 leading-snug">
                        {contract.judulKontrak}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                        <span className="text-slate-400">Penyedia:</span> {contract.rekanan}
                      </p>
                      {contract.isiPekerjaan && contract.isiPekerjaan.length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {contract.isiPekerjaan.length} rincian BoQ pekerjaan
                        </p>
                      )}
                    </td>

                    {/* 3. Nilai & 4 Poin Hitungan */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-900">
                          {formatRupiah(contract.nilaiKontrak)}
                        </p>
                        <div className="text-[10px] space-y-0.5 text-slate-500 font-mono bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <div className="flex justify-between">
                            <span>1. Jumlah:</span>
                            <span className="text-slate-700 font-semibold">
                              {formatRupiah(contract.perhitunganTerakhir.jumlah)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>2. DPP Lain:</span>
                            <span className="text-slate-700">
                              {formatRupiah(contract.perhitunganTerakhir.dppNilaiLain)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>3. Pajak ({contract.perhitunganTerakhir.persentasePajak}):</span>
                            <span className="text-slate-700">
                              {formatRupiah(contract.perhitunganTerakhir.pajak)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5 text-slate-900">
                            <span>4. Total:</span>
                            <span>{formatRupiah(contract.perhitunganTerakhir.total)}</span>
                          </div>
                        </div>

                        {/* Opsi Penerimaan Real jika Status Lunas */}
                        {contract.status === 'Lunas' && (
                          <div
                            className="pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contract.penerimaanReal ? (
                              <div className="p-2 bg-emerald-50/90 border border-emerald-300 rounded-lg text-[10px] space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between font-black text-emerald-950">
                                  <span className="flex items-center gap-1">
                                    <Coins className="w-3 h-3 text-emerald-600" />
                                    Penerimaan Real:
                                  </span>
                                  <span className="font-mono text-xs text-emerald-700">
                                    {formatRupiah(contract.penerimaanReal.penerimaanReal)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-slate-600 font-medium">
                                  <span className="truncate max-w-[130px]">
                                    {contract.penerimaanReal.pphLabel}:
                                  </span>
                                  <span className="font-mono text-rose-600 font-bold">
                                    -{formatRupiah(contract.penerimaanReal.pphAmount)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onOpenRealSettlement?.(contract)}
                                  className="w-full text-center text-[9px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline pt-0.5"
                                >
                                  Detail / Ubah Tipe PPh
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenRealSettlement?.(contract)}
                                className="w-full py-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs hover:scale-[1.01]"
                                title="Klik untuk menghitung penerimaan real setelah potongan PPN & PPh"
                              >
                                <Coins className="w-3 h-3 text-emerald-600" />
                                <span>Hitung Penerimaan Real</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Masa Kontrak & Sisa Hari */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-700 font-medium">
                          {formatTanggalIndonesia(contract.masaKontrak.tanggalMulai)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          s/d <strong className="text-slate-800">{formatTanggalIndonesia(contract.masaKontrak.tanggalSelesai)}</strong>
                        </p>
                        <div className="pt-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] rounded-full border ${deadline.badgeClass}`}
                          >
                            {deadline.label}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Status & Dropdown Alur */}
                    <td className="py-3.5 px-4 align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg border ${getStageBadge(
                            contract.status
                          )}`}
                        >
                          {contract.status}
                        </span>

                        {contract.status === 'Status Koreksi' && contract.catatanKoreksi && (
                          <p className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded border border-rose-200 line-clamp-2">
                            Catatan: {contract.catatanKoreksi}
                          </p>
                        )}

                        {/* Quick Stage Transition Dropdown */}
                        <div className="pt-1">
                          <select
                            value={contract.status}
                            onChange={(e) =>
                              onQuickChangeStage(contract, e.target.value as ContractStage)
                            }
                            className="text-[10px] bg-white border border-slate-300 rounded-md px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                          >
                            <option value="Draft Kontrak">1. Draft Kontrak</option>
                            <option value="Masa Pekerjaan">2. Masa Pekerjaan</option>
                            <option value="Tanda Tangan Berkas">3. TTD Berkas</option>
                            <option value="Upload Tagihan">4. Upload Tagihan</option>
                            <option value="Lunas">5. Lunas</option>
                            <option value="Status Koreksi">⚠️ Status Koreksi</option>
                          </select>
                        </div>
                      </div>
                    </td>

                    {/* 6. Arsip Dokumen & Materai */}
                    <td className="py-3.5 px-4 align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1.5">
                        {isUnsigned ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[10px] text-amber-900">
                            <p className="font-bold flex items-center gap-1 text-amber-800">
                              <FileSignature className="w-3 h-3 text-amber-600" />
                              Draft Belum Materai
                            </p>
                            <button
                              onClick={() => onOpenUpdateArchive(contract)}
                              className="mt-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 hover:underline"
                            >
                              <Upload className="w-2.5 h-2.5" /> Upload Berkas TTD
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-[10px] text-emerald-800">
                            <p className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sudah Bermaterai
                            </p>
                            {contract.arsip?.driveLink && (
                              <a
                                href={contract.arsip.driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 text-[10px] font-medium text-sky-700 hover:text-sky-900 flex items-center gap-0.5 hover:underline"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Buka di GDrive
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 7. Action buttons */}
                    <td className="py-3.5 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => onSelectContract(contract)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          Lihat BoQ <ChevronRight className="w-3 h-3" />
                        </button>
                        <div className="flex items-center gap-1">
                          {contract.status === 'Lunas' && (
                            <button
                              type="button"
                              onClick={() => onOpenRealSettlement?.(contract)}
                              title="Kalkulasi Penerimaan Real (PPN & PPh)"
                              className="px-2 py-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200 rounded-md transition-colors inline-flex items-center gap-1 border border-emerald-300"
                            >
                              <Coins className="w-3 h-3 text-emerald-700" />
                              Real
                            </button>
                          )}
                          <button
                            onClick={() => onEditContract(contract)}
                            title="Edit Data Kontrak & BoQ"
                            className="px-2 py-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors inline-flex items-center gap-1 border border-amber-200"
                          >
                            <FileEdit className="w-3 h-3 text-amber-600" />
                            Edit
                          </button>
                          <button
                            onClick={() => onCreateCalendarReminder(contract, 'deadline')}
                            title="Tambahkan Pengingat Jatuh Tempo ke Google Calendar"
                            className="px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3 text-slate-500" />
                            + Cal
                          </button>
                          <button
                            onClick={() => onPromptDeleteContract(contract)}
                            title="Hapus Kontrak (Double Check)"
                            className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors inline-flex items-center gap-1 border border-rose-200"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
