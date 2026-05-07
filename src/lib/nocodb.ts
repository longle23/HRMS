const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL;
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_CANDIDATES_TABLE = process.env.NOCODB_CANDIDATES_TABLE;
const NOCODB_ACTIONS_TABLE = process.env.NOCODB_ACTIONS_TABLE;
const NOCODB_ACCOUNTS_TABLE = process.env.NOCODB_ACCOUNTS_TABLE;
const NOCODB_JOB_DESCRIPTION_TABLE = process.env.NOCODB_JOB_DESCRIPTION_TABLE;
const NOCODB_EMAIL_TEMPLATES_TABLE = process.env.NOCODB_EMAIL_TEMPLATES_TABLE;
const NOCODB_LOG_EMAIL_TEMPLATES_TABLE = process.env.NOCODB_LOG_TEMPLATES_TABLE;
const ONEDRIVE_TENANT_ID = process.env.ONEDRIVE_TENANT_ID;
const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET;
const ONEDRIVE_USER_ID = process.env.ONEDRIVE_USER_ID;
const ONEDRIVE_FOLDER_PATH = process.env.ONEDRIVE_FOLDER_PATH;

function assertEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getHeaders() {
  const token = assertEnv("NOCODB_API_TOKEN", NOCODB_API_TOKEN);
  return {
    "Content-Type": "application/json",
    "xc-token": token,
  };
}

function getTableUrl(tableId: string) {
  const baseUrl = assertEnv("NOCODB_BASE_URL", NOCODB_BASE_URL);
  return `${baseUrl.replace(/\/$/, "")}/api/v2/tables/${tableId}/records`;
}

type AnyRecord = Record<string, unknown>;

function parseListPayload(payload: unknown): AnyRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const objectPayload = payload as Record<string, unknown>;
  const list = objectPayload.list ?? objectPayload.records ?? objectPayload.data;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is AnyRecord => item !== null && typeof item === "object");
}

export async function getCandidatesFromNocoDB() {
  const tableId = assertEnv("NOCODB_CANDIDATES_TABLE", NOCODB_CANDIDATES_TABLE);
  const pageSize = 100;
  const allRecords: AnyRecord[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(getTableUrl(tableId));
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NocoDB fetch candidates failed: ${response.status} - ${text}`);
    }

    const data = (await response.json()) as unknown;
    const records = parseListPayload(data);
    allRecords.push(...records);

    if (records.length < pageSize) {
      break;
    }
  }

  return allRecords;
}

export async function updateCandidateInNocoDB(candidateId: string, fields: Record<string, unknown>) {
  const tableId = assertEnv("NOCODB_CANDIDATES_TABLE", NOCODB_CANDIDATES_TABLE);
  const tableUrl = getTableUrl(tableId);
  const attempts: Array<{ url: string; body: unknown }> = [
    // Most NocoDB v2 setups update by sending Id in payload.
    { url: tableUrl, body: { Id: candidateId, ...fields } },
    // Some setups use lowercase id.
    { url: tableUrl, body: { id: candidateId, ...fields } },
    // Fallback for versions that support record-id path updates.
    { url: `${tableUrl}/${candidateId}`, body: fields },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(attempt.body),
    });

    if (response.ok) {
      return;
    }

    const text = await response.text();
    errors.push(`${response.status} @ ${attempt.url} -> ${text}`);
  }

  throw new Error(`NocoDB update candidate failed after retries: ${errors.join(" | ")}`);
}

export async function createActionLogInNocoDB(fields: Record<string, unknown>) {
  const tableId = assertEnv("NOCODB_ACTIONS_TABLE", NOCODB_ACTIONS_TABLE);
  const response = await fetch(getTableUrl(tableId), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB create action log failed: ${response.status} - ${text}`);
  }
}

