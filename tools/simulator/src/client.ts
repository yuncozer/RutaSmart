/** Cliente HTTP del dispositivo simulado (mismo contrato que el firmware). */

export interface DeviceCredentials {
  serial: string;
  secret: string;
  apiUrl: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`HTTP ${status}: ${JSON.stringify(body)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reintenta errores de red, 429 y 5xx con backoff exponencial (como el firmware). */
export async function request<T>(
  creds: DeviceCredentials,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  retries = 4,
): Promise<T> {
  const url = `${creds.apiUrl.replace(/\/$/, "")}/api/device/${path}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          "x-device-serial": creds.serial,
          authorization: `Bearer ${creds.secret}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data as T;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) throw new ApiError(res.status, data);
      const retryAfter = Number(res.headers.get("retry-after") ?? 0) * 1000;
      await sleep(Math.max(retryAfter, 2 ** attempt * 1000));
    } catch (err) {
      if (err instanceof ApiError || attempt >= retries) throw err;
      await sleep(2 ** attempt * 1000);
    }
  }
}

export interface EventsResponse {
  accepted: number;
  duplicates: number;
  rejected: { index: number; id?: string; reason: string }[];
}

export interface ConfigResponse {
  enabled: boolean;
  assigned: boolean;
  server_time: string;
  sync_interval_s: number;
  gps_interval_s?: number;
  driver_exclusion_enabled: boolean;
  firmware: { update_available: boolean; version?: string; url?: string; sha256?: string };
}
