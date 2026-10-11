import type { Subject, Topic } from '@/types';

/**
 * Arkansas Real Estate License Exam — full Pearson VUE / AREC blueprint,
 * baked into the mastery engine. Domain topics carry the blueprint's exact
 * question weights so the adaptive engine and the Exam Sim honor them.
 */

export const ARK_RE: Subject = {
  id: 'arkansas-re',
  name: 'Arkansas Real Estate License',
  description:
    'Pearson VUE salesperson exam: 80 National + 30 Arkansas items, 70 scaled on each, 240 minutes. ' +
    '110 scored + 15 unscored pre-test items (5 national, 10 state) that look identical — treat every question as live.',
  source: 'seed',
};

// Domain → blueprint scored-item count, from the Pearson VUE content outline.
export const ARK_RE_BLUEPRINT_WEIGHT: Record<string, number> = {
  'ar-re.nat.contracts-agency': 16,
  'ar-re.nat.practice': 14,
  'ar-re.nat.appraisal': 11,
  'ar-re.nat.property-landuse': 11,
  'ar-re.nat.ownership-title': 9,
  'ar-re.nat.disclosures-environment': 8,
  'ar-re.nat.financing-settlement': 7,
  'ar-re.nat.math': 4,
  'ar-re.state.licensee-activities': 14,
  'ar-re.state.agency-disclosures': 8,
  'ar-re.state.commission-powers': 4,
  'ar-re.state.licensing-requirements': 2,
  'ar-re.state.other-statutory': 2,
};

export const ARK_RE_TOPICS: Topic[] = [
  // ---- National (80) ----
  { id: 'ar-re.nat.contracts-agency', subjectId: 'arkansas-re', label: 'Contracts & Agency (16 items)', level: 'N1', prereqIds: [], source: 'seed' },
  { id: 'ar-re.nat.practice', subjectId: 'arkansas-re', label: 'Real Estate Practice & Fair Housing (14)', level: 'N2', prereqIds: ['ar-re.nat.contracts-agency'], source: 'seed' },
  { id: 'ar-re.nat.appraisal', subjectId: 'arkansas-re', label: 'Property Value & Appraisal (11)', level: 'N3', prereqIds: ['ar-re.nat.contracts-agency'], source: 'seed' },
  { id: 'ar-re.nat.property-landuse', subjectId: 'arkansas-re', label: 'Property, Legal Descriptions & Land Use (11)', level: 'N4', prereqIds: [], source: 'seed' },
  { id: 'ar-re.nat.ownership-title', subjectId: 'arkansas-re', label: 'Ownership, Transfer & Title (9)', level: 'N5', prereqIds: ['ar-re.nat.property-landuse'], source: 'seed' },
  { id: 'ar-re.nat.disclosures-environment', subjectId: 'arkansas-re', label: 'Disclosures & Environmental (8)', level: 'N6', prereqIds: ['ar-re.nat.practice'], source: 'seed' },
  { id: 'ar-re.nat.financing-settlement', subjectId: 'arkansas-re', label: 'Financing & Settlement (7)', level: 'N7', prereqIds: ['ar-re.nat.math'], source: 'seed' },
  { id: 'ar-re.nat.math', subjectId: 'arkansas-re', label: 'Real Estate Math (4 explicit + embedded)', level: 'N0', prereqIds: [], source: 'seed' },
  // ---- Arkansas State (30) ----
  { id: 'ar-re.state.licensee-activities', subjectId: 'arkansas-re', label: 'Statutory Licensee Activities (14)', level: 'S1', prereqIds: [], source: 'seed' },
  { id: 'ar-re.state.agency-disclosures', subjectId: 'arkansas-re', label: 'AR Agency & Disclosures (8)', level: 'S2', prereqIds: ['ar-re.state.licensee-activities'], source: 'seed' },
  { id: 'ar-re.state.commission-powers', subjectId: 'arkansas-re', label: 'AREC Powers & Recovery Fund (4)', level: 'S3', prereqIds: [], source: 'seed' },
  { id: 'ar-re.state.licensing-requirements', subjectId: 'arkansas-re', label: 'Licensing, CE & PLE (2)', level: 'S4', prereqIds: [], source: 'seed' },
  { id: 'ar-re.state.other-statutory', subjectId: 'arkansas-re', label: 'Time-Share & Disclosure Rescissions (2)', level: 'S5', prereqIds: ['ar-re.state.agency-disclosures'], source: 'seed' },
];

/** Exam-day administrative facts (reference tab). */
export const EXAM_ADMIN = {
  scoredNational: 80, scoredState: 30, pretestNational: 5, pretestState: 10,
  totalTimeMin: 240, passScaled: 70, partialPassMonths: 6, filingWindowDays: 90, eligibilityMonths: 12,
};

/** Statutory trap table: the numbers Pearson VUE builds distractors around. */
export const STATUTORY_TRAPS = [
  { label: 'Recovery Fund cap — single violation', value: '$25,000' },
  { label: 'Recovery Fund cap — aggregate per licensee', value: '$75,000' },
  { label: 'Recovery Fund fee (original applicants)', value: '$25' },
  { label: 'AREC fine ceiling per violation', value: '$1,000' },
  { label: 'AREC board', value: '5 members (4 brokers ≥5 yrs, 1 consumer)' },
  { label: 'Trust account deposit deadline', value: 'Close of next business day / 3 working days' },
  { label: 'Record retention', value: '3 years (last principal broker personally liable after closure)' },
  { label: 'Termination notice to AREC', value: '7 days + return pocket card' },
  { label: 'Time-share rescission', value: '5 days (refund within 30 days)' },
  { label: 'Late property-disclosure rescission', value: '3 days from receipt' },
  { label: 'Post-exam filing window', value: '90 days — results void after' },
  { label: 'Partial-pass validity', value: '6 calendar months' },
  { label: 'Annual CE', value: '7 hrs incl. 1 hr risk management/safety' },
  { label: 'Post-license education (PLE)', value: '18 classroom hrs, 6–12 months after licensure' },
  { label: 'License expiration', value: 'December 31, annually' },
  { label: 'Renewal fees by Sept 30', value: '$60 salesperson / $80 broker (penalty after)' },
];

export const MATH_RULES = [
  { name: 'AR Property Transfer Tax', formula: '(Sales Price ÷ 1,000) × $3.30 — split 50/50 buyer/seller unless contracted otherwise', cite: 'A.C.A. § 26-60-105 / § 26-60-106' },
  { name: 'Discount Points', formula: 'Loan Amount × (Points × 0.01) — NEVER on sales price', cite: '' },
  { name: 'Prepaid Proration (rent/taxes paid ahead)', formula: '(Prepaid ÷ total days) × unearned days → credit seller / debit buyer', cite: '' },
  { name: 'Accrued Proration (taxes in arrears)', formula: '(Annual ÷ total days) × seller days → credit buyer / debit seller', cite: '' },
  { name: 'Gross Rent Multiplier', formula: 'Price ÷ Gross Monthly Rent', cite: '' },
  { name: 'Capitalization', formula: 'Income (I) = Value (V) × Rate (R)', cite: '' },
  { name: 'Net to Seller', formula: '(Desired Net + Closing Costs) ÷ (1 − Commission Rate)', cite: '' },
  { name: 'Proration years', formula: "360-day banker's year (30-day months) or 365-day calendar — the question tells you; seller owns closing day unless stated", cite: '' },
];
