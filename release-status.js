(() => {
  const container = document.createElement("section");
  container.className = "release-status-panel";
  container.setAttribute("aria-labelledby", "release-status-title");

  const addText = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  };

  const safeLink = (parent, label, url) => {
    if (typeof url !== "string" || !url.startsWith("https://")) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    parent.appendChild(link);
  };

  const render = (status) => {
    addText(container, "p", "17 September defect-batch delivery", "release-status-kicker");
    const title = addText(container, "h2", status.state, "release-status-title");
    title.id = "release-status-title";
    addText(
      container,
      "p",
      `${status.reportEntriesLinked} report entries are linked to this batch; ${status.uatStatusesChanged} UAT finding statuses changed by this publication.`,
      "release-status-summary"
    );
    addText(container, "p", status.acceptanceBoundary, "release-status-boundary");

    const grid = document.createElement("div");
    grid.className = "release-status-grid";
    status.repositories.forEach((repository) => {
      const card = document.createElement("article");
      const failed = repository.testState.includes("FAILED");
      card.className = `release-status-card ${failed ? "release-status-risk" : "release-status-pending"}`;
      addText(card, "h3", repository.name, "");
      addText(card, "p", repository.deliveryState.replaceAll("_", " "), "release-status-delivery");
      addText(card, "p", `Tests: ${repository.testState}`, "");
      addText(card, "p", `Deployed UAT: ${repository.uatState}`, "");
      addText(card, "p", repository.note, "release-status-note");
      const links = document.createElement("p");
      links.className = "release-status-links";
      safeLink(links, "Pull request", repository.pullRequest);
      safeLink(links, "Deployment", repository.deploymentRun);
      safeLink(links, "Post-merge tests", repository.postMergeTestRun);
      safeLink(links, "Candidate", repository.candidateUrl);
      card.appendChild(links);
      grid.appendChild(card);
    });
    container.appendChild(grid);

    const main = document.querySelector("main");
    if (main) main.prepend(container);
  };

  fetch("release-status.json?v=20260917", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(render)
    .catch(() => {
      addText(container, "p", "Release status is unavailable. Historical report evidence remains authoritative.", "release-status-error");
      const main = document.querySelector("main");
      if (main) main.prepend(container);
    });
})();
