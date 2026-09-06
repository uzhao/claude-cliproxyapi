import * as fs from 'fs';
import * as path from 'path';

/**
 * 需要被 modelOverrides 覆盖的 Claude Code 模型别名。
 * 代理模式下这些别名全部重定向到 CLIProxyAPI 选中的模型 ID，
 * 这样无论当前 model 是哪个别名，请求都会换成代理模型。
 */
export const MODEL_ALIASES = [
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-4-opus-20250514',
  'claude-code-20250219',
  'claude-fable-5',
  'claude-fable-5-1',
  'claude-haiku-3-5',
  'claude-haiku-3-55',
  'claude-haiku-4',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4',
  'claude-opus-4-0',
  'claude-opus-4-1',
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-opus-4-5',
  'claude-opus-4-5-20251101',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-opus-5',
  'claude-sonnet-3-7',
  'claude-sonnet-4',
  'claude-sonnet-4-0',
  'claude-sonnet-4-20250514',
  'claude-sonnet-4-5',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
] as const;

const BASE_URL_KEY = 'ANTHROPIC_BASE_URL';
const OVERRIDES_KEY = 'modelOverrides';

export interface Settings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

export function readSettings(p: string): Settings | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as Settings;
  } catch {
    return null;
  }
}

export function writeSettings(p: string, data: Settings): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/** 写入代理设定：baseURL 指向 CLIProxyAPI，modelOverrides 把全部别名映射到 modelId。 */
export function setProxy(p: string, baseUrl: string, modelId: string): void {
  const s = readSettings(p) ?? {};
  s.env = { ...(s.env ?? {}), [BASE_URL_KEY]: baseUrl };
  const overrides: Record<string, string> = {};
  for (const alias of MODEL_ALIASES) {
    overrides[alias] = modelId;
  }
  s[OVERRIDES_KEY] = overrides;
  writeSettings(p, s);
}

/** 透传：删除 baseURL 与 modelOverrides，让 Claude Code 恢复直连官方。 */
export function setPass(p: string): void {
  const s = readSettings(p);
  if (!s || !hasProxyOrOverride(s)) {
    return;
  }
  if (s.env && BASE_URL_KEY in s.env) {
    delete s.env[BASE_URL_KEY];
    if (Object.keys(s.env).length === 0) {
      delete s.env;
    }
  }
  if (OVERRIDES_KEY in s) {
    delete s[OVERRIDES_KEY];
  }
  writeSettings(p, s);
}

/** 当前是否处于代理模式（有 baseURL 或 modelOverrides 任意一个）。 */
export function isProxy(s: Settings | null): boolean {
  return hasProxyOrOverride(s);
}

/** 当前代理选中的模型 ID（取任一别名的覆盖值）；透传模式返回 null。 */
export function activeModel(s: Settings | null): string | null {
  if (!s || !isProxy(s)) {
    return null;
  }
  const overrides = s[OVERRIDES_KEY] as Record<string, unknown> | undefined;
  const first = overrides?.[MODEL_ALIASES[0]];
  return typeof first === 'string' ? first : null;
}

function hasProxyOrOverride(s: Settings | null): boolean {
  if (!s) {
    return false;
  }
  return Boolean(s.env?.[BASE_URL_KEY]) || OVERRIDES_KEY in s;
}