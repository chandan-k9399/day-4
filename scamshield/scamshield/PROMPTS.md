# ScamShield - prompts and test messages (for slides 4, 5, 6)

## Prompt v1 (initial, vague)
Is this message a scam?

<paste message>

Typical problem: long, generic answer, no fixed format, hard for an elderly user to read, no local (Indian) context.

## Prompt v2 (improved) - used in background.js
- Role: safety assistant for people in India who are not comfortable with technology
- Local context: list of common Indian scams (KYC/UPI/OTP, fake jobs, lottery, digital arrest, etc.)
- Rules: never tell the user to click links or share OTP/PIN; say "Suspicious" if unsure; no false certainty
- Reading level: 10-year-old, short sentences
- Output: strict JSON (verdict, confidence, summary, reasons, advice) so the extension can show it in a card
- Language: English / Hindi / Telugu on request
- Extra input: rule-based signals found by our own code (urgency, OTP ask, short links, etc.)

## What we changed after the first output (your own decisions)
1. Added rule-based checks so the result does not depend only on AI.
2. Forced JSON output so the result fits a small card.
3. Added simple-language rule and Hindi/Telugu option for accessibility.
4. Added a fallback: if the AI call fails, basic checks still work.

## Test messages for the demo
1. URGENT: Your SBI account will be blocked today. Update KYC now: http://sbi-kyc-update.xyz/login and share the OTP you receive.
2. Congratulations! You won Rs 25,00,000 in the Jio Lucky Draw. Pay Rs 4,999 processing fee to claim your prize. WhatsApp +91 98XXXXXX10
3. Part time job: earn Rs 5000 per day by liking YouTube videos. Join our Telegram group. Refundable registration fee Rs 500.
4. (Should look safe) Hi, your order has been shipped and will arrive tomorrow. You can track it in the app you ordered from.

## Limitations (slide 10)
- AI can give false positives and false negatives; not a replacement for calling the bank or company.
- Needs internet and an API key.
- Only checks the text the user selects; does not scan whole pages.
- Privacy: only selected text is sent to the AI, nothing is stored. Never test with real personal data.

## Future improvements
- More languages, read-aloud for low-literacy users
- Check links against known phishing lists
- Community reporting of new scams
