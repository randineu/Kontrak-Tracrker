import { Contract } from '../types/contract';
import { formatWITAForExcel } from '../utils/formatters';

const SPREADSHEET_TITLE = 'Database Tracking Kontrak Multi-Platform';

export interface SheetInitResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  created: boolean;
}

// Search or create dedicated Tracking Spreadsheet in user's Google Drive
export async function getOrCreateTrackingSpreadsheet(accessToken: string): Promise<SheetInitResult> {
  // 1. Search existing file
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    SPREADSHEET_TITLE
  )}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mencari spreadsheet di Google Drive');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const file = searchData.files[0];
    return {
      spreadsheetId: file.id,
      spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`,
      created: false,
    };
  }

  // 2. Create new spreadsheet with explicit WITA (Asia/Makassar, GMT+8) timezone
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createPayload = {
    properties: {
      title: SPREADSHEET_TITLE,
      timeZone: 'Asia/Makassar',
      locale: 'id_ID',
    },
    sheets: [
      {
        properties: {
          title: 'Daftar_Kontrak',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Rincian_Pekerjaan_BoQ',
          gridProperties: { frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Log_Riwayat_Status',
          gridProperties: { frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat spreadsheet baru di Google Sheets');
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;

  // Add Headers with nice formatting
  const headersPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Daftar_Kontrak!A1:X1',
        values: [
          [
            'ID Kontrak',
            'Tipe Kontrak',
            'Nomor Kontrak',
            'Tanggal Kontrak',
            'Judul Kontrak',
            'Unit Kontrak',
            'Rekanan/Vendor',
            'Nilai Kontrak (Rp)',
            'Masa Mulai',
            'Masa Selesai',
            'Durasi (Hari)',
            'Jumlah BoQ (Rp)',
            'DPP Nilai Lain (Rp)',
            'Pajak (Rp)',
            'Ket. Pajak',
            'Total Akhir (Rp)',
            'Status Kontrak',
            'Status Materai/TTD',
            'Link Arsip Kontrak (Drive)',
            'Catatan',
            'Terakhir Diperbarui (WITA)',
            'Tipe PPh Real',
            'Potongan PPh (Rp)',
            'Penerimaan Real (Rp)',
          ],
        ],
      },
      {
        range: 'Rincian_Pekerjaan_BoQ!A1:H1',
        values: [
          [
            'ID Kontrak',
            'Nomor Kontrak',
            'No Item',
            'Uraian Pekerjaan',
            'Volume',
            'Satuan',
            'Harga Satuan (Rp)',
            'Subtotal (Rp)',
          ],
        ],
      },
      {
        range: 'Log_Riwayat_Status!A1:F1',
        values: [
          [
            'ID Kontrak',
            'Nomor Kontrak',
            'Status Kontrak',
            'Waktu / Timestamp (WITA)',
            'Catatan Status',
            'PIC / Petugas',
          ],
        ],
      },
    ],
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(headersPayload),
  });

  return {
    spreadsheetId,
    spreadsheetUrl: newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    created: true,
  };
}

// Sync all contracts to Google Sheet database
export async function syncContractsToSheet(
  spreadsheetId: string,
  contracts: Contract[],
  accessToken: string
): Promise<{ success: boolean; rowsUpdated: number }> {
  // Fetch sheet IDs to apply targeted cell formatting
  let sheetIdDaftar = 0;
  let sheetIdBoQ = 1;
  let sheetIdLog = 2;

  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      if (metaData.sheets && Array.isArray(metaData.sheets)) {
        for (const s of metaData.sheets) {
          if (s.properties?.title === 'Daftar_Kontrak') {
            sheetIdDaftar = s.properties.sheetId;
          } else if (s.properties?.title === 'Rincian_Pekerjaan_BoQ') {
            sheetIdBoQ = s.properties.sheetId;
          } else if (s.properties?.title === 'Log_Riwayat_Status') {
            sheetIdLog = s.properties.sheetId;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch sheet metadata for formatting:', e);
  }

  // Ensure spreadsheet timezone (Asia/Makassar, GMT+8) and apply number formatting (#,##0) with thousand separators
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          updateSpreadsheetProperties: {
            properties: {
              timeZone: 'Asia/Makassar',
              locale: 'id_ID',
            },
            fields: 'timeZone,locale',
          },
        },
        // Format Header Rows (Row 1 Bold)
        {
          repeatCell: {
            range: {
              sheetId: sheetIdDaftar,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: sheetIdBoQ,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: sheetIdLog,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        // Daftar_Kontrak: Nilai Kontrak (Col 7 / H) format thousand separators
        {
          repeatCell: {
            range: {
              sheetId: sheetIdDaftar,
              startRowIndex: 1,
              startColumnIndex: 7,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Daftar_Kontrak: Durasi, Jumlah BoQ, DPP, Pajak (Cols 10-14 / K, L, M, N)
        {
          repeatCell: {
            range: {
              sheetId: sheetIdDaftar,
              startRowIndex: 1,
              startColumnIndex: 10,
              endColumnIndex: 14,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Daftar_Kontrak: Total Akhir (Col 15 / P) format thousand separators
        {
          repeatCell: {
            range: {
              sheetId: sheetIdDaftar,
              startRowIndex: 1,
              startColumnIndex: 15,
              endColumnIndex: 16,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Daftar_Kontrak: Potongan PPh & Penerimaan Real (Cols 22-24 / W, X) format thousand separators
        {
          repeatCell: {
            range: {
              sheetId: sheetIdDaftar,
              startRowIndex: 1,
              startColumnIndex: 22,
              endColumnIndex: 24,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Rincian_Pekerjaan_BoQ: Volume (Col 4 / E) format thousand separators
        {
          repeatCell: {
            range: {
              sheetId: sheetIdBoQ,
              startRowIndex: 1,
              startColumnIndex: 4,
              endColumnIndex: 5,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Rincian_Pekerjaan_BoQ: Harga Satuan & Subtotal (Cols 6-8 / G, H) format thousand separators
        {
          repeatCell: {
            range: {
              sheetId: sheetIdBoQ,
              startRowIndex: 1,
              startColumnIndex: 6,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern: '#,##0',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
      ],
    }),
  }).catch(() => {});

  // Prepare Daftar_Kontrak rows with clean numbers & WITA GMT+8 formatting
  const contractRows = contracts.map((c) => [
    c.id,
    c.tipeKontrak,
    c.nomorKontrak,
    c.tanggalKontrak,
    c.judulKontrak,
    c.unitKontrak,
    c.rekanan,
    Number(c.nilaiKontrak) || 0,
    c.masaKontrak.tanggalMulai,
    c.masaKontrak.tanggalSelesai,
    Number(c.masaKontrak.durasiHari) || 0,
    Number(c.perhitunganTerakhir?.jumlah) || 0,
    Number(c.perhitunganTerakhir?.dppNilaiLain || c.perhitunganTerakhir?.jumlah) || 0,
    Number(c.perhitunganTerakhir?.pajak) || 0,
    c.perhitunganTerakhir?.persentasePajak || 'PPN 11%',
    Number(c.perhitunganTerakhir?.total) || 0,
    c.status,
    c.arsip?.statusMaterai || 'Draft (Belum TTD & Materai)',
    c.arsip?.driveLink || '-',
    c.catatanKoreksi || '-',
    formatWITAForExcel(c.updatedAt || c.createdAt),
    c.penerimaanReal?.pphLabel || (c.status === 'Lunas' ? 'Belum Dihitung' : '-'),
    c.penerimaanReal ? Number(c.penerimaanReal.pphAmount) || 0 : (c.status === 'Lunas' ? 0 : '-'),
    c.penerimaanReal ? Number(c.penerimaanReal.penerimaanReal) || 0 : (c.status === 'Lunas' ? 0 : '-'),
  ]);

  // Prepare Rincian_Pekerjaan_BoQ rows with clean numbers
  const boqRows: any[][] = [];
  contracts.forEach((c) => {
    (c.isiPekerjaan || []).forEach((item) => {
      boqRows.push([
        c.id,
        c.nomorKontrak,
        item.no,
        item.deskripsi,
        Number(item.volume) || 0,
        item.satuan,
        Number(item.hargaSatuan) || 0,
        Number(item.subtotal) || 0,
      ]);
    });
  });

  // Prepare Log_Riwayat_Status rows with WITA GMT+8 formatting
  const historyRows: any[][] = [];
  contracts.forEach((c) => {
    (c.riwayatStatus || []).forEach((log) => {
      historyRows.push([
        c.id,
        c.nomorKontrak,
        log.status,
        formatWITAForExcel(log.timestamp),
        log.catatan || '-',
        log.user || 'Sistem',
      ]);
    });
  });

  // Clear existing content and all columns (A to Z) to prevent orphans or obsolete extra columns (e.g. Peringatan Selisih Pelunasan)
  const clearRanges = [
    'Daftar_Kontrak!A1:Z1000',
    'Rincian_Pekerjaan_BoQ!A1:Z5000',
    'Log_Riwayat_Status!A1:Z5000',
  ];

  for (const range of clearRanges) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  // Batch update with current contracts data & ensure header row 1 is always updated
  const updateData: any[] = [
    {
      range: 'Daftar_Kontrak!A1:X1',
      values: [
        [
          'ID Kontrak',
          'Tipe Kontrak',
          'Nomor Kontrak',
          'Tanggal Kontrak',
          'Judul Kontrak',
          'Unit Kontrak',
          'Rekanan/Vendor',
          'Nilai Kontrak (Rp)',
          'Masa Mulai',
          'Masa Selesai',
          'Durasi (Hari)',
          'Jumlah BoQ (Rp)',
          'DPP Nilai Lain (Rp)',
          'Pajak (Rp)',
          'Ket. Pajak',
          'Total Akhir (Rp)',
          'Status Kontrak',
          'Status Materai/TTD',
          'Link Arsip Kontrak (Drive)',
          'Catatan',
          'Terakhir Diperbarui (WITA)',
          'Tipe PPh Real',
          'Potongan PPh (Rp)',
          'Penerimaan Real (Rp)',
        ],
      ],
    },
    {
      range: 'Log_Riwayat_Status!A1:F1',
      values: [
        [
          'ID Kontrak',
          'Nomor Kontrak',
          'Status Kontrak',
          'Waktu / Timestamp (WITA)',
          'Catatan Status',
          'PIC / Petugas',
        ],
      ],
    },
  ];

  if (contractRows.length > 0) {
    updateData.push({
      range: `Daftar_Kontrak!A2:X${contractRows.length + 1}`,
      values: contractRows,
    });
  }

  if (boqRows.length > 0) {
    updateData.push({
      range: `Rincian_Pekerjaan_BoQ!A2:H${boqRows.length + 1}`,
      values: boqRows,
    });
  }

  if (historyRows.length > 0) {
    updateData.push({
      range: `Log_Riwayat_Status!A2:F${historyRows.length + 1}`,
      values: historyRows,
    });
  }

  if (updateData.length === 0) {
    return { success: true, rowsUpdated: 0 };
  }

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateData,
      }),
    }
  );

  if (!batchRes.ok) {
    const err = await batchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menyinkronkan data ke Google Sheets');
  }

  return { success: true, rowsUpdated: contractRows.length };
}
