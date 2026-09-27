import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  FileText,
  Upload,
  Calendar,
  Sheet,
  FolderOpen,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Key,
} from 'lucide-react';
import { googleSignIn, logout } from '../services/auth';

interface NavbarProps {
  user: User | null;
  onUserChange: (user: User | null, token: string | null) => void;
  onOpenUpload: () => void;
  onSyncSheets: () => Promise<void>;
  isSyncingSheets: boolean;
  sheetsUrl?: string;
  driveFolderId?: string;
  onOpenApiKeyModal?: () => void;
  apiKeysCount?: number;
  activeApiKeyText?: string;
  activeApiKeyFull?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onUserChange,
  onOpenUpload,
  onSyncSheets,
  isSyncingSheets,
  sheetsUrl,
  onOpenApiKeyModal,
  apiKeysCount = 0,
  activeApiKeyText,
  activeApiKeyFull,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [witaTime, setWitaTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
        setWitaTime(`${formatted} WITA`);
      } catch {
        setWitaTime('GMT+8 (WITA)');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user, res.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Gagal login dengan akun Google');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onUserChange(null, null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  TrackKontrak<span className="text-sky-600">.ID</span>
                </span>
                {witaTime && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-50 text-amber-900 rounded-md border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {witaTime} (GMT+8)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Workspace OAuth */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Multi-Key Rotation Setting Button with Active API Key Code */}
            {onOpenApiKeyModal && (
              <button
                onClick={onOpenApiKeyModal}
                title={`Menu API (API Key yang sedang dipakai: ${activeApiKeyFull || activeApiKeyText || 'Default Server'})`}
                className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-sky-700 bg-slate-100/90 hover:bg-sky-50 rounded-xl transition-all border border-slate-200/90 shadow-2xs group"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    API Digunakan:
                  </span>
                  <span className="font-mono text-[11px] font-extrabold text-sky-950 group-hover:text-sky-700 transition-colors">
                    {activeApiKeyText || 'Default Server'}
                  </span>
                </div>
                {apiKeysCount > 0 && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md border border-emerald-300">
                    {apiKeysCount} Key
                  </span>
                )}
              </button>
            )}

            {/* Sync to Google Sheets button */}
            <button
              onClick={onSyncSheets}
              disabled={isSyncingSheets}
              title="Sinkronisasi seluruh data ke Google Sheet Database"
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all border ${
                sheetsUrl
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSyncingSheets ? 'Menyinkronkan...' : 'Sync GSheet'}
              </span>
            </button>

            {sheetsUrl && (
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Database di Google Sheets"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
              >
                <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Buka GSheet</span>
                <ExternalLink className="w-3 h-3 text-emerald-500" />
              </a>
            )}

            {/* AI OCR Upload Button */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 rounded-lg shadow-sm shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Input Kontrak (AI OCR)</span>
            </button>

            {/* Google Workspace Auth Status */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.displayName ? user.displayName.charAt(0) : 'U'}
                    </div>
                  )}
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-semibold text-slate-800 truncate max-w-[120px]">
                      {user.displayName || 'User Google'}
                    </p>
                    <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Workspace Terhubung
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout Akun Google"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="gsi-material-button inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {authLoading ? 'Menghubungkan...' : 'Hubungkan Google Workspace'}
                </span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {authError && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 py-1.5 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{authError}</span>
          </div>
          <button onClick={() => setAuthError(null)} className="text-rose-500 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}
    </header>
  );
};
