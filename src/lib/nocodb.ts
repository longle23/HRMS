const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL;
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_CANDIDATES_TABLE = process.env.NOCODB_CANDIDATES_TABLE;
const NOCODB_ACTIONS_TABLE = process.env.NOCODB_ACTIONS_TABLE;
const NOCODB_ACCOUNTS_TABLE = process.env.NOCODB_ACCOUNTS_TABLE;

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
  const response = await fetch(getTableUrl(tableId), {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NocoDB fetch candidates failed: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as unknown;
  return parseListPayload(data);
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

