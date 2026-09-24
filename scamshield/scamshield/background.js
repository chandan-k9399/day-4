// Cyber Buddy - Background Service Worker (Manifest V3)
// Powered by Groq API (Free Tier: llama-3.3-70b-versatile / llama-3.1-8b-instant)

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// ---------- System Prompt (Cyber Buddy v2) ----------
const SYSTEM_PROMPT = `You are Cyber Buddy, an empathetic, vigilant AI cyber-safety assistant designed specifically for people in India who may not be tech-savvy (elderly people, students, homemakers, first-time internet users).

Task: Analyze the user's message, SMS, email, or link to determine whether it is a scam, phishing attempt, fraudulent scheme, or safe.

Common Indian scams to identify:
1. Fake Bank / KYC / Aadhaar / PAN update threats (e.g. SBI, HDFC, PNB account block threats).
2. UPI & QR code frauds (requests to scan QR to "receive" money, PIN requests for refunds).
3. Fake job & task offers (part-time YouTube like, hotel review, Telegram task groups, registration fees).
4. Lottery & prize hoaxes (Jio, KBC, Kaun Banega Crorepati lucky draw, fake scratch cards).
5. Utility disconnection threats (urgent electricity bill cut-off notices, gas subsidy freeze).
6. "Digital Arrest" & law enforcement extortion (fake CBI, Mumbai Police, ED, Customs, FedEx parcel containing drugs).
7. Fake customer care numbers and suspicious short URLs (bit.ly, wa.me links, .xyz/.top/.click domains).
8. Loan app harassment & instant micro-loan traps.

Strict Safety Rules:
- Never instruct the user to click any links, dial unverified numbers, download APKs, or share OTP, PIN, password, or bank details.
- If you are uncertain or the content has mixed signals, choose verdict "Suspicious" and urge caution. Never give false certainty.
- Reading Level: Explain like you are speaking to a 10-year-old child or an elderly grandparent: very simple words, short reassuring sentences, zero complex tech jargon.
- Multilingual: Output the summary, reasons, and advice in the requested language (English, Hindi, or Telugu). The JSON keys must remain in English.

Return ONLY a valid JSON object matching this exact structure:
{
  "verdict": "Safe" | "Suspicious" | "Likely scam",
  "confidence": "Low" | "Medium" | "High",
  "summary": "One short, simple sentence explaining what this message actually is in the requested language.",
  "reasons": [
    "Short reason 1 in the requested language",
    "Short reason 2 in the requested language",
    "Short reason 3 in the requested language"
  ],
  "advice": [
    "Practical action step 1 in the requested language",
    "Practical action step 2 in the requested language",
    "Practical action step 3 in the requested language"
  ]
}`;

// ---------- Rule-based heuristic signals ----------
function ruleSignals(text) {
  const t = text.toLowerCase();
  const s = [];

  // Urgency / Coercion / Threat
  if (/urgent|immediately|within \d+ (hours|minutes|hrs|mins)|last chance|act now|blocked|suspended|disconnected|cut off|terminated|deactivated|legal action|arrest|fir filed/.test(t)) {
    s.push("Creates artificial panic, urgency, or legal threats");
  }

  // Sensitive credentials / OTP
  if (/\botp\b|\bpin\b|\bcvv\b|password|\bmpin\b|card number|expiry date/.test(t)) {
    s.push("Asks for confidential credentials (OTP, PIN, CVV, or passwords)");
  }

  // Payments / Fees / UPI
  if (/\bupi\b|send money|\bpay(ment)?\b|registration fee|processing fee|security deposit|refundable fee|advance payment|qr code|claim fee/.test(t)) {
    s.push("Asks for upfront fee, UPI payment, or QR code scan");
  }

  // Lottery / Prizes / Free Money
  if (/\bwon\b|lottery|prize|reward|lucky draw|\bkbc\b|cashback|free gift|crore|lakh/.test(t)) {
    s.push("Promises unexpected lottery, prize, or huge sum of money");
  }

  // URL shorteners & suspicious domains
  if (/bit\.ly|tinyurl|\bt\.co\/|cutt\.ly|rb\.gy|shorturl|is\.gd|wa\.me/.test(t)) {
    s.push("Uses a masked or shortened link");
  }
  if (/https?:\/\/[^\s]*\.(xyz|top|click|info|icu|buzz|site|online|live|cc|tk|ml|ga|cf|gq)\b/.test(t)) {
    s.push("Uses an unusual or low-cost web domain");
  }

  // Fake jobs & Telegram/WhatsApp task traps
  if (/(whatsapp|telegram)/.test(t) && /(job|work from home|part.?time|earn|daily income|like youtube|rating|crypto)/.test(t)) {
    s.push("Job or income offer routing to unverified WhatsApp or Telegram channels");
  }

  // Banking / KYC / Govt identity
  if (/(kyc|aadhaar|\bpan\b|sbi|hdfc|icici|axis|pnb|bank)/.test(t) && /(update|verify|expire|block|link|mandate)/.test(t)) {
    s.push("Pressures to update banking, KYC, Aadhaar, or PAN details");
  }

  // Digital Arrest / Law Enforcement Extortion
  if (/digital arrest|cbi|police|customs|narcotics|parcel (contain|held|illegal)|fedex|dhl/.test(t)) {
    s.push("Impersonates law enforcement, courier companies, or threatens digital arrest");
  }

  return s;
}

