const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const data=fs.readFileSync('data.js','utf8');
const retest=fs.readFileSync('retest.js','utf8');
const app=fs.readFileSync('app.js','utf8');
function setup(query='', results){
 const dom=new JSDOM(html,{url:'https://capitalinvestmentclub.github.io/support-operations-uat-report/'+query,runScripts:'outside-only'});const w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.navigator.clipboard={writeText:async()=>{}};w.setTimeout=fn=>{fn();return 1;};w.clearTimeout=()=>{};
 vm.runInContext(data,dom.getInternalVMContext());
 if(results) w.DEPLOYED_RETEST_RESULTS=results;
vm.runInContext(retest,dom.getInternalVMContext());vm.runInContext(app,dom.getInternalVMContext());
 return {dom,w,d,$:s=>d.querySelector(s),all:s=>[...d.querySelectorAll(s)]};
}
test('publishes every Support Operations scenario and six-size cell',()=>{const x=setup();assert.equal(x.all('.finding-row').length,8);assert.equal(x.all('#scenarios tr').length,5);assert.equal(x.all('.cells span').length,30);assert.equal(x.$('#metric-total').textContent,'8');assert.equal(x.$('#metric-urgent').textContent,'3');assert.match(x.d.body.textContent,/5\/5 scenarios closed/);assert.match(x.d.body.textContent,/Final UAT score: 3\/10/);x.dom.window.close();});
test('supports finding search and deep links',()=>{const x=setup();x.$('#search').value='malformed template';x.$('#search').dispatchEvent(new x.w.Event('input'));assert.equal(x.all('.finding-row').length,1);x.$('.finding-row').click();assert.ok(x.$('dialog').open);assert.match(x.$('#dialog-content').textContent,/silently substitutes/i);x.dom.window.close();const y=setup('#SUP-F008');assert.ok(y.$('dialog').open);assert.match(y.$('#dialog-title').textContent,/cannot be linked/i);y.dom.window.close();});
test('contains no credentials, applicant emails or unsupported pass claims',()=>{for(const file of ['index.html','data.js','app.js','retest.js']){const value=fs.readFileSync(file,'utf8');assert.doesNotMatch(value,/approver@gmail|test123|cic\.test\./i);assert.doesNotMatch(value,/all scenarios passed/i);}});
test('keeps the remediation overlay pending until six deployed Chrome evidence cells exist',()=>{
 const x=setup();
 const exact=['360×800','390×844','768×1024','1024×768','1280×800','1440×900'];
 assert.deepEqual(Array.from(x.w.CHROME_RETEST_SIZES),exact);
 const overlays=Object.values(x.w.PR_REVIEW_UPDATES);
 assert.equal(overlays.length,3);
 for(const overlay of overlays){
  assert.equal(overlay.status,'Open');
  assert.equal(overlay.verifiedAt,undefined);
  assert.equal(overlay.fix,undefined);
  assert.deepEqual(Array.from(overlay.retest.sizes,item=>item.size),exact);
  assert.ok(overlay.retest.sizes.every(item=>item.status==='Pending'));
  assert.match(overlay.resolution,/deployed verification pending/i);
 }
 assert.match(x.$('#pending-retest-summary').textContent,/no release-pass claim/i);
 const id=Object.keys(x.w.PR_REVIEW_UPDATES)[0];
 const incomplete=x.w.buildChromeRetestUpdates({[id]:{
  browser:'Google Chrome',environment:'deployed development',verifiedAt:'2026-09-12',summary:'Test-only result',
  deployments:{webapp:'test',webapi:'test',notificationservice:'test'},
  sizes:exact.map(size=>({size,status:'Pass'}))
 }});
 assert.equal(incomplete[id].status,'Open','six asserted passes without evidence cannot close a finding');
 assert.equal(incomplete[id].verifiedAt,undefined);
 x.dom.window.close();
});

