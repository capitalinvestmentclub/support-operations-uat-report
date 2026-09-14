// Additive targeted-run record. Historical findings and scores are not rewritten.
(() => {
  const sizes = ['360×800', '390×844', '768×1024', '1024×768', '1280×800', '1440×900'];
  const statuses = ['PASS', 'FAIL', 'BLOCKED', 'PARTIAL', 'NOT RUN'];
  const el = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const safeUrl = value => typeof value === 'string' && (/^https:\/\//.test(value) || /^assets\/[a-zA-Z0-9_./-]+$/.test(value));
  const evidenceLinks = (target, evidence) => {
    (Array.isArray(evidence) ? evidence : []).forEach(item => {
      if (!safeUrl(item.url)) return;
      const link = el('a', item.label || 'Evidence'); link.href = item.url; target.append(' ', link);
    });
  };
  // Preserve original campaign values, but never present them as current retest totals.
  const labelHistoricalBaseline = () => {
    document.querySelector('.metrics')?.setAttribute('aria-label', 'Historical campaign baseline counters');
    document.querySelector('.release-signal')?.setAttribute('aria-label', 'Historical campaign baseline assessment');
    const signalLabel = document.querySelector('.release-signal small');
    if (signalLabel) signalLabel.textContent = 'HISTORICAL CAMPAIGN BASELINE';
    const metrics = document.querySelector('.metrics');
    if (metrics && !document.getElementById('historical-counter-label')) {
      const label = el('p', 'HISTORICAL CAMPAIGN BASELINE · original counters, not latest retest totals');
      label.id = 'historical-counter-label'; label.className = 'campaign-note';
      metrics.insertAdjacentElement('beforebegin', label);
    }
    const workspace = document.querySelector('.workspace');
    workspace?.setAttribute('aria-label', 'Historical campaign baseline findings');
    if (workspace && !document.getElementById('historical-baseline-label')) {
      const note = el('p', 'HISTORICAL CAMPAIGN BASELINE — the counters, filters and original finding statuses below preserve the original assessment. They are not current retest outcomes.');
      note.id = 'historical-baseline-label'; note.className = 'campaign-note';
      workspace.insertAdjacentElement('beforebegin', note);
    }
  };
  labelHistoricalBaseline();
  window.renderTargetedRetest = run => {
    document.getElementById('targeted-retest-run')?.remove();
    const section = el('section'); section.id = 'targeted-retest-run'; section.className = 'campaign-note report-appendix';
    section.setAttribute('aria-label', 'Latest targeted deployed retest');
    section.append(el('h2', 'Targeted deployed retest · ' + run.runId));
    section.append(el('p', run.scope));
    section.append(el('p', 'Run status: ' + run.state + '. Updated: ' + (run.updatedAt || 'Awaiting execution results') + '. Chrome only; functional journeys are tested once and responsive checks reuse records across six sizes.'));
    labelHistoricalBaseline();
    document.getElementById('latest-retest-navigation')?.remove();
    const latest = el('aside'); latest.id = 'latest-retest-navigation'; latest.className = 'campaign-note';
    latest.setAttribute('aria-label', 'Latest retest results');
    latest.append(el('strong', 'LATEST RETEST · ' + run.runId));
    latest.append(el('p', run.state + '. Original counters and finding statuses below are the HISTORICAL CAMPAIGN BASELINE, not current results.'));
    const jump = el('a', 'View latest targeted results and remaining coverage →'); jump.href = '#targeted-retest-run'; latest.append(jump);
    document.querySelector('main')?.prepend(latest);
    const findings = run.findings || [];
    const counts = Object.fromEntries(statuses.map(status => [status, findings.filter(row => row.status === status).length]));
    section.append(el('p', 'Functional outcomes — ' + statuses.map(status => status + ': ' + counts[status]).join(' · ')));
    section.append(el('p', 'This targeted run does not replace the historical full-campaign assessment, change its score, or imply six independent executions of every workflow. Unexecuted checks are NOT RUN.'));
    const deployments = el('p', 'Deployed versions: ');
    Object.entries(run.deployments || {}).forEach(([repo, value]) => deployments.append(repo + ' ' + value.version + ' (' + value.commit + ') '));
    section.append(deployments);
    const list = el('div');
    findings.forEach(row => {
      const article = el('article'); article.id = 'targeted-' + row.id;
      article.append(el('h3', row.id + ' · ' + row.title));
      article.append(el('p', 'Functional result: ' + (statuses.includes(row.status) ? row.status : 'NOT RUN') + ' — ' + row.summary));
      if (row.steps?.length) { const steps = el('ol'); row.steps.forEach(step => steps.append(el('li', step))); article.append(steps); }
      const evidence = el('p', 'Functional evidence:'); evidenceLinks(evidence, row.evidence); article.append(evidence);
      const cells = el('div'); cells.className = 'cells';
      sizes.forEach(size => {
        const cell = row.responsive?.find(item => item.size === size);
        const display = el('span', size + ' · ' + (statuses.includes(cell?.status) ? cell.status : 'NOT RUN'));
        if (cell?.summary) display.append(' — ' + cell.summary);
        evidenceLinks(display, cell?.evidence); cells.append(display);
      });
      article.append(cells);
      if (row.limitations) article.append(el('p', 'Limitations: ' + row.limitations));
      (row.additionalCoverage || []).forEach(extra => {
        const detail = el('details'); detail.append(el('summary', 'Additional supporting coverage — not finding closure'));
        detail.append(el('p', extra.summary)); evidenceLinks(detail, extra.evidence);
        if (extra.limitations) detail.append(el('p', extra.limitations));
        article.append(detail);
      });
      list.append(article);
    });
    section.append(list);
    document.querySelector('.metrics').insertAdjacentElement('afterend', section);
    return section;
  };
  fetch('targeted-run.json?v=20260914', {cache: 'no-store'}).then(response => {
    if (!response.ok) throw new Error('Run record unavailable');
    return response.json();
  }).then(window.renderTargetedRetest).catch(() => {
    const notice = el('p', 'Latest targeted run record could not be loaded. Historical campaign results below remain available.');
    notice.className = 'campaign-note'; document.querySelector('.metrics').insertAdjacentElement('afterend', notice);
  });
})();
