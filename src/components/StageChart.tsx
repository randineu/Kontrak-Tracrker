import React from 'react';
import { PieChart, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Contract, ContractStage } from '../types/contract';
import { formatRupiah } from '../utils/formatters';

interface StageChartProps {
  contracts: Contract[];
}

export const StageChart: React.FC<StageChartProps> = ({ contracts }) => {
  const total = contracts.length;

  const STAGES: { stage: ContractStage; label: string; color: string; bg: string }[] = [
    { stage: 'Draft Kontrak', label: 'Draft Kontrak', color: '#f59e0b', bg: 'bg-amber-500' },
    { stage: 'Masa Pekerjaan', label: 'Masa Pekerjaan', color: '#0284c7', bg: 'bg-sky-600' },
    { stage: 'Tanda Tangan Berkas', label: 'TTD Berkas', color: '#6366f1', bg: 'bg-indigo-500' },
    { stage: 'Upload Tagihan', label: 'Upload Tagihan', color: '#a855f7', bg: 'bg-purple-500' },
    { stage: 'Lunas', label: 'Lunas', color: '#10b981', bg: 'bg-emerald-500' },
    { stage: 'Status Koreksi', label: 'Status Koreksi', color: '#f43f5e', bg: 'bg-rose-500' },
  ];

  const stageData = STAGES.map((s) => {
    const list = contracts.filter((c) => c.status === s.stage);
    const count = list.length;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const value = list.reduce((sum, c) => sum + (c.nilaiKontrak || 0), 0);
    return {
      ...s,
      count,
      percentage,
      value,
    };
  });

  // Calculate Unit Breakdown
  const unitsMap = new Map<string, { count: number; value: number }>();
  contracts.forEach((c) => {
    const u = c.unitKontrak || 'Lainnya';
    const curr = unitsMap.get(u) || { count: 0, value: 0 };
    unitsMap.set(u, {
      count: curr.count + 1,
      value: curr.value + (c.nilaiKontrak || 0),
    });
  });
  const unitList = Array.from(unitsMap.entries()).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-sky-600" />
            Distribusi & Persentase Masing-Masing Tahap Kontrak
          </h3>
          <p className="text-xs text-slate-500">
            Pemantauan siklus hidup kontrak real-time dari registrasi draft hingga pelunasan
          </p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start">
          Total: {total} Dokumen Kontrak
        </div>
      </div>

      {/* Multi-segment Segmented Bar */}
      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-4">
        {stageData.map((item) =>
          item.percentage > 0 ? (
            <div
              key={item.stage}
              style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
              title={`${item.label}: ${item.count} (${item.percentage.toFixed(1)}%)`}
              className="h-full transition-all duration-500 hover:opacity-85"
            />
          ) : null
        )}
      </div>

      {/* Grid of Stage Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
        {stageData.map((item) => (
          <div
            key={item.stage}
            className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">{item.percentage.toFixed(1)}%</span>
                <span className="text-xs font-medium text-slate-500">{item.count} ktr</span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {formatRupiah(item.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Unit Breakdown Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Penyebaran Unit Pelaksana:</span>
        {unitList.map(([unit, data]) => (
          <div key={unit} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span className="font-medium text-slate-800">{unit}:</span>
            <span className="text-slate-500 font-mono">
              {data.count} ({total > 0 ? ((data.count / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
