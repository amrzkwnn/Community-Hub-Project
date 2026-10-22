import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey, GEMINI_CONFIG } from './geminiClient.ts';
import type { ExchangeCategory } from '../../types/index.ts';

const VALID_CATEGORIES: ExchangeCategory[] = [
  'furniture',
  'baby_kids',
  'appliances',
  'books_study',
  'plants_garden',
  'sports_leisure',
  'others',
];

/**
 * Deterministic category detection based on known items and Malaysian household terms.
 */
export function detectExchangeCategory(text: string): ExchangeCategory {
  const clean = text.toLowerCase();

  if (/\b(?:chair|chairs|kerusi|sofa|couch|table|meja|desk|cabinet|almari|wardrobe|bookshelf|rak|stool|bench|furniture|perabot)\b/i.test(clean)) {
    return 'furniture';
  }
  if (/\b(?:baby|toddler|stroller|pram|kereta sorong|crib|cot|diaper|breastpump|pacifier|high chair|mainan budak|kids)\b/i.test(clean)) {
    return 'baby_kids';
  }
  if (/\b(?:coffee|espresso|microwave|oven|fridge|refrigerator|air fryer|toaster|blender|kettle|iron|vacuum|appliance|peti sejuk|mesin)\b/i.test(clean)) {
    return 'appliances';
  }
  if (/\b(?:book|books|buku|novel|textbook|kamus|study|exam|spm|igcse|reading|magazine|buku rujukan)\b/i.test(clean)) {
    return 'books_study';
  }
  if (/\b(?:plant|plants|pokok|bunga|sapling|pot|succulent|orchid|garden|tanah|soil|fertilizer|herbs|curry leaf)\b/i.test(clean)) {
    return 'plants_garden';
  }
  if (/\b(?:bicycle|basikal|bike|cycling|helmet|racket|badminton|football|bola|treadmill|dumbbells|sports|leisure|fishing)\b/i.test(clean)) {
    return 'sports_leisure';
  }

  return 'others';
}

/**
 * Deterministic title generation based strictly on user provided info.
 */
export function generateConciseTitle(description: string, existingTitle?: string): string {
  const base = existingTitle && existingTitle.trim().length > 3 ? existingTitle.trim() : description.trim();
  const clean = base.replace(/^(?:i want to sell|nak letgo|letgo|wts|giving away|free|nak bagi|saya nak|for exchange|looking to trade)\s*/i, '');
  const firstSentence = clean.split(/[.\n\r]/)[0].trim();

  // Capitalize properly
  const words = firstSentence.split(/\s+/).slice(0, 7);
  const formatted = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return formatted || 'Preloved Household Item';
}

/**
 * Deterministic description improvement adding polite collection windows
 * while preserving 100% of the user's factual description.
 */
export function refineDescription(rawDesc: string, listingType: 'giveaway' | 'exchange' | 'loan' = 'giveaway'): string {
  const clean = rawDesc.trim();
  if (!clean) return 'Preloved item in good functional condition. Free for neighbours in Elmina. Self-pickup preferred.';

  // If already detailed, just normalize
  let suffix = '';
  if (!/(?:pickup|pick up|collect|ambil|serah|handover)/i.test(clean)) {
    suffix = listingType === 'giveaway'
      ? ' Convenient porch handover or self-pickup in Elmina precinct.'
      : ' Open to barter exchange with neighbours. Porch handover preferred.';
  }

  return `${clean}${suffix}`;
}

/**
 * High-quality AI Listing Assistance powered by Gemini Flash, with deterministic fallback.
 */
export async function runExchangeListingAssist(options: {
  action: 'suggest_category' | 'suggest_title' | 'improve_description';
  title?: string;
  description?: string;
  category?: string;
  listingType?: 'giveaway' | 'exchange' | 'loan';
}): Promise<{
  action: string;
  suggestion: string;
  suggestedCategory?: ExchangeCategory;
}> {
  const combinedText = `${options.title || ''} ${options.description || ''}`.trim();

  // 1. Fast deterministic path for suggest_category
  if (options.action === 'suggest_category') {
    const detected = detectExchangeCategory(combinedText);
    return {
      action: options.action,
      suggestion: detected,
      suggestedCategory: detected,
    };
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    if (options.action === 'suggest_title') {
      return {
        action: options.action,
        suggestion: generateConciseTitle(options.description || '', options.title),
      };
    }
    return {
      action: options.action,
      suggestion: refineDescription(options.description || '', options.listingType),
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = GEMINI_CONFIG.model;

    if (options.action === 'suggest_title') {
      const prompt = `You are a helpful assistant for the Circular Exchange in Bandar Elmina township.
Generate a concise, descriptive, high-clarity title (4-7 words maximum) for an exchange item based ONLY on the resident's provided text.
DO NOT invent brands, materials, or facts not mentioned.
Text provided: "${combinedText}"
Respond ONLY with the suggested title in plain text, without quotes or markdown formatting.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0.2, maxOutputTokens: 50 },
      });

      const title = response.text ? response.text.replace(/["\n\r]/g, '').trim() : generateConciseTitle(options.description || '', options.title);
      return { action: options.action, suggestion: title };
    }

    if (options.action === 'improve_description') {
      const prompt = `You are an assistant for the Bandar Elmina Circular Exchange.
Rewrite the resident's item description for clarity, completeness, and friendly neighbourhood etiquette.
STRICT RULES:
1. Preserve 100% of facts (condition, size, features, flaws). DO NOT invent condition or purchase prices.
2. Add a courteous reminder about convenient self-pickup/porch collection in the township.
3. Keep it concise (under 60 words). Support English or Bahasa Melayu matching the input language.
Input text: "${options.description || options.title || ''}"
Respond ONLY with the refined description in plain text.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0.3, maxOutputTokens: 120 },
      });

      const refined = response.text ? response.text.replace(/["\n]/g, ' ').trim() : refineDescription(options.description || '', options.listingType);
      return { action: options.action, suggestion: refined };
    }

    return {
      action: options.action,
      suggestion: options.description || options.title || '',
    };
  } catch {
    if (options.action === 'suggest_title') {
      return {
        action: options.action,
        suggestion: generateConciseTitle(options.description || '', options.title),
      };
    }
    return {
      action: options.action,
      suggestion: refineDescription(options.description || '', options.listingType),
    };
  }
}
