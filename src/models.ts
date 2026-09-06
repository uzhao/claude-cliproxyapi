/**
 * 从 CLIProxyAPI 的 /v1/models 拉取模型 ID 列表。
 * 接受 OpenAI 风格 `{"data": [{"id": "..."}]}`，只取非空字符串 id，去重并稳定排序。
 */

export interface ModelsResponse {
  data: Array<{ id?: unknown }>;
}

export async function fetchModelIds(baseUrl: string, fetchFn: typeof fetch = fetch): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/models`;
  const resp = await fetchFn(url);
  if (!resp.ok) {
    throw new Error(`fetch models failed: HTTP ${resp.status}`);
  }
  const body = (await resp.json()) as ModelsResponse;
  return parseModelIds(body);
}

export function parseModelIds(body: ModelsResponse): string[] {
  if (!body || typeof body !== 'object' || !Array.isArray(body.data)) {
    throw new Error('models response missing data array');
  }
  const ids = new Set<string>();
  for (const item of body.data) {
    if (item && typeof item.id === 'string') {
      const id = item.id.trim();
      if (id) {
        ids.add(id);
      }
    }
  }
  if (ids.size === 0) {
    throw new Error('no usable model IDs returned');
  }
  return [...ids].sort();
}