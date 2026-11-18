import pLimit from 'p-limit';
import { canonicalizeUrl, registrableDomain } from './canonicalize';
import { prefilterCandidate } from './prefilter';
import { safeFetch } from './safeFetch';
import { extractPage } from './extract';
import { understandOpportunity } from './understand';
import { matchOpportunity } from './match';
import { verifyOpportunity } from './verify';
import { calculateScore } from './score';
import { publishOpportunity } from './publish';
import { env } from '../config/env';
import { OpportunityCategory } from '../db/types';
import { getBotConfig } from "../bots/registry";

export interface CandidateInput {
  url: string;
  title?: string;
  snippet?: string;
  text?: string | null;
  text_origin?: 'fetch' | 'feed';
  published_at?: string | null;
  source_id?: string;
}

export interface IngestRequest {
  run_id?: string;
  bot_id: number;
  bot_category?: OpportunityCategory | null;
  prompt_hint?: string;
  include_keywords?: string[];
  exclude_keywords?: string[];
  exclude_url_patterns?: string[];
  source_reliability_score?: number;
  dry_run?: boolean;
  candidates: CandidateInput[];
}

export interface CandidateOutcome {
  url: string;
  outcome: 'published' | 'duplicate' | 'rejected' | 'blocked' | 'deferred' | 'error';
  reason?: string;
  opportunity_id: string | null;
  score?: number;
}

export interface IngestStats {
  unseen: number;
  prefiltered_out: number;
  fetched: number;
  blocked: number;
  ai_calls: number;
  cache_hits: number;
  published: number;
  duplicates: number;
  rejected: number;
  deferred: number;
  errors: number;
}

export interface IngestResponse {
  run_id?: string;
  processed: number;
  results: CandidateOutcome[];
  stats: IngestStats;
}

