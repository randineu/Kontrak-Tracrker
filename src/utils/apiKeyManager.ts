export const API_KEYS_STORAGE_KEY = 'trackkontrak_gemini_api_keys';
export const PREFERRED_MODEL_STORAGE_KEY = 'trackkontrak_preferred_gemini_model';
export const ACTIVE_API_KEY_ID_KEY = 'trackkontrak_active_api_key_id';

export interface SupportedGeminiModel {
  id: string;
  name: string;
  versionLabel: string;
  description: string;
  recommended?: boolean;
}

export const SUPPORTED_GEMINI_MODELS: SupportedGeminiModel[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    versionLabel: 'v3.7',
    description: 'Model multimodal generasi 3.7, sangat cepat & akurat mengekstrak tabel BoQ',
    recommended: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    versionLabel: 'v2.5',
    description: 'Model stabil dan efisien untuk pemindaian berkas PDF & gambar',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    versionLabel: 'v2.0',
    description: 'Model cepat dan ringan untuk dokumen kontrak standar',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    versionLabel: 'v1.5',
    description: 'Model hemat kuota dengan dukungan token panjang',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    versionLabel: 'v1.5 Pro',
    description: 'Model analisis mendalam untuk kontrak dengan lampiran sangat tebal',
  },
];

export function getPreferredModel(): string {
  try {
    const saved = localStorage.getItem(PREFERRED_MODEL_STORAGE_KEY);
    if (saved && SUPPORTED_GEMINI_MODELS.some((m) => m.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read preferred model:', e);
  }
  return 'gemini-3.7-flash';
}

export function setPreferredModel(modelId: string): void {
  try {
    localStorage.setItem(PREFERRED_MODEL_STORAGE_KEY, modelId);
  } catch (e) {
    console.warn('Failed to save preferred model:', e);
  }
}

export interface StoredApiKey {
  id: string;
  key: string;
  name?: string;
  addedAt: string;
  lastUsedAt?: string;
  status?: 'active' | 'exhausted' | 'invalid' | 'unknown';
  errorMessage?: string;
}

export function getStoredApiKeys(): string[] {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Support both string array and object array
      return parsed
        .map((item) => (typeof item === 'string' ? item : item.key))
        .filter((k) => typeof k === 'string' && k.trim().length > 5);
    }
  } catch (e) {
    console.warn('Failed to read stored API keys:', e);
  }
  return [];
}

export function getStoredApiKeyDetails(): StoredApiKey[] {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `key-${idx}-${item.substring(0, 4)}`,
            key: item,
            name: `Key #${idx + 1}`,
            addedAt: new Date().toISOString(),
            status: 'unknown',
          };
        }
        return item;
      });
    }
  } catch (e) {
    console.warn('Failed to read stored API key details:', e);
  }
  return [];
}

export function saveStoredApiKeys(keysOrDetails: (string | StoredApiKey)[]): void {
  try {
    const cleaned = keysOrDetails
      .map((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed.length < 5) return null;
          return {
            id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            key: trimmed,
            name: `API Key (${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)})`,
            addedAt: new Date().toISOString(),
            status: 'unknown' as const,
          };
        }
        return item;
      })
      .filter(Boolean);

    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.warn('Failed to save API keys to storage:', e);
  }
}

export async function testSingleApiKey(
  apiKey: string,
  modelName: string = 'gemini-3.7-flash'
): Promise<{ valid: boolean; error?: string; isQuotaExhausted?: boolean }> {
  try {
    const res = await fetch('/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model: modelName }),
    });

    const data = await res.json();
    if (res.ok && data.valid) {
      return { valid: true };
    }
    return {
      valid: false,
      error: data.error || 'Gagal memvalidasi API Key.',
      isQuotaExhausted: !!data.isQuotaExhausted,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Gagal terhubung ke server untuk tes key.' };
  }
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key || 'Tidak ada key';
  const prefix = key.substring(0, 6);
  const suffix = key.substring(key.length - 4);
  return `${prefix}••••${suffix}`;
}

export function getActiveApiKeyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_API_KEY_ID_KEY);
  } catch (e) {
    console.warn('Failed to read active API key ID:', e);
    return null;
  }
}

export function setActiveApiKeyId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_API_KEY_ID_KEY, id);
  } catch (e) {
    console.warn('Failed to set active API key ID:', e);
  }
}

export function getActiveApiKey(): StoredApiKey | null {
  const allKeys = getStoredApiKeyDetails();
  if (allKeys.length === 0) return null;

  const activeId = getActiveApiKeyId();
  if (activeId) {
    const found = allKeys.find((k) => k.id === activeId);
    if (found) return found;
  }

  // Default to first key if not explicitly set
  return allKeys[0];
}

export function getActiveKeyDisplayText(): {
  label: string;
  code: string;
  isCustom: boolean;
  name?: string;
} {
  const active = getActiveApiKey();
  if (active && active.key) {
    return {
      label: maskApiKey(active.key),
      code: active.key,
      isCustom: true,
      name: active.name,
    };
  }
  return {
    label: 'Default Cloud Server',
    code: '',
    isCustom: false,
    name: 'Default Server Key',
  };
}

