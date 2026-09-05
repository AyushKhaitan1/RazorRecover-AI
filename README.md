# RazorRecover AI: Autonomous Revenue Recovery & Smart Dunning Engine

> **Razorpay AI Builder Internship 2026 Submission**  
> **Track**: `Track 03: AI Revenue Recovery`  
> **Applicant**: Ayush Khaitan (`ayushkhaitan2004@gmail.com`)  
> **Tech Stack**: MERN Stack (MongoDB, Express.js, React + Vite, Node.js) with Razorpay Test Mode API & AI Agentic Reasoning.

---

## 📌 Executive Summary & Problem Solved

In Indian digital commerce and recurring subscriptions, **18% to 32% of transactions fail** due to soft declines: bank core-banking system (CBS) outages, insufficient balances, mandate expirations, or checkout OTP drop-offs.

Traditional dunning tools are **dumb and aggressive**:
1. They bombard customers with repeated formal emails, triggering anxiety and churn.
2. They retry uniform cron schedules at 2 AM, exhausting bank retry limits.
3. They violate customer preferences and TRAI/RBI compliance by ignoring opt-outs and DND hours.

**`RazorRecover AI`** turns payment failure into an autonomous, bounded recovery workflow:
- **Root-Cause Diagnostic Engine**: Classifies failure codes (`BAD_REQUEST_INSUFFICIENT_FUNDS`, `GATEWAY_TIMEOUT`, `CUSTOMER_DROPPED_OFF`, `MANDATE_EXPIRED`, `INVOICE_OVERDUE_B2B`, `FRAUD_OR_CARD_BLOCKED`).
- **Smart Mandate Retry Sequencer**: Avoids bank switch maintenance windows and aligns retries with Indian monthly payroll liquidity cycles (1st-5th and 10th of the month).
- **Hinglish Multi-Channel Dunning Sandbox**: Replaces cold emails with empathetic, culturally contextual WhatsApp interactive cards and Voice Concierge phone scripts featuring 1-click Razorpay Payment Links.
- **Strict Guardrails & Stopping Rules**: Enforces hard caps (max 3 touches), 12-hour cooling intervals, TRAI DND windows, and instant fraud killswitches.
- **Auditable Ledger**: Every money movement, LLM decision trace, and compliance check is permanently recorded in an immutable audit trail.

---

## 🎯 "The Bar" Alignment for Track 03

Razorpay's prompt explicitly asks:
> *"Don’t just identify the problem. Show measured money recovered across a batch, with compliant escalation, stopping rules, and an audit trail."*

| Evaluation Metric | RazorRecover AI Implementation |
|---|---|
| **Measured Batch Recovery** | Evaluates a curated batch of 50 synthetic Indian payment failures across UPI AutoPay, Cards, and Netbanking. Measures Total At-Risk (`₹18,77,958`), Total Recovered (`₹12,38,820+`), and Net Conversion Rate (`66% - 93%`). |
| **Compliant Escalation** | Multi-channel sequencing: Silent Bank CBS Retries -> Contextual WhatsApp -> Voice Concierge -> B2B AP Escalation. |
| **Strict Stopping Rules** | 1. Max 3 touches across all channels.<br>2. Minimum 12h cooling interval between outreaches.<br>3. Hard fraud interlock (hotlisted card = immediate cessation, zero retries).<br>4. Automatic halt upon customer opt-out (`"STOP"`, `"Cancel"`). |
| **Explainable Audit Trail** | Step-by-step chronological decision ledger logging every timestamp, failure archetype, LLM rationale, and payment link ID. |

---

## 🏗️ Architecture & Technology Stack

```
                                  [Razorpay Webhooks & Batches]
                                                │
                                                ▼
                                    [Diagnostic Classifier]
                                                │
              ┌─────────────────────────────────┼─────────────────────────────────┐
              ▼                                 ▼                                 ▼
      [Bank Downtime]                 [Insufficient Balance]             [Cart Drop-off / B2B]
              │                                 │                                 │
     (Silent Smart Retry)              (Salary-Cycle Retrier)           (Hinglish WhatsApp & Voice)
              │                                 │                                 │
              └─────────────────────────────────┼─────────────────────────────────┘
                                                ▼
                                   [Guardrails & Stopping Rules]
                                 (Max 3 touches, Cooling, Fraud)
                                                │
                                                ▼
                                  [Razorpay Test API / Links]
                                                │
                                                ▼
                                    [Immutable Audit Trail]
                                                │
                                                ▼
                              [React + Vite Real-Time Dashboard]
```

- **Frontend**: React 18, Vite, Lucide Icons, Canvas Confetti, custom CSS Design System with glassmorphism & dark mode.
- **Backend**: Node.js, Express, Razorpay Node SDK, dotenv, cors.
- **Database**: MongoDB schema definitions + in-memory store for zero-setup execution.

---

## 🚀 Quick Start & Running Locally

### 1. Start Backend Server
```bash
cd server
npm install
npm start
# Server starts on http://localhost:5000
# Health check: http://localhost:5000/health
```

### 2. Start Frontend Dashboard
```bash
cd client
npm install
npm run dev
# Dashboard available on http://localhost:5173
```

---

## 🧪 Interactive Features to Try in the UI

1. **Batch Execution**: Click `Run AI Batch Recovery (50 Records)` in the top header and watch the live telemetry update from ₹0 to ₹12,00,000+ recovered revenue.
2. **Hinglish WhatsApp Sandbox**: Click the green WhatsApp button on any row (e.g. Aarav Sharma). Test sending:
   - `"Paise kal dunga"`: Detects Promise-to-Pay intent, pauses retries until tomorrow, and applies the cooldown stopping rule.
   - `"Subscription cancel kardo"`: Triggers immediate opt-out and halts all future contact.
   - Click `Pay ₹2,499 via Razorpay` inside the chat to test live payment link settlement and celebratory confetti!
3. **Immutable Audit Trail**: Click `Audit Log` in the header or the shield icon on any row to inspect the complete LLM reasoning chain and compliance decisions.
