const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const run = JSON.parse(fs.readFileSync('targeted-run.json', 'utf8'));
const sizes = ['360×800','390×844','768×1024','1024×768','1280×800','1440×900'];
test('published run evidence links exist and public text excludes tokens and mailbox addresses', () => {
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.url === 'string' && value.url.startsWith('assets/')) {
      assert.ok(!value.url.includes('..'));
      assert.ok(fs.existsSync(value.url), 'Missing evidence: ' + value.url);
    }
    Object.values(value).forEach(walk);
  };
  walk(run);
  assert.doesNotMatch(JSON.stringify(run), /cic\.test\.|approver@gmail|test123|[?&](token|signature|x-goog-signature)=/i);
});
test('targeted run has exact scope, no silent missing responsive cells and no unsupported pass evidence', () => {
  const ids = new Set();
  assert.equal(run.browser, 'Google Chrome');
  assert.equal(run.frontend, 'https://planar-truck-361704.uc.r.appspot.com');
  assert.equal(run.api, 'https://cicdevapi.uc.r.appspot.com');
  for (const finding of run.findings) {
    assert.ok(!ids.has(finding.id)); ids.add(finding.id);
    assert.ok(['PASS','FAIL','BLOCKED','PARTIAL','NOT RUN'].includes(finding.status));
    assert.deepEqual(finding.responsive.map(cell => cell.size), sizes);
    if (finding.status !== 'NOT RUN') {
      if (finding.evidencePublication === 'WITHHELD_PRIVACY_REVIEW') { assert.ok(finding.summary.length > 20); assert.ok(finding.limitations.length > 20); assert.equal(finding.evidence.length, 0); assert.match(run.state, /PARTIAL/); }
      else { assert.ok(finding.steps.length); assert.ok(finding.evidence.length); }
    }
    for (const cell of finding.responsive) {
      assert.ok(['PASS','FAIL','BLOCKED','PARTIAL','NOT RUN'].includes(cell.status));
      if (['PASS','FAIL','PARTIAL'].includes(cell.status)) {
        if (finding.evidencePublication === 'WITHHELD_PRIVACY_REVIEW') { assert.ok(cell.summary.length > 20); assert.equal(cell.evidence.length, 0); }
        else assert.ok(cell.evidence.length);
      }
    }
  }
});
test('targeted report renders separately without altering historical data or accepting executable evidence links', () => {
  const dom = new JSDOM(fs.readFileSync('index.html','utf8'), {url:'https://capitalinvestmentclub.github.io/report/',runScripts:'outside-only'});
  const w = dom.window;
  w.fetch = () => new Promise(() => {});
  vm.runInContext(fs.readFileSync('data.js','utf8'), dom.getInternalVMContext());
  const before = JSON.stringify(w.PR_REVIEW_DATA);
  vm.runInContext(fs.readFileSync('targeted-run.js','utf8'), dom.getInternalVMContext());
  const fixture = JSON.parse(JSON.stringify(run));
  fixture.findings[0].evidence.push({url:'javascript:alert(1)',label:'unsafe'});
  const section = w.renderTargetedRetest(fixture);
  assert.equal(section.querySelectorAll('article').length, run.findings.length);
  assert.equal(section.querySelectorAll('.cells span').length, run.findings.length * 6);
  assert.match(section.textContent, /does not replace the historical/);
  assert.equal(section.querySelector('[href^="javascript:"]'), null);
  assert.equal(JSON.stringify(w.PR_REVIEW_DATA), before);
  assert.ok(w.document.querySelector('script[src^="targeted-run.js"]'));
  w.renderTargetedRetest(run);
  assert.equal(w.document.querySelectorAll('#targeted-retest-run').length,1);
  assert.equal(w.document.querySelectorAll('#latest-retest-navigation').length,1);
  assert.match(w.document.querySelector('#latest-retest-navigation').textContent, /HISTORICAL CAMPAIGN BASELINE, not current results/);
  assert.equal(w.document.querySelector('#latest-retest-navigation a').getAttribute('href'), '#targeted-retest-run');
  assert.match(w.document.querySelector('.metrics').getAttribute('aria-label'), /Historical campaign baseline/);
  assert.equal(w.document.querySelector('.release-signal small').textContent, 'HISTORICAL CAMPAIGN BASELINE');
  assert.match(w.document.querySelector('#historical-baseline-label').textContent, /not current retest outcomes/);
  w.close();
});

test('repair readiness is visible but never overwrites deployed outcomes', () => {
  const dom = new JSDOM(fs.readFileSync('index.html','utf8'), {runScripts:'outside-only'});
  dom.window.fetch = () => new Promise(() => {});
  vm.runInContext(fs.readFileSync('targeted-run.js','utf8'), dom.getInternalVMContext());
  const fixture = JSON.parse(JSON.stringify(run));
  fixture.repairBatch = {runId:'ready-only',state:'LOCAL VERIFIED',scope:'Not a deployed retest',mergeStatus:'PENDING',deploymentStatus:'PENDING',cloudRetestStatus:'PENDING',findings:[{id:'example',classification:'TEST_FIXTURE_CORRECTED',summary:'Historical seed was not backfilled.'}]};
  const before = JSON.stringify(fixture.findings);
  const section = dom.window.renderTargetedRetest(fixture);
  assert.match(section.querySelector('[aria-label="Repair batch delivery status"]').textContent, /Cloud retest: PENDING/);
  assert.match(section.textContent, /Historical seed was not backfilled/);
  assert.equal(JSON.stringify(fixture.findings), before);
  dom.window.close();
});
