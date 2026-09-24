# Cyber Buddy - Prompts & Test Scenarios (for Slides 4, 5, 6)

## Prompt v1 (Initial, Vague)
```text
Is this message a scam?

<paste message>
```

### Problems with Prompt v1:
- Output is unstructured and verbose (paragraphs of text).
- Cannot be cleanly displayed inside a compact extension card or popup.
- Lacks local Indian cybercrime context (KYC threats, UPI scams, Digital Arrest, KBC lottery).
- Written in complex technical jargon difficult for elderly users or non-native English speakers.
- Gives false certainty instead of nuanced caution.

---

## Prompt v2 (Improved) - Used in Cyber Buddy (`background.js`)

```text
You are Cyber Buddy, an empathetic, vigilant AI cyber-safety assistant designed specifically for people in India who may not be tech-savvy (elderly people, students, homemakers, first-time internet users).

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
}
```

---

## What We Changed & Key Architectural Decisions (for Slide 5 & 7)
1. **Hybrid Heuristic + LLM Architecture**: Pre-scans 8 heuristic warning signals (urgency, OTP asks, fees, unverified domains) and feeds them into the Groq prompt.
2. **Guaranteed JSON Schema**: Enables direct rendering in popup and in-page Shadow DOM cards.
3. **Inclusive Language Support**: Configurable for English, Hindi, and Telugu.
4. **Resilient Offline Fallback**: If Groq API quota is reached or network is unavailable, heuristic rules take over immediately so the demo never fails.
5. **Privacy by Design**: Zero user history stored; only the user-selected snippet is inspected.

---

## Test Messages for Presentation & Demo (for Slide 8)

### Test 1: SBI KYC Phishing (Likely Scam)
* **Message**: `URGENT: Your SBI account will be blocked today. Update KYC now: http://sbi-kyc-update.xyz/login and share the OTP you receive.`
* **Expected Output**:
  * Verdict: `Likely scam` (High confidence)
  * Summary: "This is a fake bank message trying to steal your account login and OTP."
  * Reasons: ["Creates false urgency about your account being blocked", "Uses a fake website ending in .xyz instead of official sbi.co.in", "Asks you to share your private OTP"]
  * Advice: ["Never click the link", "Never share your OTP with anyone", "Call your SBI branch directly if you have doubts"]

### Test 2: Jio Lottery / KBC Lucky Draw (Likely Scam)
* **Message**: `Congratulations! You won Rs 25,00,000 in the Jio Lucky Draw. Pay Rs 4,999 processing fee to claim your prize. WhatsApp +91 98XXXXXX10`
* **Expected Output**:
  * Verdict: `Likely scam` (High confidence)
  * Summary: "This is a fake prize message designed to trick you into paying a fee."
  * Reasons: ["Real lotteries do not ask for advance processing fees", "Directs you to an unverified personal WhatsApp number", "Promises unrealistic cash rewards"]
  * Advice: ["Do not pay any money or fee", "Block and report the sender on WhatsApp", "Remember: You cannot win a contest you never entered"]

### Test 3: Part-Time YouTube Job Scam (Likely Scam)
* **Message**: `Part time job: earn Rs 5000 per day by liking YouTube videos. Join our Telegram group. Refundable registration fee Rs 500.`
* **Expected Output**:
  * Verdict: `Likely scam` (High confidence)
  * Summary: "This is a common task scam that takes your fee and pays nothing."
  * Reasons: ["Legitimate jobs never ask candidates to pay a registration fee", "Offers unrealistically high daily pay for simple clicks", "Conducts business on anonymous Telegram channels"]
  * Advice: ["Do not transfer the Rs 500 fee", "Do not join unknown Telegram groups", "Report the message as spam"]

### Test 4: Legitimate Order Update (Safe)
* **Message**: `Hi, your order #402-9812 has been shipped and will arrive tomorrow. You can track its delivery status directly in the shopping app.`
* **Expected Output**:
  * Verdict: `Safe` (High confidence)
  * Summary: "This appears to be a normal delivery update."
  * Reasons: ["Does not ask for money, OTP, or passwords", "Does not contain suspicious links or urgent threats", "Advises tracking safely inside your official app"]
  * Advice: ["Check your order status directly inside your installed app", "No action needed"]

---

## Limitations (for Slide 10)
- **Probabilistic Nature**: AI models may occasionally produce false positives or false negatives.
- **Scope**: Scans selected text and links; does not monitor background network traffic or device storage.
- **Dependency**: Real-time AI reasoning requires internet connectivity and Groq API availability (mitigated by our rule-based fallback).
- **Personal Data**: Users should never test with real passwords, live credit card numbers, or genuine OTPs.
