export type ContractStage =
  | 'Draft Kontrak'
  | 'Masa Pekerjaan'
  | 'Tanda Tangan Berkas'
  | 'Upload Tagihan'
  | 'Lunas'
  | 'Status Koreksi';

export type ArchiveSigningStatus =
  | 'Draft (Belum TTD & Materai)'
  | 'Sudah TTD & Bermaterai';

export type PPhType = 'pph22' | 'pphFinal' | 'pph23' | 'custom' | 'none';

export interface PPhOption {
  type: PPhType;
  label: string;
  name: string;
  rate: number; // desimal, misal 0.015 untuk 1,5%
  ratePercent: number; // 1.5, 1.75, 2.0
  description: string;
  category: string;
}

export interface RealSettlementCalculation {
  pphType: PPhType;
  pphRate: number; // 0.015, 0.0175, 0.02
  pphLabel: string; // e.g. "PPh 22 1,5% (Material)"
  boqBase: number; // Nilai BoQ (Subtotal pekerjaan sebelum PPN)
  ppnAmount: number; // Nilai PPN yang dipotong/dikeluarkan
  pphAmount: number; // BOQ * tipe PPh
  penerimaanReal: number; // BOQ - (BOQ * tipe PPh)
  catatan?: string;
  calculatedAt?: string;
}

export interface BoQItem {
  no: number;
  deskripsi: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  subtotal: number;
}

export interface CalculationPoints {
  jumlah: number; // 1. Jumlah akumulasi subtotal pekerjaan
  dppNilaiLain: number; // 2. DPP Nilai Lain jika ada (atau standar DPP)
  pajak: number; // 3. PPN 11%/12% / PPh
  persentasePajak: string;
  total: number; // 4. Grand Total Akhir Kontrak
}

export interface ContractArchive {
  namaFile: string;
  tipeFile: string;
  statusMaterai: ArchiveSigningStatus;
  driveFileId?: string;
  driveLink?: string;
  tanggalUpload: string;
  tanggalUpdateTTD?: string;
  previewUrl?: string;
}

export interface StatusLog {
  status: ContractStage;
  timestamp: string;
  catatan?: string;
  user?: string;
}

export interface Contract {
  id: string;
  nomorKontrak: string;
  tipeKontrak: string; // SPBJ, SPBL, SPK, Perjanjian Kerjasama, dll
  tanggalKontrak: string; // YYYY-MM-DD
  judulKontrak: string;
  unitKontrak: string; // UP3 Watampone, UP3 Bulukumba, UID Makassar, dll
  rekanan: string;
  nilaiKontrak: number;
  masaKontrak: {
    tanggalMulai: string;
    tanggalSelesai: string;
    durasiHari: number;
  };
  isiPekerjaan: BoQItem[];
  perhitunganTerakhir: CalculationPoints;
  status: ContractStage;
  statusSebelumKoreksi?: ContractStage;
  catatanKoreksi?: string;
  arsip: ContractArchive;
  riwayatStatus: StatusLog[];
  calendarEventId?: string;
  calendarSigningReminderId?: string;
  penerimaanReal?: RealSettlementCalculation;
  syncedWithSheets?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStats {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
  syncedCount: number;
  driveFilesCount: number;
  calendarRemindersCount: number;
}
