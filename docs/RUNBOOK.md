# Infiniti Code Tech — AI Business Development System
# Operations Runbook (v1.0)

This document provides complete instructions for day-to-day operations, review procedures, source onboarding, key rotations, and compliance maintenance for the Infiniti Code Tech AI Business Development System.

---

## 1. Daily Operations Procedure

### 1.1 Morning Routine (Reviewer / BD Specialist)
1. **Access the Lead Dashboard**
   Navigate to `/dashboard` and log in with your reviewer credentials.
2. **Filter by New Opportunities**
   Filter status by `NEW` and sort by `Priority: High` or `Score: Descending`.
3. **Open Opportunity Detail (`/leads/[id]`)**
   Click on the lead to open the detailed review page.
4. **Evaluate Evidence (Panel A vs. Panel B)**
   - **Panel A (Facts from Source)**: Verify that the `stated_requirement` accurately reflects the organization's public RFP or tender, and confirm the `evidence_quote` matches the source text.
   - **Panel B (AI Hypotheses)**: Treat all bullet points in Panel B as speculative suggestions only. Never present unconfirmed hypotheses to the client as confirmed facts.
5. **Take Status Action**
   - Click **"Start Review"** to transition the lead to `REVIEW`.
   - If genuine fit: Click **"Approve Lead"** to transition to `APPROVED`.
   - If not relevant or spam: Click **"Not a Fit"** to reject.
6. **Manual Contact Execution**
   - Use the copyable **Contact Route URL** or **Generic Email** in the profile to reach out directly via official email or web portal.
   - Once sent, click **"Mark as Contacted (Manual)"** and confirm the compliance dialog.

---

## 2. Onboarding a New Discovery Source

All public sources must be strictly reviewed for terms of service compliance before automated collection is enabled (Rule C6 & C7).

### 2.1 Compliance Review Checklist
- [ ] Source provides public RFP, tender, or procurement notices without requiring authentication or login credentials.
- [ ] Source terms of service do not explicitly prohibit research or automated indexing.
- [ ] Source robots.txt allows access to procurement listings.
- [ ] Source reliability score assigned (between 10 and 100).

### 2.2 Adding the Source via SQL
```sql
insert into sources (
  name,
  kind,
  base_url,
  reliability_score,
  terms_reviewed,
  terms_review_notes,
  automated_collection_allowed,
  enabled
) values (
  'National Procurement Portal',
  'api',
  'https://tenders.example.gov/api/v1',
  90,
  true,
  'Reviewed public data terms on 2026-11-16. Automated collection allowed for public tenders.',
  true,
  true
);
```

---

## 3. Adding or Enabling a Bot by Configuration

The system architecture includes a 20-bot registry. To activate a bot from Bots 06–20:

```sql
update bots
set enabled = true
where id = 6; -- e.g. Bot 06: Legacy System Modernisation
```

Update your n8n workflow or bot runner (`scripts/run-bots.ts`) to include the bot ID and category.

---

## 4. API Key & Credential Rotation

### 4.1 Pipeline API Key
1. Generate a new secure 32+ character key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
2. Update `.env.local` on the server:
   ```ini
   PIPELINE_API_KEY=infiniti_secret_new_key_here
   ```
3. Update n8n environment variable `PIPELINE_API_KEY` in `n8n/docker-compose.yml`.
4. Restart services.

### 4.2 OpenAI API Key
1. Update `OPENAI_API_KEY` in `.env.local`.
2. Check health status at `/api/health` to confirm connectivity.

---

## 5. Data Retention & Compliance Maintenance

### 5.1 Suppression List (Do-Not-Research)
If an organization requests exclusion, immediately add their domain:
```sql
insert into suppression_list (domain, reason, added_by)
values ('excluded-domain.com', 'Requested opt-out via contact form', auth.uid());
```

### 5.2 Purging Old Evidence (180-Day Retention)
```sql
delete from source_evidence
where date_checked < now() - interval '180 days'
  and id not in (select source_evidence_id from opportunities where source_evidence_id is not null);
```

---

## 6. Backup & Disaster Recovery

Run the backup script weekly or before migrations:
```powershell
# Windows
.\scripts\backup.ps1

# Linux / Mac
./scripts/backup.sh
```

To restore on a clean Supabase database:
```bash
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f backups/ict_backup_YYYYMMDD_HHMMSS.sql
```