export async function orchestratePipeline(req: IngestRequest): Promise<IngestResponse> {
  const limit = pLimit(1); // Enforce sequential processing suited for local LLM hardware
  const botConfig = getBotConfig(req.bot_id);

  const promptHint =
    req.prompt_hint ||
    botConfig?.promptHint ||
    "Technology solution or engineering services";

  const includeKeywords =
    req.include_keywords ?? botConfig?.includeKeywords;

  const excludeKeywords =
    req.exclude_keywords ?? botConfig?.excludeKeywords;

  const excludeUrlPatterns =
    req.exclude_url_patterns ?? botConfig?.excludeUrlPatterns;

  const botCategory =
    req.bot_category ?? botConfig?.category ?? null;

  const sourceReliability = req.source_reliability_score ?? 80;

  const results: CandidateOutcome[] = [];
  const stats: IngestStats = {
    unseen: req.candidates.length,
    prefiltered_out: 0,
    fetched: 0,
    blocked: 0,
    ai_calls: 0,
    cache_hits: 0,
    published: 0,
    duplicates: 0,
    rejected: 0,
    deferred: 0,
    errors: 0,
  };

  let aiCallsThisRun = 0;
  const maxAiCalls = env.AI_MAX_CALLS_PER_RUN;

  const candidateTasks = req.candidates.map((cand) =>
    limit(async () => {
      let canonicalUrl = cand.url;
      try {
        canonicalUrl = canonicalizeUrl(cand.url);
      } catch {
        stats.errors++;
        results.push({
          url: cand.url,
          outcome: 'error',
          reason: 'Invalid URL format',
          opportunity_id: null,
        });
        return;
      }
      const hasCandidateText = Boolean(cand.text || cand.snippet);
      // 1. Prefilter Stage (D2-PIPE-07)
      const initialText = `${cand.title || ''} ${cand.snippet || ''} ${cand.text || ''}`;
      const prefilter = prefilterCandidate(
        canonicalUrl,
        cand.title || "",
        initialText,
        {
          includeKeywords: hasCandidateText ? includeKeywords : undefined,
          excludeKeywords: hasCandidateText ? excludeKeywords : undefined,
          excludeUrlPatterns,
          allowHiringSignals: botConfig?.allowHiringSignals === true,
        } 
      );

      if (!prefilter.pass) {
        stats.prefiltered_out++;
        results.push({
          url: canonicalUrl,
          outcome: 'rejected',
          reason: prefilter.reason,
          opportunity_id: null,
        });
        return;
      }

      // 2. Capture Stage (safeFetch or Feed text, D2-PIPE-04, D2-PIPE-05)
      let pageBody = cand.text || '';
      let httpStatus = 200;
      let robotsAllowed = true;

      if (cand.text_origin !== 'feed' || !cand.text) {
        stats.fetched++;
        const fetchRes = await safeFetch(canonicalUrl);

        if (!fetchRes.ok) {
          if (fetchRes.captureStatus === 'blocked_robots' || fetchRes.captureStatus === 'blocked_captcha' || fetchRes.captureStatus === 'blocked_auth') {
            stats.blocked++;
            results.push({
              url: canonicalUrl,
              outcome: 'blocked',
              reason: fetchRes.errorDetail || fetchRes.captureStatus,
              opportunity_id: null,
            });
          } else {
            stats.errors++;
            results.push({
              url: canonicalUrl,
              outcome: 'error',
              reason: fetchRes.errorDetail || 'Fetch failed',
              opportunity_id: null,
            });
          }
          return;
        }

        pageBody = fetchRes.body;
        httpStatus = fetchRes.httpStatus;
        robotsAllowed = fetchRes.robotsAllowed;
      }

      // Extract & Scrub relevance window
      const extracted = extractPage(
        pageBody,
        canonicalUrl,
        includeKeywords || []
      );
      const contentPrefilter = prefilterCandidate(
      canonicalUrl,
      extracted.title,
      extracted.relevanceExcerpt,
      {
        includeKeywords,
        excludeKeywords,
        excludeUrlPatterns,
        allowHiringSignals: botConfig?.allowHiringSignals === true,
      }
    );

    if (!contentPrefilter.pass) {
      stats.prefiltered_out++;

      results.push({
        url: canonicalUrl,
        outcome: "rejected",
        reason: contentPrefilter.reason || "Content did not match bot requirements",
      opportunity_id: null,
    });

  return;
}
      // Enforce AI Call Caps (D2-AI-03)
      if (aiCallsThisRun >= maxAiCalls) {
        stats.deferred++;
        results.push({
          url: canonicalUrl,
          outcome: 'deferred',
          reason: 'Per-run AI call cap reached',
          opportunity_id: null,
        });
        return;
      }

      // 3. Understand & Classify Stage (D2-PIPE-08)
      let understand;
      try {
        understand = await understandOpportunity({
          url: canonicalUrl,
          excerpt: extracted.relevanceExcerpt,
          promptHint,
        });

        if (understand.fromCache) {
          stats.cache_hits++;
        } else {
          stats.ai_calls++;
          aiCallsThisRun++;
        }
      } catch (err) {
        stats.errors++;
        results.push({
          url: canonicalUrl,
          outcome: 'error',
          reason: err instanceof Error ? err.message : 'AI analysis failed',
          opportunity_id: null,
        });
        return;
      }

      const { analysis, contentHash, quoteInSource } = understand;

      if (!analysis.is_relevant || analysis.signal_strength === 'none' || analysis.category === 'none') {
        stats.rejected++;
        results.push({
          url: canonicalUrl,
          outcome: 'rejected',
          reason: 'AI determined content is not a relevant technology opportunity',
          opportunity_id: null,
        });
        return;
      }

      // 4. Match Stage (D2-PIPE-09)
      const match = await matchOpportunity(
        analysis.category as OpportunityCategory,
        analysis.title,
        analysis.stated_requirement,
        analysis.evidence_quote
      );

      // 5. Verify Stage (D2-PIPE-10)
      const domain = registrableDomain(canonicalUrl);
      const companyName = analysis.company_name || domain || 'Unknown Organization';
      const officialWebsite = analysis.company_website_stated || `https://${domain}`;

      const verification = verifyOpportunity({
        httpStatus,
        robotsAllowed,
        quoteInSource,
        publishedDate: analysis.published_date_stated || cand.published_at || extracted.publishedDate,
        companyName,
        officialWebsite,
        isPiiScrubbed: true,
        aiCategory: analysis.category as OpportunityCategory,
        botCategory,
      });

      if (verification.status === 'failed') {
        stats.rejected++;
        results.push({
          url: canonicalUrl,
          outcome: 'rejected',
          reason: 'Verification hard checks failed: ' + verification.flags.join(', '),
          opportunity_id: null,
        });
        return;
      }

      // 6. Score Stage (D2-PIPE-11)
      const hasContactRoute = !!(extracted.officialContactUrl || extracted.genericContactEmail);
      const scoring = calculateScore({
        signal: analysis.signal_strength,
        quoteInSource,
        fitPoints: match.fitPoints,
        sourceReliabilityScore: sourceReliability,
        publishedDate: analysis.published_date_stated || cand.published_at || extracted.publishedDate,
        hasOfficialWebsite: !!officialWebsite,
        hasCompanyName: !!companyName,
        hasContactRoute,
        scopeClarity: analysis.scope_clarity,
        verificationStatus: verification.status,
      });

      // Check Minimum Publish Score (threshold: 25)
      if (scoring.score < 25) {
        stats.rejected++;
        results.push({
          url: canonicalUrl,
          outcome: 'rejected',
          reason: `Score ${scoring.score} is below minimum publish threshold (25)`,
          opportunity_id: null,
          score: scoring.score,
        });
        return;
      }

      // 7. Publish Stage (D2-PIPE-12)
      if (req.dry_run) {
        stats.published++;
        results.push({
          url: canonicalUrl,
          outcome: 'published',
          reason: 'Dry run execution (not committed to DB)',
          opportunity_id: null,
          score: scoring.score,
        });
        return;
      }
      const categoryBotMap: Record<string, number> = {
        website: 1,
        mobile_app: 2,
        custom_software: 3,
        ai_solution: 4,
        workflow_automation: 5, 
      };

      const assignedBotId =
        categoryBotMap[analysis.category] ?? req.bot_id;

      
      const publishResult = await publishOpportunity({
        runId: req.run_id,
        botId: req.bot_id,
        sourceId: cand.source_id,
        sourceUrl: cand.url,
        canonicalUrl,
        sourcePublishedAt: analysis.published_date_stated || cand.published_at || extracted.publishedDate,
        httpStatus,
        robotsAllowed,
        contentHash,
        excerpt: extracted.relevanceExcerpt,
        company: {
          name: companyName,
          domain,
          officialWebsite,
          industry: analysis.industry,
          country: null,
          city: null,
          contactRouteType: extracted.officialContactUrl
            ? 'official_contact_page'
            : extracted.genericContactEmail
            ? 'published_generic_email'
            : 'none',
          contactRouteUrl: extracted.officialContactUrl,
          contactEmailGeneric: extracted.genericContactEmail,
        },
        opportunity: {
          category: analysis.category as OpportunityCategory,
          signal: analysis.signal_strength,
          title: analysis.title,
          statedRequirement: analysis.stated_requirement,
          evidenceQuote: analysis.evidence_quote,
          aiHypotheses: analysis.hypotheses,
          matchedServiceKeys: match.matchedServiceKeys,
          scopeClarity: analysis.scope_clarity,
          score: scoring.score,
          scoreBreakdown: scoring.scoreBreakdown,
          scoreVersion: scoring.scoreVersion,
          priority: scoring.priority,
          confidence: scoring.confidence,
          verification: verification.status,
          verificationChecks: verification.checks,
        },
      });

      if (publishResult.outcome === 'published') {
        stats.published++;
      } else if (publishResult.outcome === 'duplicate') {
        stats.duplicates++;
      } else {
        stats.errors++;
      }

      results.push({
        url: canonicalUrl,
        outcome: publishResult.outcome,
        reason: publishResult.error,
        opportunity_id: publishResult.opportunityId,
        score: scoring.score,
      });
    })
  );

  await Promise.all(candidateTasks);

  return {
    run_id: req.run_id,
    processed: results.length,
    results,
    stats,
  };
}
