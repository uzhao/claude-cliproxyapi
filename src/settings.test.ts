import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readSettings, setProxy, setPass, writeSettings, isProxy } from './settings';

function tmpFile(t: any): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccpa-settings-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'settings.json');
}

test('setProxy 写入 ANTHROPIC_BASE_URL 与 CLAUDE_CODE_DISABLE_ARTIFACT', (t) => {
  const p = tmpFile(t);
  setProxy(p, 'http://127.0.0.1:8317');
  const s = readSettings(p)!;
  assert.strictEqual(s.env?.ANTHROPIC_BASE_URL, 'http://127.0.0.1:8317');
  assert.strictEqual(s.env?.CLAUDE_CODE_DISABLE_ARTIFACT, '1');
  assert.ok(!('modelOverrides' in s));
  assert.strictEqual(isProxy(s), true);
});

test('setProxy 保留既有字段并清掉老版本 modelOverrides 残留', (t) => {
  const p = tmpFile(t);
  writeSettings(p, {
    permissions: { allow: ['Bash(npm)'] },
    env: { SOME_VAR: 'x' },
    modelOverrides: { 'claude-opus-4': 'tier-2' },
  });
  setProxy(p, 'http://127.0.0.1:8317');
  const s = readSettings(p)!;
  assert.deepStrictEqual(s.permissions, { allow: ['Bash(npm)'] });
  assert.strictEqual(s.env?.SOME_VAR, 'x');
  assert.strictEqual(s.env?.ANTHROPIC_BASE_URL, 'http://127.0.0.1:8317');
  assert.strictEqual(s.env?.CLAUDE_CODE_DISABLE_ARTIFACT, '1');
  assert.ok(!('modelOverrides' in s));
});

test('setPass 删除 baseURL、DISABLE_ARTIFACT 与 modelOverrides 残留,保留其他字段', (t) => {
  const p = tmpFile(t);
  writeSettings(p, {
    env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:8317', CLAUDE_CODE_DISABLE_ARTIFACT: '1' },
    modelOverrides: { opus: 'x' },
    other: 1,
  });
  setPass(p);
  const s = readSettings(p)!;
  assert.ok(!('env' in s));
  assert.ok(!('modelOverrides' in s));
  assert.strictEqual(s.other, 1);
  assert.strictEqual(isProxy(s), false);
});

test('setPass 对既无 baseURL 也无残留的 settings 是 no-op', (t) => {
  const p = tmpFile(t);
  writeSettings(p, { permissions: { allow: [] } });
  const before = fs.readFileSync(p, 'utf8');
  setPass(p);
  assert.strictEqual(fs.readFileSync(p, 'utf8'), before);
});

test('isProxy 只看 ANTHROPIC_BASE_URL,文件缺失视为直连', (t) => {
  const p = tmpFile(t);
  assert.strictEqual(isProxy(readSettings(p)), false);
  setProxy(p, 'http://127.0.0.1:8317');
  assert.strictEqual(isProxy(readSettings(p)), true);
  setPass(p);
  assert.strictEqual(isProxy(readSettings(p)), false);
  // 只有 modelOverrides 残留、没有 baseURL(老插件产物)→ 直连
  writeSettings(p, { modelOverrides: { 'claude-opus-4': 'tier-2' } });
  assert.strictEqual(isProxy(readSettings(p)), false);
});
