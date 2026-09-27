import { Contract, PPhOption, PPhType, RealSettlementCalculation } from '../types/contract';

export const TIMEZONE_WITA = 'Asia/Makassar'; // GMT+8 (Waktu Indonesia Tengah - Watampone, Bulukumba, Makassar)

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Format date in Indonesian with GMT+8 (WITA)
export function formatTanggalIndonesia(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE_WITA,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

// Format full date & time with GMT+8 WITA
export function formatWaktuWITA(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE_WITA,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
    return `${formatted} WITA (GMT+8)`;
  } catch {
    return dateStr;
  }
}

// Generate current timestamp in GMT+8 WITA (ISO string with +08:00 offset)
export function getCurrentTimestampWITA(): string {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE_WITA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;
  } catch {
    return now.toISOString();
  }
}

// Format timestamp explicitly to GMT+8 (WITA) for Excel & Google Sheets display
export function formatWITAForExcel(dateInput?: string | Date): string {
  if (!dateInput) return '-';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: TIMEZONE_WITA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day} ${hour}:${minute}:${second} WITA`;
  } catch {
    return String(dateInput);
  }
}

export function getDeadlineStatus(contract: Contract): {
  isOverdue: boolean;
  isApproaching: boolean;
  daysRemaining: number;
  label: string;
  badgeClass: string;
} {
  if (!contract.masaKontrak?.tanggalSelesai) {
    return {
      isOverdue: false,
      isApproaching: false,
      daysRemaining: 999,
      label: 'Tanggal belum ditentukan',
      badgeClass: 'bg-slate-100 text-slate-700',
    };
  }

  // If already paid or completed
  if (contract.status === 'Lunas') {
    return {
      isOverdue: false,
      isApproaching: false,
      daysRemaining: 0,
      label: 'Selesai & Lunas',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }

  // Calculate today based on GMT+8
  const now = new Date();
  // Format to YYYY-MM-DD in Asia/Makassar
  const makassarDateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_WITA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const today = new Date(makassarDateParts);
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(contract.masaKontrak.tanggalSelesai);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      isOverdue: true,
      isApproaching: false,
      daysRemaining: days,
      label: `Lewat Jatuh Tempo (${Math.abs(days)} hari)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
    };
  } else if (days <= 7) {
    return {
      isOverdue: false,
      isApproaching: true,
      daysRemaining: days,
      label: days === 0 ? 'Jatuh Tempo HARI INI (WITA)' : `Jatuh tempo dlm ${days} hari`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    };
  } else {
    return {
      isOverdue: false,
      isApproaching: false,
      daysRemaining: days,
      label: `Sisa ${days} hari kalender`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
}

export function isDraftUnsigned(contract: Contract): boolean {
  return (
    contract.arsip?.statusMaterai === 'Draft (Belum TTD & Materai)' ||
    contract.status === 'Draft Kontrak'
  );
}

export function isBeforeMasaPekerjaan(contract: Contract): boolean {
  return contract.status === 'Draft Kontrak';
}

// 3 Standar Tipe PPh Sesuai Ketentuan Transaksi Kontrak & Pengadaan
export const PPH_OPTIONS: PPhOption[] = [
  {
    type: 'pph22',
    name: 'PPh 22 (1,5%)',
    label: 'PPh 22 1,5% (Material)',
    rate: 0.015,
    ratePercent: 1.5,
    description: 'Pemotongan pajak atas pembelian/pengadaan material, barang, atau suku cadang.',
    category: 'Material',
  },
  {
    type: 'pphFinal',
    name: 'PPh Final (1,75%)',
    label: 'PPh Final 1,75% (Jasa Konstuksi)',
    rate: 0.0175,
    ratePercent: 1.75,
    description: 'Pajak penghasilan final atas pelaksanaan pekerjaan jasa konstruksi / fisik.',
    category: 'Jasa Konstruksi',
  },
  {
    type: 'pph23',
    name: 'PPh 23 (2%)',
    label: 'PPh 23 2% (Jasa/Sewa)',
    rate: 0.02,
    ratePercent: 2.0,
    description: 'Pajak atas jasa pemeliharaan, sewa alat berat, instalasi, dan jasa manajemen lainnya.',
    category: 'Jasa/Sewa',
  },
];

/**
 * Rumus Penerimaan Real sesuai ketentuan:
 * BOq - (BOq x tipe PPh) = Hasil / Penerimaan Real
 *
 * @param boqBase Nilai BOQ (Subtotal pekerjaan sebelum PPN)
 * @param pphRate Tarif PPh dalam desimal (misal 0.015 untuk 1,5%)
 * @param ppnAmount Nilai PPN (jika ada pada kontrak yang dikurangkan untuk mencapai BOQ)
 * @param pphType Tipe PPh ('pph22' | 'pphFinal' | 'pph23' | 'custom' | 'none')
 * @param customLabel Label khusus jika menggunakan tarif custom
 */
export function calculateRealSettlement(
  boqBase: number,
  pphRate: number,
  ppnAmount: number = 0,
  pphType: PPhType = 'pph22',
  customLabel?: string,
  catatan?: string
): RealSettlementCalculation {
  const safeBoq = Math.max(0, boqBase || 0);
  const safeRate = Math.max(0, pphRate || 0);
  const pphAmount = Math.round(safeBoq * safeRate);
  const penerimaanReal = Math.round(safeBoq - pphAmount);

  let pphLabel = customLabel;
  if (!pphLabel) {
    const match = PPH_OPTIONS.find((opt) => opt.type === pphType);
    pphLabel = match ? match.label : `PPh Custom ${(safeRate * 100).toFixed(2)}%`;
  }

  return {
    pphType,
    pphRate: safeRate,
    pphLabel,
    boqBase: safeBoq,
    ppnAmount: ppnAmount || 0,
    pphAmount,
    penerimaanReal,
    catatan,
    calculatedAt: getCurrentTimestampWITA(),
  };
}

