import { PriorityLevel, SignalStrength, VerificationStatus } from '../db/types';

export interface ScoreInput {
  signal: SignalStrength;
  quoteInSource: boolean;
  fitPoints: number; // 0 to 25
  sourceReliabilityScore: number; // 0 to 100
  publishedDate: string | null;
  hasOfficialWebsite: boolean;
  hasCompanyName: boolean;
  hasContactRoute: boolean;
  scopeClarity: 'clear' | 'partial' | 'vague' | null;
  verificationStatus: VerificationStatus;
}

export interface ScoreBreakdown {
  explicit: number;
  fit: number;
  source: number;
  identity: number;
  scope: number;
  details: {
    sourceReliability: number;
    sourceRecency: number;
    identityWebsite: number;
    identityName: number;
    identityContact: number;
  };
}

export interface ScoreResult {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  scoreVersion: number;
  priority: PriorityLevel;
  confidence: number;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  // 1. Explicit project request (max 30)
  let effectiveSignal = input.signal;
  if (!input.quoteInSource) {
    if (effectiveSignal === 'explicit_request') effectiveSignal = 'strong_signal';
    else if (effectiveSignal === 'strong_signal') effectiveSignal = 'weak_signal';
    else if (effectiveSignal === 'weak_signal') effectiveSignal = 'none';
  }

  let explicitPoints = 0;
  if (effectiveSignal === 'explicit_request') explicitPoints = 30;
  else if (effectiveSignal === 'strong_signal') explicitPoints = 18;
  else if (effectiveSignal === 'weak_signal') explicitPoints = 8;
  else explicitPoints = 0;

  // 2. Fit with ICT services (max 25)
  const fitPoints = Math.min(25, Math.max(0, input.fitPoints));

  // 3. Source reliability & recency (max 20)
  const reliabilityPoints = Math.min(12, Math.max(0, Math.round(input.sourceReliabilityScore * 0.12)));

  let recencyPoints = 2; // Default for unknown date
  if (input.publishedDate) {
    const ageDays = (Date.now() - new Date(input.publishedDate).getTime()) / 86400000;
    if (ageDays <= 30) recencyPoints = 8;
    else if (ageDays <= 90) recencyPoints = 5;
    else if (ageDays <= 180) recencyPoints = 2;
    else recencyPoints = 0;
  }
  const sourcePoints = Math.min(20, reliabilityPoints + recencyPoints);

  // 4. Company identity & official channel (max 15)
  const identityWebsite = input.hasOfficialWebsite ? 6 : 0;
  const identityName = input.hasCompanyName ? 4 : 0;
  const identityContact = input.hasContactRoute ? 5 : 0;
  const identityPoints = Math.min(15, identityWebsite + identityName + identityContact);

  // 5. Practical project scope (max 10)
  let scopePoints = 0;
  if (input.scopeClarity === 'clear') scopePoints = 10;
  else if (input.scopeClarity === 'partial') scopePoints = 5;
  else scopePoints = 0;

  const totalScore = Math.min(
    100,
    explicitPoints + fitPoints + sourcePoints + identityPoints + scopePoints
  );

  // Priority classification: High >= 70, Medium 45-69, Low < 45
  let priority: PriorityLevel = 'low';
  if (totalScore >= 70) priority = 'high';
  else if (totalScore >= 45) priority = 'medium';

  // Confidence calculation (0 - 100):
  // 100 * (0.40 * explicit/30 + 0.25 * source/20 + 0.20 * identity/15 + 0.15 * vf)
  let vf = 0;
  if (input.verificationStatus === 'verified') vf = 1.0;
  else if (input.verificationStatus === 'needs_review') vf = 0.6;
  else vf = 0.0;

  const confidenceRaw =
    100 *
    (0.4 * (explicitPoints / 30) +
      0.25 * (sourcePoints / 20) +
      0.2 * (identityPoints / 15) +
      0.15 * vf);
  const confidence = Math.min(100, Math.max(0, Math.round(confidenceRaw)));

  return {
    score: totalScore,
    scoreBreakdown: {
      explicit: explicitPoints,
      fit: fitPoints,
      source: sourcePoints,
      identity: identityPoints,
      scope: scopePoints,
      details: {
        sourceReliability: reliabilityPoints,
        sourceRecency: recencyPoints,
        identityWebsite,
        identityName,
        identityContact,
      },
    },
    scoreVersion: 1,
    priority,
    confidence,
  };
}