// Synthetic contract fixtures only: no real verification records or images are
// created or published by these tests.
function verifiedFixture(){
 return {
  browser:'Google Chrome',environment:'deployed development',
  frontend:'https://planar-truck-361704.uc.r.appspot.com',api:'https://cicdevapi.uc.r.appspot.com',
  verifiedAt:'2026-09-12T18:00:00Z',summary:'Synthetic adapter contract fixture only',
  deployments:Object.fromEntries(['webapp','webapi','notificationservice'].map(repo=>[repo,{commit:'a'.repeat(40),version:'unit-fixture-only'}])),
  sizes:['360×800','390×844','768×1024','1024×768','1280×800','1440×900'].map(size=>({
   size,status:'Pass',evidence:{src:'assets/unit-fixture-only.png',caption:'Synthetic contract fixture only',capturedAt:'2026-09-12T17:59:00Z'}
  }))
 };
}
test('evidence gate rejects missing, malformed, local and incomplete provenance',()=>{
 const x=setup(),id=Object.keys(x.w.PR_REVIEW_UPDATES)[0];
 const reject=mutate=>{
  const result=verifiedFixture();mutate(result);
  const overlay=x.w.buildChromeRetestUpdates({[id]:result})[id];
  assert.match(overlay.status,/^Open/);
  assert.equal(overlay.verifiedAt,undefined);
 };
 for(const field of ['browser','environment','frontend','api','verifiedAt','summary','deployments']) reject(result=>delete result[field]);
 reject(result=>result.browser='Chromium');
 reject(result=>result.frontend='http://localhost:3101');
 reject(result=>result.api='http://localhost:4310');
 reject(result=>result.verifiedAt='2026-09-12');
 reject(result=>result.summary='   ');
 for(const repo of ['webapp','webapi','notificationservice']){
  reject(result=>delete result.deployments[repo]);
  reject(result=>result.deployments[repo].commit='not-a-commit');
  reject(result=>result.deployments[repo].version=' ');
 }
 for(const field of ['src','caption','capturedAt']) reject(result=>delete result.sizes[0].evidence[field]);
 reject(result=>result.sizes[0].evidence.capturedAt='not-an-ISO-time');
 reject(result=>result.sizes[0].evidence.caption=' ');
 reject(result=>result.sizes[0].status='Fail');
 reject(result=>result.sizes.pop());
 reject(result=>result.sizes[0].size=result.sizes[1].size);
 reject(result=>result.sizes='malformed');
 reject(result=>result.sizes=[null]);
 x.dom.window.close();
});
test('notice derives zero, partial and complete defect-only verification from gated overlays',()=>{
 const baseline=setup(),ids=Object.keys(baseline.w.PR_REVIEW_UPDATES);
 const original=JSON.stringify(baseline.w.PR_REVIEW_DATA);
 assert.match(baseline.$('#pending-retest-summary').textContent,new RegExp('0/'+ids.length));
 assert.match(baseline.$('#pending-retest-summary').textContent,/verification is pending/);
 assert.equal(Object.keys(baseline.w.DEPLOYED_RETEST_RESULTS).length,0);
 const partial=setup('',{[ids[0]]:verifiedFixture()});
 assert.match(partial.$('#pending-retest-summary').textContent,new RegExp('1/'+ids.length));
 assert.match(partial.$('#pending-retest-summary').textContent,/verification is partial/);
 assert.equal(Object.values(partial.w.PR_REVIEW_UPDATES).filter(item=>item.status==='Fixed').length,1);
 const complete=setup('',Object.fromEntries(ids.map(id=>[id,verifiedFixture()])));
 assert.ok(Object.values(complete.w.PR_REVIEW_UPDATES).every(item=>item.status==='Fixed'));
 assert.match(complete.$('#pending-retest-summary').textContent,new RegExp(ids.length+'/'+ids.length));
 assert.match(complete.$('#pending-retest-summary').textContent,/Defect retest complete; historical campaign results unchanged/);
 assert.doesNotMatch(complete.$('#pending-retest-summary').textContent,/pending|all scenarios passed|campaign.*complete/i);
 assert.equal(JSON.stringify(complete.w.PR_REVIEW_DATA),original,'historical campaign data remains unchanged');
 if(complete.w.PR_REVIEW_RETEST_PLAN){
  assert.match(complete.w.PR_REVIEW_RETEST_PLAN.state,/Defect retest complete/);
  assert.equal(complete.w.PR_REVIEW_RETEST_PLAN.scenarios.length,30);
  assert.ok(complete.w.PR_REVIEW_RETEST_PLAN.scenarios.every(scenario=>scenario.sizes.every(cell=>cell.status==='PENDING')));
 }
 baseline.dom.window.close();partial.dom.window.close();complete.dom.window.close();
});
