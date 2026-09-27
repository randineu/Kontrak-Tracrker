import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  FolderUp,
  FileSignature,
  Cpu,
  Zap,
  ShieldCheck,
  Coins,
  Key,
} from 'lucide-react';
import { Contract, BoQItem, CalculationPoints } from '../types/contract';
import { uploadContractToDrive } from '../services/driveSync';
import { formatRupiah } from '../utils/formatters';
import { getActiveApiKey, maskApiKey } from '../utils/apiKeyManager';

const GEMINI_MODEL_OPTIONS = [
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: 'Terkini & Cepat',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Versi Flash mutakhir dengan pemrosesan seimbang dan responsif.',
    tokenCost: 'Efisien',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'gemini-3.8-flash',
    tag: 'Akurasi Tinggi',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Generasi 3.8 akurasi tinggi untuk tabel BoQ kompleks & 4 poin hitungan.',
    tokenCost: 'Standar',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'gemini-3.7-flash',
    tag: 'Gen 3.7 Stabil',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Model multimodal canggih generasi 3.7 untuk ekstraksi kontrak komprehensif.',
    tokenCost: 'Standar',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'gemini-3.6-flash',
    tag: 'Gen 3.6 Cepat',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'Performa stabil generasi 3.6 dengan pemrosesan dokumen cepat.',
    tokenCost: 'Efisien',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'gemini-3.5-flash-lite',
    tag: 'Hemat Kuota Lite',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Versi Lite generasi 3.5, hemat token dan beban komputasi ringan.',
    tokenCost: 'Hemat Token',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'gemini-3.1-flash-lite',
    tag: 'Sangat Hemat Lite',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Sangat hemat konsumsi kuota token, cocok untuk mencegah rate limit.',
    tokenCost: 'Sangat Hemat',
  },
  {
    id: 'gemini-3.0-flash',
    name: 'gemini-3.0-flash',
    tag: 'Gen 3.0 Flash',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Fondasi generasi 3.0 dengan performa pemrosesan dokumen yang baik.',
    tokenCost: 'Efisien',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    tag: 'Gen 2.5 Stabil',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Generasi 2.5 stabil dengan performa ekstraksi andal.',
    tokenCost: 'Hemat',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'gemini-2.0-flash',
    tag: 'Gen 2.0 Ringan',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Generasi 2.0 ringan dan efisien untuk dokumen terstruktur.',
    tokenCost: 'Hemat',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'gemini-1.5-flash',
    tag: 'Gen 1.5 Legasi',
    badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Generasi 1.5 klasik yang stabil dan sangat hemat token.',
    tokenCost: 'Ultra Hemat',
  },
];

const MODEL_STORAGE_KEY = 'gemini_ocr_selected_model';

interface UploadContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveContract: (newContract: Contract) => void;
  accessToken: string | null;
  onOpenApiKeySettings?: () => void;
}

