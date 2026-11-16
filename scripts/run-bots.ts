import fs from 'fs';
import path from 'path';
import { orchestratePipeline } from '../lib/pipeline/orchestrate';
import { resolve } from '../lib/ai/registry';
import { env } from '../lib/config/env';

interface BotConfig {
  id: number;
  code: string;
  name: string;
  category: 'website' | 'mobile_app' | 'custom_software' | 'ai_solution' | 'workflow_automation';
  prompt_hint: string;
}

const MVP_BOTS: BotConfig[] = [
  {
    id: 1,
    code: 'B01',
    name: 'Website Discovery Bot',
    category: 'website',
    prompt_hint: 'Website design, CMS migration, portal development, or responsive web engineering',
  },
  {
    id: 2,
    code: 'B02',
    name: 'Mobile App Discovery Bot',
    category: 'mobile_app',
    prompt_hint: 'Native iOS/Android or cross-platform mobile application development',
  },
  {
    id: 3,
    code: 'B03',
    name: 'Custom Software Discovery Bot',
    category: 'custom_software',
    prompt_hint: 'Custom business software, SaaS platform development, API engineering, or cloud modernization',
  },
  {
    id: 4,
    code: 'B04',
    name: 'AI Solution Discovery Bot',
    category: 'ai_solution',
    prompt_hint: 'Enterprise AI solution, NLP, computer vision, predictive analytics, or LLM agent integration',
  },
  {
    id: 5,
    code: 'B05',
    name: 'Workflow Automation Bot',
    category: 'workflow_automation',
    prompt_hint: 'Business process workflow automation, RPA, or ERP/CRM system integration',
  },
];

async function runBots() {
  console.log('================================================================');
  console.log('Infiniti Code Tech — Discovery Bot Orchestrator (Bots 01–05)');
  console.log('================================================================');
  
  const { provider, model } = resolve('analyze_opportunity');
  console.log(`Active AI Provider: ${provider.name.toUpperCase()} (Model: ${model})`);
  console.log(`Max Candidates Per Bot: ${env.MAX_CANDIDATES_PER_RUN}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Load eval fixtures to feed realistic procurement and RFP candidates
  const fixturesPath = path.resolve(process.cwd(), 'fixtures/eval_fixtures.json');
  let fixtures: any[] = [];
  if (fs.existsSync(fixturesPath)) {
    fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  }

  const overallResults: Array<{
    bot: string;
    processed: number;
    published: number;
    rejected: number;
    errors: number;
  }> = [];

  for (const bot of MVP_BOTS) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`Running [${bot.code}] ${bot.name} (Category: ${bot.category})`);
    console.log(`----------------------------------------------------------------`);

    // Match fixtures for this bot or generic
    const botCandidates = fixtures
      .filter((f) => f.bot_id === bot.id)
      .map((f) => ({
        url: f.url,
        title: f.name,
        text: f.excerpt,
        text_origin: 'fetch' as const,
        published_at: new Date().toISOString().split('T')[0],
      }));

    if (botCandidates.length === 0) {
      console.log(`No specific candidates queued for ${bot.code}. Skipping...`);
      continue;
    }

    try {
      const response = await orchestratePipeline({
        bot_id: bot.id,
        bot_category: bot.category,
        prompt_hint: bot.prompt_hint,
        dry_run: true, // Safe dry-run mode for CLI evaluation
        candidates: botCandidates,
      });

      console.log(`Results for ${bot.code}:`);
      console.log(`  Processed:  ${response.processed}`);
      console.log(`  Published:  ${response.stats.published}`);
      console.log(`  AI Calls:   ${response.stats.ai_calls}`);
      console.log(`  Blocked:    ${response.stats.blocked}`);
      console.log(`  Duplicates: ${response.stats.duplicates}`);
      console.log(`  Errors:     ${response.stats.errors}`);

      overallResults.push({
        bot: `${bot.code} - ${bot.name}`,
        processed: response.processed,
        published: response.stats.published,
        rejected: response.stats.rejected + response.stats.prefiltered_out,
        errors: response.stats.errors,
      });
    } catch (err) {
      console.error(`Error executing ${bot.code}:`, err instanceof Error ? err.message : String(err));
      overallResults.push({
        bot: `${bot.code} - ${bot.name}`,
        processed: botCandidates.length,
        published: 0,
        rejected: 0,
        errors: 1,
      });
    }
  }

  console.log('\n================================================================');
  console.log('SUMMARY OF ALL DISCOVERY BOTS');
  console.log('================================================================');
  console.table(overallResults);
  console.log('All bot discovery runs completed successfully.\n');
}

runBots().catch((err) => {
  console.error('Fatal error during bot orchestration run:', err);
  process.exit(1);
});
