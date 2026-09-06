import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MODEL_ALIASES, readSettings, setProxy, setPass, writeSettings, isProxy, activeModel } from './settings';

function tmpFile(t: any): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccpa-settings-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'settings.json');
}

test('MODEL_ALIASES 覆盖预期的 14 个别名', () => {
  assert.deepStrictEqual(
    [...MODEL_ALIASES],
    [
      'sonnet',
      'opus',
      'haiku',
      'fable',
      'best',
      'sonnet[1m]',
      'opus[1m]',
      'fable[1m]',
      'opusplan',
      'default',
      'claude-fable-5-1',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-haiku-4-5-20251001',
    ],
  );
});

test('setProxy 写入 baseURL 与全别名 modelOverrides', (t) => {
  const p = tmpFile(t);
  setProxy(p, 'http://127.0.0.1:8317', 'tier-2');
  const s = readSettings(p)!;
  assert.strictEqual(s.env?.ANTHROPIC_BASE_URL, 'http://127.0.0.1:8317');
  const overrides = s.modelOverrides as Record<string, string>;
  for (const alias of MODEL_ALIASES) {
    assert.strictEqual(overrides[alias], 'tier-2');
  }
});

test('setProxy 保留既有字段，只覆盖 env 与 modelOverrides', (t) => {
  const p = tmpFile(t);
  writeSettings(p, { permissions: { allow: ['Bash(npm)'] }, env: { SOME_VAR: 'x' } });
  setProxy(p, 'http://127.0.0.1:8317', 'gpt');
  const s = readSettings(p)!;
  assert.deepStrictEqual(s.permissions, { allow: ['Bash(npm)'] });
  assert.strictEqual(s.env?.SOME_VAR, 'x');
  assert.strictEqual(s.env?.ANTHROPIC_BASE_URL, 'http://127.0.0.1:8317');
});

test('activeModel 返回当前代理模型，透传返回 null', (t) => {
  const p = tmpFile(t);
  assert.strictEqual(activeModel(readSettings(p)), null); // 文件不存在 → 透传
  setProxy(p, 'http://127.0.0.1:8317', 'tier-2');
  assert.strictEqual(activeModel(readSettings(p)), 'tier-2');
  setPass(p);
  assert.strictEqual(activeModel(readSettings(p)), null);
  // 只有 baseURL 没有 modelOverrides（非本插件写入）→ null
  writeSettings(p, { env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:8317' } });
  assert.strictEqual(activeModel(readSettings(p)), null);
});

test('setPass 删除 baseURL 与 modelOverrides，保留其他字段', (t) => {
  const p = tmpFile(t);
  setProxy(p, 'http://127.0.0.1:8317', 'tier-2');
  setPass(p);
  const s = readSettings(p)!;
  assert.ok(!Object.keys(s).some((k) => k === 'modelOverrides'));
  assert.ok(!('ANTHROPIC_BASE_URL' in (s.env ?? {})));
  assert.strictEqual(isProxy(s), false);
});

test('setPass 对非代理 settings 是 no-op', (t) => {
  const p = tmpFile(t);
  writeSettings(p, { permissions: { allow: [] } });
  const before = fs.readFileSync(p, 'utf8');
  setPass(p);
  assert.strictEqual(fs.readFileSync(p, 'utf8'), before);
});

test('setPass 清空 env 后删除空 env，但保留文件其余内容', (t) => {
  const p = tmpFile(t);
  writeSettings(p, { env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:8317' }, modelOverrides: { opus: 'x' }, other: 1 });
  setPass(p);
  const s = readSettings(p)!;
  assert.ok(!('env' in s));
  assert.ok(!('modelOverrides' in s));
  assert.strictEqual(s.other, 1);
});