export const UploadContractModal: React.FC<UploadContractModalProps> = ({
  isOpen,
  onClose,
  onSaveContract,
  accessToken,
  onOpenApiKeySettings,
}) => {
  if (!isOpen) return null;

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-3.8-flash';
  });
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [extractedContract, setExtractedContract] = useState<Partial<Contract> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleProcessAI = async () => {
    if (!file && !textContent.trim()) {
      setErrorMessage('Pilih file dokumen PDF/gambar atau tempel teks kontrak terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProcessStep('Mempersiapkan dokumen untuk AI...');

      const activeKey = getActiveApiKey();
      let payload: any = {
        model: selectedModel,
        userApiKey: activeKey?.key || undefined,
      };

      if (file) {
        setProcessStep(`Membaca file "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

        // Use FileReader.readAsDataURL for native fast base64 conversion (handles large PDFs/images safely)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = () => reject(new Error('Gagal membaca file di browser.'));
          reader.readAsDataURL(file);
        });

        // Determine proper MIME type
        let mimeType = file.type;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          mimeType = 'application/pdf';
        } else if (lowerName.endsWith('.png')) {
          mimeType = 'image/png';
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          mimeType = 'image/jpeg';
        } else if (lowerName.endsWith('.webp')) {
          mimeType = 'image/webp';
        } else if (lowerName.endsWith('.docx')) {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (lowerName.endsWith('.doc')) {
          mimeType = 'application/msword';
        }

        payload = {
          ...payload,
          fileData: base64,
          mimeType: mimeType || 'application/pdf',
          fileName: file.name,
        };
      } else {
        payload = {
          ...payload,
          textContent: textContent,
        };
      }

      const activeModelInfo = GEMINI_MODEL_OPTIONS.find((m) => m.id === selectedModel);
      setProcessStep(`Memproses dengan ${activeModelInfo?.name || selectedModel}...`);
      const response = await fetch('/api/extract-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal mengekstrak kontrak dengan AI.');
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Data ekstraksi tidak valid.');
      }

      const data = result.data;
      setExtractedContract({
        id: `cnt-${Date.now()}`,
        nomorKontrak: data.nomorKontrak || 'KTR-BARU-' + Math.floor(Math.random() * 1000),
        tipeKontrak: data.tipeKontrak || 'SPBJ',
        tanggalKontrak: data.tanggalKontrak || new Date().toISOString().split('T')[0],
        judulKontrak: data.judulKontrak || 'Pekerjaan Pengadaan Kontrak',
        unitKontrak: data.unitKontrak || 'UP3 Watampone',
        rekanan: data.rekanan || 'Penyedia Jasa',
        nilaiKontrak: Number(data.nilaiKontrak) || Number(data.perhitunganTerakhir?.total) || 0,
        masaKontrak: {
          tanggalMulai:
            data.masaKontrak?.tanggalMulai || new Date().toISOString().split('T')[0],
          tanggalSelesai:
            data.masaKontrak?.tanggalSelesai || new Date().toISOString().split('T')[0],
          durasiHari: Number(data.masaKontrak?.durasiHari) || 30,
        },
        isiPekerjaan: (data.isiPekerjaan || []).map((item: any, idx: number) => ({
          no: item.no || idx + 1,
          deskripsi: item.deskripsi || 'Item pekerjaan',
          volume: Number(item.volume) || 1,
          satuan: item.satuan || 'unit',
          hargaSatuan: Number(item.hargaSatuan) || 0,
          subtotal: Number(item.subtotal) || 0,
        })),
        perhitunganTerakhir: {
          jumlah: Number(data.perhitunganTerakhir?.jumlah) || 0,
          dppNilaiLain:
            Number(data.perhitunganTerakhir?.dppNilaiLain) ||
            Number(data.perhitunganTerakhir?.jumlah) ||
            0,
          pajak: Number(data.perhitunganTerakhir?.pajak) || 0,
          persentasePajak: data.perhitunganTerakhir?.persentasePajak || 'PPN 11%',
          total: Number(data.perhitunganTerakhir?.total) || 0,
        },
        status:
          data.statusArsip === 'Sudah TTD & Bermaterai' ? 'Masa Pekerjaan' : 'Draft Kontrak',
        arsip: {
          namaFile: file?.name || 'Dokumen_Kontrak.pdf',
          tipeFile: file?.type || 'application/pdf',
          statusMaterai:
            data.statusArsip === 'Sudah TTD & Bermaterai'
              ? 'Sudah TTD & Bermaterai'
              : 'Draft (Belum TTD & Materai)',
          tanggalUpload: new Date().toISOString(),
        },
        catatanKoreksi: data.catatanKoreksi || '',
      });

      setProcessStep('Ekstraksi Berhasil!');
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses ekstraksi kontrak.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalSave = async () => {
    if (!extractedContract) return;

    try {
      setIsProcessing(true);
      let driveResult = null;

      // If user is connected with Google Workspace and has uploaded a physical file, upload to Drive!
      if (file && accessToken) {
        setProcessStep('Mengarsipkan file ke Google Drive...');
        try {
          driveResult = await uploadContractToDrive(
            file,
            file.name,
            extractedContract.arsip?.statusMaterai === 'Sudah TTD & Bermaterai',
            accessToken
          );
        } catch (e) {
          console.warn('Google drive upload warning:', e);
        }
      }

      const now = new Date().toISOString();
      const finalContract: Contract = {
        id: extractedContract.id || `cnt-${Date.now()}`,
        nomorKontrak: extractedContract.nomorKontrak || 'NOMOR-TIDAK-TERCETAK',
        tipeKontrak: extractedContract.tipeKontrak || 'SPBJ',
        tanggalKontrak: extractedContract.tanggalKontrak || now.split('T')[0],
        judulKontrak: extractedContract.judulKontrak || 'Judul Kontrak',
        unitKontrak: extractedContract.unitKontrak || 'UP3 Watampone',
        rekanan: extractedContract.rekanan || 'Penyedia',
        nilaiKontrak: Number(extractedContract.nilaiKontrak) || 0,
        masaKontrak: extractedContract.masaKontrak as any,
        isiPekerjaan: extractedContract.isiPekerjaan || [],
        perhitunganTerakhir: extractedContract.perhitunganTerakhir as CalculationPoints,
        status: extractedContract.status || 'Draft Kontrak',
        catatanKoreksi: extractedContract.catatanKoreksi || '',
        arsip: {
          namaFile: file?.name || extractedContract.arsip?.namaFile || 'Dokumen_Kontrak.pdf',
          tipeFile: file?.type || 'application/pdf',
          statusMaterai:
            extractedContract.arsip?.statusMaterai || 'Draft (Belum TTD & Materai)',
          driveFileId: driveResult?.fileId,
          driveLink: driveResult?.webViewLink,
          tanggalUpload: now,
        },
        riwayatStatus: [
          {
            status: extractedContract.status || 'Draft Kontrak',
            timestamp: now,
            catatan: 'Kontrak berhasil diekstraksi menggunakan AI OCR dan dimasukkan ke database.',
            user: 'Sistem AI Tracking Kontrak',
          },
        ],
        createdAt: now,
        updatedAt: now,
        syncedWithSheets: false,
      };

      onSaveContract(finalContract);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan kontrak.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Input Kontrak Baru dengan AI OCR
              </h3>
              <p className="text-xs text-slate-500">
                Ekstraksi otomatis dokumen PDF, Docs, atau Gambar ke database dan arsip
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

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {!extractedContract ? (
            <>
              {/* Mode switch */}
              <div className="flex gap-2 border-b border-slate-200 pb-3 text-xs font-bold">
                <button
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    inputMode === 'file'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File (PDF / DOC / Foto)
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    inputMode === 'text'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Salin & Tempel Teks Kontrak
                </button>
              </div>

              {inputMode === 'file' ? (
                /* Drag and drop zone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50/80 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {file ? file.name : 'Klik atau seret file kontrak ke sini'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendukung format PDF, Word (DOC/DOCX), dan Gambar (JPG/PNG) hingga 50MB
                    </p>
                  </div>
                  {file && (
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" /> File terpilih:{' '}
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              ) : (
                /* Text Area */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Tempel Isi Teks Kontrak Mentahan:
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Tempel isi SPBJ, SPBL, atau SPK di sini..."
                    rows={8}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Model Selection for Token Efficiency */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Pilihan Generasi & Model Gemini AI
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Pilih versi model 3.8 ke bawah untuk menghemat kuota token & mencegah limit
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 shadow-2xs">
                    <Coins className="w-3 h-3 text-amber-500" />
                    <span>
                      {GEMINI_MODEL_OPTIONS.find((m) => m.id === selectedModel)?.tokenCost || 'Standar'}
                    </span>
                  </div>
                </div>

                {/* Kode API yang Sedang Dipakai Banner */}
                {(() => {
                  const activeKey = getActiveApiKey();
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-slate-500 font-medium">Kode API Digunakan:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {activeKey ? maskApiKey(activeKey.key) : 'Default Server API Key'}
                        </span>
                        {activeKey && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                            Aktif
                          </span>
                        )}
                      </div>
                      {onOpenApiKeySettings && (
                        <button
                          type="button"
                          onClick={onOpenApiKeySettings}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800 underline"
                        >
                          Kelola API Key ↗
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {GEMINI_MODEL_OPTIONS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleModelChange(m.id)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-50/80 border-sky-400 shadow-xs ring-1 ring-sky-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="gemini_model_choice"
                              checked={isSelected}
                              onChange={() => handleModelChange(m.id)}
                              className="text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                            />
                            <span className="text-xs font-bold text-slate-900">{m.name}</span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${m.badgeColor}`}
                          >
                            {m.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight pl-5">
                          {m.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Process Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessAI}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 inline-flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{processStep || 'Sedang memproses AI...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Mulai Ekstraksi AI</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Review & Edit Extracted Results */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI Berhasil Mengekstrak Data Kontrak Secara Akurat</span>
                </div>
                <button
                  onClick={() => setExtractedContract(null)}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  Ubah File / Input Ulang
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe Kontrak</label>
                  <input
                    type="text"
                    value={extractedContract.tipeKontrak || ''}
                    onChange={(e) =>
                      setExtractedContract({ ...extractedContract, tipeKontrak: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nomor Kontrak</label>
                  <input
                    type="text"
                    value={extractedContract.nomorKontrak || ''}
                    onChange={(e) =>
                      setExtractedContract({ ...extractedContract, nomorKontrak: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Judul Pekerjaan</label>
                  <input
                    type="text"
                    value={extractedContract.judulKontrak || ''}
                    onChange={(e) =>
                      setExtractedContract({ ...extractedContract, judulKontrak: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit Kontrak</label>
                  <input
                    type="text"
                    value={extractedContract.unitKontrak || ''}
                    onChange={(e) =>
                      setExtractedContract({ ...extractedContract, unitKontrak: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-sky-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rekanan / Vendor</label>
                  <input
                    type="text"
                    value={extractedContract.rekanan || ''}
                    onChange={(e) =>
                      setExtractedContract({ ...extractedContract, rekanan: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Masa Mulai</label>
                  <input
                    type="date"
                    value={extractedContract.masaKontrak?.tanggalMulai || ''}
                    onChange={(e) =>
                      setExtractedContract({
                        ...extractedContract,
                        masaKontrak: {
                          ...extractedContract.masaKontrak!,
                          tanggalMulai: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Masa Selesai (Jatuh Tempo)
                  </label>
                  <input
                    type="date"
                    value={extractedContract.masaKontrak?.tanggalSelesai || ''}
                    onChange={(e) =>
                      setExtractedContract({
                        ...extractedContract,
                        masaKontrak: {
                          ...extractedContract.masaKontrak!,
                          tanggalSelesai: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Extracted 4 Points of Calculation */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800 block mb-2 uppercase tracking-wider">
                  4 Poin Hitungan Terakhir Terbaca:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">1. Jumlah BoQ:</span>
                    <p className="font-black text-slate-900 font-mono">
                      {formatRupiah(extractedContract.perhitunganTerakhir?.jumlah || 0)}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">2. DPP Lain:</span>
                    <p className="font-bold text-slate-900 font-mono">
                      {formatRupiah(extractedContract.perhitunganTerakhir?.dppNilaiLain || 0)}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400">
                      3. Pajak ({extractedContract.perhitunganTerakhir?.persentasePajak}):
                    </span>
                    <p className="font-bold text-slate-900 font-mono">
                      {formatRupiah(extractedContract.perhitunganTerakhir?.pajak || 0)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-700 font-bold">4. Total Akhir:</span>
                    <p className="font-black text-emerald-900 font-mono">
                      {formatRupiah(extractedContract.perhitunganTerakhir?.total || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Arsip & Materai Check */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-amber-900">Status Materai Arsip:</span>
                    <p className="text-[11px] text-amber-800">
                      {extractedContract.arsip?.statusMaterai}
                    </p>
                  </div>
                </div>
                <select
                  value={extractedContract.arsip?.statusMaterai}
                  onChange={(e) =>
                    setExtractedContract({
                      ...extractedContract,
                      arsip: {
                        ...extractedContract.arsip!,
                        statusMaterai: e.target.value as any,
                      },
                    })
                  }
                  className="bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800"
                >
                  <option value="Draft (Belum TTD & Materai)">Draft (Belum TTD & Materai)</option>
                  <option value="Sudah TTD & Bermaterai">Sudah TTD & Bermaterai</option>
                </select>
              </div>

              {/* BoQ Items Summary */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  Item Pekerjaan BoQ ({extractedContract.isiPekerjaan?.length || 0} Uraian):
                </span>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 text-[10px]">
                      <tr>
                        <th className="p-1.5 text-center">No</th>
                        <th className="p-1.5">Uraian</th>
                        <th className="p-1.5 text-right">Vol</th>
                        <th className="p-1.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(extractedContract.isiPekerjaan || []).map((item, i) => (
                        <tr key={i}>
                          <td className="p-1.5 text-center text-slate-500">{item.no}</td>
                          <td className="p-1.5 text-slate-800 font-medium truncate max-w-[200px]">
                            {item.deskripsi}
                          </td>
                          <td className="p-1.5 text-right font-mono">
                            {item.volume} {item.satuan}
                          </td>
                          <td className="p-1.5 text-right font-mono font-semibold">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setExtractedContract(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={handleFinalSave}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan ke Database & Sinkronkan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
