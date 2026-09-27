import React from 'react';
import {
  FileText,
  DollarSign,
  Clock,
  HardHat,
  FileSignature,
  Receipt,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { Contract } from '../types/contract';
import { formatRupiah } from '../utils/formatters';

interface StatsSummaryProps {
  contracts: Contract[];
  activeFilterStage: string | null;
  onFilterStage: (stage: string | null) => void;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  contracts,
  activeFilterStage,
  onFilterStage,
}) => {
  const totalCount = contracts.length;
  const totalValue = contracts.reduce((acc, c) => acc + (c.nilaiKontrak || 0), 0);

  const draftCount = contracts.filter((c) => c.status === 'Draft Kontrak').length;
  const inProgressCount = contracts.filter((c) => c.status === 'Masa Pekerjaan').length;
  const signingCount = contracts.filter((c) => c.status === 'Tanda Tangan Berkas').length;
  const billingCount = contracts.filter((c) => c.status === 'Upload Tagihan').length;
  const paidCount = contracts.filter((c) => c.status === 'Lunas').length;
  const correctionCount = contracts.filter((c) => c.status === 'Status Koreksi').length;
  const totalPenerimaanReal = contracts
    .filter((c) => c.status === 'Lunas' && c.penerimaanReal)
    .reduce((acc, c) => acc + (c.penerimaanReal?.penerimaanReal || 0), 0);

  const cards = [
    {
      stage: 'Draft Kontrak',
      label: 'Draft Kontrak',
      count: draftCount,
      sublabel: 'proses draft / tanda tangan kontrak',
      icon: Clock,
      color: 'amber',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      activeRing: 'ring-2 ring-amber-500',
    },
    {
      stage: 'Masa Pekerjaan',
      label: 'Masa Pekerjaan',
      count: inProgressCount,
      sublabel: 'Fisik berjalan',
      icon: HardHat,
      color: 'blue',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      activeRing: 'ring-2 ring-blue-500',
    },
    {
      stage: 'Tanda Tangan Berkas',
      label: 'Tanda Tangan Berkas',
      count: signingCount,
      sublabel: 'Draft/kirim/pengajuan tanda tangan tagihan',
      icon: FileSignature,
      color: 'indigo',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      activeRing: 'ring-2 ring-indigo-500',
    },
    {
      stage: 'Upload Tagihan',
      label: 'Upload Tagihan',
      count: billingCount,
      sublabel: 'mengupload file tagihan / menunggu proses verifikasi dan pelunasan',
      icon: Receipt,
      color: 'purple',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      activeRing: 'ring-2 ring-purple-500',
    },
    {
      stage: 'Lunas',
      label: 'Lunas',
      count: paidCount,
      sublabel:
        totalPenerimaanReal > 0
          ? `Real: ${formatRupiah(totalPenerimaanReal)}`
          : 'Selesai terbayar (PPN & PPh)',
      icon: CheckCircle2,
      color: 'emerald',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      stage: 'Status Koreksi',
      label: 'Status Koreksi',
      count: correctionCount,
      sublabel: 'Perlu revisi',
      icon: AlertOctagon,
      color: 'rose',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      activeRing: 'ring-2 ring-rose-500',
    },
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Top Banner KPI: Total & Nilai */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Kontrak Terdata
            </p>
            <p className="text-2xl font-black text-slate-900">
              {totalCount}{' '}
              <span className="text-xs font-normal text-slate-500">Berkas</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Nilai Kontrak
            </p>
            <p className="text-xl font-black text-slate-900 truncate">
              {formatRupiah(totalValue)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Belum Masa Kerja
            </p>
            <p className="text-2xl font-black text-amber-700">
              {draftCount}{' '}
              <span className="text-xs font-normal text-slate-500">Kontrak</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dalam Status Koreksi
            </p>
            <p className="text-2xl font-black text-rose-700">
              {correctionCount}{' '}
              <span className="text-xs font-normal text-slate-500">Revisi</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stage Clickable Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = activeFilterStage === card.stage;
          return (
            <button
              key={card.stage}
              onClick={() => onFilterStage(isActive ? null : card.stage)}
              className={`text-left p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                card.bg
              } ${card.border} ${isActive ? `${card.activeRing} shadow-md` : 'shadow-xs hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon className={`w-4 h-4 ${card.text}`} />
                <span className={`text-base font-black ${card.text}`}>
                  {card.count}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{card.label}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{card.sublabel}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
