// Pitcher-style finding overlay. Historical campaign data and scores are unchanged.
window.CHROME_RETEST_SIZES = ['360×800', '390×844', '768×1024', '1024×768', '1280×800', '1440×900'];
const targetFindings = window.PR_REVIEW_DATA.findings.filter(finding => ['critical', 'high'].includes(finding.severity.toLowerCase()));
const pendingCell = 'Pending';
const pendingStatus = 'Open';
const pendingResolution = 'Fixes merged and deployed; full deployed verification pending for original finding closure. Current targeted results are recorded in the dated retest section.';
const pendingBrowser = 'Google Chrome';
const pendingEnvironment = 'Pending deployed development verification';
const pendingCheck = null;
const pendingFix = () => ({});
const verificationEvidence = () => ({});

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const isoDate = (value) => nonempty(value)
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value));
window.DEPLOYED_RETEST_RESULTS = window.DEPLOYED_RETEST_RESULTS || {};
window.buildChromeRetestUpdates = (results = {}) => Object.fromEntries(
  targetFindings.map((finding) => {
    const result = results?.[finding.id] || {};
    const suppliedSizes = Array.isArray(result.sizes) ? result.sizes.filter(item => item && typeof item === 'object') : [];
    const cells = window.CHROME_RETEST_SIZES.map(size => {
      const supplied = suppliedSizes.find(item => item.size === size);
      return {size, status: ['Pass', 'Fail', 'Blocked'].includes(supplied?.status) ? supplied.status : pendingCell};
    });
    const visuals = window.CHROME_RETEST_SIZES.flatMap(size => {
      const evidence = suppliedSizes.find(item => item.size === size)?.evidence;
      return nonempty(evidence?.src) && nonempty(evidence?.caption) && isoDate(evidence?.capturedAt)
        ? [{...evidence, size}] : [];
    });
    const complete = result.browser === 'Google Chrome'
      && result.environment === 'deployed development'
      && result.frontend === 'https://planar-truck-361704.uc.r.appspot.com'
      && result.api === 'https://cicdevapi.uc.r.appspot.com'
      && isoDate(result.verifiedAt) && nonempty(result.summary)
      && ['webapp', 'webapi', 'notificationservice'].every(repo =>
        /^[a-f0-9]{40}$/i.test(result.deployments?.[repo]?.commit || '')
        && nonempty(result.deployments?.[repo]?.version))
      && suppliedSizes.length === window.CHROME_RETEST_SIZES.length
      && window.CHROME_RETEST_SIZES.every(size => suppliedSizes.filter(item => item.size === size).length === 1)
      && cells.every(cell => cell.status === 'Pass')
      && visuals.length === window.CHROME_RETEST_SIZES.length;
    const evidence = visuals.map(item => ({label: item.size + ' Chrome evidence', url: item.src, note: item.caption}));
    return [finding.id, {
      status: complete ? 'Fixed' : pendingStatus,
      resolution: complete ? result.summary : pendingResolution,
      ...(complete ? {verifiedAt: result.verifiedAt} : {}),
      retest: {
        browser: complete ? 'Google Chrome' : pendingBrowser,
        environment: complete ? 'deployed development' : pendingEnvironment,
        check: result.check || pendingCheck || finding.remediation || finding.expected,
        sizes: cells,
        ...(complete ? {frontend: result.frontend, api: result.api, deployments: result.deployments} : {}),
      },
      visuals: [...(finding.visuals || []), ...visuals],
      ...(complete ? {fix: {summary: result.summary, evidence}} : pendingFix(finding)),
      ...verificationEvidence(evidence),
    }];
  })
);
window.chromeRetestSummary = (updates = window.PR_REVIEW_UPDATES) => {
  const entries = Object.values(updates || {});
  const verified = entries.filter(item => item.status === 'Fixed').length;
  const complete = entries.length > 0 && verified === entries.length;
  return 'Deployed defect retest · ' + verified + '/' + entries.length
    + ' critical/high findings verified · Chrome only × six exact sizes. '
    + (complete ? 'Defect retest complete; historical campaign results unchanged.'
      : 'Deployed verification ' + (verified ? 'is partial' : 'is pending')
        + '; remaining findings are open; no release-pass claim or historical score change is made.');
};
window.PR_REVIEW_UPDATES = window.buildChromeRetestUpdates(window.DEPLOYED_RETEST_RESULTS);
const pendingNotice = document.createElement('div');
pendingNotice.className = 'campaign-note';
pendingNotice.id = 'pending-retest-summary';
pendingNotice.textContent = window.chromeRetestSummary();
document.querySelector('.metrics').insertAdjacentElement('afterend', pendingNotice);
