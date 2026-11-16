# Infiniti Code Tech — AI Business Development System
## Compliance Policy and Operational Boundaries

This document specifies the compliance, data privacy, and operational boundaries governing the Infiniti Code Tech (ICT) AI Business Development System in accordance with project constraints and PDF §3 & §11.

---

### 1. Public Data and Source Selection
- **Publicly Available Information Only**: The system strictly collects data from publicly accessible web pages and authorized API/feed endpoints.
- **Terms of Service Review Required**: No data source may be activated in the system unless its terms have been reviewed and approved (`terms_reviewed = true` AND `automated_collection_allowed = true`). This is enforced by a PostgreSQL database check constraint on the `sources` table.
- **No Authentication / Credential Bypass**: The system never attempts to bypass logins, paywalls, or private portals. HTTP 401/403 responses immediately halt processing for that target domain (`blocked_auth`).
- **No CAPTCHA / Bot Protection Bypass**: The system never uses CAPTCHA solvers, headless browsers, or evasion techniques. If a challenge is encountered, the domain is marked `blocked_captcha` for 30 days and no further requests are made.

---

### 2. Scraping Etiquette and Robots Policy
- **robots.txt Adherence**: The system checks and strictly respects `robots.txt` directives for all fetched domains, caching results for 24 hours. `Disallow` paths are never crawled.
- **Crawl-Delay & Rate Limiting**: The system respects `Crawl-delay` headers and enforces a mandatory per-domain minimum interval (`FETCH_MIN_INTERVAL_MS = 2000`).
- **User-Agent Transparency**: Every request identifies itself with a transparent User-Agent string containing contact information:
  `InfinitiCodeTechResearchBot/0.1 (+https://infiniticodetech.com/contact)`
- **Fetch Caps**: Requests are capped at 1.5MB and 15s timeouts; at most 3 HTTP redirects are followed, re-validating the target URL at every step.

---

### 3. Privacy, PII Scrubbing, and Suppression
- **No Private Individuals' PII**: The system does not target or collect private personal contact data. Personal email addresses and telephone numbers are scrubbed prior to AI analysis or persistent database storage.
- **Allowed Contact Routes**: Only official organization contact pages (`https://.../contact`) or publicly published generic corporate mailboxes (`info@`, `contact@`, `sales@`, `hello@`, `enquiries@`, `support@`) are captured.
- **Do-Not-Contact / Suppression List**: An active `suppression_list` table is checked prior to capture and publish. Any domain or email on this list is immediately suppressed from processing.
- **Data Retention**: Raw page contents are never stored; only an excerpt of up to 3,000 characters is kept for verification. Excerpts for non-captured or stale items are purged according to retention policies.

---

### 4. Separation of Facts vs. AI Hypotheses
- **Source-Backed Verbatim Evidence**: Every published opportunity must include a verbatim quotation from the source text (`evidence_quote`) verified against the captured text.
- **Unconfirmed AI Inferences**: Any inferred need, suggested cross-sell, or project assumption is placed exclusively in `ai_hypotheses` and clearly labeled as **"AI hypotheses (unconfirmed)"** in the dashboard.
- **No Fabricated Certainty**: Signals are classified into `explicit_request`, `strong_signal`, `weak_signal`, or `none`. Inferred needs are never labeled as confirmed projects.

---

### 5. Mandatory Human Approval Before Outreach
- **Strictly No Automated Outreach**: The codebase, database, and n8n workflows contain **no** automated communication capabilities (no SMTP, SES, SendGrid, LinkedIn APIs, WhatsApp, or auto-DM nodes).
- **Enforced State Machine**: Leads cannot transition to `contacted` without first being manually reviewed and moved to `approved` by an authorized human reviewer.
- **Manual Contact Only**: Outreach is conducted manually by ICT staff using official business channels.
