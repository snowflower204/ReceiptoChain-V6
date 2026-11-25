import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { seed, readSavedDemo, STORAGE_KEY } from '../src/app/demo/_lib/state';

const legacyKey = 'receiptochain-entrep-demo-v1';
function storage(initial: Record<string,string>) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
test('migrates existing prototype records without touching real application keys', () => {
  const saved = seed(); saved.activities[0].title = 'Previously saved demo';
  const raw = JSON.stringify(saved);
  const store = storage({ [legacyKey]: raw, 'auth-token': 'untouched', 'real-records': 'untouched' });
  assert.equal(readSavedDemo(store), raw);
  assert.equal(store.getItem(STORAGE_KEY), raw);
  assert.equal(store.getItem(legacyKey), null);
  assert.equal(store.getItem('auth-token'), 'untouched');
  assert.equal(store.getItem('real-records'), 'untouched');
  assert.match(STORAGE_KEY, /^receiptochain-demo-/);
});
test('existing namespaced demo wins; migration failure preserves old data', () => {
  const raw = JSON.stringify(seed());
  const store = storage({[STORAGE_KEY]: raw, [legacyKey]: 'older copy'});
  assert.equal(readSavedDemo(store), raw);
  const full = storage({[legacyKey]:raw});
  full.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => readSavedDemo(full), /Quota/);
  assert.equal(full.getItem(legacyKey), raw);
  const corrupt = storage({[legacyKey]:'invalid'});
  assert.throws(() => readSavedDemo(corrupt));
  assert.equal(corrupt.getItem(legacyKey),'invalid');
});
test('all replaced real pages match the pre-prototype revision exactly', () => {
  for (const route of ['', 'about', 'dashboard', 'events', 'transactions', 'transaction-history', 'receipt']) {
    const path = join('src/app', route, 'page.tsx');
    assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show',`57f9639:${path}`],{encoding:'utf8'}),path);
  }
});
test('prototype entry points and navigation stay inside /demo, except Exit Demo', () => {
  for (const route of ['', 'events', 'financial-activities', 'document-reviews', 'reimbursements', 'reconciliation', 'about']) {
    assert.match(readFileSync(join('src/app/demo',route,'page.tsx'),'utf8'), /@\/app\/demo\/_components\/DemoApp/);
  }
  const source = readFileSync('src/app/demo/_components/DemoApp.tsx','utf8');
  const hrefs = [...source.matchAll(/href(?:=|:\s*)["']([^"']+)["']/g)].map(m => m[1]);
  assert.ok(hrefs.every(href => href === '#main' || href === '/' || href === '/demo' || href.startsWith('/demo/')));
  assert.equal(hrefs.filter(h => h === '/').length,1);
  assert.match(source,/href="\/"[^>]*>Exit Demo/);
  assert.match(source,/Demo – Local Only/);
});
test('demo source has no server imports or network calls and real pages do not import demo', () => {
  function walk(dir: string): string[] { return readdirSync(dir,{withFileTypes:true}).flatMap(f => f.isDirectory() ? walk(join(dir,f.name)) : [join(dir,f.name)]); }
  for (const path of walk('src/app/demo').filter(p => /\.(ts|tsx)$/.test(p))) {
    const source = readFileSync(path,'utf8');
    assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(|from\s+['"][^'"]*(?:prisma|\/api\/|auth)[^'"]*['"]/,path);
  }
  for (const path of walk('src/app').filter(p => !p.startsWith('src/app/demo/') && /page\.tsx$/.test(p))) {
    assert.doesNotMatch(readFileSync(path,'utf8'),/DemoApp|\/demo\/_lib/,path);
  }
  const chrome = readFileSync('src/components/AppChrome.tsx','utf8');
  assert.match(chrome,/path === '\/demo' \|\| path.startsWith\('\/demo\/'\)/);
});
