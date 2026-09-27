import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  FileText,
  Sheet,
  FolderOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Zap,
  Key,
} from 'lucide-react';
import { Contract, ContractStage } from './types/contract';
import { SAMPLE_CONTRACTS } from './data/sampleContracts';
import { initAuth, getAccessToken, googleSignIn } from './services/auth';
import {
  getOrCreateTrackingSpreadsheet,
  syncContractsToSheet,
} from './services/sheetsSync';
import {
  createDeadlineCalendarReminder,
  createSigningReminder,
} from './services/calendarSync';
import { Navbar } from './components/Navbar';
import { AlertBanner } from './components/AlertBanner';
import { StatsSummary } from './components/StatsSummary';
import { StageChart } from './components/StageChart';
import { ContractList } from './components/ContractList';
import { ContractDetailModal } from './components/ContractDetailModal';
import { UploadContractModal } from './components/UploadContractModal';
import { UpdateSignedArchiveModal } from './components/UpdateSignedArchiveModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { EditContractModal } from './components/EditContractModal';
import { ProgressUpdateModal } from './components/ProgressUpdateModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RealSettlementModal } from './components/RealSettlementModal';
import { RealSettlementCalculation } from './types/contract';
import { getCurrentTimestampWITA, formatRupiah } from './utils/formatters';
import { getStoredApiKeys, getActiveKeyDisplayText } from './utils/apiKeyManager';

const LOCAL_STORAGE_KEY = 'trackkontrak_contracts_v1';
const SPREADSHEET_ID_KEY = 'trackkontrak_spreadsheet_id';
const SPREADSHEET_URL_KEY = 'trackkontrak_spreadsheet_url';

