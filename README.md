# Infiniti Code Tech — AI Business Development System (MVP)

A secure, compliance-first, AI-assisted business development system for **Infiniti Code Tech**. Built to discover authentic public technology RFPs and procurement signals, perform 8-stage verification and scoring, and present high-confidence leads to human reviewers with strict **zero automated outreach**.

---

## 1. System Architecture

```
[Approved Public Sources] (Brave Search API · RSS Feeds · Curated Tenders)
                    ↓
     [Discovery Agents (Bots 01–05)] (n8n Scheduled / CLI Runner)
                    ↓
       [8-Stage Pipeline Service] (Next.js 15 API Routes)
          1. Canonicalize & Deduplicate
          2. Domain Policy & Suppression Check
          3. Robots.txt Compliance & Rate Limiting
          4. Safe Fetch (Byte-capped, auth-wall & CAPTCHA detection)
          5. PII Scrubbing (Removes personal contacts; preserves role mailboxes)
          6. Prefilter (Excludes hiring/jobs; matches procurement intent)
          7. AI Understanding (OpenAI gpt-4o-mini structured analysis)
          8. Service Matching & 9-Rule Verification (V1–V9) → 100pt Rubric Scoring
                    ↓
        [Supabase PostgreSQL] (RLS · Audit Triggers · Atomic RPCs)
                    ↓
        [Next.js 15 Lead Dashboard]
          - 13-Column Interactive Table with Filters
          - Panel A (Verified Facts) vs. Panel B (AI Hypotheses)
          - Human Review State Machine (new → review → approved → contacted)
```

---

## 2. Quick Start Guide (Setup in 6 Steps)

### Step 1: Clone and Install Dependencies
```bash
git clone <repo-url>
cd Infiniti_Business_Dev
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env.local` and configure your API keys:
```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Pipeline Secret
PIPELINE_API_KEY=infiniti_secret_pipeline_api_key_2026_mvp

# AI Engine (OpenAI gpt-4o-mini)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your-openai-key...
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Run Database Migrations
Apply migrations located in `supabase/migrations/`:
- `0001_schema.sql` (Tables, enums, 20-bot registry)
- `0002_security.sql` (RLS policies, audit triggers, state machine RPCs)
- `0003_seed.sql` (Knowledge base, approved service profiles, sources)
- `0004_publish_rpc.sql` (Atomic publish transaction)

### Step 4: Run the Compliance Audit
Verify all 15 compliance controls (C1–C15) pass:
```bash
npm run compliance:check
```

### Step 5: Run Unit & Contract Tests
```bash
npm test
```

### Step 6: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Lead Review Dashboard.

---

## 3. Core Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Compiles optimized production build (typechecks & lints) |
| `npm test` | Runs the full Vitest suite (32 unit & contract tests) |
| `npm run compliance:check` | Executes automated compliance assertions (Rules C1–C15) |
| `npm run pilot:run` | Runs the Day 4 pilot benchmark across Bots 01–05 |
| `npm run bots:run` | Runs CLI discovery orchestrator across all 5 MVP bots |
| `npm run ai:eval` | Runs AI evaluation benchmark on sample fixtures |

---

## 4. Key Architectural Guarantees

1. **Zero Automated Outreach (Rule C1)**: There are no email libraries (`nodemailer`, `resend`), no messaging SDKs (`twilio`, `slack`), and no outbound communication nodes in n8n. All outreach must be conducted manually by human BD specialists.
2. **Facts vs. AI Hypotheses (Rule C9)**: The database schema and dashboard UI strictly isolate verified source facts (Panel A) from speculative AI suggestions (Panel B).
3. **Approval Required Before Contact (Rule C10)**: The PostgreSQL function `change_lead_status` strictly rejects any transition to `contacted` unless the lead was first explicitly `approved` by a reviewer.
4. **Privacy & PII Scrubbing (Rule C2)**: Personal email addresses and telephone numbers are scrubbed prior to storage; only official published generic business mailboxes (e.g. `tenders@...`, `contact@...`) are preserved.

For detailed operational procedures, key rotations, and disaster recovery, refer to [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
