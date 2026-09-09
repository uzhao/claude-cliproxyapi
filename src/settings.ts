import * as fs from 'fs';
import * as path from 'path';

const BASE_URL_KEY = 'ANTHROPIC_BASE_URL';
const DISABLE_ARTIFACT_KEY = 'CLAUDE_CODE_DISABLE_ARTIFACT';
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

/** 写入代理设定:baseURL 指向 CLIProxyAPI,同时禁用 Artifacts,并清掉老版本写入的 modelOverrides 残留。 */
export function setProxy(p: string, baseUrl: string): void {
  const s = readSettings(p) ?? {};
  s.env = {
    ...(s.env ?? {}),
    [BASE_URL_KEY]: baseUrl,
    [DISABLE_ARTIFACT_KEY]: '1',
  };
  removeOverrides(s);
  writeSettings(p, s);
}

/** 直连官方:删除 baseURL、禁用 Artifacts 的 env 与 modelOverrides 残留,让 Claude Code 恢复官方接入。 */
export function setPass(p: string): void {
  const s = readSettings(p);
  if (!s || !hasProxyOrOverride(s)) {
    return;
  }
  if (s.env && BASE_URL_KEY in s.env) {
    delete s.env[BASE_URL_KEY];
    delete s.env[DISABLE_ARTIFACT_KEY];
    if (Object.keys(s.env).length === 0) {
      delete s.env;
    }
  }
  removeOverrides(s);
  writeSettings(p, s);
}

/** 当前是否处于代理模式(只看 baseURL)。 */
export function isProxy(s: Settings | null): boolean {
  return Boolean(s?.env?.[BASE_URL_KEY]);
}

function hasProxyOrOverride(s: Settings | null): boolean {
  if (!s) {
    return false;
  }
  return Boolean(s.env?.[BASE_URL_KEY]) || OVERRIDES_KEY in s;
}

function removeOverrides(s: Settings): void {
  if (OVERRIDES_KEY in s) {
    delete s[OVERRIDES_KEY];
  }
}
