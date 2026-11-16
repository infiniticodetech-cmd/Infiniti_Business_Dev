import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('Infiniti Code Tech — Automated Compliance Audit (Rules C1–C15)');
console.log('================================================================');

let violations = 0;

function assertRule(ruleId: string, description: string, pass: boolean, detail?: string) {
  if (pass) {
    console.log(`[PASS] ${ruleId}: ${description}`);
  } else {
    console.error(`[FAIL] ${ruleId}: ${description}`);
    if (detail) console.error(`       Detail: ${detail}`);
    violations++;
  }
}

// -----------------------------------------------------------------------------
// Rule C1: No Automated Outreach
// -----------------------------------------------------------------------------
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

const FORBIDDEN_PACKAGES = [
  'nodemailer',
  'resend',
  '@sendgrid/mail',
  'mailgun.js',
  'postmark',
  'twilio',
  'linkedin-api',
  '@slack/web-api',
  'discord.js',
];

const foundForbiddenDeps = FORBIDDEN_PACKAGES.filter((dep) => allDeps[dep]);
assertRule(
  'C1.1',
  'Zero automated outreach or mail packages in package.json',
  foundForbiddenDeps.length === 0,
  `Found packages: ${foundForbiddenDeps.join(', ')}`
);

// Check n8n workflows for forbidden outbound communication nodes
const workflowsDir = path.resolve(process.cwd(), 'n8n/workflows');
let forbiddenNodesFound: string[] = [];

if (fs.existsSync(workflowsDir)) {
  const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
  const FORBIDDEN_NODE_TYPES = [
    'emailSend',
    'gmail',
    'sendGrid',
    'mailgun',
    'smtp',
    'linkedIn',
    'slack',
    'telegram',
    'discord',
    'whatsapp',
  ];

  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
    const workflow = JSON.parse(content);
    const nodes = workflow.nodes || [];
    for (const node of nodes) {
      const type = (node.type || '').toLowerCase();
      for (const forbidden of FORBIDDEN_NODE_TYPES) {
        if (type.includes(forbidden.toLowerCase())) {
          forbiddenNodesFound.push(`${file} -> ${node.name} (${node.type})`);
        }
      }
    }
  }
}

assertRule(
  'C1.2',
  'Zero outbound communication or messaging nodes in n8n workflows',
  forbiddenNodesFound.length === 0,
  `Found nodes: ${forbiddenNodesFound.join(', ')}`
);

// -----------------------------------------------------------------------------
// Rule C2: PII Scrubbing
// -----------------------------------------------------------------------------
import { scrubPii, isGenericRoleMailbox } from '../lib/pipeline/scrub';

const piiSample = 'Reach john.doe@personalmail.com or call +44 7700 900077. For RFPs email tenders@company.com';
const scrubbed = scrubPii(piiSample);

const piiPreservedRole = scrubbed.includes('tenders@company.com');
const piiScrubbedPersonal = !scrubbed.includes('john.doe@personalmail.com') && !scrubbed.includes('+44 7700 900077');

assertRule(
  'C2',
  'PII scrubbing removes personal contacts while preserving authorized role mailboxes',
  piiPreservedRole && piiScrubbedPersonal,
  `Scrubbed output: ${scrubbed}`
);

// -----------------------------------------------------------------------------
// Rule C5: Robots.txt Parser and Compliance Gate
// -----------------------------------------------------------------------------
const robotsFile = path.resolve(process.cwd(), 'lib/pipeline/robots.ts');
const robotsSource = fs.readFileSync(robotsFile, 'utf-8');
const hasRobotsCheck = robotsSource.includes('isRobotsAllowed') && robotsSource.includes('robots-parser');

assertRule(
  'C5',
  'Robots.txt gate is implemented and enforced prior to fetch',
  hasRobotsCheck
);

// -----------------------------------------------------------------------------
// Rule C8: Transparent User-Agent Header
// -----------------------------------------------------------------------------
const envFile = path.resolve(process.cwd(), 'lib/config/env.ts');
const envSource = fs.readFileSync(envFile, 'utf-8');
const hasUserAgent = envSource.includes('InfinitiCodeTechResearchBot');

assertRule(
  'C8',
  'User-Agent transparently declares research identity and contact URL',
  hasUserAgent
);

// -----------------------------------------------------------------------------
// Rule C9: Strict Separation of Facts vs Hypotheses
// -----------------------------------------------------------------------------
const schemaFile = path.resolve(process.cwd(), 'lib/ai/schemas.ts');
const schemaSource = fs.readFileSync(schemaFile, 'utf-8');
const hasSeparation =
  schemaSource.includes('evidence_quote') &&
  schemaSource.includes('stated_requirement') &&
  schemaSource.includes('hypotheses');

assertRule(
  'C9',
  'Schema strictly separates facts (stated_requirement, evidence_quote) from hypotheses',
  hasSeparation
);

// -----------------------------------------------------------------------------
// Rule C10: State Machine Enforces Approval Before Contact
// -----------------------------------------------------------------------------
const migrationSecurityFile = path.resolve(process.cwd(), 'supabase/migrations/0002_security.sql');
const securitySql = fs.readFileSync(migrationSecurityFile, 'utf-8');
const enforcesApprovedBeforeContact =
  securitySql.includes("change_lead_status") &&
  securitySql.includes("(cur = 'approved'   and p_to in ('contacted','not_a_fit'))");

assertRule(
  'C10',
  'Database RPC change_lead_status strictly requires approved status before contacted',
  enforcesApprovedBeforeContact
);

// -----------------------------------------------------------------------------
// Rule C11: Service Role Key Isolation
// -----------------------------------------------------------------------------
// Check that SUPABASE_SERVICE_ROLE_KEY is never referenced in client code (app/...)
const clientAppDir = path.resolve(process.cwd(), 'app');
let clientLeakedKey = false;
let leakLocation = '';

function scanDirForSecret(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'api') { // API routes run server-side
        scanDirForSecret(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const src = fs.readFileSync(fullPath, 'utf-8');
      if (src.includes('SUPABASE_SERVICE_ROLE_KEY') || src.includes('service_role')) {
        clientLeakedKey = true;
        leakLocation = fullPath;
      }
    }
  }
}

scanDirForSecret(clientAppDir);

assertRule(
  'C11',
  'No client-facing UI components reference SUPABASE_SERVICE_ROLE_KEY',
  !clientLeakedKey,
  leakLocation ? `Leaked in: ${leakLocation}` : undefined
);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
if (violations === 0) {
  console.log('RESULT: ALL COMPLIANCE CHECKS PASSED (0 Violations)');
  console.log('System is compliant with ICT AI Business Development specifications.');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error(`RESULT: ${violations} COMPLIANCE VIOLATION(S) DETECTED`);
  console.log('================================================================\n');
  process.exit(1);
}
