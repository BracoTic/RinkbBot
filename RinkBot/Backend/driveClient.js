import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

export function createDriveClient() {
  let auth;

  // Prioridad 1: variable de entorno (Railway / cualquier cloud)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    // Prioridad 2: archivo local (desarrollo)
    const keyFile = path.join(__dirname, "config", "service-account.json");
    if (!fs.existsSync(keyFile)) {
      throw new Error(
        "Google Drive: falta GOOGLE_SERVICE_ACCOUNT_JSON (env) o config/service-account.json (local)"
      );
    }
    auth = new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
  }

  return google.drive({ version: "v3", auth });
}

export async function listFolder(drive, folderId, pageToken = null) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: 200,
    pageToken: pageToken || undefined,
    fields:
      "nextPageToken, files(id,name,mimeType,webViewLink,modifiedTime,md5Checksum,size)",
  });

  return {
    files: res.data.files || [],
    nextPageToken: res.data.nextPageToken || null,
  };
}

export async function downloadBuffer(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}

export async function exportBuffer(drive, fileId, mimeType) {
  const res = await drive.files.export(
    { fileId, mimeType },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}
