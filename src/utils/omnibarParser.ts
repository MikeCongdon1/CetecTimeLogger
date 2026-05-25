import { Order } from '../types';

export interface ParsedCommand {
  durationHours?: number;
  orderSearchTerm?: string;
  workType?: string;
  isComplete: boolean;
}

const DURATION_RE = /(\d+(?:\.\d+)?)\s*(h(?:r|rs|our|ours)?|m(?:in|ins|inute|inutes)?)\b/i;

const WORK_TYPE_MAP: Record<string, string> = {
  development: 'Development', dev: 'Development',
  meeting: 'Meeting', meet: 'Meeting',
  design: 'Design',
  testing: 'Testing', test: 'Testing', qa: 'Testing',
  support: 'Support',
  planning: 'Planning', plan: 'Planning',
  review: 'Review',
  documentation: 'Documentation', docs: 'Documentation', doc: 'Documentation',
  deployment: 'Deployment', deploy: 'Deployment',
};

// Sorted longest-first to avoid partial key matches (e.g. "dev" before "development")
const WORK_TYPE_ENTRIES = Object.entries(WORK_TYPE_MAP).sort((a, b) => b[0].length - a[0].length);

const BOILERPLATE = /\b(log|track|add|record|time|entry|work|the|a|an|and|or|in|on|at|by|with)\b/gi;

export function parseCommand(text: string): ParsedCommand {
  const lower = text.toLowerCase().trim();

  // Extract duration
  let durationHours: number | undefined;
  const dm = text.match(DURATION_RE);
  if (dm) {
    const val = parseFloat(dm[1]);
    durationHours = dm[2][0].toLowerCase() === 'm' ? val / 60 : val;
  }

  // Extract work type
  let workType: string | undefined;
  for (const [key, value] of WORK_TYPE_ENTRIES) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
      workType = value;
      break;
    }
  }

  // Extract order search term via "to <TERM> for" or "to <TERM>"
  let orderSearchTerm: string | undefined;
  const toForMatch = text.match(/\bto\s+(.+?)\s+for\b/i);
  const toEndMatch = text.match(/\bto\s+(.+?)(?:\s+for\b|$)/i);

  if (toForMatch) {
    orderSearchTerm = toForMatch[1].trim();
  } else if (toEndMatch) {
    orderSearchTerm = toEndMatch[1].trim();
  }

  // Strip work type words that leaked into the order term
  if (orderSearchTerm && workType) {
    const wtKeys = WORK_TYPE_ENTRIES.filter(([, v]) => v === workType).map(([k]) => k);
    for (const k of wtKeys) {
      orderSearchTerm = orderSearchTerm.replace(new RegExp(`\\b${k}\\b`, 'gi'), '').trim();
    }
  }

  // Fallback: strip boilerplate + duration + work type words, use remainder
  if (!orderSearchTerm && text.trim().length > 1) {
    let cleaned = text;
    if (dm) cleaned = cleaned.replace(dm[0], '');
    cleaned = cleaned.replace(/\bto\b|\bfor\b/gi, ' ').replace(BOILERPLATE, ' ');
    if (workType) {
      const wtKeys = WORK_TYPE_ENTRIES.filter(([, v]) => v === workType).map(([k]) => k);
      for (const k of wtKeys) {
        cleaned = cleaned.replace(new RegExp(`\\b${k}\\b`, 'gi'), ' ');
      }
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 1) orderSearchTerm = cleaned;
  }

  return {
    durationHours,
    orderSearchTerm,
    workType,
    isComplete: !!(durationHours && orderSearchTerm),
  };
}

export function fuzzyMatchOrders(orders: Order[], term: string): Order[] {
  if (!term.trim()) return [];
  const lower = term.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(w => w.length > 1);

  return orders
    .map(o => {
      const haystack = `${o.clientName} ${o.orderNumber} ${o.service}`.toLowerCase();
      let score = 0;
      if (haystack.includes(lower)) score = 3;
      else if (words.length > 1 && words.every(w => haystack.includes(w))) score = 2;
      else if (words.some(w => w.length > 2 && haystack.includes(w))) score = 1;
      return { o, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ o }) => o);
}
