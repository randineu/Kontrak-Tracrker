import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for PDF/image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

// Key status endpoint to inspect server default key status & preview
app.get('/api/key-status', (_req: Request, res: Response) => {
  const hasEnvKey = !!apiKey;
  const envKeyMask = hasEnvKey
    ? `${apiKey.substring(0, 6)}••••••••${apiKey.substring(apiKey.length - 4)}`
    : null;
  res.json({
    hasEnvKey,
    envKeyMask,
  });
});

// Single Key Test Endpoint
app.post('/api/test-key', async (req: Request, res: Response) => {
  try {
    const { apiKey: customKey, model } = req.body;
    const targetKey = customKey || apiKey;

    if (!targetKey) {
      return res.status(400).json({
        valid: false,
        error: 'Kode API Key tidak ditemukan. Masukkan kode API Key terlebih dahulu.',
      });
    }

    const testAi = targetKey === apiKey ? ai : new GoogleGenAI({
      apiKey: targetKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const testModel = ALLOWED_GEMINI_MODELS.includes(model) ? model : 'gemini-3.7-flash';
    const response = await testAi.models.generateContent({
      model: testModel,
      contents: 'Ping test. Reply with ok.',
    });

    return res.json({
      valid: true,
      modelTested: testModel,
      response: response.text?.trim() || 'ok',
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    const isQuotaExhausted =
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('resource_exhausted');
    return res.status(400).json({
      valid: false,
      error: formatGeminiErrorMessage(err),
      isQuotaExhausted,
    });
  }
});

// Supported Gemini Models (Configured according to user selection)
const ALLOWED_GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.0-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// Helper to format friendly Gemini error messages
function formatGeminiErrorMessage(error: any): string {
  const errMsg = error?.message || String(error);
  if (
    errMsg.includes('resource_exhausted') ||
    errMsg.includes('quota') ||
    errMsg.includes('429') ||
    errMsg.includes('limit')
  ) {
    return 'Kuota token Gemini API model ini sedang penuh atau terlampaui (Resource Exhausted). Silakan beralih ke model hemat token seperti "Gemini 3.1 Flash Lite" atau "Gemini 2.5 Flash Lite", atau tunggu beberapa saat.';
  }
  if (errMsg.includes('overloaded') || errMsg.includes('503')) {
    return 'Layanan Gemini AI sedang sibuk sementara. Silakan coba lagi dalam beberapa detik atau pilih model lain.';
  }
  return errMsg || 'Terjadi kesalahan saat memproses ekstraksi kontrak.';
}

// AI Contract Extraction Endpoint
app.post('/api/extract-contract', async (req: Request, res: Response) => {
  try {
    const { fileData, mimeType, fileName, textContent, model, userApiKey } = req.body;
    const selectedModel = ALLOWED_GEMINI_MODELS.includes(model) ? model : 'gemini-3.8-flash';

    if (!fileData && !textContent) {
      return res.status(400).json({
        error: 'Mohon sertakan file dokumen (PDF, gambar) atau teks kontrak untuk diproses.',
      });
    }

    const effectiveKey = userApiKey || apiKey;
    if (!effectiveKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server maupun di pengaturan API Key.',
      });
    }

    const activeAi = effectiveKey === apiKey ? ai : new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemPrompt = `Anda adalah asisten AI ahli dalam membaca dan menganalisis dokumen kontrak konstruksi, pengadaan barang/jasa, dan perjanjian kerja (seperti SPBJ, SPBL, SPK, Perjanjian Kerjasama di lingkungan PLN dan perusahaan BUMN / Korporat Indonesia).

Tugas Anda adalah membaca isi dokumen kontrak dengan sangat teliti dan akurat, mengekstraksi informasi penting ke dalam format JSON yang terstruktur.

Perhatikan detail berikut:
1. Tipe Kontrak: SPBJ (Surat Perjanjian Pengadaan Barang dan Jasa), SPBL (Surat Pesanan Barang Langsung), SPK (Surat Perintah Kerja), Perjanjian Kerjasama, Surat Pesanan, atau tipe lainnya yang tertulis.
2. Nomor Kontrak: Nomor resmi kontrak (contoh: 0045.PJ/DAN.01.01/UP3-WTP/2026).
3. Tanggal Kontrak: Tanggal surat/kontrak disepakati (format YYYY-MM-DD).
4. Judul Kontrak: Perihal atau judul pekerjaan pengadaan / jasa.
5. Unit Kontrak: Unit pelaksana/pengguna barang jasa (misal: UP3 Watampone, UP3 Bulukumba, UID Makassar, dll).
6. Rekanan / Vendor: Nama perseroan / CV / PT pelaksana rekanan.
7. Nilai Kontrak: Total nilai nominal angka kontrak rupiah bersih.
8. Masa Kontrak:
   - Tanggal Mulai (YYYY-MM-DD)
   - Tanggal Selesai / Jatuh Tempo (YYYY-MM-DD)
   - Durasi dalam hari kalender (angka)
9. Isi Pekerjaan (Tabel BoQ / Rincian Pekerjaan):
   Daftar item pekerjaan yang ada di dalam tabel kontrak mentahan, dengan kolom:
   - no (nomor urut)
   - deskripsi (uraian pekerjaan / barang)
   - volume (jumlah)
   - satuan (unit: bh, m, km, lot, set, ttk, dll)
   - hargaSatuan (dalam rupiah)
   - subtotal (volume * hargaSatuan)
10. Empat (4) Poin Hitungan Terakhir:
    - Jumlah: Total akumulasi subtotal pekerjaan BoQ sebelum pajak
    - DPP Nilai Lain: Nilai Dasar Pengenaan Pajak jika ada perlakuan khusus PMK/faktur, atau sama dengan jumlah jika standar
    - Pajak: Nilai PPN (11% / 12%) atau PPh yang tertera
    - Persentase Pajak: (contoh: 'PPN 11%' atau 'PPN 12%')
    - Total: Grand total akhir yang wajib dibayarkan kepada penyedia
11. Status Berkas Arsip:
    Periksa apakah berkas kontrak ini sudah bertanda tangan basah / digital dan bermaterai:
    - Bila ada tanda tangan kedua pihak dan stempel / materai -> 'Sudah TTD & Bermaterai'
    - Bila tidak ada tanda tangan, hanya draft, atau belum ada materai -> 'Draft (Belum TTD & Materai)'
12. Catatan Koreksi / Pemeriksaan:
    Tuliskan catatan penting jika terdapat ketidaksesuaian hitungan, klausa kritis, atau peringatan tenggat waktu.

Berikan output secara ketat dalam format JSON yang valid.`;

    let finalMimeType = mimeType;
    let extractedText = textContent;

    // Detect and handle Word documents (.docx / .doc)
    const lowerFileName = (fileName || '').toLowerCase();
    if (
      lowerFileName.endsWith('.docx') ||
      lowerFileName.endsWith('.doc') ||
      mimeType?.includes('wordprocessingml') ||
      mimeType?.includes('msword')
    ) {
      if (fileData) {
        try {
          const mammoth = await import('mammoth');
          const fileBuffer = Buffer.from(fileData, 'base64');
          const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
          if (mammothResult.value && mammothResult.value.trim().length > 0) {
            extractedText = mammothResult.value;
            console.log(`Successfully parsed Word document text (${extractedText.length} chars)`);
          }
        } catch (mErr) {
          console.warn('Mammoth extraction failed, falling back:', mErr);
        }
      }
    } else if (lowerFileName.endsWith('.pdf')) {
      finalMimeType = 'application/pdf';
    } else if (lowerFileName.endsWith('.png')) {
      finalMimeType = 'image/png';
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      finalMimeType = 'image/jpeg';
    } else if (lowerFileName.endsWith('.webp')) {
      finalMimeType = 'image/webp';
    }

    console.log(
      `Processing extraction: fileName=${fileName}, finalMimeType=${finalMimeType}, hasFileData=${!!fileData}, textLength=${extractedText?.length || 0}`
    );

    let contentPayload: any;

    if (extractedText && extractedText.trim().length > 0) {
      contentPayload = `Berikut teks isi dokumen kontrak:\n\n${extractedText}\n\nLakukan ekstraksi data kontrak, tabel pekerjaan BoQ, dan 4 poin hitungan terakhir ke dalam format JSON.`;
    } else if (fileData && finalMimeType) {
      // Must use parts structure for @google/genai SDK
      contentPayload = {
        parts: [
          {
            inlineData: {
              mimeType: finalMimeType,
              data: fileData,
            },
          },
          {
            text: `Ekstraksi data kontrak dari dokumen "${fileName || 'kontrak'}" ini ke dalam format JSON terstruktur. Pastikan membaca tabel rincian pekerjaan BoQ dan 4 poin hitungan terakhir (Jumlah, DPP Nilai Lain, Pajak, Total) dengan seksama.`,
          },
        ],
      };
    } else {
      return res.status(400).json({
        error: 'Dokumen tidak dapat diproses. Pastikan format file PDF, Gambar (PNG/JPG), Word (.docx), atau teks.',
      });
    }

    console.log(`Calling Gemini API with model: ${selectedModel}`);
    const response = await activeAi.models.generateContent({
      model: selectedModel,
      contents: contentPayload,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tipeKontrak: {
              type: Type.STRING,
              description: 'Tipe kontrak misalnya SPBJ, SPBL, SPK, Perjanjian Kerjasama',
            },
            nomorKontrak: {
              type: Type.STRING,
              description: 'Nomor resmi dokumen kontrak',
            },
            tanggalKontrak: {
              type: Type.STRING,
              description: 'Tanggal kontrak format YYYY-MM-DD',
            },
            judulKontrak: {
              type: Type.STRING,
              description: 'Judul atau perihal pengadaan kontrak',
            },
            unitKontrak: {
              type: Type.STRING,
              description: 'Nama unit kontrak seperti UP3 Watampone, UP3 Bulukumba, UID Makassar',
            },
            rekanan: {
              type: Type.STRING,
              description: 'Nama penyedia barang/jasa rekanan pelaksana',
            },
            nilaiKontrak: {
              type: Type.NUMBER,
              description: 'Nilai total kontrak dalam angka rupiah',
            },
            masaKontrak: {
              type: Type.OBJECT,
              properties: {
                tanggalMulai: { type: Type.STRING, description: 'Format YYYY-MM-DD' },
                tanggalSelesai: { type: Type.STRING, description: 'Format YYYY-MM-DD' },
                durasiHari: { type: Type.NUMBER, description: 'Durasi hari kalender' },
              },
              required: ['tanggalMulai', 'tanggalSelesai', 'durasiHari'],
            },
            isiPekerjaan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.NUMBER },
                  deskripsi: { type: Type.STRING },
                  volume: { type: Type.NUMBER },
                  satuan: { type: Type.STRING },
                  hargaSatuan: { type: Type.NUMBER },
                  subtotal: { type: Type.NUMBER },
                },
                required: ['no', 'deskripsi', 'volume', 'satuan', 'hargaSatuan', 'subtotal'],
              },
            },
            perhitunganTerakhir: {
              type: Type.OBJECT,
              properties: {
                jumlah: { type: Type.NUMBER, description: 'Subtotal nilai pekerjaan' },
                dppNilaiLain: { type: Type.NUMBER, description: 'DPP Nilai Lain / Dasar Pengenaan Pajak' },
                pajak: { type: Type.NUMBER, description: 'Nilai nominal pajak PPN / PPh' },
                persentasePajak: { type: Type.STRING, description: 'Misal: PPN 11% atau PPN 12%' },
                total: { type: Type.NUMBER, description: 'Total akhir kontrak' },
              },
              required: ['jumlah', 'pajak', 'total'],
            },
            statusArsip: {
              type: Type.STRING,
              description: "'Draft (Belum TTD & Materai)' atau 'Sudah TTD & Bermaterai'",
            },
            catatanKoreksi: {
              type: Type.STRING,
              description: 'Catatan penting mengenai isi kontrak atau saran koreksi jika ada',
            },
          },
          required: [
            'tipeKontrak',
            'nomorKontrak',
            'tanggalKontrak',
            'judulKontrak',
            'unitKontrak',
            'nilaiKontrak',
            'masaKontrak',
            'isiPekerjaan',
            'perhitunganTerakhir',
            'statusArsip',
          ],
        },
      },
    });

    let textOutput = response.text || '';
    // Clean any markdown wrapper if present
    textOutput = textOutput.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    if (!textOutput) {
      throw new Error('AI tidak mengembalikan hasil pembacaan kontrak (respon kosong).');
    }

    const parsedData = JSON.parse(textOutput);
    console.log('Extraction success for:', parsedData.nomorKontrak, parsedData.judulKontrak);
    return res.json({
      success: true,
      data: parsedData,
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('Error in /api/extract-contract:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// AI Contract Validation & Risk Review Endpoint
app.post('/api/validate-contract', async (req: Request, res: Response) => {
  try {
    const { contract, model } = req.body;
    const selectedModel = ALLOWED_GEMINI_MODELS.includes(model) ? model : 'gemini-3.8-flash';

    if (!contract) {
      return res.status(400).json({ error: 'Data kontrak diperlukan.' });
    }

    const prompt = `Lakukan audit ringkas terhadap data kontrak berikut:
${JSON.stringify(contract, null, 2)}

Analisis:
1. Kesesuaian 4 poin perhitungan (Jumlah + Pajak vs Total).
2. Status kelengkapan tanda tangan dan materai (Draft vs Bermaterai).
3. Evaluasi tenggat waktu masa pekerjaan dan risiko keterlambatan.
4. Rekomendasi tindakan berikutnya (misal: "Segera lakukan penandatanganan di atas materai Rp10.000", "Lanjutkan ke BAPP", dsb).

Keluarkan format JSON dengan keys:
- valid: boolean
- calculationCheck: string
- signingStatus: string
- deadlineRisk: 'Aman' | 'Peringatan' | 'Kritis'
- recommendations: string[]`;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const analysis = JSON.parse(response.text || '{}');
    return res.json({ success: true, analysis, modelUsed: selectedModel });
  } catch (error: any) {
    console.error('Error in /api/validate-contract:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// Setup Vite middleware in Dev or Static files in Prod
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server Sistem Tracking Kontrak running on port ${PORT}`);
  });
}

startServer();
