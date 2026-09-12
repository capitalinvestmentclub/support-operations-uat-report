(() => {
  const report = window.PR_REVIEW_DATA;
  const updates = window.PR_REVIEW_UPDATES || {};
  if (!report?.findings) {
    document.body.innerHTML = '<p role="alert">The generated finding ledger could not be loaded.</p>';
    return;
  }

  const findings = report.findings.map((finding) => ({
    ...finding,
    ...(updates[finding.id] || {}),
  }));
  const elements = {
    list: document.querySelector('#findings-list'),
    empty: document.querySelector('#empty-state'),
    count: document.querySelector('#result-count'),
    filterCopy: document.querySelector('#active-filter-copy'),
    search: document.querySelector('#search'),
    sort: document.querySelector('#sort'),
    dialog: document.querySelector('#finding-dialog'),
    dialogKicker: document.querySelector('#dialog-kicker'),
    dialogTitle: document.querySelector('#dialog-title'),
    dialogContent: document.querySelector('#dialog-content'),
    toast: document.querySelector('#toast'),
  };
  const state = {
    evidence: '',
    search: '',
    types: new Set(),
    statuses: new Set(),
    severities: new Set(),
    sort: 'severity',
  };

  const statusBucket = (status = '') => {
    const value = status.toLowerCase();
    if (value.startsWith('fixed')) return 'Fixed';
    if (value.includes('progress')) return 'In progress';
    if (value.includes('retest')) return 'Needs retest';
    if (value.startsWith('closed')) return 'Closed';
    return 'Open';
  };

  const statusClass = (status) => {
    const bucket = statusBucket(status);
    if (bucket === 'Fixed') return 'status-fixed';
    if (bucket === 'In progress') return 'status-progress';
    if (bucket === 'Needs retest') return 'status-retest';
    if (bucket === 'Closed') return 'status-closed';
    return '';
  };

  const escapeHtml = (value = '') =>
    String(value).replace(
      /[&<>'"]/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
          character
        ],
    );

  const severityWeight = {
    Critical: 0,
    Blocker: 1,
    High: 2,
    Medium: 3,
    Low: 4,
    Info: 5,
    Unclassified: 6,
  };

  const idNumber = (finding) => Number(finding.id.match(/\d+/)?.[0] || 0);
  const comparators = {
    severity: (a, b) =>
      severityWeight[a.severity] - severityWeight[b.severity] ||
      a.type.localeCompare(b.type) ||
      idNumber(a) - idNumber(b),
    id: (a, b) => a.type.localeCompare(b.type) || idNumber(a) - idNumber(b),
    scenario: (a, b) => a.scenario.localeCompare(b.scenario) || idNumber(a) - idNumber(b),
    status: (a, b) => statusBucket(a.status).localeCompare(statusBucket(b.status)) || idNumber(a) - idNumber(b),
  };

  function renderMetadata() {
    const generated = new Date(report.meta.generatedAt);
    document.querySelector('#metadata').innerHTML = `
      <span>HEAD ${escapeHtml(report.meta.commit.slice(0, 8))}</span>
      <span>Evidence ${escapeHtml(report.meta.checkpoint)}</span>
      <a href="${report.meta.url}">Open report source ↗</a>
    `;
  }

  function renderMetrics() {
    const urgent = findings.filter(
      (finding) =>
        ['Critical', 'High'].includes(finding.severity) && statusBucket(finding.status) === 'Open',
    ).length;
    const open = findings.filter((finding) => statusBucket(finding.status) === 'Open').length;
    const fixed = findings.filter((finding) => statusBucket(finding.status) === 'Fixed').length;
    const closed = findings.filter((finding) => statusBucket(finding.status) === 'Closed').length;
    document.querySelector('#metric-total').textContent = findings.length;
    document.querySelector('#metric-urgent').textContent = urgent;
    document.querySelector('#metric-open').textContent = open;
    document.querySelector('#metric-fixed').textContent = fixed;
    document.querySelector('#metric-closed').textContent = closed;
    document.querySelector('#release-reason').textContent = `${urgent} high findings remain open; one scenario is blocked by missing controlled prerequisites.`;
  }

  function optionCounts(property, transform = (value) => value) {
    return findings.reduce((counts, finding) => {
      const value = transform(finding[property]);
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
  }

  function renderFilterGroup(containerId, name, counts, selectedSet, preferredOrder) {
    const container = document.querySelector(`#${containerId}`);
    const options = Object.keys(counts).sort((a, b) => {
      const left = preferredOrder.indexOf(a);
      const right = preferredOrder.indexOf(b);
      return (left < 0 ? 99 : left) - (right < 0 ? 99 : right) || a.localeCompare(b);
    });
    container.innerHTML = options
      .map(
        (option) => `
          <label class="filter-option">
            <span>
              <input type="checkbox" name="${name}" value="${escapeHtml(option)}" ${selectedSet.has(option) ? 'checked' : ''} />
              ${escapeHtml(option)}
            </span>
            <output>${counts[option]}</output>
          </label>
        `,
      )
      .join('');
    container.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) selectedSet.add(input.value);
        else selectedSet.delete(input.value);
        render();
      });
    });
  }

  function renderFilters() {
    renderFilterGroup(
      'type-filters',
      'type',
      optionCounts('type'),
      state.types,
      ['Defect', 'Gap', 'Question'],
    );
    renderFilterGroup(
      'status-filters',
      'status',
      optionCounts('status', statusBucket),
      state.statuses,
      ['Open', 'In progress', 'Needs retest', 'Fixed', 'Closed'],
    );
    renderFilterGroup(
      'severity-filters',
      'severity',
      optionCounts('severity'),
      state.severities,
      ['Critical', 'Blocker', 'High', 'Medium', 'Low', 'Info', 'Unclassified'],
    );
  }

  function filteredFindings() {
    const query = state.search.toLowerCase().trim();
    return findings
      .filter((finding) => !state.types.size || state.types.has(finding.type))
      .filter((finding) => !state.statuses.size || state.statuses.has(statusBucket(finding.status)))
      .filter((finding) => !state.severities.size || state.severities.has(finding.severity))
      .filter((finding) => {
        if (!query) return true;
        return [
          finding.id,
          finding.title,
          finding.description,
          finding.area,
          finding.scenario,
          finding.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort(comparators[state.sort]);
  }

  function activeFilterText() {
    const parts = [];
    if (state.search) parts.push(`“${state.search}”`);
    if (state.types.size) parts.push([...state.types].join(', '));
    if (state.statuses.size) parts.push([...state.statuses].join(', '));
    if (state.severities.size) parts.push([...state.severities].join(', '));
    return parts.length ? parts.join(' · ') : 'Full Support Operations record';
  }

  function rowTemplate(finding) {
    return `
      <button
        class="finding-row"
        type="button"
        data-id="${finding.id}"
        data-type="${finding.type}"
        data-severity="${finding.severity}"
        aria-label="Open ${finding.id}: ${escapeHtml(finding.title)}"
      >
        <span class="finding-main">
          <span class="finding-id">${finding.id}</span>
          <span>
            <span class="finding-title">${escapeHtml(finding.title)}</span>
            <span class="finding-tags">
              <span class="tag tag-${finding.severity.toLowerCase()}">${finding.severity}</span>
              <span class="tag">${finding.type}</span>
            </span>
          </span>
        </span>
        <span class="finding-area">
          <strong>${finding.scenario}</strong>
          ${escapeHtml(finding.area)}
        </span>
        <span class="status-label ${statusClass(finding.status)}">${escapeHtml(finding.status)}</span>
      </button>
    `;
  }

  function render() {
    const visible = filteredFindings();
    elements.list.innerHTML = visible.map(rowTemplate).join('');
    elements.count.textContent = visible.length;
    elements.filterCopy.textContent = activeFilterText();
    elements.empty.hidden = visible.length > 0;
    elements.list.querySelectorAll('.finding-row').forEach((row) => {
      row.addEventListener('click', () => openFinding(row.dataset.id));
    });
    persistView();
  }

  function evidenceLink(label, url, note) {
    if (!url) return '';
    return `
      <a class="evidence-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
        <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(note)}</small></span>
        <span aria-hidden="true">↗</span>
      </a>
    `;
  }

  function fixTemplate(finding) {
    if (!finding.fix && !finding.resolution) return '';
    const fix = finding.fix || {};
    const evidence = finding.verificationEvidence || fix.evidence || [];
    const changes = [
      fix.summary ? `<li><strong>Summary:</strong> ${escapeHtml(fix.summary)}</li>` : '',
      fix.commit
        ? `<li><strong>Commit:</strong> <a href="${escapeHtml(fix.commit.url)}" target="_blank" rel="noreferrer">${escapeHtml(fix.commit.sha || fix.commit.url)}</a></li>`
        : '',
      fix.pr
        ? `<li><strong>Fix PR:</strong> <a href="${escapeHtml(fix.pr.url)}" target="_blank" rel="noreferrer">${escapeHtml(fix.pr.label || fix.pr.url)}</a></li>`
        : '',
      ...(fix.files || []).map(
        (file) => `<li><strong>Changed:</strong> <a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">${escapeHtml(file.path)}</a></li>`,
      ),
    ].filter(Boolean);
    return `
      <section class="detail-section fix-section">
        <h3>${statusBucket(finding.status) === 'Fixed' ? 'Fix verified' : 'Resolution'}</h3>
        <p>${escapeHtml(finding.resolution || fix.summary || 'Resolution recorded.')}</p>
        ${changes.length ? `<ul class="change-list">${changes.join('')}</ul>` : ''}
      </section>
      ${
        evidence.length
          ? `<section class="detail-section"><h3>Fix evidence</h3><div class="evidence-links">${evidence
              .map((item) => evidenceLink(item.label, item.url, item.note || 'Verification evidence'))
              .join('')}</div></section>`
          : ''
      }
    `;
  }

  function retestTemplate(finding) {
    if (!finding.retest) return '';
    return `
      <section class="detail-section retest-section">
        <h3>Deployed Chrome retest</h3>
        <p><strong>${escapeHtml(finding.retest.check)}</strong><br>${escapeHtml(finding.retest.browser)} · ${escapeHtml(finding.retest.environment)}</p>
        <div class="cells retest-cells">${finding.retest.sizes.map((item) => `<span>${escapeHtml(item.size)} · ${escapeHtml(item.status)}</span>`).join('')}</div>
      </section>
    `;
  }

  function openFinding(id, updateHash = true) {
    const finding = findings.find((item) => item.id === id);
    if (!finding) return;
    selectEvidence(id);
    elements.dialogKicker.textContent = `${finding.id} · ${finding.scenario} · ${finding.type}`;
    elements.dialogTitle.textContent = finding.title;
    const fixed = statusBucket(finding.status) === 'Fixed';
    const resolved = fixed || statusBucket(finding.status) === 'Closed';
    elements.dialogContent.innerHTML = `
      <div class="detail-status">
        <span class="tag tag-${finding.severity.toLowerCase()}">${finding.severity}</span>
        <span class="status-label ${statusClass(finding.status)}">${escapeHtml(finding.status)}</span>
      </div>
      <section class="detail-section">
        <h3>What was found</h3>
        <p>${escapeHtml(finding.description || finding.title)}</p>
      </section>
      <section class="detail-section"><h3>Reproduction / observed path</h3><p>${escapeHtml(finding.steps)}</p></section>
      <section class="detail-section"><h3>Expected result / acceptance</h3><p>${escapeHtml(finding.expected)}</p></section>
      <section class="detail-section">
        <h3>Original evidence</h3>
        <p>${escapeHtml(finding.evidenceStatus)} · 12 September Support Operations Chrome campaign. Private <code>tests/e2e/admin/</code> run records are the source of this sanitized consolidation. <a href="#coverage" id="dialog-coverage">View scenario coverage and provenance</a>.</p>
        <div class="evidence-links">
          ${evidenceLink('Run record', finding.sourceUrl, `${finding.source}:${finding.line}`)}
          ${evidenceLink('Captured evidence', finding.evidenceUrl, 'Screenshots, recordings, and evidence notes')}
        </div>
      </section>
      <section class="detail-section finding-visuals"><h3>Visual evidence for ${escapeHtml(finding.id)}</h3>${visualTemplate(finding)}</section>
      ${retestTemplate(finding)}
      ${fixTemplate(finding)}
      <section class="detail-section">
        <h3>Lifecycle</h3>
        <div class="timeline">
          <div class="timeline-item done"><strong>Finding recorded</strong><small>${finding.scenario} · Support Operations Chrome evidence run</small></div>
          <div class="timeline-item ${finding.fix ? 'done' : ''}"><strong>Change linked</strong><small>${finding.fix ? 'Commit and changed files recorded' : 'Awaiting implementation'}</small></div>
          <div class="timeline-item ${resolved ? 'done' : ''}"><strong>Verification evidence</strong><small>${resolved ? escapeHtml(finding.verifiedAt || 'Recorded') : 'Awaiting browser retest'}</small></div>
        </div>
      </section>
    `;
    document.querySelector('#dialog-coverage').addEventListener('click', () => elements.dialog.close());
    bindImageErrors(elements.dialogContent);
    if (!elements.dialog.open) elements.dialog.showModal();
    if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
  }

  function closeDialog() {
    elements.dialog.close();
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  function persistView() {
    const params = new URLSearchParams();
    if (state.evidence) params.set('evidence', state.evidence);
    if (state.search) params.set('q', state.search);
    if (state.types.size) params.set('type', [...state.types].join(','));
    if (state.statuses.size) params.set('status', [...state.statuses].join(','));
    if (state.severities.size) params.set('severity', [...state.severities].join(','));
    if (state.sort !== 'severity') params.set('sort', state.sort);
    const query = params.toString();
    const hash = location.hash;
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${hash}`);
  }

  function hydrateView() {
    const params = new URLSearchParams(location.search);
    state.search = params.get('q') || '';
    state.evidence = findings.some(f => f.id === params.get('evidence')) ? params.get('evidence') : '';
    state.sort = Object.hasOwn(comparators, params.get('sort')) ? params.get('sort') : 'severity';
    ['type', 'status', 'severity'].forEach((key) => {
      const setName = key === 'type' ? 'types' : key === 'status' ? 'statuses' : 'severities';
      const values = params.get(key)?.split(',').filter(Boolean) || [];
      const allowed = key === 'type' ? ['Defect', 'Question'] : key === 'status' ? ['Open', 'Fixed', 'Closed', 'In progress', 'Needs retest'] : Object.keys(severityWeight);
      state[setName] = new Set(values.filter(value => allowed.includes(value)));
    });
    elements.search.value = state.search;
    elements.sort.value = state.sort;
  }

  function clearFilters() {
    state.search = '';
    state.types.clear();
    state.statuses.clear();
    state.severities.clear();
    elements.search.value = '';
    renderFilters();
    render();
  }

  function applyMetricFilter(metric) {
    clearFilters();
    if (metric === 'urgent') {
      state.severities = new Set(['Critical', 'High']);
      state.statuses = new Set(['Open']);
    }
    if (metric === 'open') state.statuses = new Set(['Open']);
    if (metric === 'fixed') state.statuses = new Set(['Fixed']);
    if (metric === 'closed') state.statuses = new Set(['Closed']);
    renderFilters();
    render();
    document.querySelector('.results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => elements.toast.classList.remove('visible'), 2200);
  }

  async function copyViewLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('Filtered view link copied');
    } catch {
      showToast('Copy unavailable — use the browser address bar');
    }
  }

  function exportCsv() {
    const columns = ['id', 'type', 'severity', 'status', 'scenario', 'area', 'title', 'steps', 'description', 'expected', 'evidenceStatus'];
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [columns.join(','), ...filteredFindings().map((item) => columns.map((column) => quote(item[column])).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'support-operations-uat-20260912.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('CSV exported');
  }

  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    render();
  });
  elements.sort.addEventListener('change', (event) => {
    state.sort = event.target.value;
    render();
  });
  document.querySelectorAll('[data-metric-filter]').forEach((button) => {
    button.addEventListener('click', () => applyMetricFilter(button.dataset.metricFilter));
  });
  document.querySelector('#clear-filters').addEventListener('click', clearFilters);
  document.querySelector('#share-button').addEventListener('click', copyViewLink);
  document.querySelector('#export-button').addEventListener('click', exportCsv);
  document.querySelector('#dialog-close').addEventListener('click', closeDialog);
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) closeDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !elements.dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
      event.preventDefault();
      elements.search.focus();
    }
  });

  elements.dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  window.addEventListener('hashchange', () => { if(location.hash) openFinding(location.hash.slice(1), false); else if(elements.dialog.open) elements.dialog.close(); });
  function visualTemplate(finding) {
    if (!finding.visuals.length) return '<p class="evidence-empty">No visual evidence published for this finding. Its recorded outcome remains in the run notes; an unrelated screenshot is not substituted.</p>';
    return finding.visuals.map(item => `<figure class="finding-evidence"><a href="${escapeHtml(item.src)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(finding.id + ': ' + item.caption)}" loading="lazy"></a><figcaption><strong>${escapeHtml(item.capturedAt)}</strong><br>${escapeHtml(item.caption)}<br><a href="${escapeHtml(item.src)}" target="_blank" rel="noreferrer">Open original image ↗</a></figcaption></figure>`).join('');
  }

  function bindImageErrors(container) {
    container.querySelectorAll('.finding-evidence img').forEach(img => {
      img.addEventListener('error', () => {
        const message = document.createElement('p');
        message.className = 'evidence-empty';
        message.textContent = 'This evidence image could not load. Use the original-image link below or retry after refreshing.';
        img.replaceWith(message);
      }, {once:true});
    });
  }

  function selectEvidence(id) {
    const finding = findings.find(f => f.id === id);
    state.evidence = finding ? finding.id : '';
    document.querySelector('#evidence-finding').value = state.evidence;
    const panel = document.querySelector('#selected-evidence');
    panel.innerHTML = finding ? `<h3>${escapeHtml(finding.id)} · ${escapeHtml(finding.title)}</h3>${visualTemplate(finding)}` : '<p class="evidence-empty">Select a finding above or open one from the register to see its evidence.</p>';
    bindImageErrors(panel);
    persistView();
  }

  document.querySelector('#evidence-finding').innerHTML = '<option value="">Choose a finding</option>' + findings.map(f => `<option value="${f.id}">${escapeHtml(f.id + ' · ' + f.title + ' · ' + (f.visuals.length ? f.visuals.length + ' image(s)' : 'No public images'))}</option>`).join('');
  document.querySelector('#evidence-finding').addEventListener('change', event => selectEvidence(event.target.value));
  const initialId = location.hash.replace('#', '');
  hydrateView();
  renderMetadata();
  renderMetrics();
  renderFilters();
  render();
  selectEvidence(state.evidence);
  if (initialId) openFinding(initialId);
})();
