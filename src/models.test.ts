import { test } from 'node:test';
import assert from 'node:assert';
import { parseModelIds, fetchModelIds } from './models';

test('parseModelIds 取非空字符串 id、去重、排序', () => {
  assert.deepStrictEqual(
    parseModelIds({ data: [{ id: 'gpt' }, { id: 'kimi' }, { id: 'gpt' }, { id: '' }, { id: '  tier-2  ' }, {}] }),
    ['gpt', 'kimi', 'tier-2'],
  );
});

test('parseModelIds 缺 data 数组抛错', () => {
  assert.throws(() => parseModelIds({} as any));
  assert.throws(() => parseModelIds(null as any));
});

test('parseModelIds 无可用 id 抛错', () => {
  assert.throws(() => parseModelIds({ data: [{ id: '' }, { foo: 1 } as any] }));
});

test('fetchModelIds 请求 /v1/models 并去除 baseUrl 尾部斜杠', async () => {
  let seenUrl = '';
  const fakeFetch = (async (url: string) => {
    seenUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'zeta' }, { id: 'alpha' }] }),
    } as any;
  }) as typeof fetch;
  const ids = await fetchModelIds('http://127.0.0.1:8317/', fakeFetch);
  assert.strictEqual(seenUrl, 'http://127.0.0.1:8317/v1/models');
  assert.deepStrictEqual(ids, ['alpha', 'zeta']);
});

test('fetchModelIds 非 200 抛错', async () => {
  const fakeFetch = (async () => ({ ok: false, status: 500, json: async () => ({}) }) as any) as typeof fetch;
  await assert.rejects(() => fetchModelIds('http://127.0.0.1:8317', fakeFetch), /HTTP 500/);
});