import { test } from 'node:test';
import assert from 'node:assert';
import { shouldReloadWindow } from './reload';

test('只在代理模式发生变化时重载窗口', () => {
  assert.strictEqual(shouldReloadWindow(false, true), true);
  assert.strictEqual(shouldReloadWindow(true, false), true);
  assert.strictEqual(shouldReloadWindow(false, false), false);
  assert.strictEqual(shouldReloadWindow(true, true), false);
});