// ---------- Graceful Fallback Result (Demo never fails) ----------
function fallbackResult(signals, note) {
  const verdict = signals.length >= 2 ? "Likely scam" : (signals.length === 1 ? "Suspicious" : "Suspicious");
  return {
    verdict,
    confidence: "Medium",
    summary: signals.length
      ? "Cyber Buddy detected several common red flags in this message."
      : "Cyber Buddy could not verify this message with the AI engine, but caution is advised.",
    reasons: signals.length ? signals.slice(0, 3) : ["Unknown sender or unusual request pattern."],
    advice: [
      "Never share OTP, PIN, password, or banking information.",
      "Do not click any web links or scan QR codes received in messages.",
      "Contact your official bank or company helpline directly to verify."
    ],
    note: note || "Evaluated with Cyber Buddy heuristic engine."
  };
}

// ---------- Groq API Analysis ----------
async function analyze(text) {
  const { apiKey, lang = "English", model = DEFAULT_MODEL } = await chrome.storage.local.get(["apiKey", "lang", "model"]);

  const signals = ruleSignals(text);

  if (!apiKey || !apiKey.trim()) {
    return fallbackResult(
      signals,
      "Groq API key not set. Using local heuristic rules. Set your free key in the extension popup."
    );
  }

  const userPrompt = `Target reply language: ${lang}
Heuristic warning signals detected: ${signals.length ? signals.join("; ") : "None detected by local keywords"}

Message to analyze:
"""${text.slice(0, 4000)}"""`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Groq API responded with status ${response.status}`);
    }

    const content = data.choices?.[0]?.message?.content || "";
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanContent);

    if (!["Safe", "Suspicious", "Likely scam"].includes(result.verdict)) {
      result.verdict = signals.length >= 2 ? "Likely scam" : "Suspicious";
    }

    return result;
  } catch (error) {
    console.error("Cyber Buddy Groq error:", error);
    return fallbackResult(
      signals,
      `AI evaluation unavailable (${error.message}). Showing Cyber Buddy rule-based safety check.`
    );
  }
}

// ---------- Chrome Context Menu ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cyberbuddy-check",
    title: "Check with Cyber Buddy",
    contexts: ["selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "cyberbuddy-check" || !tab?.id) return;
  const text = (info.selectionText || info.linkUrl || "").trim();
  if (!text) return;

  await showCard(tab.id, { status: "loading" });
  try {
    const result = await analyze(text);
    await showCard(tab.id, { status: "done", result });
  } catch (err) {
    await showCard(tab.id, { status: "error", message: err.message });
  }
});

// ---------- Handle Messages from Popup ----------
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "analyze") {
    analyze(request.text)
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // Keep asynchronous message port open
  }
});

// ---------- In-Page Card Injection ----------
async function showCard(tabId, state) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: renderCyberBuddyCard,
      args: [state]
    });
  } catch (err) {
    console.warn("Cyber Buddy: Cannot inject card on this page (system or restricted page):", err);
  }
}

// Self-contained Shadow DOM function injected into the webpage
function renderCyberBuddyCard(state) {
  const HOST_ID = "cyberbuddy-overlay-root";
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "all:initial;position:fixed;top:20px;right:20px;z-index:2147483647;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
  const shadow = host.attachShadow({ mode: "open" });

  const colors = {
    "Safe": { bg: "#15803d", badge: "#dcfce7", text: "#166534", border: "#86efac" },
    "Suspicious": { bg: "#b45309", badge: "#fef3c7", text: "#92400e", border: "#fcd34d" },
    "Likely scam": { bg: "#b91c1c", badge: "#fee2e2", text: "#991b1b", border: "#fca5a5" }
  };

  const card = document.createElement("div");
  card.style.cssText = `
    position: relative;
    width: 370px;
    max-width: calc(100vw - 40px);
    background: #ffffff;
    color: #111827;
    border-radius: 14px;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.3), 0 0 1px 1px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    font-size: 15px;
    line-height: 1.5;
    animation: cbSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  // Inject animation style
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes cbSlideIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  shadow.append(styleEl);

  // Close Button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "\u00d7";
  closeBtn.setAttribute("aria-label", "Close Cyber Buddy");
  closeBtn.style.cssText = "position:absolute;top:10px;right:14px;border:none;background:transparent;color:#ffffff;font-size:24px;line-height:1;cursor:pointer;opacity:0.85;padding:0;transition:opacity 0.2s;";
  closeBtn.onmouseenter = () => closeBtn.style.opacity = "1";
  closeBtn.onmouseleave = () => closeBtn.style.opacity = "0.85";
  closeBtn.onclick = () => host.remove();

  const header = document.createElement("div");
  header.style.cssText = "padding:16px 20px;background:#1e293b;color:#ffffff;";

  const body = document.createElement("div");
  body.style.cssText = "padding:18px 20px;max-height:80vh;overflow-y:auto;";

  function addList(title, items, icon) {
    if (!items || !items.length) return;
    const titleEl = document.createElement("div");
    titleEl.textContent = `${icon} ${title}`;
    titleEl.style.cssText = "font-weight:700;font-size:14px;color:#374151;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.5px;";
    body.append(titleEl);

    const ul = document.createElement("ul");
    ul.style.cssText = "margin:0;padding-left:18px;color:#1f2937;";
    items.forEach(item => {
      const li = document.createElement("li");
      li.style.cssText = "margin:4px 0;font-size:14.5px;";
      li.textContent = String(item);
      ul.append(li);
    });
    body.append(ul);
  }

  if (state.status === "loading") {
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">🛡️</span>
        <span style="font-size:18px;font-weight:700;">Cyber Buddy</span>
      </div>
    `;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;">
        <div style="width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:cbSpin 0.8s linear infinite;"></div>
        <span style="color:#475569;font-size:15px;font-weight:500;">Analyzing message with AI & safety rules…</span>
      </div>
      <style>@keyframes cbSpin { to { transform: rotate(360deg); } }</style>
    `;
  } else if (state.status === "error") {
    header.style.background = "#b91c1c";
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;">⚠️</span>
        <span style="font-size:18px;font-weight:700;">Cyber Buddy Alert</span>
      </div>
    `;
    body.innerHTML = `
      <p style="margin:0 0 10px;color:#991b1b;font-weight:600;">Unable to complete analysis:</p>
      <p style="margin:0;color:#374151;font-size:14px;">${state.message || "An unexpected error occurred."}</p>
    `;
  } else {
    const res = state.result;
    const style = colors[res.verdict] || { bg: "#1e293b", badge: "#e2e8f0", text: "#1e293b", border: "#cbd5e1" };
    header.style.background = style.bg;

    header.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding-right:24px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🛡️</span>
          <span style="font-size:17px;font-weight:700;letter-spacing:-0.2px;">Cyber Buddy</span>
        </div>
        <span style="font-size:12px;background:rgba(255,255,255,0.22);padding:3px 8px;border-radius:12px;font-weight:600;">
          ${res.confidence || "Medium"} Confidence
        </span>
      </div>
      <div style="font-size:24px;font-weight:800;margin-top:8px;display:flex;align-items:center;gap:8px;">
        ${res.verdict === "Likely scam" ? "🚨" : res.verdict === "Suspicious" ? "⚠️" : "✅"} ${res.verdict}
      </div>
    `;

    // Summary
    const summaryEl = document.createElement("div");
    summaryEl.style.cssText = "font-size:15.5px;font-weight:600;color:#1e293b;line-height:1.45;margin-bottom:12px;";
    summaryEl.textContent = res.summary || "";
    body.append(summaryEl);

    // Reasons & Advice
    addList("Why this was flagged", res.reasons, "🔍");
    addList("What you should do", res.advice, "👉");

    // Note / Fallback message
    if (res.note) {
      const noteEl = document.createElement("div");
      noteEl.style.cssText = "margin-top:14px;padding:8px 12px;background:#f8fafc;border-left:3px solid #94a3b8;font-size:12.5px;color:#64748b;border-radius:4px;";
      noteEl.textContent = res.note;
      body.append(noteEl);
    }

    // Safety Footer
    const footer = document.createElement("div");
    footer.style.cssText = "margin-top:14px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;line-height:1.4;";
    footer.textContent = "AI advice is an aid. When in doubt, never transfer money or share OTPs. Always call the official company or bank helpline.";
    body.append(footer);
  }

  card.append(header, body, closeBtn);
  shadow.append(card);
  document.documentElement.append(host);
}
