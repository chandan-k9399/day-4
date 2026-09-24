const $ = id => document.getElementById(id);
const colors = { "Safe": "#15803d", "Suspicious": "#b45309", "Likely scam": "#b91c1c" };

chrome.storage.local.get(["apiKey", "lang"]).then(({ apiKey, lang }) => {
  if (apiKey) $("key").value = apiKey;
  $("lang").value = lang || "English";
});

$("save").onclick = async () => {
  await chrome.storage.local.set({ apiKey: $("key").value.trim(), lang: $("lang").value });
  $("saved").textContent = "Saved";
  setTimeout(() => ($("saved").textContent = ""), 1500);
};

$("lang").onchange = () => chrome.storage.local.set({ lang: $("lang").value });

function add(parent, tag, text, css) {
  const e = document.createElement(tag);
  e.textContent = text;
  if (css) e.style.cssText = css;
  parent.append(e);
  return e;
}

function list(parent, title, items) {
  if (!items || !items.length) return;
  add(parent, "div", title, "font-weight:700;margin-top:10px;");
  const ul = document.createElement("ul");
  items.forEach(i => add(ul, "li", String(i)));
  parent.append(ul);
}

$("check").onclick = async () => {
  const text = $("text").value.trim();
  const out = $("out");
  out.textContent = "";
  if (!text) { out.textContent = "Paste a message or link first."; return; }
  out.textContent = "Checking\u2026";

  const res = await chrome.runtime.sendMessage({ type: "analyze", text });
  out.textContent = "";
  if (!res || !res.ok) { out.textContent = (res && res.error) || "Something went wrong. Try again."; return; }

  const r = res.result;
  const v = add(out, "div", `${r.verdict} (${r.confidence || "Low"} confidence)`, "");
  v.className = "verdict";
  v.style.background = colors[r.verdict] || "#374151";
  add(out, "p", r.summary || "");
  list(out, "Why", r.reasons);
  list(out, "What to do", r.advice);
  if (r.note) add(out, "div", r.note).className = "note";
};
