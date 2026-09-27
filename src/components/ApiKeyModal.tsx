import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Shield,
  HelpCircle,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import {
  getStoredApiKeyDetails,
  saveStoredApiKeys,
  StoredApiKey,
  testSingleApiKey,
  SUPPORTED_GEMINI_MODELS,
  getPreferredModel,
  setPreferredModel,
  getActiveApiKey,
  setActiveApiKeyId,
  getActiveApiKeyId,
  maskApiKey,
} from '../utils/apiKeyManager';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeysUpdated,
}) => {
  if (!isOpen) return null;

  const [keysList, setKeysList] = useState<StoredApiKey[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(getPreferredModel());
  const [singleKeyInput, setSingleKeyInput] = useState('');
  const [keyNameInput, setKeyNameInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Active Key management state
  const [activeKeyId, setActiveKeyIdState] = useState<string | null>(getActiveApiKeyId());
  const [showFullActiveKey, setShowFullActiveKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());
  const [serverEnvKeyMask, setServerEnvKeyMask] = useState<string | null>(null);

  // Currently active key object
  const currentActiveKey =
    keysList.find((k) => k.id === activeKeyId) ||
    (keysList.length > 0 ? keysList[0] : null);

  useEffect(() => {
    loadKeys();
    setSelectedModel(getPreferredModel());
    setActiveKeyIdState(getActiveApiKeyId());

    fetch('/api/key-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.envKeyMask) {
          setServerEnvKeyMask(data.envKeyMask);
        }
      })
      .catch((e) => console.warn('Failed to fetch server key status:', e));
  }, [isOpen]);

  const loadKeys = () => {
    const stored = getStoredApiKeyDetails();
    setKeysList(stored);
  };

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSetActiveKey = (id: string) => {
    setActiveApiKeyId(id);
    setActiveKeyIdState(id);
    const targetKey = keysList.find((k) => k.id === id);
    showNotice(
      'success',
      `API Key "${targetKey?.name || 'Kustom'}" sekarang aktif digunakan.`
    );
    if (onKeysUpdated) onKeysUpdated();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
    showNotice('success', 'Kode API Key berhasil disalin ke clipboard.');
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setPreferredModel(modelId);
    showNotice('success', `Model OCR utama diubah ke ${modelId} (Versi ≤ 3.7).`);
  };

  const handleAddSingleKey = () => {
    const trimmed = singleKeyInput.trim();
    if (!trimmed) {
      showNotice('error', 'Masukkan kode API Key terlebih dahulu.');
      return;
    }
    if (trimmed.length < 10) {
      showNotice('error', 'Format API Key terlalu pendek / tidak valid.');
      return;
    }

    // Check duplicate
    if (keysList.some((k) => k.key === trimmed)) {
      showNotice('error', 'API Key ini sudah terdaftar dalam daftar.');
      return;
    }

    const newEntry: StoredApiKey = {
      id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: trimmed,
      name: keyNameInput.trim() || `API Key #${keysList.length + 1}`,
      addedAt: new Date().toISOString(),
      status: 'unknown',
    };

    const updated = [...keysList, newEntry];
    setKeysList(updated);
    saveStoredApiKeys(updated);
    if (!activeKeyId || keysList.length === 0) {
      setActiveApiKeyId(newEntry.id);
      setActiveKeyIdState(newEntry.id);
    }
    setSingleKeyInput('');
    setKeyNameInput('');
    showNotice('success', 'API Key berhasil ditambahkan ke rotasi.');
    if (onKeysUpdated) onKeysUpdated();
  };

  const handleAddBulk = () => {
    if (!bulkInput.trim()) {
      showNotice('error', 'Tempel beberapa API Key (satu per baris atau pisahkan koma).');
      return;
    }

    const splitKeys = bulkInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 8);

    if (splitKeys.length === 0) {
      showNotice('error', 'Tidak ada format API Key yang valid ditemukan.');
      return;
    }

    let addedCount = 0;
    const existingKeyStrings = new Set(keysList.map((k) => k.key));
    const newItems: StoredApiKey[] = [];

    splitKeys.forEach((keyStr, idx) => {
      if (!existingKeyStrings.has(keyStr)) {
        existingKeyStrings.add(keyStr);
        newItems.push({
          id: `key-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          key: keyStr,
          name: `API Key Cadangan ${keysList.length + newItems.length + 1}`,
          addedAt: new Date().toISOString(),
          status: 'unknown',
        });
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showNotice('error', 'Semua API Key yang dimasukkan sudah terdaftar sebelumnya.');
      return;
    }

    const updated = [...keysList, ...newItems];
    setKeysList(updated);
    saveStoredApiKeys(updated);
    setBulkInput('');
    setIsBulkMode(false);
    showNotice('success', `Berhasil menambahkan ${addedCount} API Key baru ke sistem rotasi.`);
    if (onKeysUpdated) onKeysUpdated();
  };

  const handleDeleteKey = (id: string) => {
    const updated = keysList.filter((k) => k.id !== id);
    setKeysList(updated);
    saveStoredApiKeys(updated);
    showNotice('success', 'API Key dihapus dari daftar rotasi.');
    if (onKeysUpdated) onKeysUpdated();
  };

  const handleTestKey = async (item: StoredApiKey) => {
    try {
      setTestingKeyId(item.id);
      const result = await testSingleApiKey(item.key, selectedModel);

      const updated = keysList.map((k) => {
        if (k.id === item.id) {
          return {
            ...k,
            status: result.valid
              ? ('active' as const)
              : result.isQuotaExhausted
              ? ('exhausted' as const)
              : ('invalid' as const),
            errorMessage: result.error,
            lastUsedAt: new Date().toISOString(),
          };
        }
        return k;
      });

      setKeysList(updated);
      saveStoredApiKeys(updated);

      if (result.valid) {
        showNotice('success', `${item.name || 'API Key'} aktif pada model ${selectedModel}!`);
      } else if (result.isQuotaExhausted) {
        showNotice('error', `${item.name || 'API Key'} terkena limit/kuota habis. Sistem akan merotasi ke key lain.`);
      } else {
        showNotice('error', `${item.name || 'API Key'} error: ${result.error}`);
      }
    } finally {
      setTestingKeyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Opsi API Key & Versi OCR Gemini
                <span className="px-2 py-0.5 text-[11px] font-bold bg-sky-100 text-sky-800 rounded-full border border-sky-200">
                  Versi ≤ 3.7 Aktif
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                Pilih versi model Gemini (3.7 atau dibawahnya) & input array multi-key untuk auto-rotation anti rate-limit.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification banner */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. KODE API KEY YANG SEDANG DIPAKAI SAAT INI */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-400 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">
                      Kode API Key Yang Sedang Dipakai
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Aktif Digunakan
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                    {currentActiveKey ? currentActiveKey.name || 'API Key Utama' : 'API Key Default Cloud Server'}
                  </h3>
                </div>
              </div>

              {currentActiveKey && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFullActiveKey(!showFullActiveKey)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                    title={showFullActiveKey ? 'Sembunyikan kode API' : 'Tampilkan kode API lengkap'}
                  >
                    {showFullActiveKey ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px]">Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px]">Lihat Kode</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(currentActiveKey.key, 'active-hero')}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs"
                    title="Salin kode API key aktif"
                  >
                    {copiedKeyId === 'active-hero' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] text-emerald-700 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px]">Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Display the active code box */}
            <div className="bg-white/95 rounded-xl border border-emerald-300/80 p-3 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 font-mono text-[11px] select-none font-bold">KODE API:</span>
                <span className="font-mono text-xs sm:text-sm font-black text-slate-900 tracking-wide select-all truncate">
                  {currentActiveKey
                    ? showFullActiveKey
                      ? currentActiveKey.key
                      : maskApiKey(currentActiveKey.key)
                    : serverEnvKeyMask || 'AIzaSy••••••••[Default Server Key Aktif]'}
                </span>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                  Model: {selectedModel}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-snug">
              {currentActiveKey
                ? 'Kode API Key di atas digunakan otomatis untuk mengekstrak isi tabel BoQ & 4 poin hitungan kontrak.'
                : 'Sistem sedang menggunakan kredensial bawaan Google Cloud AI Studio server. Anda dapat menambahkan API key Anda sendiri di bawah.'}
            </p>
          </div>

          {/* Model Version Selector (Strictly 3.7 and Below) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-600" />
                Pilihan Versi Gemini OCR (Versi 3.7 atau Dibawahnya)
              </label>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                Respon Cepat & Stabil
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORTED_GEMINI_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleModelChange(model.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-50/90 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{model.name}</span>
                        {model.recommended && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-sky-600 text-white rounded">
                            Rekomendasi
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {model.versionLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{model.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Information box */}
          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sky-950">Mekanisme Auto-Rotate Anti Resource Exhausted:</p>
              <p className="text-slate-600 leading-relaxed">
                Saat OCR memproses dokumen kontrak, sistem akan menggunakan model pilihan Anda (misal{' '}
                <strong>Gemini 3.7 Flash</strong> atau <strong>Gemini 2.5 Flash</strong>) dengan API Key #1. Jika key tersebut
                terkena limit kuota (429), sistem otomatis langsung beralih ke API Key #2, #3 tanpa gagal.
              </p>
            </div>
          </div>

          {/* Form to Add Keys */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-sky-600" />
                Tambah API Key Cadangan
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkMode(!isBulkMode)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 underline"
              >
                {isBulkMode ? 'Mode Input Satuan' : 'Mode Tempel Sekaligus (Bulk)'}
              </button>
            </div>

            {!isBulkMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Label / Nama Key
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Akun Cadangan 1"
                      value={keyNameInput}
                      onChange={(e) => setKeyNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Gemini API Key (Google AI Studio)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={singleKeyInput}
                        onChange={(e) => setSingleKeyInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSingleKey}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow-xs"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Tempel Beberapa API Key (Pisahkan dengan baris baru atau koma)
                </label>
                <textarea
                  rows={3}
                  placeholder={`AIzaSyA...\nAIzaSyB...\nAIzaSyC...`}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddBulk}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                  >
                    Tambahkan Semua Key
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* List of Registered API Keys */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Daftar Urutan Rotasi API Key ({keysList.length})</span>
              <span className="text-[11px] font-normal text-slate-500">
                Prioritas dieksekusi dari urutan teratas
              </span>
            </h3>

            {keysList.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
                <Key className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                <p className="text-xs font-semibold text-slate-700">Belum ada API Key kustom yang disimpan di browser.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sistem saat ini menggunakan konfigurasi default server (Gemini 3.7 / 2.5). Tambahkan 1 atau lebih API key cadangan di atas
                  untuk mengaktifkan auto-switch saat kuota habis.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {keysList.map((item, idx) => {
                  const isCurrentlyActive = currentActiveKey?.id === item.id;
                  const isRevealed = revealedKeyIds.has(item.id);
                  const displayCode = isRevealed ? item.key : maskApiKey(item.key);
                  const isTesting = testingKeyId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCurrentlyActive
                          ? 'bg-emerald-50/40 border-emerald-400 ring-1 ring-emerald-400/50 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                            isCurrentlyActive
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.name || `API Key #${idx + 1}`}
                            </p>

                            {isCurrentlyActive && (
                              <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                Sedang Dipakai
                              </span>
                            )}

                            {item.status === 'active' && !isCurrentlyActive && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-sky-100 text-sky-800 rounded flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                              </span>
                            )}
                            {item.status === 'exhausted' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-800 rounded flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Kuota Habis
                              </span>
                            )}
                          </div>

                          {/* Kode API & Toggle Controls */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-black text-slate-800 tracking-wide select-all bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[240px] sm:max-w-xs">
                              {displayCode}
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleRevealKey(item.id)}
                              title={isRevealed ? 'Sembunyikan kode' : 'Tampilkan kode lengkap'}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            >
                              {isRevealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(item.key, item.id)}
                              title="Salin kode API key"
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            >
                              {copiedKeyId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on right */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {!isCurrentlyActive ? (
                          <button
                            type="button"
                            onClick={() => handleSetActiveKey(item.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Jadikan key ini aktif dipakai saat ini"
                          >
                            <Key className="w-3 h-3 text-emerald-600" />
                            <span>Gunakan Key Ini</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold px-2 py-1 bg-emerald-100/60 rounded-lg border border-emerald-200">
                            Utama
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTestKey(item)}
                          disabled={isTesting}
                          title={`Uji koneksi key ini dengan model ${selectedModel}`}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors inline-flex items-center gap-1 border border-slate-200"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">
                            {isTesting ? 'Menguji...' : 'Tes'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteKey(item.id)}
                          title="Hapus API Key"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            API Key & preferensi model tersimpan aman di browser Anda.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