export default function App() {
  // Main Contracts State
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Load contracts from storage failed:', e);
    }
    return SAMPLE_CONTRACTS;
  });

  // User & OAuth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Google Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() =>
    localStorage.getItem(SPREADSHEET_ID_KEY)
  );
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() =>
    localStorage.getItem(SPREADSHEET_URL_KEY)
  );
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Modals & Navigation
  const [selectedContractForDetail, setSelectedContractForDetail] = useState<Contract | null>(null);
  const [contractForUpdateArchive, setContractForUpdateArchive] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [contractForRealSettlement, setContractForRealSettlement] = useState<Contract | null>(null);
  const [progressUpdateTarget, setProgressUpdateTarget] = useState<{
    contract: Contract;
    targetStage: ContractStage;
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeysCount, setApiKeysCount] = useState(0);
  const [activeKeyInfo, setActiveKeyInfo] = useState(() => getActiveKeyDisplayText());
  const [activeFilterStage, setActiveFilterStage] = useState<string | null>(null);

  // Notification Toast State
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);

  // Save contracts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contracts));
    } catch (e) {
      console.warn('Failed to save contracts to localStorage:', e);
    }
  }, [contracts]);

  // Load API keys count and active key
  const refreshApiKeysCount = () => {
    const keys = getStoredApiKeys();
    setApiKeysCount(keys.length);
    setActiveKeyInfo(getActiveKeyDisplayText());
  };

  useEffect(() => {
    refreshApiKeysCount();
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
  }, []);

  const showToast = (
    type: 'success' | 'error' | 'info',
    message: string,
    actionUrl?: string,
    actionLabel?: string
  ) => {
    setToast({ type, message, actionUrl, actionLabel });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const handleUserChange = async (newUser: User | null, token: string | null) => {
    setUser(newUser);
    setAccessToken(token);
    if (newUser && token) {
      showToast('success', `Terhubung dengan akun Google: ${newUser.email}`);
      // Auto-check/create tracking sheet on login
      try {
        const sheetRes = await getOrCreateTrackingSpreadsheet(token);
        setSpreadsheetId(sheetRes.spreadsheetId);
        setSpreadsheetUrl(sheetRes.spreadsheetUrl);
        localStorage.setItem(SPREADSHEET_ID_KEY, sheetRes.spreadsheetId);
        localStorage.setItem(SPREADSHEET_URL_KEY, sheetRes.spreadsheetUrl);
      } catch (e) {
        console.warn('Auto sheet creation check:', e);
      }
    } else {
      showToast('info', 'Anda telah keluar dari akun Google.');
    }
  };

  // Google Sheets Sync
  const handleSyncSheets = async () => {
    let currentToken = accessToken;
    if (!currentToken) {
      try {
        const res = await googleSignIn();
        if (res) {
          setUser(res.user);
          setAccessToken(res.accessToken);
          currentToken = res.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        showToast('error', `Gagal login Google: ${err.message}`);
        return;
      }
    }

    if (!currentToken) return;

    try {
      setIsSyncingSheets(true);
      // Ensure spreadsheet exists
      let targetId = spreadsheetId;
      let targetUrl = spreadsheetUrl;

      if (!targetId) {
        const initRes = await getOrCreateTrackingSpreadsheet(currentToken);
        targetId = initRes.spreadsheetId;
        targetUrl = initRes.spreadsheetUrl;
        setSpreadsheetId(targetId);
        setSpreadsheetUrl(targetUrl);
        localStorage.setItem(SPREADSHEET_ID_KEY, targetId);
        localStorage.setItem(SPREADSHEET_URL_KEY, targetUrl);
      }

      const syncResult = await syncContractsToSheet(targetId, contracts, currentToken);
      if (syncResult.success) {
        // Mark all as synced
        setContracts((prev) => prev.map((c) => ({ ...c, syncedWithSheets: true })));
        showToast(
          'success',
          `Sinkronisasi berhasil! ${syncResult.rowsUpdated} data kontrak diperbarui di Google Sheets.`,
          targetUrl || undefined,
          'Buka Spreadsheet'
        );
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      showToast('error', `Gagal menyinkronkan data ke Google Sheets: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Google Calendar Integration
  const handleCreateCalendarReminder = async (
    contract: Contract,
    type: 'deadline' | 'signing'
  ) => {
    let currentToken = accessToken;
    if (!currentToken) {
      try {
        const res = await googleSignIn();
        if (res) {
          setUser(res.user);
          setAccessToken(res.accessToken);
          currentToken = res.accessToken;
        } else {
          return;
        }
      } catch (err: any) {
        showToast('error', `Gagal menghubungkan Google Calendar: ${err.message}`);
        return;
      }
    }

    if (!currentToken) return;

    try {
      if (type === 'deadline') {
        const calRes = await createDeadlineCalendarReminder(contract, currentToken);
        showToast(
          'success',
          `Jatuh tempo ${contract.nomorKontrak} ditambahkan ke Google Calendar`,
          calRes.htmlLink,
          'Lihat di Google Calendar'
        );
      } else {
        const calRes = await createSigningReminder(contract, currentToken);
        showToast(
          'success',
          `Jadwal Tanda Tangan & Materai ${contract.nomorKontrak} ditambahkan ke Google Calendar`,
          calRes.htmlLink,
          'Lihat di Google Calendar'
        );
      }
    } catch (err: any) {
      console.error('Calendar error:', err);
      showToast('error', `Gagal membuat event di Google Calendar: ${err.message}`);
    }
  };

  // Contract CRUD Handlers
  const handleSaveContract = (newContract: Contract) => {
    setContracts((prev) => [newContract, ...prev]);
    showToast(
      'success',
      `Kontrak "${newContract.nomorKontrak}" berhasil disimpan ke sistem! Tekan "Sync GSheet" untuk menyinkronkan.`
    );
  };

  const handleUpdateStage = (contractId: string, newStage: ContractStage, note?: string) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const prevStage = c.status;
          const updatedRiwayat = [
            ...c.riwayatStatus,
            {
              status: newStage,
              timestamp: getCurrentTimestampWITA(),
              catatan:
                note ||
                (newStage === 'Status Koreksi'
                  ? 'Kontrak dikembalikan ke status koreksi.'
                  : `Tahap diperbarui dari ${c.status} ke ${newStage}`),
              user: user?.displayName || 'Petugas Tracking',
            },
          ];

          return {
            ...c,
            status: newStage,
            statusSebelumKoreksi: newStage === 'Status Koreksi' ? prevStage : c.statusSebelumKoreksi,
            catatanKoreksi: newStage === 'Status Koreksi' ? note : c.catatanKoreksi,
            riwayatStatus: updatedRiwayat,
            updatedAt: new Date().toISOString(),
            syncedWithSheets: false,
          };
        }
        return c;
      })
    );

    // Update opened detail view if any
    if (selectedContractForDetail && selectedContractForDetail.id === contractId) {
      setSelectedContractForDetail((prev) =>
        prev
          ? {
              ...prev,
              status: newStage,
              statusSebelumKoreksi:
                newStage === 'Status Koreksi' ? prev.status : prev.statusSebelumKoreksi,
              catatanKoreksi: newStage === 'Status Koreksi' ? note : prev.catatanKoreksi,
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    }

    showToast('info', `Status kontrak berhasil diubah menjadi: ${newStage}`);
  };

  const handlePromptProgressUpdate = (contract: Contract, targetStage: ContractStage) => {
    setProgressUpdateTarget({ contract, targetStage });
  };

  const handleConfirmProgress = (
    contractId: string,
    targetStage: ContractStage,
    note: string,
    _checklistSnapshot?: any,
    openRealCalculator?: boolean
  ) => {
    handleUpdateStage(contractId, targetStage, note);
    setProgressUpdateTarget(null);

    if (targetStage === 'Lunas' && openRealCalculator) {
      const targetContract = contracts.find((c) => c.id === contractId);
      if (targetContract) {
        setContractForRealSettlement({ ...targetContract, status: 'Lunas' });
      }
    }
  };

  const handleSaveRealSettlement = (
    contractId: string,
    calculation: RealSettlementCalculation
  ) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          return {
            ...c,
            penerimaanReal: calculation,
            updatedAt: new Date().toISOString(),
            syncedWithSheets: false,
          };
        }
        return c;
      })
    );

    if (selectedContractForDetail && selectedContractForDetail.id === contractId) {
      setSelectedContractForDetail((prev) =>
        prev
          ? {
              ...prev,
              penerimaanReal: calculation,
              updatedAt: new Date().toISOString(),
              syncedWithSheets: false,
            }
          : null
      );
    }

    showToast(
      'success',
      `Penerimaan Real berhasil dihitung: ${formatRupiah(calculation.penerimaanReal)} (${calculation.pphLabel}). Klik "Sync GSheet" untuk menyimpan ke Google Sheets.`
    );
  };

  const handleRemoveRealSettlement = (contractId: string) => {
    setContracts((prev) =>
      prev.map((c) => {
        if (c.id === contractId) {
          const { penerimaanReal, ...rest } = c;
          return {
            ...rest,
            updatedAt: new Date().toISOString(),
            syncedWithSheets: false,
          };
        }
        return c;
      })
    );

    if (selectedContractForDetail && selectedContractForDetail.id === contractId) {
      setSelectedContractForDetail((prev) => {
        if (!prev) return null;
        const { penerimaanReal, ...rest } = prev;
        return { ...rest, updatedAt: new Date().toISOString() };
      });
    }

    showToast('info', 'Kalkulasi penerimaan real telah dihapus.');
  };

  const handleArchiveUpdated = (updatedContract: Contract) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === updatedContract.id ? updatedContract : c))
    );

    if (selectedContractForDetail && selectedContractForDetail.id === updatedContract.id) {
      setSelectedContractForDetail(updatedContract);
    }

    showToast(
      'success',
      'Arsip kontrak bertanda tangan berhasil diperbarui dan tersimpan di Google Drive!'
    );
  };

  const handleConfirmDelete = (contractId: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
    setContractToDelete(null);
    if (selectedContractForDetail?.id === contractId) {
      setSelectedContractForDetail(null);
    }
    showToast('info', 'Data kontrak berhasil dihapus dari database lokal.');
  };

  const handleSaveEditedContract = (updatedContract: Contract) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === updatedContract.id ? updatedContract : c))
    );
    if (selectedContractForDetail?.id === updatedContract.id) {
      setSelectedContractForDetail(updatedContract);
    }
    setContractToEdit(null);
    showToast('success', `Kontrak ${updatedContract.nomorKontrak} berhasil diperbarui.`);
  };

  const displayedContracts = activeFilterStage
    ? contracts.filter((c) => c.status === activeFilterStage)
    : contracts;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onUserChange={handleUserChange}
        onOpenUpload={() => setIsUploadOpen(true)}
        onSyncSheets={handleSyncSheets}
        isSyncingSheets={isSyncingSheets}
        sheetsUrl={spreadsheetUrl || undefined}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        apiKeysCount={apiKeysCount}
        activeApiKeyText={activeKeyInfo.label}
        activeApiKeyFull={activeKeyInfo.code}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slideUp">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-medium leading-relaxed">{toast.message}</p>
              {toast.actionUrl && (
                <a
                  href={toast.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-bold text-sky-300 hover:text-sky-200 underline text-xs"
                >
                  {toast.actionLabel || 'Lihat Tautan'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* System Overview Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sistem Tracking Kontrak Multi-Platform
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Sinkronisasi terpadu Google Sheets, Google Drive, Google Calendar, dan costum by randi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-sky-500/25 inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kontrak (AI OCR)</span>
            </button>
          </div>
        </div>

        {/* 1. Alert Banner for Status Koreksi, Unsigned Drafts/Drive, Before Masa Kerja, and Deadlines */}
        <AlertBanner
          contracts={contracts}
          onSelectContract={(c) => setSelectedContractForDetail(c)}
          onOpenUpdateArchive={(c) => setContractForUpdateArchive(c)}
          onCreateCalendarReminder={handleCreateCalendarReminder}
        />

        {/* 2. KPI Stats Summary Cards */}
        <StatsSummary
          contracts={contracts}
          activeFilterStage={activeFilterStage}
          onFilterStage={(stage) => setActiveFilterStage(stage)}
        />

        {/* 3. Stage Percentage & Distribution Chart */}
        <StageChart contracts={contracts} />

        {/* 4. Filtered Indicator if Stage Card is Active */}
        {activeFilterStage && (
          <div className="mb-3 flex items-center justify-between p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs">
            <span className="font-semibold text-sky-900">
              Menampilkan filter tahap: <strong>{activeFilterStage}</strong> ({displayedContracts.length} kontrak)
            </span>
            <button
              onClick={() => setActiveFilterStage(null)}
              className="text-sky-700 font-bold hover:underline"
            >
              Hapus Filter ✕
            </button>
          </div>
        )}

        {/* 5. Master Contract List Table with Filters & Stages */}
        <ContractList
          contracts={displayedContracts}
          onSelectContract={(c) => setSelectedContractForDetail(c)}
          onOpenUpdateArchive={(c) => setContractForUpdateArchive(c)}
          onCreateCalendarReminder={handleCreateCalendarReminder}
          onQuickChangeStage={(contract, newStage) =>
            handlePromptProgressUpdate(contract, newStage)
          }
          onPromptDeleteContract={(c) => setContractToDelete(c)}
          onEditContract={(c) => setContractToEdit(c)}
          onOpenRealSettlement={(c) => setContractForRealSettlement(c)}
        />
      </main>

      {/* Modals */}
      {selectedContractForDetail && (
        <ContractDetailModal
          contract={selectedContractForDetail}
          onClose={() => setSelectedContractForDetail(null)}
          onUpdateStage={handleUpdateStage}
          onOpenUpdateArchive={(c) => setContractForUpdateArchive(c)}
          onCreateCalendarReminder={handleCreateCalendarReminder}
          onPromptDeleteContract={(c) => setContractToDelete(c)}
          onEditContract={(c) => setContractToEdit(c)}
          onPromptProgressUpdate={(contract, newStage) =>
            handlePromptProgressUpdate(contract, newStage)
          }
          onOpenRealSettlement={(c) => setContractForRealSettlement(c)}
          onSaveSettlement={handleSaveRealSettlement}
        />
      )}

      {isUploadOpen && (
        <UploadContractModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSaveContract={handleSaveContract}
          accessToken={accessToken}
          onOpenApiKeySettings={() => setIsApiKeyModalOpen(true)}
        />
      )}

      {isApiKeyModalOpen && (
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeysUpdated={refreshApiKeysCount}
        />
      )}

      {contractForUpdateArchive && (
        <UpdateSignedArchiveModal
          contract={contractForUpdateArchive}
          isOpen={!!contractForUpdateArchive}
          onClose={() => setContractForUpdateArchive(null)}
          onArchiveUpdated={handleArchiveUpdated}
          accessToken={accessToken}
        />
      )}

      {contractToDelete && (
        <DeleteConfirmationModal
          contract={contractToDelete}
          isOpen={!!contractToDelete}
          onClose={() => setContractToDelete(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {contractToEdit && (
        <EditContractModal
          contract={contractToEdit}
          isOpen={!!contractToEdit}
          onClose={() => setContractToEdit(null)}
          onSave={handleSaveEditedContract}
        />
      )}

      {progressUpdateTarget && (
        <ProgressUpdateModal
          contract={progressUpdateTarget.contract}
          targetStage={progressUpdateTarget.targetStage}
          isOpen={!!progressUpdateTarget}
          onClose={() => setProgressUpdateTarget(null)}
          onConfirmProgress={handleConfirmProgress}
          currentUser={user?.displayName || undefined}
        />
      )}

      {contractForRealSettlement && (
        <RealSettlementModal
          contract={contractForRealSettlement}
          isOpen={!!contractForRealSettlement}
          onClose={() => setContractForRealSettlement(null)}
          onSaveSettlement={handleSaveRealSettlement}
          onRemoveSettlement={handleRemoveRealSettlement}
        />
      )}
    </div>
  );
}
