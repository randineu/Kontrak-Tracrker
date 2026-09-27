import { Contract } from '../types/contract';

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
  summary: string;
}

// Create calendar reminder for contract work deadline
export async function createDeadlineCalendarReminder(
  contract: Contract,
  accessToken: string
): Promise<CalendarEventResult> {
  const endDate = contract.masaKontrak.tanggalSelesai;
  const summary = `⚠️ [JATUH TEMPO] Kontrak: ${contract.nomorKontrak} - ${contract.unitKontrak}`;
  const description = `PENGINGAT BATAS AKHIR MASA PEKERJAAN KONTRAK\n\nNomor Kontrak: ${contract.nomorKontrak}\nJudul Pekerjaan: ${contract.judulKontrak}\nUnit: ${contract.unitKontrak}\nRekanan: ${contract.rekanan}\nNilai Kontrak: Rp ${contract.nilaiKontrak.toLocaleString('id-ID')}\nStatus Terkini: ${contract.status}\nStatus Materai: ${contract.arsip.statusMaterai}\nLink Arsip: ${contract.arsip.driveLink || 'Belum ada link drive'}\n\nMohon pastikan seluruh progres fisik BoQ telah 100% dan persiapan BAPP/BAST dilakukan sebelum tanggal jatuh tempo.`;

  const eventPayload = {
    summary,
    description,
    start: {
      date: endDate,
    },
    end: {
      date: endDate,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 * 3 }, // 3 days before
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 * 3 }, // 3 hours before
      ],
    },
    colorId: '11', // Red color for deadline
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menambahkan pengingat jatuh tempo ke Google Calendar');
  }

  const data = await res.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
  };
}

// Create calendar reminder for unsigned draft archive (needs materai & signed upload)
export async function createSigningReminder(
  contract: Contract,
  accessToken: string
): Promise<CalendarEventResult> {
  // Set reminder for tomorrow or 2 days from now
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const reminderDate = tomorrow.toISOString().split('T')[0];

  const summary = `📝 [PERINGATAN MATERAI] Draft Kontrak Belum TTD: ${contract.nomorKontrak}`;
  const description = `PENGINGAT UPDATE BERKAS BERTANDATANGAN & BERMATERAI\n\nArsip dokumen untuk kontrak "${contract.judulKontrak}" (${contract.nomorKontrak}) saat ini masih berbentuk "Draft Belum Bertanda Tangan di Materai".\n\nLangkah Tindakan:\n1. Cetak / mintakan tanda tangan pejabat berwenang dan rekanan ${contract.rekanan}.\n2. Bubuhkan materai Rp 10.000 resmi.\n3. Scan dokumen dan lakukan "Update / Upload Ulang Berkas" di Sistem Tracking Kontrak agar terarsip di Google Drive.\n\nUnit: ${contract.unitKontrak}`;

  const eventPayload = {
    summary,
    description,
    start: {
      date: reminderDate,
    },
    end: {
      date: reminderDate,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
    colorId: '5', // Yellow/Banana color for signing warning
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menambahkan pengingat tanda tangan ke Google Calendar');
  }

  const data = await res.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
  };
}
