// ScamShield - background service worker
// If the model name ever gives a 404 error, change MODEL below (see aistudio.google.com for current names).
const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ---------- Improved prompt (v2) ----------
const SYSTEM_PROMPT = `You are ScamShield, a safety assistant for people in India who are not comfortable with technology (elderly people, first-time internet users, students).

Task: judge whether the given message or link is a scam, phishing, or misinformation.

Common Indian scams to consider: fake bank/KYC/UPI/OTP fraud, fake job and work-from-home offers, lottery and prize messages, fake delivery or customs fees, electricity or gas disconnection threats, "digital arrest" / fake police or CBI calls, loan app harassment, investment / crypto / stock tips, fake customer care numbers.

Rules:
- The rule-based signals are hints only. Decide using the whole message.
- Never tell the user to click a link or share an OTP, PIN or password.
- If you cannot tell, answer "Suspicious" and say what they should verify. Never claim certainty.
- Write at a 10-year-old reading level: short sentences, no technical words.
- Write summary, reasons and advice in the requested language. Keep the JSON keys in English.

Return ONLY valid JSON in this shape:
{"verdict":"Safe" | "Suspicious" | "Likely scam","confidence":"Low" | "Medium" | "High","summary":"one short sentence","reasons":["max 3 short strings"],"advice":["max 3 short action strings"]}`;

// ---------- Simple rule-based checks ----------
function ruleSignals(text) {
  const t = text.toLowerCase();
  const s = [];
  if (/urgent|immediately|within \d+ (hours|minutes)|last chance|act now|blocked|suspended/.test(t)) s.push("Creates urgency or fear");
  if (/\botp\b|\bpin\b|\bcvv\b|password|card number/.test(t)) s.push("Asks for OTP, PIN, password or card details");
  if (/\bupi\b|send money|\bpay(ment)?\b|registration fee|processing fee|advance|deposit/.test(t)) s.push("Asks for a payment or fee");
  if (/\bwon\b|lottery|prize|reward|cashback|free gift/.test(t)) s.push("Promises a prize or reward");
  if (/bit\.ly|tinyurl|\bt\.co\/|cutt\.ly|rb\.gy|shorturl/.test(t)) s.push("Uses a shortened link");
  if (/https?:\/\/[^\s]*\.(xyz|top|click|info|icu|buzz)\b/.test(t)) s.push("Link ends with a suspicious domain");
  if (/whatsapp|telegram/.test(t) && /job|work from home|part.?time|earn/.test(t)) s.push("Job offer that moves you to WhatsApp or Telegram");
  if (/kyc|aadhaar|\bpan\b/.test(t) && /update|verify|expire/.test(t)) s.push("Asks you to update KYC, Aadhaar or PAN");
  return s;
}

function fallbackResult(signals, note) {
  const verdict = signals.length >= 3 ? "Likely scam" : "Suspicious";
  return {
    verdict,
    confidence: "Low",
    summary: signals.length ? "Basic checks found warning signs." : "Basic checks found nothing, but this could not be fully verified.",
    reasons: signals.slice(0, 3),
    advice: ["Do not share OTP, PIN or passwords.", "Do not click links in the message.", "Call the company on its official number."],
    note
  };
}

// ---------- AI call ----------
async function analyze(text) {
  const { apiKey, lang = "English" } = await chrome.storage.local.get(["apiKey", "lang"]);
  if (!apiKey) throw new Error("No API key yet. Click the ScamShield icon and paste your Gemini API key.");

  const signals = ruleSignals(text);
  const userMsg = `Reply language: ${lang}\nRule-based signals: ${signals.join("; ") || "none"}\n\nMessage to check:\n"""${text.slice(0, 4000)}"""`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    const out = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!["Safe", "Suspicious", "Likely scam"].includes(out.verdict)) throw new Error("Unexpected AI reply");
    return out;
  } catch (e) {
    return fallbackResult(signals, "AI check failed (" + e.message + "). Showing basic checks only.");
  }
}

// ---------- Right-click menu ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scamshield-check",
    title: "Check with ScamShield",
    contexts: ["selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "scamshield-check" || !tab?.id) return;
  const text = (info.selectionText || info.linkUrl || "").trim();
  if (!text) return;
  await show(tab.id, { status: "loading" });
  try {
    const result = await analyze(text);
    await show(tab.id, { status: "done", result });
  } catch (e) {
    await show(tab.id, { status: "error", message: e.message });
  }
});

// Popup asks for a check by message
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "analyze") {
    analyze(msg.text)
      .then(result => sendResponse({ ok: true, result }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async reply
  }
});

async function show(tabId, state) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: renderCard, args: [state] });
  } catch (e) {
    console.warn("ScamShield: cannot show card on this page", e);
  }
}

// ---------- Result card injected into the page (must be self-contained) ----------
function renderCard(state) {
  const ID = "scamshield-root";
  document.getElementById(ID)?.remove();

  const host = document.createElement("div");
  host.id = ID;
  host.style.cssText = "all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });

  const el = (tag, css, text) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const colors = { "Safe": "#15803d", "Suspicious": "#b45309", "Likely scam": "#b91c1c" };
  const card = el("div", "position:relative;font-family:system-ui,'Segoe UI',Arial,sans-serif;width:360px;max-width:92vw;background:#fff;color:#111827;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);overflow:hidden;font-size:16px;line-height:1.5;");

  const close = el("button", "position:absolute;top:6px;right:10px;border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer;", "\u00d7");
  close.setAttribute("aria-label", "Close");
  close.onclick = () => host.remove();

  const head = el("div", "padding:14px 18px;color:#fff;background:#374151;");
  const body = el("div", "padding:14px 18px 16px;");

  const list = (title, items) => {
    if (!items || !items.length) return;
    body.append(el("div", "font-weight:700;margin:12px 0 4px;", title));
    const ul = el("ul", "margin:0;padding-left:20px;");
    items.forEach(i => ul.append(el("li", "margin:2px 0;", String(i))));
    body.append(ul);
  };

  if (state.status === "loading") {
    head.append(el("div", "font-size:18px;font-weight:700;", "ScamShield"));
    body.append(el("div", "", "Checking this message\u2026"));
  } else if (state.status === "error") {
    head.append(el("div", "font-size:18px;font-weight:700;", "ScamShield"));
    body.append(el("div", "", state.message));
  } else {
    const r = state.result;
    head.style.background = colors[r.verdict] || "#374151";
    head.append(el("div", "font-size:22px;font-weight:800;", r.verdict));
    head.append(el("div", "font-size:14px;opacity:.9;", "Confidence: " + (r.confidence || "Low")));
    body.append(el("div", "", r.summary || ""));
    list("Why", r.reasons);
    list("What to do", r.advice);
    if (r.note) body.append(el("div", "margin-top:10px;font-size:13px;color:#6b7280;", r.note));
    body.append(el("div", "margin-top:12px;font-size:13px;color:#6b7280;", "AI can make mistakes. When unsure, call the official number of your bank or company."));
  }

  card.append(head, body, close);
  root.append(card);
  document.documentElement.append(host);
}
