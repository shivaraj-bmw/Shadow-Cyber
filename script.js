/* ============================================================
   CYBER INCIDENT SIMULATOR
   Vanilla JS application logic.
   Everything in this file operates on 100% fictional/simulated
   data. No real network requests, scans, or exploits are ever
   performed — this is a self-contained educational simulation.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     STORAGE / STATE
  --------------------------------------------------------- */
  const STORAGE_KEY = "cis_state_v1";

  const RANKS = [
    { name: "NOVICE", min: 0 },
    { name: "ANALYST", min: 800 },
    { name: "INVESTIGATOR", min: 2000 },
    { name: "THREAT HUNTER", min: 3800 },
    { name: "INCIDENT RESPONDER", min: 5800 },
    { name: "CYBER OPERATIVE", min: 7800 },
    { name: "DIGITAL FORENSICS EXPERT", min: 9800 },
  ];

  const ACHIEVEMENTS = [
    { id: "first-case", emoji: "🏆", name: "First Investigation", desc: "Complete your first case." },
    { id: "evidence-hunter", emoji: "🔎", name: "Evidence Hunter", desc: "Discover 10 clues across all cases." },
    { id: "perfect-analysis", emoji: "🧠", name: "Perfect Analysis", desc: "Score 100% on a final report." },
    { id: "fast-investigator", emoji: "⚡", name: "Fast Investigator", desc: "Complete a case in under 5 minutes." },
    { id: "digital-detective", emoji: "🕵️", name: "Digital Detective", desc: "Complete 3 cases." },
    { id: "security-expert", emoji: "🔐", name: "Security Expert", desc: "Complete 5 training modules." },
    { id: "incident-master", emoji: "🔥", name: "Incident Master", desc: "Complete all cases." },
    { id: "secret-1337", emoji: "👾", name: "Signal Found", desc: "Discovered a hidden terminal signal." },
  ];

  function defaultState() {
    return {
      xp: 0,
      completedCases: {}, // id -> {score, evidenceFound, cluesFound, accuracy, timeSeconds, completedAt}
      caseProgress: {},   // id -> {foundClues:[], viewedEvidence:[], startedAt}
      notes: {},           // caseId -> text
      achievements: [],    // ids
      trainingCompleted: [],
      trainingScores: {},  // topicId -> best % score
      certificateName: "",
      settings: { sound: false, reducedMotion: false, bootSkipped: false },
      streak: 0,
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — continue without persistence */
    }
  }

  function getRank(xp) {
    let r = RANKS[0];
    for (const rank of RANKS) if (xp >= rank.min) r = rank;
    return r;
  }

  function nextRank(xp) {
    for (const rank of RANKS) if (xp < rank.min) return rank;
    return null;
  }

  function addXp(amount) {
    state.xp += amount;
    saveState();
    updateTopbar();
  }

  function unlockAchievement(id) {
    if (state.achievements.includes(id)) return;
    state.achievements.push(id);
    saveState();
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) {
      toast("🏆", `Achievement unlocked: ${def.name}`);
      playSound("success");
    }
  }

  function totalCluesFound() {
    let n = 0;
    Object.values(state.caseProgress).forEach((p) => (n += (p.foundClues || []).length));
    return n;
  }

  function checkAchievements() {
    const completedCount = Object.keys(state.completedCases).length;
    if (completedCount >= 1) unlockAchievement("first-case");
    if (completedCount >= 3) unlockAchievement("digital-detective");
    if (completedCount >= CASES.length) unlockAchievement("incident-master");
    if (totalCluesFound() >= 10) unlockAchievement("evidence-hunter");
    if (state.trainingCompleted.length >= 5) unlockAchievement("security-expert");
  }

  /* ---------------------------------------------------------
     UTILITIES
  --------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") e.className = v;
        else if (k === "html") e.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }
  function fmtXp(n) { return n.toLocaleString("en-US"); }

  function toast(icon, text) {
    const root = $("#toastRoot");
    const tpl = $("#tpl-toast").content.cloneNode(true);
    tpl.querySelector(".toast-icon").textContent = icon;
    tpl.querySelector(".toast-text").textContent = text;
    const node = tpl.querySelector(".toast");
    root.appendChild(node);
    setTimeout(() => { node.style.opacity = "0"; node.style.transition = "opacity 0.3s"; }, 2600);
    setTimeout(() => node.remove(), 3000);
  }

  function openConfirm(title, message, onConfirm) {
    $("#confirmTitle").textContent = title;
    $("#confirmMessage").textContent = message;
    const modal = $("#confirmModal");
    modal.classList.remove("hidden");
    const okBtn = $("#confirmOkBtn");
    const cancelBtn = $("#confirmCancelBtn");
    function cleanup() { modal.classList.add("hidden"); okBtn.removeEventListener("click", onOk); cancelBtn.removeEventListener("click", onCancel); }
    function onOk() { cleanup(); onConfirm(); }
    function onCancel() { cleanup(); }
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  }

  /* ---------------------------------------------------------
     SOUND SYSTEM (Web Audio API — simple synthesized tones)
  --------------------------------------------------------- */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }
  function playSound(kind) {
    if (!state.settings.sound) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const map = {
      boot: [220, 330],
      click: [440],
      notification: [520, 660],
      alert: [180, 140],
      success: [523, 659, 784],
      error: [160, 110],
    };
    const freqs = map[kind] || [440];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0.05;
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.16);
    });
  }

  /* ---------------------------------------------------------
     BOOT SEQUENCE
  --------------------------------------------------------- */
  const BOOT_LINES = [
    "[✓] Kernel Loaded",
    "[✓] Encryption Module Loaded",
    "[✓] Evidence Engine Loaded",
    "[✓] Forensics Engine Loaded",
    "[✓] Threat Intelligence Module Loaded",
    "[✓] Investigation Database Loaded",
  ];

  function runBoot() {
    const linesRoot = $("#bootLines");
    const fill = $("#bootProgressFill");
    const statusLine = $("#bootStatusLine");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function finish() {
      $("#screen-boot").classList.add("hidden");
      $("#appShell").classList.remove("hidden");
      playSound("boot");
      navigate("home");
    }

    $("#skipBootBtn").addEventListener("click", finish);

    if (reduced) { finish(); return; }

    let i = 0;
    function nextLine() {
      if (i >= BOOT_LINES.length) {
        statusLine.textContent = "SYSTEM STATUS: ONLINE — ACCESS LEVEL: INVESTIGATOR";
        fill.style.width = "100%";
        setTimeout(finish, 700);
        return;
      }
      const line = el("div", { class: "boot-line" }, [
        el("span", { class: "ok" }, [BOOT_LINES[i].slice(0, 3)]),
        el("span", {}, [BOOT_LINES[i].slice(4)]),
      ]);
      linesRoot.appendChild(line);
      fill.style.width = Math.round(((i + 1) / BOOT_LINES.length) * 92) + "%";
      i++;
      setTimeout(nextLine, 320);
    }
    statusLine.textContent = "> Establishing secure session...";
    setTimeout(nextLine, 260);
  }

  /* ---------------------------------------------------------
     ROUTER
  --------------------------------------------------------- */
  let currentRoute = { name: "home", params: {} };

  function navigate(name, params) {
    currentRoute = { name, params: params || {} };
    render();
    $all(".bn-item").forEach((b) => b.classList.toggle("active", b.dataset.nav === navGroup(name)));
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  function navGroup(name) {
    if (name === "home") return "home";
    if (["cases", "investigation", "report", "score"].includes(name)) return "cases";
    if (["training", "lesson"].includes(name)) return "training";
    if (name === "lab") return "lab";
    if (["archive", "achievements"].includes(name)) return "archive";
    return "";
  }

  function render() {
    const main = $("#mainView");
    main.innerHTML = "";
    const renderers = {
      home: renderHome,
      cases: renderCaseSelection,
      investigation: renderInvestigation,
      report: renderReport,
      score: renderScore,
      training: renderTraining,
      lesson: renderLesson,
      lab: renderLab,
      archive: renderArchive,
      achievements: renderAchievements,
      settings: renderSettings,
    };
    const fn = renderers[currentRoute.name] || renderHome;
    main.appendChild(fn(currentRoute.params));
  }

  function updateTopbar() {
    const rank = getRank(state.xp);
    $("#tbRank").textContent = rank.name;
    $("#tbXp").textContent = fmtXp(state.xp);
    const completed = Object.keys(state.completedCases).length;
    const threatEl = $("#tbThreat");
    let level = "LOW", cls = "pill-ok";
    if (completed >= 2 && completed < 4) { level = "ELEVATED"; cls = "pill-warn"; }
    if (completed >= 4) { level = "GUARDED"; cls = "pill-ok"; }
    threatEl.textContent = level;
    threatEl.className = "tb-value " + cls;
  }

  /* ---------------------------------------------------------
     HOME SCREEN
  --------------------------------------------------------- */
  function renderHome() {
    const rank = getRank(state.xp);
    const nrank = nextRank(state.xp);
    const completed = Object.keys(state.completedCases).length;
    const accuracyVals = Object.values(state.completedCases).map((c) => c.accuracy || 0);
    const avgAccuracy = accuracyVals.length ? Math.round(accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length) : 0;

    const wrap = el("div", {});
    wrap.appendChild(
      el("div", { class: "hero" }, [
        el("div", { class: "hero-eyebrow" }, ["DIGITAL FORENSICS & INCIDENT RESPONSE PLATFORM"]),
        el("h1", { class: "hero-title" }, ["Cyber Incident Simulator"]),
        el("p", { class: "hero-sub" }, [
          "Investigate. Analyze. Respond. A simulated digital forensics environment designed to challenge your cybersecurity investigation skills — every case, log, and address is fictional.",
        ]),
        el("div", { class: "hero-actions" }, [
          el("button", { class: "btn", onclick: () => navigate("cases") }, ["START INVESTIGATION"]),
          el("button", { class: "btn-secondary", onclick: () => navigate("training") }, ["ENTER TRAINING MODE"]),
        ]),
      ])
    );

    const statGrid = el("div", { class: "stat-grid" }, [
      statCard("INVESTIGATOR RANK", rank.name),
      statCard("XP", fmtXp(state.xp) + (nrank ? ` / ${fmtXp(nrank.min)}` : "")),
      statCard("CASES COMPLETED", `${completed} / ${CASES.length}`),
      statCard("AVG. ACCURACY", accuracyVals.length ? avgAccuracy + "%" : "—"),
      statCard("ACHIEVEMENTS", `${state.achievements.length} / ${ACHIEVEMENTS.length}`),
      statCard("SYSTEM STATUS", "ONLINE"),
    ]);
    wrap.appendChild(statGrid);

    const menuGrid = el("div", { class: "menu-grid" }, [
      menuCard("▣", "START INVESTIGATION", "Choose a case and begin analyzing evidence.", () => navigate("cases")),
      menuCard("◎", "TRAINING MODE", "Short lessons covering core security concepts.", () => navigate("training")),
      menuCard("⚗", "CYBER LAB", "Hands-on mini challenges in a safe sandbox.", () => navigate("lab")),
      menuCard("☰", "CASE ARCHIVE", "Review completed and locked cases.", () => navigate("archive")),
      menuCard("🏆", "ACHIEVEMENTS", "Track unlocked badges and milestones.", () => navigate("achievements")),
      menuCard("⚙", "SYSTEM", "Manage progress, sound, and reset options.", () => navigate("settings")),
    ]);
    wrap.appendChild(el("div", { class: "section-gap" }, [menuGrid]));

    wrap.appendChild(el("div", { class: "section-gap panel" }, [
      el("div", { class: "panel-title" }, ["SYSTEM MONITOR"]),
      buildSystemMonitor(),
    ]));

    return wrap;
  }

  function statCard(label, value) {
    return el("div", { class: "stat-card" }, [
      el("div", { class: "label" }, [label]),
      el("div", { class: "value" }, [value]),
    ]);
  }
  function menuCard(icon, title, desc, onclick) {
    return el("button", { class: "menu-card", onclick }, [
      el("span", { class: "mc-icon" }, [icon]),
      el("div", { class: "mc-title" }, [title]),
      el("div", { class: "mc-desc" }, [desc]),
    ]);
  }

  function buildSystemMonitor() {
    const rows = [
      { label: "CPU", value: 12 + Math.round(Math.random() * 20) },
      { label: "RAM", value: 30 + Math.round(Math.random() * 25) },
      { label: "NETWORK", value: 8 + Math.round(Math.random() * 30) },
      { label: "FIREWALL", value: 96 + Math.round(Math.random() * 4) },
      { label: "THREAT LVL", value: Math.min(100, Object.keys(state.completedCases).length * 8 + 10) },
    ];
    const wrap = el("div", {});
    rows.forEach((r) => {
      wrap.appendChild(el("div", { class: "sysmon-row" }, [
        el("span", { class: "sysmon-label" }, [r.label]),
        el("span", { class: "sysmon-track" }, [el("span", { class: "sysmon-fill", style: `width:${r.value}%` })]),
        el("span", { class: "sysmon-val" }, [r.value + "%"]),
      ]));
    });
    wrap.appendChild(el("div", { class: "muted", style: "margin-top:4px;" }, ["Simulated telemetry — for interface demonstration only."]));
    return wrap;
  }

  /* ---------------------------------------------------------
     CASE SELECTION
  --------------------------------------------------------- */
  function isCaseUnlocked(caseObj) {
    if (!caseObj.requires) return true;
    return !!state.completedCases[caseObj.requires];
  }

  function renderCaseSelection() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Case Selection"]),
        el("div", { class: "page-desc" }, ["Choose an incident to investigate. Complete a case to unlock the next."]),
      ]),
    ]));

    const grid = el("div", { class: "case-grid" });
    CASES.forEach((c) => {
      const unlocked = isCaseUnlocked(c);
      const completed = state.completedCases[c.id];
      const diffClass = "badge-" + c.difficulty.toLowerCase();
      const card = el("div", { class: "case-card" + (unlocked ? "" : " locked") }, [
        el("div", { class: "case-card-top" }, [
          el("span", { class: "case-code" }, ["CASE #" + c.code]),
          el("span", { class: "badge " + diffClass }, [c.difficulty.toUpperCase()]),
        ]),
        el("div", { class: "case-title" }, [c.title]),
        el("div", { class: "case-tagline" }, [c.tagline]),
        el("div", { class: "case-foot" }, [
          el("span", {}, [unlocked ? (completed ? "COMPLETED · " + completed.accuracy + "%" : "READY") : "🔒 LOCKED"]),
          completed ? el("span", { class: "case-progress-dot" }) : el("span", {}, [unlocked ? "ENTER →" : ""]),
        ]),
      ]);
      if (unlocked) {
        card.addEventListener("click", () => { playSound("click"); navigate("investigation", { caseId: c.id }); });
      } else {
        card.title = "Complete " + c.requires + " to unlock this case.";
      }
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------------------------------------------------
     INVESTIGATION WORKSPACE
  --------------------------------------------------------- */
  const EVIDENCE_TABS = [
    { key: "email", label: "Email" },
    { key: "network", label: "Network Logs" },
    { key: "userlogs", label: "User Logs" },
    { key: "filesystem", label: "File System" },
    { key: "dns", label: "DNS Logs" },
    { key: "firewall", label: "Firewall" },
    { key: "browser", label: "Browser" },
    { key: "timeline", label: "Timeline" },
    { key: "network-map", label: "Network Map" },
    { key: "threat", label: "Threat Analysis" },
    { key: "notes", label: "Notes" },
  ];

  let activeTab = "email";

  function getCaseProgress(caseId) {
    if (!state.caseProgress[caseId]) {
      state.caseProgress[caseId] = { foundClues: [], viewedEvidence: [], startedAt: Date.now() };
    }
    return state.caseProgress[caseId];
  }

  function markClueFound(caseObj, clue) {
    const prog = getCaseProgress(caseObj.id);
    if (prog.foundClues.includes(clue.id)) return;
    prog.foundClues.push(clue.id);
    saveState();
    addXp(clue.xp);
    toast("🔎", `Clue discovered: ${clue.text} (+${clue.xp} XP)`);
    playSound("notification");
    checkAchievements();
  }

  function markEvidenceViewed(caseObj, ref) {
    const prog = getCaseProgress(caseObj.id);
    if (!prog.viewedEvidence.includes(ref)) {
      prog.viewedEvidence.push(ref);
      saveState();
    }
    // Any clue tied to this evidence ref becomes discoverable
    caseObj.clues.filter((c) => c.ref === ref).forEach((c) => markClueFound(caseObj, c));
  }

  function renderInvestigation(params) {
    const caseObj = CASES.find((c) => c.id === (params && params.caseId));
    if (!caseObj || !isCaseUnlocked(caseObj)) {
      const wrap = el("div", {});
      wrap.appendChild(el("div", { class: "panel" }, ["Case not available. "]));
      return wrap;
    }
    getCaseProgress(caseObj.id);
    if (!EVIDENCE_TABS.find((t) => t.key === activeTab)) activeTab = "email";

    const wrap = el("div", {});
    wrap.appendChild(el("button", { class: "back-link", onclick: () => navigate("cases") }, ["← Back to Case Selection"]));

    const tlColor = { LOW: "pill-ok", MEDIUM: "pill-warn", HIGH: "pill-danger", CRITICAL: "pill-danger" }[caseObj.threatLevel] || "pill-ok";
    wrap.appendChild(el("div", { class: "case-topbar" }, [
      el("div", { class: "ct-title" }, [`CASE #${caseObj.code} — ${caseObj.title.toUpperCase()}`]),
      el("span", { class: "threat-level-tag " + tlColor }, ["THREAT LEVEL: " + caseObj.threatLevel]),
    ]));

    const progress = getCaseProgress(caseObj.id);
    wrap.appendChild(el("div", { class: "progress-summary" }, [
      el("span", { class: "progress-chip" }, [`Clues: ${progress.foundClues.length}/${caseObj.clues.length}`]),
      el("span", { class: "progress-chip" }, [`Evidence viewed: ${progress.viewedEvidence.length}`]),
      el("span", { class: "progress-chip" }, [`Confidence: ${caseObj.threatAnalysis.confidence}%`]),
    ]));

    const layout = el("div", { class: "investigation-layout" });
    const nav = el("div", { class: "evidence-nav" });
    EVIDENCE_TABS.forEach((t) => {
      const count = evidenceCount(caseObj, t.key);
      const item = el("div", { class: "evidence-nav-item" + (activeTab === t.key ? " active" : "") }, [
        el("span", {}, [t.label]),
        count != null ? el("span", { class: "count" }, [String(count)]) : null,
      ]);
      item.addEventListener("click", () => { activeTab = t.key; playSound("click"); render(); });
      nav.appendChild(item);
    });
    layout.appendChild(nav);

    const workspace = el("div", { class: "workspace-panel panel" });
    workspace.appendChild(buildEvidenceTabContent(caseObj, activeTab));
    layout.appendChild(workspace);

    wrap.appendChild(layout);

    const submitRow = el("div", { class: "section-gap", style: "display:flex; justify-content:flex-end;" }, [
      el("button", { class: "btn", onclick: () => navigate("report", { caseId: caseObj.id }) }, ["SUBMIT INVESTIGATION REPORT →"]),
    ]);
    wrap.appendChild(submitRow);

    return wrap;
  }

  function evidenceCount(caseObj, key) {
    const ev = caseObj.evidence;
    if (key === "email") return ev.email.length;
    if (key === "network") return ev.network.length;
    if (key === "userlogs") return ev.userlogs.length;
    if (key === "filesystem") return Object.keys(ev.filesystem.files).length;
    if (key === "dns") return ev.dns.length;
    if (key === "firewall") return ev.firewall.length;
    if (key === "browser") return ev.browser.length;
    if (key === "timeline") return caseObj.timeline.length;
    return null;
  }

  function buildEvidenceTabContent(caseObj, tab) {
    switch (tab) {
      case "email": return buildEmailTab(caseObj);
      case "network": return buildLogTab(caseObj, "network", ["time", "src", "dst", "note"]);
      case "userlogs": return buildLogTab(caseObj, "userlogs", ["time", "user", "event", "detail"]);
      case "filesystem": return buildFilesystemTab(caseObj);
      case "dns": return buildLogTab(caseObj, "dns", ["time", "query"]);
      case "firewall": return buildFirewallTab(caseObj);
      case "browser": return buildLogTab(caseObj, "browser", ["time", "url", "note"]);
      case "timeline": return buildTimelineTab(caseObj);
      case "network-map": return buildNetworkMapTab(caseObj);
      case "threat": return buildThreatTab(caseObj);
      case "notes": return buildNotesTab(caseObj);
      default: return el("div", {}, ["Select a category."]);
    }
  }

  function buildEmailTab(caseObj) {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["EMAIL EVIDENCE"]));
    if (!caseObj.evidence.email.length) {
      wrap.appendChild(el("div", { class: "muted" }, ["No email evidence collected for this case."]));
      return wrap;
    }
    caseObj.evidence.email.forEach((mail) => {
      const card = el("div", { class: "email-card", style: "margin-bottom:12px; cursor:pointer;" }, [
        el("div", { class: "email-meta" }, [el("b", {}, ["From: "]), mail.from]),
        el("div", { class: "email-meta" }, [el("b", {}, ["To: "]), mail.to]),
        el("div", { class: "email-meta" }, [el("b", {}, ["Subject: "]), mail.subject, "  ·  " + mail.time]),
        el("div", { class: "email-body" }, [mail.body]),
      ]);
      card.addEventListener("click", () => openEvidenceModalForMail(caseObj, mail));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function openEvidenceModalForMail(caseObj, mail) {
    markEvidenceViewed(caseObj, mail.id);
    const body = el("div", {}, [
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Subject"]), el("span", { class: "mv" }, [mail.subject])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["From"]), el("span", { class: "mv" }, [mail.from])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Received"]), el("span", { class: "mv" }, [mail.time])]),
      el("span", { class: "status-pill status-" + mail.status.toLowerCase() }, [mail.status]),
      el("div", { class: "section-gap" }, [
        el("div", { class: "panel-title" }, ["INDICATORS"]),
        el("ul", { class: "indicator-list" }, mail.indicators.map((i) => el("li", {}, ["⚠ " + i]))),
      ]),
    ]);
    openEvidenceModal(body);
  }

  function buildLogTab(caseObj, key, cols) {
    const rows = caseObj.evidence[key];
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, [EVIDENCE_TABS.find((t) => t.key === key).label.toUpperCase()]));
    if (!rows.length) { wrap.appendChild(el("div", { class: "muted" }, ["No entries recorded."])); return wrap; }

    const filterInput = el("input", { placeholder: "Filter logs…", type: "text" });
    wrap.appendChild(el("div", { class: "log-toolbar" }, [filterInput]));

    const list = el("div", { class: "evidence-list" });
    function draw(filterText) {
      list.innerHTML = "";
      const ft = (filterText || "").toLowerCase();
      rows
        .filter((r) => !ft || cols.some((c) => String(r[c] || "").toLowerCase().includes(ft)))
        .forEach((r, idx) => {
          const rowId = key + "-" + idx;
          const row = el("div", { class: "evidence-row" + (r.suspicious ? " suspicious" : "") }, [
            el("span", { class: "row-time" }, [r.time || ""]),
            el("span", { class: "row-main" }, [cols.filter((c) => c !== "time").map((c) => r[c]).join("  ·  ")]),
            r.suspicious ? el("span", { class: "flag-tag" }, ["FLAGGED"]) : null,
          ]);
          row.addEventListener("click", () => openLogModal(caseObj, key, r, rowId));
          list.appendChild(row);
        });
      if (!list.children.length) list.appendChild(el("div", { class: "muted" }, ["No matching entries."]));
    }
    filterInput.addEventListener("input", (e) => draw(e.target.value));
    draw("");
    wrap.appendChild(list);
    return wrap;
  }

  function openLogModal(caseObj, key, row, rowId) {
    markEvidenceViewed(caseObj, key);
    const body = el("div", {});
    Object.entries(row).forEach(([k, v]) => {
      if (k === "suspicious") return;
      body.appendChild(el("div", { class: "meta-row" }, [el("span", { class: "mk" }, [k]), el("span", { class: "mv" }, [String(v)])]));
    });
    if (row.suspicious) {
      body.appendChild(el("span", { class: "status-pill status-suspicious", style: "margin-top:12px;" }, ["FLAGGED AS SUSPICIOUS"]));
    } else {
      body.appendChild(el("span", { class: "status-pill status-clean", style: "margin-top:12px;" }, ["ROUTINE ACTIVITY"]));
    }
    openEvidenceModal(body);
  }

  function buildFirewallTab(caseObj) {
    return buildLogTab(caseObj, "firewall", ["time", "source", "destination", "action"]);
  }

  function buildFilesystemTab(caseObj) {
    const fs = caseObj.evidence.filesystem;
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["FILE SYSTEM"]));
    const tree = el("div", { class: "filesystem-tree" });
    tree.appendChild(el("div", {}, ["/root"]));
    fs.tree.forEach((item) => {
      const isFile = !!fs.files[item];
      const line = el("div", { class: "fs-item", style: "padding-left:18px;" }, [(isFile ? "├── " : "├── ") + item + (isFile ? "" : "/")]);
      if (isFile) line.addEventListener("click", () => openFileModal(caseObj, item));
      tree.appendChild(line);
    });
    wrap.appendChild(tree);
    wrap.appendChild(el("div", { class: "muted section-gap" }, ["Click a file to view its forensic metadata."]));
    return wrap;
  }

  function openFileModal(caseObj, filename) {
    markEvidenceViewed(caseObj, "filesystem");
    const meta = caseObj.evidence.filesystem.files[filename];
    const body = el("div", {}, [
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["File"]), el("span", { class: "mv" }, [filename])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Type"]), el("span", { class: "mv" }, [meta.type])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Created"]), el("span", { class: "mv" }, [meta.created])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Modified"]), el("span", { class: "mv" }, [meta.modified])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["SHA-256"]), el("span", { class: "mv" }, [meta.hash])]),
      el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Source"]), el("span", { class: "mv" }, [meta.source])]),
      el("span", { class: "status-pill status-" + meta.status.toLowerCase() }, [meta.status]),
      el("div", { class: "section-gap" }, [
        el("div", { class: "panel-title" }, ["INDICATORS"]),
        el("ul", { class: "indicator-list" }, meta.indicators.map((i) => el("li", {}, ["⚠ " + i]))),
      ]),
    ]);
    openEvidenceModal(body);
  }

  function buildTimelineTab(caseObj) {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["INCIDENT TIMELINE"]));
    const tl = el("div", { class: "timeline" });
    caseObj.timeline.forEach((item) => {
      const node = el("div", { class: "timeline-item" }, [
        el("div", { class: "timeline-time" }, [item.time]),
        el("div", { class: "timeline-title" }, [item.title]),
        el("div", { class: "timeline-desc" }, [item.desc]),
      ]);
      node.addEventListener("click", () => {
        markEvidenceViewed(caseObj, item.ref);
        openEvidenceModal(el("div", {}, [
          el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Time"]), el("span", { class: "mv" }, [item.time])]),
          el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Event"]), el("span", { class: "mv" }, [item.title])]),
          el("p", { class: "section-gap" }, [item.desc]),
        ]));
      });
      tl.appendChild(node);
    });
    wrap.appendChild(tl);
    return wrap;
  }

  function buildNetworkMapTab(caseObj) {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["NETWORK MAP"]));
    const nm = caseObj.networkMap;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 62.5");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    function nodeXY(id) {
      const n = nm.nodes.find((x) => x.id === id);
      return [n.x, n.y * 0.625];
    }
    nm.edges.forEach((edge) => {
      const [x1, y1] = nodeXY(edge.from);
      const [x2, y2] = nodeXY(edge.to);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("class", "nm-edge" + (edge.suspicious ? " suspicious" : ""));
      svg.appendChild(line);
    });
    const typeColor = { cloud: "#748497", firewall: "#eda94a", host: "#49d3c8", server: "#8d8ff2", danger: "#e9585f" };
    nm.nodes.forEach((n) => {
      const [x, y] = [n.x, n.y * 0.625];
      const g = document.createElementNS(svgNS, "g");
      g.style.cursor = "pointer";
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", x); circle.setAttribute("cy", y); circle.setAttribute("r", n.type === "cloud" ? 3 : 3.6);
      circle.setAttribute("fill", "#0c1117");
      circle.setAttribute("stroke", typeColor[n.type] || "#49d3c8");
      circle.setAttribute("stroke-width", "1.4");
      g.appendChild(circle);
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x); label.setAttribute("y", y + 6.4);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "nm-node-label");
      label.setAttribute("font-size", "2.6");
      label.textContent = n.label;
      g.appendChild(label);
      g.addEventListener("click", () => {
        markEvidenceViewed(caseObj, "network");
        openEvidenceModal(el("div", {}, [
          el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Node"]), el("span", { class: "mv" }, [n.label])]),
          el("div", { class: "meta-row" }, [el("span", { class: "mk" }, ["Type"]), el("span", { class: "mv" }, [n.type])]),
          el("p", { class: "section-gap muted" }, [n.type === "danger" ? "This host shows indicators consistent with attacker infrastructure." : "Simulated network asset."]),
        ]));
      });
      svg.appendChild(g);
    });

    const netmapWrap = el("div", { class: "netmap-wrap" }, []);
    netmapWrap.appendChild(svg);
    wrap.appendChild(netmapWrap);
    wrap.appendChild(el("div", { class: "muted section-gap" }, ["Red dashed paths indicate suspicious traffic flow. Click a node for details. All hosts are simulated."]));
    return wrap;
  }

  function buildThreatTab(caseObj) {
    const t = caseObj.threatAnalysis;
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["THREAT ANALYSIS"]));
    const grid = el("div", { class: "threat-grid" }, [
      threatField("Attack Category", t.category),
      threatField("Initial Access", t.initialAccess),
      threatField("Persistence", t.persistence),
      threatField("Privilege Escalation", t.privilegeEscalation),
      threatField("Data Access", t.dataAccess),
      threatField("Exfiltration", t.exfiltration),
    ]);
    wrap.appendChild(grid);
    wrap.appendChild(el("div", { class: "section-gap" }, [
      el("div", { class: "tf-label", style: "font-family:var(--font-mono); font-size:11px; color:var(--text-2);" }, ["CONFIDENCE"]),
      el("div", { class: "confidence-bar-track" }, [el("div", { class: "confidence-bar-fill", style: `width:${t.confidence}%` })]),
      el("div", { class: "muted", style: "margin-top:6px;" }, [t.confidence + "% confidence based on evidence gathered so far."]),
    ]));
    wrap.appendChild(el("div", { class: "section-gap" }, [
      el("div", { class: "panel-title" }, ["ATTACK CHAIN"]),
      buildAttackChain(caseObj),
    ]));
    return wrap;
  }

  function threatField(label, value) {
    return el("div", { class: "threat-field" }, [
      el("div", { class: "tf-label" }, [label.toUpperCase()]),
      el("div", { class: "tf-value" }, [value]),
    ]);
  }

  function buildAttackChain(caseObj) {
    const progress = getCaseProgress(caseObj.id);
    const unlockedCount = Math.max(1, Math.ceil((progress.foundClues.length / Math.max(1, caseObj.clues.length)) * caseObj.attackChain.length));
    const wrap = el("div", { class: "attack-chain" });
    caseObj.attackChain.forEach((stage, i) => {
      const unlocked = i < unlockedCount;
      wrap.appendChild(el("div", { class: "chain-step" + (unlocked ? " unlocked" : "") }, [
        el("span", { class: "chain-dot" }),
        el("span", { class: "chain-label" }, [stage]),
      ]));
      if (i < caseObj.attackChain.length - 1) wrap.appendChild(el("div", { class: "chain-connector" }));
    });
    return wrap;
  }

  function buildNotesTab(caseObj) {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "panel-title" }, ["INVESTIGATOR NOTES"]));
    const ta = el("textarea", { class: "notes-textarea", placeholder: "Record your observations here…" });
    ta.value = state.notes[caseObj.id] || "";
    ta.addEventListener("input", () => {
      state.notes[caseObj.id] = ta.value;
      saveState();
    });
    wrap.appendChild(ta);
    wrap.appendChild(el("div", { class: "muted", style: "margin-top:8px;" }, ["Notes are saved automatically to this device."]));
    return wrap;
  }

  function openEvidenceModal(bodyNode) {
    const modal = $("#evidenceModal");
    const body = $("#evidenceModalBody");
    body.innerHTML = "";
    body.appendChild(bodyNode);
    modal.classList.remove("hidden");
    playSound("click");
  }

  /* ---------------------------------------------------------
     FINAL REPORT
  --------------------------------------------------------- */
  let reportAnswers = {};

  function renderReport(params) {
    const caseObj = CASES.find((c) => c.id === (params && params.caseId));
    if (!caseObj) return el("div", { class: "panel" }, ["Case not found."]);
    reportAnswers = {};

    const wrap = el("div", {});
    wrap.appendChild(el("button", { class: "back-link", onclick: () => navigate("investigation", { caseId: caseObj.id }) }, ["← Back to Investigation"]));
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Final Investigation Report"]),
        el("div", { class: "page-desc" }, [`CASE #${caseObj.code} — ${caseObj.title}`]),
      ]),
    ]));

    const panel = el("div", { class: "panel" });
    caseObj.questions.forEach((q, qi) => {
      const qWrap = el("div", { class: "report-q" });
      qWrap.appendChild(el("div", { class: "rq-title" }, [`${qi + 1}. ${q.q}`]));
      const opts = el("div", { class: "report-options" });
      q.options.forEach((opt, oi) => {
        const row = el("label", { class: "report-option" }, [
          el("input", { type: "radio", name: "q" + qi, value: String(oi) }),
          el("span", {}, [opt]),
        ]);
        row.querySelector("input").addEventListener("change", () => {
          reportAnswers[qi] = oi;
          $all(".report-option", qWrap).forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
        });
        opts.appendChild(row);
      });
      qWrap.appendChild(opts);
      panel.appendChild(qWrap);
    });

    const submitBtn = el("button", { class: "btn" }, ["SUBMIT REPORT"]);
    submitBtn.addEventListener("click", () => {
      if (Object.keys(reportAnswers).length < caseObj.questions.length) {
        toast("⚠", "Please answer every question before submitting.");
        return;
      }
      const result = scoreReport(caseObj);
      navigate("score", { caseId: caseObj.id, result });
    });
    panel.appendChild(submitBtn);
    wrap.appendChild(panel);
    return wrap;
  }

  function scoreReport(caseObj) {
    let correct = 0;
    caseObj.questions.forEach((q, qi) => { if (reportAnswers[qi] === q.correct) correct++; });
    const accuracy = Math.round((correct / caseObj.questions.length) * 100);
    const progress = getCaseProgress(caseObj.id);
    const evidenceFound = progress.viewedEvidence.length;
    const totalEvidence = countTotalEvidence(caseObj);
    const cluesFound = progress.foundClues.length;
    const timeSeconds = Math.max(1, Math.round((Date.now() - (progress.startedAt || Date.now())) / 1000));
    const xpEarned = Math.round(caseObj.xpReward * (accuracy / 100)) + cluesFound * 5;

    const wasFirstCompletion = !state.completedCases[caseObj.id];
    state.completedCases[caseObj.id] = {
      score: correct, accuracy, evidenceFound, totalEvidence, cluesFound,
      totalClues: caseObj.clues.length, timeSeconds, completedAt: Date.now(),
    };
    saveState();
    addXp(xpEarned);
    if (accuracy === 100) unlockAchievement("perfect-analysis");
    if (timeSeconds < 300) unlockAchievement("fast-investigator");
    checkAchievements();

    return { correct, accuracy, evidenceFound, totalEvidence, cluesFound, totalClues: caseObj.clues.length, timeSeconds, xpEarned, wasFirstCompletion };
  }

  function countTotalEvidence(caseObj) {
    const ev = caseObj.evidence;
    return ev.email.length + ev.network.length + ev.userlogs.length + Object.keys(ev.filesystem.files).length + ev.dns.length + ev.firewall.length + ev.browser.length;
  }

  /* ---------------------------------------------------------
     SCORE SCREEN
  --------------------------------------------------------- */
  function renderScore(params) {
    const caseObj = CASES.find((c) => c.id === (params && params.caseId));
    const result = (params && params.result) || (caseObj && state.completedCases[caseObj.id]);
    if (!caseObj || !result) return el("div", { class: "panel" }, ["No result available."]);

    const rank = getRank(state.xp);
    const mm = Math.floor((result.timeSeconds || 0) / 60);
    const ss = String((result.timeSeconds || 0) % 60).padStart(2, "0");

    const frame = el("div", { class: "score-frame" }, [
      el("h2", {}, ["INVESTIGATION COMPLETE"]),
      el("div", { class: "case-name" }, [`CASE #${caseObj.code} — ${caseObj.title}`]),
      el("div", { class: "score-metric" }, [el("span", {}, ["Accuracy"]), el("span", {}, [result.accuracy + "%"])]),
      el("div", { class: "score-metric" }, [el("span", {}, ["Evidence Found"]), el("span", {}, [`${result.evidenceFound}/${result.totalEvidence}`])]),
      el("div", { class: "score-metric" }, [el("span", {}, ["Clues Found"]), el("span", {}, [`${result.cluesFound}/${result.totalClues}`])]),
      el("div", { class: "score-metric" }, [el("span", {}, ["Time"]), el("span", {}, [`${mm}:${ss}`])]),
      el("div", { class: "score-xp" }, ["XP EARNED: +" + fmtXp(result.xpEarned || 0)]),
      el("div", { class: "score-rank" }, ["RANK: " + rank.name]),
      el("div", { class: "hero-actions", style: "justify-content:center; margin-top:22px;" }, [
        el("button", { class: "btn-secondary", onclick: () => navigate("archive") }, ["CASE ARCHIVE"]),
        el("button", { class: "btn", onclick: () => navigate("cases") }, ["NEXT CASE →"]),
      ]),
    ]);
    playSound("success");
    const wrap = el("div", {}, [frame]);
    return wrap;
  }

  /* ---------------------------------------------------------
     TRAINING MODE
  --------------------------------------------------------- */
  const PASS_THRESHOLD = 0.7; // 70% required to complete a topic

  function renderTraining() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Training Mode"]),
        el("div", { class: "page-desc" }, [`${state.trainingCompleted.length}/${TRAINING_TOPICS.length} modules completed  ·  ${TRAINING_TOPICS[0].questions.length}-question quiz per module`]),
      ]),
    ]));

    const allComplete = state.trainingCompleted.length >= TRAINING_TOPICS.length;
    if (allComplete) {
      wrap.appendChild(el("div", { class: "panel", style: "border-color:var(--green); box-shadow:0 0 30px rgba(87,207,143,0.14); margin-bottom:18px;" }, [
        el("div", { class: "panel-title", style: "color:var(--green);" }, ["ALL MODULES COMPLETE"]),
        el("p", { style: "margin-bottom:14px;" }, [
          "You've completed every training module in the Cyber Incident Simulator curriculum. Your certificate of completion is ready to generate.",
        ]),
        el("button", { class: "btn", onclick: openCertificateModal }, ["🎓 DOWNLOAD CERTIFICATE"]),
      ]));
    }

    const grid = el("div", { class: "training-grid" });
    TRAINING_TOPICS.forEach((t) => {
      const done = state.trainingCompleted.includes(t.id);
      const best = state.trainingScores && state.trainingScores[t.id];
      const card = el("div", { class: "training-card" }, [
        el("div", { class: "tc-title" }, [t.title]),
        el("div", { class: "tc-status" }, [done ? `✓ COMPLETED · ${best != null ? best + "%" : ""}` : `NOT STARTED · ${t.questions.length} QUESTIONS`]),
      ]);
      card.addEventListener("click", () => navigate("lesson", { topicId: t.id }));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function renderLesson(params) {
    const topic = TRAINING_TOPICS.find((t) => t.id === (params && params.topicId));
    if (!topic) return el("div", { class: "panel" }, ["Lesson not found."]);
    const wrap = el("div", {});
    wrap.appendChild(el("button", { class: "back-link", onclick: () => navigate("training") }, ["← Back to Training"]));
    const panel = el("div", { class: "panel" });
    panel.appendChild(el("div", { class: "panel-title" }, [topic.title.toUpperCase()]));
    panel.appendChild(el("p", { style: "margin-bottom:14px;" }, [topic.explanation]));
    panel.appendChild(el("div", { class: "muted", style: "margin-bottom:20px;" }, ["Example: " + topic.example]));

    const quizHost = el("div", {});
    panel.appendChild(quizHost);
    wrap.appendChild(panel);

    let qIndex = 0;
    let correctCount = 0;
    let selected = null;

    function drawQuestion() {
      quizHost.innerHTML = "";
      const q = topic.questions[qIndex];
      quizHost.appendChild(el("div", { class: "muted", style: "margin-bottom:8px;" }, [`Question ${qIndex + 1} of ${topic.questions.length}`]));
      const qWrap = el("div", { class: "report-q" });
      qWrap.appendChild(el("div", { class: "rq-title" }, [q.q]));
      const opts = el("div", { class: "report-options" });
      selected = null;
      q.options.forEach((opt, oi) => {
        const row = el("label", { class: "report-option" }, [
          el("input", { type: "radio", name: "lesson-q", value: String(oi) }),
          el("span", {}, [opt]),
        ]);
        row.querySelector("input").addEventListener("change", () => {
          selected = oi;
          $all(".report-option", qWrap).forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
        });
        opts.appendChild(row);
      });
      qWrap.appendChild(opts);
      quizHost.appendChild(qWrap);

      const feedback = el("div", { class: "section-gap muted" }, []);
      const btn = el("button", { class: "btn" }, [qIndex === topic.questions.length - 1 ? "FINISH QUIZ" : "NEXT QUESTION"]);
      let answered = false;
      btn.addEventListener("click", () => {
        if (!answered) {
          if (selected == null) { toast("⚠", "Select an answer first."); return; }
          answered = true;

          // Lock the question: disable further selection and reveal correct/incorrect states
          const rows = $all(".report-option", qWrap);
          rows.forEach((r, oi) => {
            const inputEl = r.querySelector("input");
            inputEl.disabled = true;
            r.classList.add("locked");
            if (oi === q.correct) r.classList.add("correct");
            else if (oi === selected) r.classList.add("incorrect");
          });

          if (selected === q.correct) {
            correctCount++;
            feedback.textContent = "✓ Correct — " + q.explanation;
            feedback.style.color = "var(--green)";
            playSound("success");
          } else {
            feedback.textContent = "✗ Not quite — " + q.explanation;
            feedback.style.color = "var(--red)";
            playSound("error");
          }
          btn.textContent = qIndex === topic.questions.length - 1 ? "SEE RESULTS →" : "NEXT →";
          return;
        }
        if (qIndex < topic.questions.length - 1) {
          qIndex++;
          drawQuestion();
        } else {
          finishQuiz();
        }
      });
      quizHost.appendChild(btn);
      quizHost.appendChild(feedback);
    }

    function finishQuiz() {
      const pct = Math.round((correctCount / topic.questions.length) * 100);
      const passed = correctCount / topic.questions.length >= PASS_THRESHOLD;
      quizHost.innerHTML = "";
      quizHost.appendChild(el("div", { class: "panel-title" }, ["QUIZ RESULTS"]));
      quizHost.appendChild(el("div", { style: "font-family:var(--font-mono); font-size:28px; font-weight:700; color:" + (passed ? "var(--green)" : "var(--amber)") + ";" }, [pct + "%"]));
      quizHost.appendChild(el("div", { class: "muted", style: "margin-bottom:16px;" }, [`${correctCount}/${topic.questions.length} correct — ${passed ? "passed" : "needs 70% to pass"}`]));

      if (!state.trainingScores) state.trainingScores = {};
      const prevBest = state.trainingScores[topic.id] || 0;
      state.trainingScores[topic.id] = Math.max(prevBest, pct);

      if (passed) {
        if (!state.trainingCompleted.includes(topic.id)) {
          state.trainingCompleted.push(topic.id);
          addXp(60 + Math.round(correctCount * 6));
          toast("◎", `Module complete (+${60 + Math.round(correctCount * 6)} XP)`);
          checkAchievements();
        }
        saveState();
        const actions = el("div", { class: "hero-actions" }, [
          el("button", { class: "btn-secondary", onclick: () => navigate("training") }, ["BACK TO TRAINING"]),
        ]);
        if (state.trainingCompleted.length >= TRAINING_TOPICS.length) {
          actions.appendChild(el("button", { class: "btn", onclick: openCertificateModal }, ["🎓 DOWNLOAD CERTIFICATE"]));
        }
        quizHost.appendChild(actions);
      } else {
        saveState();
        const retryBtn = el("button", { class: "btn" }, ["RETRY QUIZ"]);
        retryBtn.addEventListener("click", () => { qIndex = 0; correctCount = 0; drawQuestion(); });
        quizHost.appendChild(el("div", { class: "hero-actions" }, [
          retryBtn,
          el("button", { class: "btn-secondary", onclick: () => navigate("training") }, ["BACK TO TRAINING"]),
        ]));
      }
    }

    drawQuestion();
    return wrap;
  }

  /* ---------------------------------------------------------
     CERTIFICATE OF COMPLETION
  --------------------------------------------------------- */
  let certBgImage = null;
  let certBgImagePromise = null;
  function loadCertBgImage() {
    if (certBgImagePromise) return certBgImagePromise;
    certBgImagePromise = new Promise((resolve) => {
      if (typeof CERTIFICATE_BG_DATA_URI === "undefined") { resolve(null); return; }
      const img = new Image();
      img.onload = () => { certBgImage = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = CERTIFICATE_BG_DATA_URI;
    });
    return certBgImagePromise;
  }

  function openCertificateModal() {
    const modal = $("#certificateModal");
    const nameInput = $("#certificateNameInput");
    nameInput.value = state.certificateName || "";
    modal.classList.remove("hidden");
    setTimeout(() => nameInput.focus(), 50);
    loadCertBgImage();
  }

  function closeCertificateModal() {
    $("#certificateModal").classList.add("hidden");
  }

  function generateCertificate() {
    const nameInput = $("#certificateNameInput");
    const name = nameInput.value.trim();
    if (!name) { toast("⚠", "Enter the name to print on the certificate."); return; }
    state.certificateName = name;
    saveState();
    toast("🎓", "Generating certificate…");
    Promise.all([document.fonts.ready, loadCertBgImage()]).then(() => {
      drawCertificateCanvas(name);
      toast("🎓", "Certificate downloaded.");
      playSound("success");
    });
    closeCertificateModal();
  }

  function certificateId() {
    const raw = (state.certificateName || "INVESTIGATOR") + state.xp + Object.keys(state.completedCases).length;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) { hash = (hash * 31 + raw.charCodeAt(i)) >>> 0; }
    return "CIS-" + hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
  }

  function drawCertificateCanvas(name) {
    // Canvas mirrors the uploaded template's proportions (2000x1176 scaled to 1600x940)
    // so the content panel and badge coordinates below line up with the artwork.
    const W = 1600, H = 940;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const GREEN = "#0e7a4d";       // deep green — reads on the light panel
    const GREEN_BRIGHT = "#57cf8f"; // bright green — reads on the dark photo side
    const RED = "#c23640";
    const TEXT_DARK = "#161f1b";
    const DIM_DARK = "#5c6b65";
    const TEXT_LIGHT = "#f2faf6";
    const DIM_LIGHT = "#c6ddd1";

    /* ---------- background template (cover-fit) ---------- */
    if (certBgImage) {
      ctx.drawImage(certBgImage, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#e3e1de";
      ctx.fillRect(0, 0, W, H);
    }

    /* ---------- badge medallion monogram (measured from the template art) ---------- */
    const badgeCX = 246, badgeCY = 150;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = GREEN;
    ctx.font = "700 46px 'IBM Plex Mono', monospace";
    ctx.fillText("SC", badgeCX, badgeCY - 6);
    ctx.fillStyle = "#3a4a43";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText("VERIFIED", badgeCX, badgeCY + 26);
    ctx.restore();
    ctx.textBaseline = "alphabetic";

    /* ---------- brand mark, upper-left over the photo ---------- */
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = "700 22px 'IBM Plex Mono', monospace";
    ctx.fillText("◈ SHADOW CREATION", 36, 640);
    ctx.fillStyle = "rgba(230,245,238,0.92)";
    ctx.font = "400 12.5px 'IBM Plex Mono', monospace";
    ctx.fillText("CYBER INCIDENT SIMULATOR — TRAINING DIVISION", 36, 660);
    ctx.shadowBlur = 0;

    /* ---------- content panel (measured from the template art) ---------- */
    const X0 = 530;   // left inset inside the light panel
    const XR = 1508;  // right inset inside the light panel
    const panelTop = 55;

    // certification number, top right of panel
    ctx.textAlign = "right";
    ctx.fillStyle = DIM_DARK;
    ctx.font = "600 12.5px 'IBM Plex Mono', monospace";
    ctx.fillText("CERTIFICATION NUMBER", XR, panelTop + 30);
    ctx.fillStyle = GREEN;
    ctx.font = "700 16px 'IBM Plex Mono', monospace";
    ctx.fillText(certificateId(), XR, panelTop + 50);

    // heading
    ctx.textAlign = "left";
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "700 22px 'IBM Plex Mono', monospace";
    ctx.fillText("CYBER INCIDENT SIMULATOR", X0, panelTop + 40);
    ctx.fillStyle = DIM_DARK;
    ctx.font = "italic 400 13.5px 'IBM Plex Sans', sans-serif";
    ctx.fillText("Every clue tells a story — investigate it.", X0, panelTop + 61);

    ctx.strokeStyle = "rgba(14,122,77,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, panelTop + 78); ctx.lineTo(XR, panelTop + 78); ctx.stroke();

    // acknowledgement + name
    ctx.fillStyle = DIM_DARK;
    ctx.font = "italic 400 18px 'IBM Plex Sans', sans-serif";
    ctx.fillText("This is to acknowledge that", X0, panelTop + 120);

    ctx.fillStyle = GREEN;
    ctx.font = "700 46px 'IBM Plex Mono', monospace";
    ctx.fillText(name, X0, panelTop + 182);
    const nameW = Math.min(ctx.measureText(name).width, XR - X0);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X0, panelTop + 196); ctx.lineTo(X0 + nameW, panelTop + 196); ctx.stroke();

    // completion heading
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "700 23px 'IBM Plex Mono', monospace";
    ctx.fillText("CERTIFICATE OF COMPLETION", X0, panelTop + 235);
    ctx.fillStyle = GREEN;
    ctx.font = "600 13px 'IBM Plex Mono', monospace";
    ctx.fillText("CYBERSECURITY & DIGITAL FORENSICS TRAINING PROGRAM", X0, panelTop + 256);

    // description paragraph
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "400 14px 'IBM Plex Sans', sans-serif";
    const paraLines = [
      `for successfully completing all ${TRAINING_TOPICS.length} training modules and passing every applied`,
      "assessment on phishing, social engineering, network defense, malware analysis, digital",
      "forensics, incident response, cryptography, authentication, firewalls, IDS/IPS, and secure",
      "coding — verified through simulated case investigations administered by Shadow Creation.",
    ];
    paraLines.forEach((line, i) => ctx.fillText(line, X0, panelTop + 285 + i * 20));

    // credentials id
    ctx.fillStyle = DIM_DARK;
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText("CREDENTIALS ID", X0, panelTop + 400);
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "700 14.5px 'IBM Plex Mono', monospace";
    ctx.fillText(certificateId() + "-" + Math.abs(state.xp).toString(16).toUpperCase().padStart(4, "0"), X0 + 128, panelTop + 400);

    ctx.strokeStyle = "rgba(14,122,77,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, panelTop + 417); ctx.lineTo(XR, panelTop + 417); ctx.stroke();

    // module checklist — 3 columns
    const cols = 3;
    const colW = (XR - X0) / cols;
    const rowH = 25;
    const gridTop = panelTop + 444;
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    TRAINING_TOPICS.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = X0 + col * colW;
      const y = gridTop + row * rowH;
      ctx.fillStyle = GREEN;
      ctx.fillText("✓", x, y);
      ctx.fillStyle = TEXT_DARK;
      ctx.fillText(t.title.toUpperCase(), x + 18, y);
    });

    /* ---------- footer: signature / date / seal ---------- */
    const footerY = panelTop + 570;
    ctx.strokeStyle = "rgba(14,122,77,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, footerY); ctx.lineTo(XR, footerY); ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = GREEN;
    ctx.font = "italic 700 30px 'IBM Plex Sans', cursive";
    ctx.fillText("shivaraj", X0, footerY + 46);
    ctx.strokeStyle = DIM_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X0, footerY + 56); ctx.lineTo(X0 + 180, footerY + 56); ctx.stroke();
    ctx.fillStyle = DIM_DARK;
    ctx.font = "500 11.5px 'IBM Plex Mono', monospace";
    ctx.fillText("SHIVARAJ", X0, footerY + 74);
    ctx.fillText("FOUNDER & CEO, SHADOW CREATION", X0, footerY + 89);

    const dateCX = X0 + (XR - X0) * 0.58;
    ctx.textAlign = "center";
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "600 14px 'IBM Plex Mono', monospace";
    ctx.fillText(dateStr, dateCX, footerY + 46);
    ctx.strokeStyle = DIM_DARK;
    ctx.beginPath(); ctx.moveTo(dateCX - 85, footerY + 56); ctx.lineTo(dateCX + 85, footerY + 56); ctx.stroke();
    ctx.fillStyle = DIM_DARK;
    ctx.font = "500 11.5px 'IBM Plex Mono', monospace";
    ctx.fillText("DATE ISSUED", dateCX, footerY + 74);

    const sealX = XR - 38, sealY = footerY + 24;
    ctx.save();
    ctx.translate(sealX, sealY);
    ctx.shadowColor = "rgba(194,54,64,0.5)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(ang) * 34, py = Math.sin(ang) * 34;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(ang) * 26, py = Math.sin(ang) * 26;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = TEXT_DARK;
    ctx.font = "700 16px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SC", 0, 1);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = DIM_DARK;
    ctx.font = "500 10.5px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("VERIFIED SIMULATION", sealX, footerY + 74);
    ctx.fillText("CREDENTIAL", sealX, footerY + 87);

    /* ---------- outer frame accent ---------- */
    function roundedRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(87,207,143,0.9)";
    roundedRect(10, 10, W - 20, H - 20, 8);
    ctx.stroke();

    /* ---------- trigger download ---------- */
    const link = document.createElement("a");
    const safeName = name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    link.download = `cyber-incident-simulator-certificate-${safeName}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }




  /* ---------------------------------------------------------
     CYBER LAB
  --------------------------------------------------------- */
  const LAB_DEFS = [
    {
      id: "lab-phishing",
      title: "Lab 1 — Identify the Phishing Email",
      desc: "Two emails below. Pick the one that shows signs of phishing.",
      build: buildLabPhishing,
    },
    {
      id: "lab-network",
      title: "Lab 2 — Find the Suspicious Log Entry",
      desc: "Scan the network log and select the entry that stands out.",
      build: buildLabNetwork,
    },
    {
      id: "lab-password",
      title: "Lab 3 — Identify a Weak Password",
      desc: "Type a password to see a simulated strength assessment.",
      build: buildLabPassword,
    },
    {
      id: "lab-base64",
      title: "Lab 4 — Decode a Harmless Base64 Message",
      desc: "Decode the string below to reveal a short safe message.",
      build: buildLabBase64,
    },
    {
      id: "lab-metadata",
      title: "Lab 5 — Identify Suspicious File Metadata",
      desc: "Review the file record and decide if it looks suspicious.",
      build: buildLabMetadata,
    },
    {
      id: "lab-authtimeline",
      title: "Lab 6 — Analyze an Authentication Timeline",
      desc: "Review login events and spot the anomaly.",
      build: buildLabAuthTimeline,
    },
    {
      id: "lab-irsequence",
      title: "Lab 7 — Build a Secure Incident Response Sequence",
      desc: "Put the incident response phases in the correct order.",
      build: buildLabIRSequence,
    },
    {
      id: "lab-walkthrough",
      title: "Lab 8 — Guided Walkthrough: How to Investigate a Case",
      desc: "New to the simulator? Step through a real example before trying a case yourself.",
      build: buildLabWalkthrough,
    },
  ];

  function renderLab() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Cyber Lab"]),
        el("div", { class: "page-desc" }, ["Small, safe, simulated exercises. No real systems are involved."]),
      ]),
    ]));
    const grid = el("div", { class: "lab-grid" });
    LAB_DEFS.forEach((lab) => {
      const card = el("div", { class: "lab-card" }, [
        el("div", { class: "lc-title" }, [lab.title]),
        el("div", { class: "lc-desc" }, [lab.desc]),
      ]);
      card.appendChild(lab.build());
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function labFeedback(el1, correct, correctMsg, wrongMsg) {
    el1.textContent = correct ? "✓ " + correctMsg : "✗ " + wrongMsg;
    el1.style.color = correct ? "var(--green)" : "var(--red)";
    el1.style.marginTop = "10px";
    el1.style.fontSize = "12.5px";
    playSound(correct ? "success" : "error");
    if (correct) addXp(15);
  }

  function buildLabPhishing() {
    const wrap = el("div", {});
    const options = [
      { label: "A) From: it-support@northfield-labs.local — 'Password reset window is open in the portal.'", correct: false },
      { label: "B) From: security@northfield-secure-verification.example — 'URGENT: verify now or lose access!'", correct: true },
    ];
    const fb = el("div", {});
    options.forEach((o) => {
      const btn = el("button", { class: "btn-ghost", style: "display:block; width:100%; text-align:left; margin-bottom:8px; font-size:12px;" }, [o.label]);
      btn.addEventListener("click", () => labFeedback(fb, o.correct, "That's the phishing email — mismatched domain and urgency.", "Look for a mismatched domain and urgent pressure."));
      wrap.appendChild(btn);
    });
    wrap.appendChild(fb);
    return wrap;
  }

  function buildLabNetwork() {
    const wrap = el("div", {});
    const entries = [
      { label: "10:41:02 CLIENT-04 → SERVER-01 (ALLOW, routine)", correct: false },
      { label: "10:41:09 CLIENT-04 → UNKNOWN-HOST (BLOCK, new destination)", correct: true },
      { label: "10:41:12 CLIENT-05 → PRINT-SERVER (ALLOW, routine)", correct: false },
    ];
    const fb = el("div", {});
    entries.forEach((o) => {
      const btn = el("button", { class: "btn-ghost", style: "display:block; width:100%; text-align:left; margin-bottom:8px; font-size:12px;" }, [o.label]);
      btn.addEventListener("click", () => labFeedback(fb, o.correct, "Correct — an unrecognized destination that was blocked is worth investigating.", "That entry looks routine — look for an unfamiliar destination."));
      wrap.appendChild(btn);
    });
    wrap.appendChild(fb);
    return wrap;
  }

  function buildLabPassword() {
    const wrap = el("div", {});
    const input = el("input", { type: "text", placeholder: "Type a sample password…", style: "width:100%; background:var(--bg-1); border:1px solid var(--border); color:var(--text-0); padding:9px 10px; border-radius:4px; font-family:var(--font-mono); font-size:12.5px;" });
    const meter = el("div", { class: "confidence-bar-track", style: "margin-top:10px;" }, [el("div", { class: "confidence-bar-fill" })]);
    const label = el("div", { class: "muted", style: "margin-top:6px;" }, ["Simulated strength: —"]);
    input.addEventListener("input", () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score += 25;
      if (v.length >= 12) score += 20;
      if (/[A-Z]/.test(v)) score += 15;
      if (/[0-9]/.test(v)) score += 15;
      if (/[^A-Za-z0-9]/.test(v)) score += 15;
      if (!/(.)\1{2,}/.test(v)) score += 10;
      score = Math.min(100, score);
      meter.querySelector(".confidence-bar-fill").style.width = score + "%";
      let word = "Very Weak";
      if (score >= 80) word = "Strong";
      else if (score >= 55) word = "Moderate";
      else if (score >= 30) word = "Weak";
      label.textContent = v ? `Simulated strength: ${word} (${score}/100)` : "Simulated strength: —";
    });
    wrap.appendChild(input);
    wrap.appendChild(meter);
    wrap.appendChild(label);
    wrap.appendChild(el("div", { class: "muted", style: "margin-top:8px; font-size:11px;" }, ["This is a local simulated estimate only — nothing you type is stored or transmitted."]));
    return wrap;
  }

  function buildLabBase64() {
    const wrap = el("div", {});
    const secret = "stay alert, stay patched";
    const encoded = btoa(secret);
    wrap.appendChild(el("div", { class: "muted", style: "font-family:var(--font-mono); margin-bottom:10px; word-break:break-all;" }, [encoded]));
    const input = el("input", { type: "text", placeholder: "Type the decoded message…", style: "width:100%; background:var(--bg-1); border:1px solid var(--border); color:var(--text-0); padding:9px 10px; border-radius:4px; font-family:var(--font-mono); font-size:12.5px;" });
    const btn = el("button", { class: "btn-ghost", style: "margin-top:8px;" }, ["CHECK"]);
    const fb = el("div", {});
    btn.addEventListener("click", () => labFeedback(fb, input.value.trim().toLowerCase() === secret, "Decoded correctly!", "Not quite — try decoding the Base64 string again."));
    wrap.appendChild(input); wrap.appendChild(btn); wrap.appendChild(fb);
    return wrap;
  }

  function buildLabMetadata() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "muted", style: "font-family:var(--font-mono); font-size:12px; margin-bottom:10px;" }, [
      "File: quarterly_report.pdf.exe  ·  Created: 03:14 AM  ·  Source: unknown removable media",
    ]));
    const options = [
      { label: "This file looks routine", correct: false },
      { label: "This file looks suspicious", correct: true },
    ];
    const fb = el("div", {});
    options.forEach((o) => {
      const btn = el("button", { class: "btn-ghost", style: "display:inline-block; margin-right:8px; font-size:12px;" }, [o.label]);
      btn.addEventListener("click", () => labFeedback(fb, o.correct, "Correct — a double extension and odd hour/source are red flags.", "Look again at the extension, timestamp, and source."));
      wrap.appendChild(btn);
    });
    wrap.appendChild(fb);
    return wrap;
  }

  function buildLabAuthTimeline() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "muted", style: "font-family:var(--font-mono); font-size:12px; margin-bottom:10px; line-height:1.8;" }, [
      "08:58 Login success (office)\n09:00 Login success (office)\n09:02 Login success (unfamiliar country, 4000km away)",
    ]));
    const options = [
      { label: "Nothing unusual", correct: false },
      { label: "The 09:02 login is anomalous", correct: true },
    ];
    const fb = el("div", {});
    options.forEach((o) => {
      const btn = el("button", { class: "btn-ghost", style: "display:inline-block; margin-right:8px; font-size:12px;" }, [o.label]);
      btn.addEventListener("click", () => labFeedback(fb, o.correct, "Correct — a login from an implausible location shortly after is a classic anomaly.", "Compare the location and timing between logins."));
      wrap.appendChild(btn);
    });
    wrap.appendChild(fb);
    return wrap;
  }

  function buildLabIRSequence() {
    const wrap = el("div", {});
    const correctOrder = ["Preparation", "Identification", "Containment", "Eradication", "Recovery", "Lessons Learned"];
    const shuffled = [...correctOrder].sort(() => Math.random() - 0.5);
    const list = el("ol", { style: "padding-left:18px; font-size:12.5px;" });
    shuffled.forEach((s) => list.appendChild(el("li", { style: "margin-bottom:4px;" }, [s])));
    wrap.appendChild(list);
    const btn = el("button", { class: "btn-ghost" }, ["REVEAL CORRECT ORDER"]);
    const fb = el("div", { class: "muted", style: "margin-top:8px; font-size:12px;" }, []);
    btn.addEventListener("click", () => {
      fb.textContent = "Correct order: " + correctOrder.join(" → ");
      addXp(15);
      playSound("success");
    });
    wrap.appendChild(btn);
    wrap.appendChild(fb);
    return wrap;
  }

  function buildLabWalkthrough() {
    const demoCase = CASES[0]; // Case #001 — Phishing Breach
    const steps = [
      {
        title: "Step 1 — Open a case",
        body: "From Case Selection, tap a case card to enter its Investigation Workspace. Every unlocked case starts fresh, tracking your own clue and evidence progress.",
        detail: () => el("div", { class: "email-card" }, [
          el("div", { class: "email-meta" }, [el("b", {}, ["Case: "]), `#${demoCase.code} — ${demoCase.title}`]),
          el("div", { class: "email-meta" }, [el("b", {}, ["Difficulty: "]), demoCase.difficulty]),
          el("div", { class: "email-meta" }, [el("b", {}, ["Brief: "]), demoCase.tagline]),
        ]),
      },
      {
        title: "Step 2 — Read the evidence tabs",
        body: "The left-hand tabs (Email, Network Logs, User Logs, File System, DNS, Firewall, Browser) hold every piece of evidence. Tap any item to open its forensic details — here's the actual phishing email from Case #001:",
        detail: () => el("div", { class: "email-card" }, [
          el("div", { class: "email-meta" }, [el("b", {}, ["From: "]), demoCase.evidence.email[0].from]),
          el("div", { class: "email-meta" }, [el("b", {}, ["Subject: "]), demoCase.evidence.email[0].subject]),
          el("div", { class: "muted", style: "margin-top:8px;" }, ["⚠ " + demoCase.evidence.email[0].indicators[0]]),
        ]),
      },
      {
        title: "Step 3 — Watch for flagged entries",
        body: "Logs mark risky entries with a FLAGGED tag and a colored left border. Opening or filtering these logs is how clues get discovered automatically.",
        detail: () => el("div", { class: "evidence-row suspicious" }, [
          el("span", { class: "row-time" }, [demoCase.evidence.network[0].time]),
          el("span", { class: "row-main" }, [demoCase.evidence.network[0].src + " → " + demoCase.evidence.network[0].dst]),
          el("span", { class: "flag-tag" }, ["FLAGGED"]),
        ]),
      },
      {
        title: "Step 4 — Build the picture: Timeline & Network Map",
        body: "The Timeline tab reconstructs the order of events. The Network Map tab shows a visual diagram — red dashed paths mean suspicious traffic flow between hosts. Both update as you investigate.",
        detail: () => el("div", {}, [
          el("div", { class: "timeline-item", style: "cursor:default;" }, [
            el("div", { class: "timeline-time" }, [demoCase.timeline[0].time]),
            el("div", { class: "timeline-title" }, [demoCase.timeline[0].title]),
            el("div", { class: "timeline-desc" }, [demoCase.timeline[0].desc]),
          ]),
        ]),
      },
      {
        title: "Step 5 — Check Threat Analysis",
        body: "This tab summarizes the attack category, confidence score, and an Attack Chain that visually unlocks as you gather more clues — it's your best read on how serious the incident is.",
        detail: () => el("div", { class: "threat-field" }, [
          el("div", { class: "tf-label" }, ["ATTACK CATEGORY"]),
          el("div", { class: "tf-value" }, [demoCase.threatAnalysis.category]),
        ]),
      },
      {
        title: "Step 6 — Submit your report",
        body: "Once you've reviewed enough evidence, tap 'Submit Investigation Report' and answer the closing questions. Your accuracy, evidence found, and time all feed into your final score and XP.",
        detail: () => el("div", { class: "muted" }, [`Case #${demoCase.code} has ${demoCase.questions.length} closing questions worth ${demoCase.xpReward} XP at 100% accuracy.`]),
      },
    ];

    const wrap = el("div", {});
    const host = el("div", {});
    wrap.appendChild(host);
    let i = 0;

    function draw() {
      host.innerHTML = "";
      const s = steps[i];
      host.appendChild(el("div", { class: "muted", style: "margin-bottom:6px;" }, [`${i + 1} / ${steps.length}`]));
      host.appendChild(el("div", { style: "font-weight:600; margin-bottom:6px;" }, [s.title]));
      host.appendChild(el("div", { class: "muted", style: "margin-bottom:10px; font-size:12.5px;" }, [s.body]));
      host.appendChild(s.detail());

      const navRow = el("div", { style: "display:flex; gap:8px; margin-top:14px;" });
      const backBtn = el("button", { class: "btn-ghost-sm" }, ["← BACK"]);
      backBtn.disabled = i === 0;
      backBtn.addEventListener("click", () => { i = Math.max(0, i - 1); draw(); });
      navRow.appendChild(backBtn);

      if (i < steps.length - 1) {
        const nextBtn = el("button", { class: "btn-ghost-sm" }, ["NEXT →"]);
        nextBtn.addEventListener("click", () => { i++; draw(); playSound("click"); });
        navRow.appendChild(nextBtn);
      } else {
        const startBtn = el("button", { class: "btn" }, ["START THIS CASE FOR REAL →"]);
        startBtn.addEventListener("click", () => navigate("investigation", { caseId: demoCase.id }));
        navRow.appendChild(startBtn);
      }
      host.appendChild(navRow);
    }

    draw();
    return wrap;
  }

  /* ---------------------------------------------------------
     CASE ARCHIVE
  --------------------------------------------------------- */
  function renderArchive() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Case Archive"]),
        el("div", { class: "page-desc" }, ["Review completed investigations or reopen a case."]),
      ]),
    ]));
    const grid = el("div", { class: "case-grid" });
    CASES.forEach((c) => {
      const completed = state.completedCases[c.id];
      const unlocked = isCaseUnlocked(c);
      const status = completed ? "COMPLETED" : unlocked ? "AVAILABLE" : "LOCKED";
      const card = el("div", { class: "case-card" + (unlocked ? "" : " locked") }, [
        el("div", { class: "case-card-top" }, [
          el("span", { class: "case-code" }, ["CASE #" + c.code]),
          el("span", { class: "badge " + (completed ? "badge-easy" : unlocked ? "badge-medium" : "badge-locked") }, [status]),
        ]),
        el("div", { class: "case-title" }, [c.title]),
        completed
          ? el("div", { class: "case-tagline" }, [`Score: ${completed.accuracy}%  ·  Clues: ${completed.cluesFound}/${completed.totalClues}`])
          : el("div", { class: "case-tagline" }, [c.tagline]),
      ]);
      if (unlocked) card.addEventListener("click", () => navigate("investigation", { caseId: c.id }));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------------------------------------------------
     ACHIEVEMENTS
  --------------------------------------------------------- */
  function renderAchievements() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["Achievements"]),
        el("div", { class: "page-desc" }, [`${state.achievements.length}/${ACHIEVEMENTS.length} unlocked`]),
      ]),
    ]));
    const grid = el("div", { class: "ach-grid" });
    ACHIEVEMENTS.forEach((a) => {
      const unlocked = state.achievements.includes(a.id);
      grid.appendChild(el("div", { class: "ach-card" + (unlocked ? "" : " locked") }, [
        el("span", { class: "ach-emoji" }, [a.emoji]),
        el("div", { class: "ach-name" }, [a.name]),
        el("div", { class: "ach-desc" }, [a.desc]),
      ]));
    });
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---------------------------------------------------------
     SYSTEM SETTINGS
  --------------------------------------------------------- */
  function renderSettings() {
    const wrap = el("div", {});
    wrap.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-title" }, ["System Settings"]),
        el("div", { class: "page-desc" }, ["Manage sound, motion, and stored progress."]),
      ]),
    ]));

    const panel = el("div", { class: "panel" });

    const soundRow = el("div", { class: "settings-row" }, [
      el("div", {}, [el("div", { class: "sr-title" }, ["Interface Sound"]), el("div", { class: "sr-desc" }, ["Subtle tones for clicks, alerts, and success events."])]),
      el("div", { class: "toggle" + (state.settings.sound ? " on" : "") }),
    ]);
    soundRow.querySelector(".toggle").addEventListener("click", (e) => {
      state.settings.sound = !state.settings.sound;
      saveState();
      e.target.classList.toggle("on", state.settings.sound);
      if (state.settings.sound) playSound("click");
    });
    panel.appendChild(soundRow);
    wrap.appendChild(panel);

    const dangerPanel = el("div", { class: "panel section-gap" });
    dangerPanel.appendChild(el("div", { class: "panel-title" }, ["RESET"]));
    dangerPanel.appendChild(settingsAction("Reset Progress", "Clears XP, rank, completed cases, and achievements.", () => {
      openConfirm("Reset Progress", "This will permanently erase your XP, completed cases, and achievements. Continue?", () => {
        const notesBackup = state.notes;
        state = defaultState();
        state.notes = notesBackup;
        saveState();
        updateTopbar();
        toast("⚙", "Progress reset.");
        navigate("home");
      });
    }));
    dangerPanel.appendChild(settingsAction("Reset Settings", "Restores sound and accessibility defaults.", () => {
      openConfirm("Reset Settings", "Restore default sound and interface settings?", () => {
        state.settings = { sound: false, reducedMotion: false, bootSkipped: false };
        saveState();
        toast("⚙", "Settings reset.");
        navigate("settings");
      });
    }));
    dangerPanel.appendChild(settingsAction("Clear Investigation Notes", "Removes all saved notes across every case.", () => {
      openConfirm("Clear Notes", "This will delete all saved investigator notes. Continue?", () => {
        state.notes = {};
        saveState();
        toast("⚙", "Notes cleared.");
      });
    }));
    wrap.appendChild(dangerPanel);
    return wrap;
  }

  function settingsAction(title, desc, onClick) {
    const row = el("div", { class: "settings-row" }, [
      el("div", {}, [el("div", { class: "sr-title" }, [title]), el("div", { class: "sr-desc" }, [desc])]),
      el("button", { class: "btn-danger" }, ["Run"]),
    ]);
    row.querySelector("button").addEventListener("click", onClick);
    return row;
  }

  /* ---------------------------------------------------------
     TERMINAL
  --------------------------------------------------------- */
  function termPrint(text, cls) {
    const out = $("#terminalOutput");
    out.appendChild(el("div", { class: "tline" + (cls ? " " + cls : "") }, [text]));
    out.scrollTop = out.scrollHeight;
  }

  const TERMINAL_HELP = [
    "help          — list available commands",
    "clear         — clear the terminal",
    "status        — show system + investigator status",
    "case          — list cases and lock status",
    "evidence      — show evidence count for the open case",
    "timeline      — print the timeline of the open case",
    "network       — describe the network map of the open case",
    "scan          — run a SIMULATED scan (fictional output only)",
    "analyze       — show threat analysis of the open case",
    "notes         — print your saved notes for the open case",
    "rank          — show current rank + XP",
    "achievements  — list unlocked achievements",
  ];

  function runTerminalCommand(raw) {
    const input = raw.trim();
    if (!input) return;
    termPrint("investigator@sim:~$ " + input, "cmd");
    const [cmd, ...rest] = input.toLowerCase().split(/\s+/);
    const openCaseId = currentRoute.params && currentRoute.params.caseId;
    const openCase = CASES.find((c) => c.id === openCaseId);

    switch (cmd) {
      case "help":
        TERMINAL_HELP.forEach((l) => termPrint(l));
        break;
      case "clear":
        $("#terminalOutput").innerHTML = "";
        break;
      case "status": {
        const rank = getRank(state.xp);
        termPrint(`SYSTEM STATUS: ONLINE  |  RANK: ${rank.name}  |  XP: ${state.xp}`);
        termPrint(`CASES COMPLETED: ${Object.keys(state.completedCases).length}/${CASES.length}`);
        break;
      }
      case "case":
        CASES.forEach((c) => termPrint(`${c.code}  ${c.title.padEnd(24)}  ${isCaseUnlocked(c) ? (state.completedCases[c.id] ? "COMPLETED" : "UNLOCKED") : "LOCKED"}`));
        break;
      case "evidence":
        if (!openCase) { termPrint("No case is currently open. Use the Cases screen to start one.", "err"); break; }
        termPrint(`Evidence catalogued for ${openCase.title}: ${countTotalEvidence(openCase)} items across 7 categories.`);
        break;
      case "timeline":
        if (!openCase) { termPrint("No case is currently open.", "err"); break; }
        openCase.timeline.forEach((t) => termPrint(`${t.time}  ${t.title}`));
        break;
      case "network":
        if (!openCase) { termPrint("No case is currently open.", "err"); break; }
        termPrint(`Network map: ${openCase.networkMap.nodes.length} nodes, ${openCase.networkMap.edges.filter((e) => e.suspicious).length} flagged paths.`);
        break;
      case "scan":
        termPrint("Running simulated environment scan...");
        setTimeout(() => termPrint("[SIMULATION] No real systems were scanned. This output is fictional."), 350);
        break;
      case "analyze":
        if (!openCase) { termPrint("No case is currently open.", "err"); break; }
        termPrint(`Category: ${openCase.threatAnalysis.category}  |  Confidence: ${openCase.threatAnalysis.confidence}%`);
        break;
      case "notes":
        if (!openCase) { termPrint("No case is currently open.", "err"); break; }
        termPrint(state.notes[openCase.id] ? state.notes[openCase.id] : "(no notes saved for this case)");
        break;
      case "rank": {
        const rank = getRank(state.xp);
        termPrint(`RANK: ${rank.name}  |  XP: ${state.xp}`);
        break;
      }
      case "achievements":
        if (!state.achievements.length) { termPrint("No achievements unlocked yet."); break; }
        state.achievements.forEach((id) => {
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          if (a) termPrint(`${a.emoji} ${a.name}`);
        });
        break;
      /* ---- easter eggs ---- */
      case "shadow":
        termPrint("[DEV NOTE] \"Every log tells a story. Some of them are lying to you.\" — the simulation team", "cmd");
        break;
      case "matrix":
        termPrint("Visual effect activated.");
        flashMatrixEffect();
        break;
      case "1337":
        unlockAchievement("secret-1337");
        termPrint("Hidden signal acquired.");
        break;
      default:
        termPrint(`Unrecognized command: '${cmd}'. Type 'help' for a list of commands.`, "err");
    }
  }

  function flashMatrixEffect() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = el("div", {
      style: "position:fixed; inset:0; z-index:150; pointer-events:none; background:radial-gradient(circle at 50% 40%, rgba(73,211,200,0.18), transparent 60%); transition:opacity 1.1s ease;",
    });
    document.body.appendChild(layer);
    setTimeout(() => { layer.style.opacity = "0"; }, 120);
    setTimeout(() => layer.remove(), 1300);
  }

  /* ---------------------------------------------------------
     GLOBAL EVENT BINDINGS + INIT
  --------------------------------------------------------- */
  function bindGlobalEvents() {
    $("#brandHomeBtn").addEventListener("click", () => navigate("home"));
    $all(".bn-item").forEach((btn) => btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      const map = { home: "home", cases: "cases", training: "training", lab: "lab", archive: "archive" };
      navigate(map[target] || "home");
    }));

    $("#terminalToggleBtn").addEventListener("click", () => {
      $("#terminalOverlay").classList.remove("hidden");
      if (!$("#terminalOutput").children.length) {
        termPrint("SIMULATION TERMINAL — controls this website's fictional simulation only.");
        termPrint("No real commands are executed. Type 'help' to begin.");
      }
      $("#terminalInput").focus();
    });
    $("#terminalCloseBtn").addEventListener("click", () => $("#terminalOverlay").classList.add("hidden"));
    $("#terminalInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        runTerminalCommand(e.target.value);
        e.target.value = "";
      }
    });

    $("#evidenceModalCloseBtn").addEventListener("click", () => $("#evidenceModal").classList.add("hidden"));
    $("#evidenceModal").addEventListener("click", (e) => { if (e.target.id === "evidenceModal") $("#evidenceModal").classList.add("hidden"); });
    $("#terminalOverlay").addEventListener("click", (e) => { if (e.target.id === "terminalOverlay") $("#terminalOverlay").classList.add("hidden"); });

    $("#certificateCancelBtn").addEventListener("click", closeCertificateModal);
    $("#certificateGenerateBtn").addEventListener("click", generateCertificate);
    $("#certificateModal").addEventListener("click", (e) => { if (e.target.id === "certificateModal") closeCertificateModal(); });
    $("#certificateNameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") generateCertificate(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.settings.reducedMotion = true;
    }
    bindGlobalEvents();
    updateTopbar();
    runBoot();
  });

  /* Exposed for later parts of the file */
  window.__CIS = {
    state, saveState, addXp, unlockAchievement, checkAchievements, getRank, nextRank,
    $, $all, el, esc, fmtXp, toast, openConfirm, playSound, navigate, updateTopbar,
    RANKS, ACHIEVEMENTS,
  };

  window.__CIS_runBoot = runBoot;
  window.__CIS_navigate = navigate;
})();