export async function getAccountsFromNocoDB() {
  const tableId = assertEnv("NOCODB_ACCOUNTS_TABLE", NOCODB_ACCOUNTS_TABLE);
  const response = await fetch(getTableUrl(tableId), {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB fetch accounts failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as unknown;
  return parseListPayload(data);
}

export async function getJobDescriptionsFromNocoDB() {
  const tableId = assertEnv("NOCODB_JOB_DESCRIPTION_TABLE", NOCODB_JOB_DESCRIPTION_TABLE);
  const response = await fetch(getTableUrl(tableId), {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB fetch job descriptions failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as unknown;
  return parseListPayload(data);
}

export async function getEmailTemplateFromNocoDB() {
  const tableId = assertEnv("NOCODB_EMAIL_TEMPLATES_TABLE", NOCODB_EMAIL_TEMPLATES_TABLE);
  const response = await fetch(getTableUrl(tableId), {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB fetch email templates failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as unknown;
  return parseListPayload(data);
}

export async function updateEmailTemplateInNocoDB(fields: Record<string, unknown>) {
  const tableId = assertEnv("NOCODB_EMAIL_TEMPLATES_TABLE", NOCODB_EMAIL_TEMPLATES_TABLE);
  const tableUrl = getTableUrl(tableId);
  const key = typeof fields.key === "string" ? fields.key : "";

  const existingResponse = await fetch(tableUrl, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!existingResponse.ok) {
    const text = await existingResponse.text();
    throw new Error(`NocoDB fetch email templates failed: ${existingResponse.status} - ${text}`);
  }

  const existingData = (await existingResponse.json()) as unknown;
  const records = parseListPayload(existingData);
  const current = records.find((record) => record.key === key) as Record<string, unknown> | undefined;

  if (!current) {
    throw new Error(`NocoDB email template not found for key: ${key}`);
  }

  const recordId = String(current.Id ?? current.id ?? current.ID ?? "");
  if (!recordId) {
    throw new Error(`NocoDB email template record id missing for key: ${key}`);
  }

  const patchPayload = {
    Id: recordId,
    key: fields.key,
    subject: fields.subject,
    body: fields.body,
    updateBy: fields.updateBy,
    updateAt: fields.updateAt,
  };

  const patchResponse = await fetch(tableUrl, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(patchPayload),
  });

  if (!patchResponse.ok) {
    const text = await patchResponse.text();
    throw new Error(`NocoDB update email template failed: ${patchResponse.status} - ${text}`);
  }

  return fields;
}

export async function appendEmailTemplateLogInNocoDB(fields: Record<string, unknown>) {
  const tableId = assertEnv("NOCODB_LOG_EMAIL_TEMPLATES_TABLE", NOCODB_LOG_EMAIL_TEMPLATES_TABLE);
  const response = await fetch(getTableUrl(tableId), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB log email template failed: ${response.status} - ${text}`);
  }
}

async function getOneDriveAccessToken() {
  const tenantId = assertEnv("ONEDRIVE_TENANT_ID", ONEDRIVE_TENANT_ID);
  const clientId = assertEnv("ONEDRIVE_CLIENT_ID", ONEDRIVE_CLIENT_ID);
  const clientSecret = assertEnv("ONEDRIVE_CLIENT_SECRET", ONEDRIVE_CLIENT_SECRET);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneDrive token request failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("OneDrive token response missing access_token.");
  }

  return data.access_token;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

function buildUniqueFileName(fileName: string) {
  const safeName = sanitizeFileName(fileName);
  const dotIndex = safeName.lastIndexOf(".");
  const baseName = dotIndex >= 0 ? safeName.slice(0, dotIndex) : safeName;
  const extension = dotIndex >= 0 ? safeName.slice(dotIndex) : "";
  return `${baseName}-${Date.now()}${extension}`;
}

function normalizeOneDriveFolderPath(folderPath: string) {
  const trimmed = folderPath.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.replace(/^personal\/[^/]+\//i, "");
}

export async function uploadJobDescriptionToOneDrive(file: File, folderPath = "JD") {
  const accessToken = await getOneDriveAccessToken();
  const userId = assertEnv("ONEDRIVE_USER_ID", ONEDRIVE_USER_ID);
  const configuredFolderPath = assertEnv("ONEDRIVE_FOLDER_PATH", ONEDRIVE_FOLDER_PATH);
  const baseFolderPath = normalizeOneDriveFolderPath(configuredFolderPath);
  const relativeFolderPath = normalizeOneDriveFolderPath(folderPath);
  const safeFolderPath = [baseFolderPath, relativeFolderPath].filter(Boolean).join("/");
  const uniqueFileName = buildUniqueFileName(file.name);
  const uploadPath = safeFolderPath ? `${safeFolderPath}/${uniqueFileName}` : uniqueFileName;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/drive/root:/${encodeURI(uploadPath)}:/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/pdf",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneDrive upload failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as { name?: string; webUrl?: string };
  return { fileName: data.name ?? uniqueFileName, folderPath: safeFolderPath || "JD", itemUrl: data.webUrl };
}

