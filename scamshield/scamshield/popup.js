// Cyber Buddy - Popup Script
const $ = id => document.getElementById(id);

const PRESET_MESSAGES = {
  sbi: "URGENT: Your SBI account will be blocked today. Update KYC now: http://sbi-kyc-update.xyz/login and share the OTP you receive.",
  jio: "Congratulations! You won Rs 25,00,000 in the Jio Lucky Draw. Pay Rs 4,999 processing fee to claim your prize. WhatsApp +91 98XXXXXX10",
  job: "Part time job: earn Rs 5000 per day by liking YouTube videos. Join our Telegram group. Refundable registration fee Rs 500.",
  safe: "Hi, your order #402-9812 has been shipped and will arrive tomorrow. You can track its delivery status directly in the shopping app."
};

const VERDICT_THEMES = {
  "Safe": { bg: "#15803d", icon: "✅" },
  "Suspicious": { bg: "#b45309", icon: "⚠️" },
  "Likely scam": { bg: "#b91c1c", icon: "🚨" }
};

const DEFAULT_API_KEY = "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";

// Load saved settings
chrome.storage.local.get(["apiKey", "lang", "model"]).then(({ apiKey, lang, model }) => {
  const currentKey = apiKey || DEFAULT_API_KEY;
  $("apiKey").value = currentKey;
  if (!apiKey) chrome.storage.local.set({ apiKey: DEFAULT_API_KEY });
  if (lang) $("lang").value = lang;
  if (model) $("model").value = model;
});

// Save settings handler
$("saveBtn").onclick = async () => {
  const apiKey = $("apiKey").value.trim();
  const lang = $("lang").value;
  const model = $("model").value;

  await chrome.storage.local.set({ apiKey, lang, model });
  const statusEl = $("saved-status");
  statusEl.textContent = "Saved ✓";
  setTimeout(() => (statusEl.textContent = ""), 2000);
};

// Auto-save on select dropdown changes
$("lang").onchange = () => chrome.storage.local.set({ lang: $("lang").value });
$("model").onchange = () => chrome.storage.local.set({ model: $("model").value });

// Preset chip click handlers
document.querySelectorAll(".chip").forEach(chip => {
  chip.onclick = () => {
    const key = chip.dataset.test;
    if (PRESET_MESSAGES[key]) {
      $("messageText").value = PRESET_MESSAGES[key];
      $("messageText").focus();
    }
  };
});

// Helper functions for DOM creation
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function renderList(parent, title, items, icon) {
  if (!items || !items.length) return;
  const h = createEl("div", "section-title", `${icon} ${title}`);
  parent.append(h);
  const ul = createEl("ul", "result-list");
  items.forEach(item => {
    const li = createEl("li", "", String(item));
    ul.append(li);
  });
  parent.append(ul);
}

// Analyze button handler
$("checkBtn").onclick = async () => {
  const text = $("messageText").value.trim();
  const out = $("output-container");
  const checkBtn = $("checkBtn");
  const btnIcon = $("btnIcon");
  const btnText = $("btnText");

  out.innerHTML = "";

  if (!text) {
    out.innerHTML = `<div style="color:#b91c1c;font-weight:600;padding:8px 0;">Please paste a message or link to analyze.</div>`;
    return;
  }

  // Set loading state
  checkBtn.disabled = true;
  btnIcon.className = "spinner";
  btnIcon.textContent = "";
  btnText.textContent = "Analyzing…";

  try {
    const res = await chrome.runtime.sendMessage({ type: "analyze", text });

    if (!res || !res.ok) {
      out.innerHTML = `
        <div class="card" style="border-left:4px solid #b91c1c;">
          <div style="font-weight:700;color:#991b1b;margin-bottom:4px;">Error</div>
          <div style="font-size:13px;color:#374151;">${(res && res.error) || "Unable to complete check. Please try again."}</div>
        </div>
      `;
      return;
    }

    const r = res.result;
    const theme = VERDICT_THEMES[r.verdict] || { bg: "#334155", icon: "🛡️" };

    const card = createEl("div", "card");

    // Verdict Banner
    const banner = createEl("div", "result-banner");
    banner.style.background = theme.bg;

    const verdictEl = createEl("div", "result-verdict", `${theme.icon} ${r.verdict}`);
    const confEl = createEl("div", "result-conf", `Confidence: ${r.confidence || "Medium"}`);
    banner.append(verdictEl, confEl);
    card.append(banner);

    // Summary
    if (r.summary) {
      const summaryEl = createEl("div", "result-summary", r.summary);
      card.append(summaryEl);
    }

    // Reasons & Advice
    renderList(card, "Why", r.reasons, "🔍");
    renderList(card, "What to do", r.advice, "👉");

    // Note / Fallback notice
    if (r.note) {
      const noteEl = createEl("div", "note-box", r.note);
      card.append(noteEl);
    }

    out.append(card);
  } catch (err) {
    out.innerHTML = `
      <div class="card" style="border-left:4px solid #b91c1c;">
        <div style="font-weight:700;color:#991b1b;">Error</div>
        <div style="font-size:13px;color:#374151;">${err.message || "Failed to contact background worker."}</div>
      </div>
    `;
  } finally {
    checkBtn.disabled = false;
    btnIcon.className = "";
    btnIcon.textContent = "🛡️";
    btnText.textContent = "Check with Cyber Buddy";
  }
};
