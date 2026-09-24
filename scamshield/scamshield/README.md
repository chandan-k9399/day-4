# Cyber Buddy - AI Scam & Phishing Detector
**AI for Good Challenge | Topic 3: AI for a safer and more inclusive digital society**

Cyber Buddy is a lightweight Chrome Extension (Manifest V3) that protects people in India (especially elderly people, students, and first-time digital users) from cyber fraud, phishing SMS/WhatsApp messages, fake job offers, lottery traps, and "digital arrest" extortion.

---

## ⚡ Quick Setup (2 Minutes)

### Step 1: Get a Free Groq API Key
1. Go to **[https://console.groq.com/keys](https://console.groq.com/keys)**
2. Sign in with Google / GitHub and click **"Create API Key"**
3. Copy your key (starts with `gsk_...`)

### Step 2: Install Extension in Chrome
1. Open Google Chrome and navigate to: `chrome://extensions`
2. Turn on **Developer mode** (toggle switch in the top-right corner).
3. Click **"Load unpacked"** (top-left).
4. Select the `cyberbuddy` folder:
   `c:\Users\Dell\OneDrive\Desktop\inovation week\day 4\cyberbuddy`

### Step 3: Save Your Key & Test
1. Click the **Cyber Buddy (🛡️)** icon in your Chrome toolbar or extensions menu.
2. Paste your Groq API key into the input field.
3. Choose your preferred language: **English**, **हिन्दी (Hindi)**, or **తెలుగు (Telugu)**.
4. Click **"Save Settings"**.
5. Click any **Demo Preset** (e.g. *SBI KYC Phishing*) and click **"Check with Cyber Buddy"**.

---

## 🌐 How to Use on Any Webpage
1. Highlight any suspicious text or link on any webpage (e.g. in Gmail, WhatsApp Web, Twitter/X, or news articles).
2. Right-click and choose **"Check with Cyber Buddy"**.
3. An accessible, self-contained overlay card appears instantly with the verdict, reasons, and safe action steps!

---

## 🛠️ Architecture & Under the Hood
* **Engine**: Groq Free Tier running `llama-3.3-70b-versatile` (or `llama-3.1-8b-instant`).
* **Format**: Strict JSON output mode (`response_format: { type: "json_object" }`).
* **Local Heuristic Shield**: 8 Indian cybercrime pattern matchers (OTP asks, UPI/QR requests, urgency, short links, .xyz domains, digital arrest, job scams, fake KYC).
* **Guaranteed Fallback**: If the API is offline or the user has no key, heuristic checks still provide instant verdicts.
