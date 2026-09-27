import React, { useState } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Calculator,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Contract, BoQItem, CalculationPoints, ContractStage, ArchiveSigningStatus } from '../types/contract';
import { formatRupiah, getCurrentTimestampWITA } from '../utils/formatters';

interface EditContractModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContract: Contract) => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !contract) return null;

  // Form State
  const [tipeKontrak, setTipeKontrak] = useState(contract.tipeKontrak || 'SPBJ');
  const [nomorKontrak, setNomorKontrak] = useState(contract.nomorKontrak || '');
  const [tanggalKontrak, setTanggalKontrak] = useState(contract.tanggalKontrak || '');
  const [judulKontrak, setJudulKontrak] = useState(contract.judulKontrak || '');
  const [unitKontrak, setUnitKontrak] = useState(contract.unitKontrak || 'UP3 Watampone');
  const [rekanan, setRekanan] = useState(contract.rekanan || '');
  const [status, setStatus] = useState<ContractStage>(contract.status || 'Draft Kontrak');
  const [statusMaterai, setStatusMaterai] = useState<ArchiveSigningStatus>(
    contract.arsip?.statusMaterai || 'Draft (Belum TTD & Materai)'
  );

  // Masa Kontrak
  const [tanggalMulai, setTanggalMulai] = useState(contract.masaKontrak?.tanggalMulai || '');
  const [tanggalSelesai, setTanggalSelesai] = useState(contract.masaKontrak?.tanggalSelesai || '');
  const [durasiHari, setDurasiHari] = useState(contract.masaKontrak?.durasiHari || 30);

  // BoQ Items
  const [isiPekerjaan, setIsiPekerjaan] = useState<BoQItem[]>(
    contract.isiPekerjaan && contract.isiPekerjaan.length > 0
      ? JSON.parse(JSON.stringify(contract.isiPekerjaan))
      : [
          {
            no: 1,
            deskripsi: 'Item pekerjaan pengadaan / jasa',
            volume: 1,
            satuan: 'lot',
            hargaSatuan: contract.nilaiKontrak || 0,
            subtotal: contract.nilaiKontrak || 0,
          },
        ]
  );

  // 4 Points of Calculation
  const [jumlah, setJumlah] = useState(contract.perhitunganTerakhir?.jumlah || 0);
  const [dppNilaiLain, setDppNilaiLain] = useState(
    contract.perhitunganTerakhir?.dppNilaiLain || contract.perhitunganTerakhir?.jumlah || 0
  );
  const [persentasePajak, setPersentasePajak] = useState(
    contract.perhitunganTerakhir?.persentasePajak || 'PPN 11%'
  );
  const [pajak, setPajak] = useState(contract.perhitunganTerakhir?.pajak || 0);
  const [total, setTotal] = useState(contract.perhitunganTerakhir?.total || contract.nilaiKontrak || 0);

  const [catatanEdit, setCatatanEdit] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle BoQ row change
  const handleBoQChange = (index: number, field: keyof BoQItem, value: any) => {
    const updated = [...isiPekerjaan];
    const item = { ...updated[index], [field]: value };

    // Auto-calculate subtotal when volume or hargaSatuan changes
    if (field === 'volume' || field === 'hargaSatuan') {
      const vol = field === 'volume' ? Number(value) || 0 : Number(item.volume) || 0;
      const price = field === 'hargaSatuan' ? Number(value) || 0 : Number(item.hargaSatuan) || 0;
      item.subtotal = vol * price;
    }

    updated[index] = item;
    setIsiPekerjaan(updated);
  };

  // Add new BoQ row
  const handleAddBoQRow = () => {
    setIsiPekerjaan([
      ...isiPekerjaan,
      {
        no: isiPekerjaan.length + 1,
        deskripsi: '',
        volume: 1,
        satuan: 'unit',
        hargaSatuan: 0,
        subtotal: 0,
      },
    ]);
  };

  // Remove BoQ row
  const handleRemoveBoQRow = (index: number) => {
    if (isiPekerjaan.length <= 1) {
      alert('Minimal harus terdapat 1 baris item pekerjaan BoQ.');
      return;
    }
    const filtered = isiPekerjaan
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, no: idx + 1 }));
    setIsiPekerjaan(filtered);
  };

  // Auto Recalculate 4 Points from BoQ Table
  const handleAutoRecalculate = () => {
    const subtotalBoQ = isiPekerjaan.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const taxRate = persentasePajak.includes('12') ? 0.12 : 0.11;
    const taxAmount = Math.round(subtotalBoQ * taxRate);
    const grandTotal = subtotalBoQ + taxAmount;

    setJumlah(subtotalBoQ);
    setDppNilaiLain(subtotalBoQ);
    setPajak(taxAmount);
    setTotal(grandTotal);
  };

  // Auto calculate duration in calendar days when dates change
  const handleDateChange = (mulai: string, selesai: string) => {
    setTanggalMulai(mulai);
    setTanggalSelesai(selesai);
    if (mulai && selesai) {
      const d1 = new Date(mulai);
      const d2 = new Date(selesai);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
          setDurasiHari(diff);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorKontrak.trim()) {
      setErrorMessage('Nomor kontrak wajib diisi.');
      return;
    }
    if (!judulKontrak.trim()) {
      setErrorMessage('Judul kontrak wajib diisi.');
      return;
    }

    const now = getCurrentTimestampWITA();
    const updatedContract: Contract = {
      ...contract,
      tipeKontrak: tipeKontrak.trim(),
      nomorKontrak: nomorKontrak.trim(),
      tanggalKontrak: tanggalKontrak,
      judulKontrak: judulKontrak.trim(),
      unitKontrak: unitKontrak.trim(),
      rekanan: rekanan.trim(),
      nilaiKontrak: Number(total) || Number(jumlah) || 0,
      status: status,
      masaKontrak: {
        tanggalMulai,
        tanggalSelesai,
        durasiHari: Number(durasiHari) || 0,
      },
      isiPekerjaan: isiPekerjaan,
      perhitunganTerakhir: {
        jumlah: Number(jumlah) || 0,
        dppNilaiLain: Number(dppNilaiLain) || Number(jumlah) || 0,
        pajak: Number(pajak) || 0,
        persentasePajak: persentasePajak,
        total: Number(total) || 0,
      },
      arsip: {
        ...contract.arsip,
        statusMaterai: statusMaterai,
      },
      riwayatStatus: [
        ...(contract.riwayatStatus || []),
        {
          status: status,
          timestamp: now,
          catatan:
            catatanEdit.trim() ||
            'Perubahan data kontrak, rincian BoQ, atau 4 poin hitungan disimpan melalui menu Edit.',
          user: 'Editor / Pengawas Kontrak',
        },
      ],
      updatedAt: now,
      syncedWithSheets: false,
    };

    onSave(updatedContract);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Data Hasil Input Kontrak
              </h3>
              <p className="text-xs text-slate-500">
                Ubah identitas kontrak, masa kerja, tabel rincian pekerjaan BoQ, dan 4 poin hitungan
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bagian 1: Identitas Pokok Dokumen Kontrak */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              1. Identitas Pokok Dokumen Kontrak
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipe Kontrak</label>
                <select
                  value={tipeKontrak}
                  onChange={(e) => setTipeKontrak(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                >
                  <option value="SPBJ">SPBJ (Pengadaan Barang & Jasa)</option>
                  <option value="SPBL">SPBL (Pesanan Barang Langsung)</option>
                  <option value="SPK">SPK (Surat Perintah Kerja)</option>
                  <option value="Perjanjian Kerjasama">Perjanjian Kerjasama</option>
                  <option value="Surat Pesanan">Surat Pesanan</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Kontrak</label>
                <input
                  type="text"
                  value={nomorKontrak}
                  onChange={(e) => setNomorKontrak(e.target.value)}
                  placeholder="Contoh: 0142.PJ/DAN.01.01/UP3-WTP/2026"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-semibold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Kontrak</label>
                <input
                  type="date"
                  value={tanggalKontrak}
                  onChange={(e) => setTanggalKontrak(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-semibold text-slate-700 block mb-1">Judul / Perihal Pekerjaan</label>
                <input
                  type="text"
                  value={judulKontrak}
                  onChange={(e) => setJudulKontrak(e.target.value)}
                  placeholder="Uraian judul pengadaan barang atau jasa..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Unit Kontrak</label>
                <input
                  type="text"
                  value={unitKontrak}
                  onChange={(e) => setUnitKontrak(e.target.value)}
                  placeholder="UP3 Watampone, UP3 Bulukumba, UID Makassar"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-sky-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rekanan / Vendor Pelaksana</label>
                <input
                  type="text"
                  value={rekanan}
                  onChange={(e) => setRekanan(e.target.value)}
                  placeholder="PT / CV Penyedia Barang Jasa"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Tahapan Saat Ini</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContractStage)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-sky-700"
                >
                  <option value="Draft Kontrak">1. Draft Kontrak</option>
                  <option value="Masa Pekerjaan">2. Masa Pekerjaan</option>
                  <option value="Tanda Tangan Berkas">3. Tanda Tangan Berkas</option>
                  <option value="Upload Tagihan">4. Upload Tagihan</option>
                  <option value="Lunas">5. Lunas</option>
                  <option value="Status Koreksi">⚠️ Status Koreksi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bagian 2: Masa Pelaksanaan & Batas Waktu */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              2. Masa Kontrak (Jangka Waktu Pelaksanaan)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => handleDateChange(e.target.value, tanggalSelesai)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Selesai (Jatuh Tempo)</label>
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => handleDateChange(tanggalMulai, e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Durasi (Hari Kalender)</label>
                <input
                  type="number"
                  value={durasiHari}
                  onChange={(e) => setDurasiHari(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Tabel Rincian Pekerjaan BoQ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                  3. Isi-Isi Pekerjaan (Tabel BoQ Mentahan Kontrak)
                </span>
                <p className="text-[11px] text-slate-500">
                  Ubah rincian, sesuaikan volume, atau tambah item pekerjaan baru
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBoQRow}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 w-10 text-center">No</th>
                    <th className="p-2">Uraian / Deskripsi Pekerjaan</th>
                    <th className="p-2 w-20 text-right">Volume</th>
                    <th className="p-2 w-20 text-center">Satuan</th>
                    <th className="p-2 w-32 text-right">Harga Satuan (Rp)</th>
                    <th className="p-2 w-32 text-right">Subtotal (Rp)</th>
                    <th className="p-2 w-10 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isiPekerjaan.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={item.deskripsi}
                          onChange={(e) => handleBoQChange(idx, 'deskripsi', e.target.value)}
                          placeholder="Deskripsi item pekerjaan..."
                          className="w-full p-1.5 bg-white border border-slate-200 rounded focus:border-sky-500 font-medium"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={item.volume}
                          onChange={(e) => handleBoQChange(idx, 'volume', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={item.satuan}
                          onChange={(e) => handleBoQChange(idx, 'satuan', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-center font-mono"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="number"
                          value={item.hargaSatuan}
                          onChange={(e) => handleBoQChange(idx, 'hargaSatuan', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-right font-mono"
                        />
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold text-slate-900 pr-2">
                        {formatRupiah(item.subtotal)}
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveBoQRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus baris item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bagian 4: 4 Poin Hitungan Terakhir */}
          <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sky-950 uppercase tracking-wider block text-[11px]">
                  4. Empat (4) Poin Hitungan Terakhir Kontrak
                </span>
                <p className="text-[11px] text-sky-700">
                  Dapat disesuaikan secara manual atau dihitung otomatis berdasarkan rincian BoQ di atas
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoRecalculate}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Calculator className="w-3.5 h-3.5" />
                Hitung Otomatis dari BoQ
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">1. Jumlah BoQ (Rp)</label>
                <input
                  type="number"
                  value={jumlah}
                  onChange={(e) => setJumlah(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">2. DPP Nilai Lain (Rp)</label>
                <input
                  type="number"
                  value={dppNilaiLain}
                  onChange={(e) => setDppNilaiLain(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">3. Pajak (Rp)</label>
                  <select
                    value={persentasePajak}
                    onChange={(e) => setPersentasePajak(e.target.value)}
                    className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                  >
                    <option value="PPN 11%">PPN 11%</option>
                    <option value="PPN 12%">PPN 12%</option>
                    <option value="PPh / Lainnya">PPh / Lainnya</option>
                  </select>
                </div>
                <input
                  type="number"
                  value={pajak}
                  onChange={(e) => setPajak(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-800 block mb-1">4. Total Kontrak (Rp)</label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-black text-emerald-950"
                />
              </div>
            </div>
          </div>

          {/* Bagian 5: Status Materai Arsip & Catatan Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Status Arsip Materai</label>
              <select
                value={statusMaterai}
                onChange={(e) => setStatusMaterai(e.target.value as ArchiveSigningStatus)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold"
              >
                <option value="Draft (Belum TTD & Materai)">Draft (Belum TTD & Materai)</option>
                <option value="Sudah TTD & Bermaterai">Sudah TTD & Bermaterai</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Catatan Riwayat Pembaruan (Opsional)</label>
              <input
                type="text"
                value={catatanEdit}
                onChange={(e) => setCatatanEdit(e.target.value)}
                placeholder="Contoh: Menyesuaikan volume kawat AAAC sesuai adendum 1..."
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 inline-flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Kontrak</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
