const FOLDER_NAME = 'Arsip Kontrak Sistem Tracking';

export interface DriveUploadResult {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
}

// Get or create archive folder in Google Drive
export async function getOrCreateArchiveFolder(accessToken: string): Promise<string> {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    FOLDER_NAME
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Gagal membuat folder arsip di Google Drive');
  }

  const folder = await createRes.json();
  return folder.id;
}

// Upload contract archive to Google Drive
export async function uploadContractToDrive(
  file: File | Blob,
  fileName: string,
  isSigned: boolean,
  accessToken: string,
  existingFileId?: string
): Promise<DriveUploadResult> {
  const folderId = await getOrCreateArchiveFolder(accessToken);
  const cleanName = `${isSigned ? '[BERMATERAI]' : '[DRAFT]'} ${fileName}`;

  // If replacing existing file on Drive
  if (existingFileId) {
    try {
      const updateMetaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: cleanName }),
      });

      // Update binary content via upload endpoint
      const updateMediaRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        }
      );

      if (updateMediaRes.ok) {
        const fileMetaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${existingFileId}?fields=id,name,webViewLink,webContentLink`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const meta = await fileMetaRes.json();
        return {
          fileId: existingFileId,
          name: cleanName,
          webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${existingFileId}/view`,
          webContentLink: meta.webContentLink,
        };
      }
    } catch (e) {
      console.warn('Update existing drive file failed, falling back to new upload:', e);
    }
  }

  // Multipart upload for new file
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: cleanName,
    parents: [folderId],
    description: `Arsip dokumen kontrak ${isSigned ? 'Sudah Bertanda Tangan & Bermaterai' : 'Draft Belum Bertanda Tangan'}`,
  };

  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaPartHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaPartHeader);
  const closeBytes = encoder.encode(closeDelimiter);

  const combined = new Uint8Array(
    metaBytes.length + mediaHeaderBytes.length + fileBytes.length + closeBytes.length
  );

  let offset = 0;
  combined.set(metaBytes, offset);
  offset += metaBytes.length;
  combined.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.length;
  combined.set(fileBytes, offset);
  offset += fileBytes.length;
  combined.set(closeBytes, offset);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mengunggah file ke Google Drive');
  }

  const result = await uploadRes.json();
  return {
    fileId: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink,
  };
}
