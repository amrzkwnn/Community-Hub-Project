import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey, GEMINI_CONFIG } from '@/lib/server/geminiClient';
import { getMemoryStore } from '@/lib/server/dbSync';
import type { ResilienceIncident } from '@/types';

// Haversine distance in meters between two coordinates
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface DuplicateAssessment {
  canonicalIncidentId: string;
  duplicateIncidentId: string;
  distanceMeters: number;
  confidence: number;
  rationale: string;
  isDuplicate: boolean;
  modelUsed?: string;
}

/**
 * GET /api/ai/incident-duplicate
 * Scans active and pending incidents for candidate duplicate reports using
 * deterministic spatial-temporal filtering + Gemini semantic assessment.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('incidentId');

  const memory = getMemoryStore();
  const incidents = memory.incidents.filter((i) => !i.isArchived && !i.isMerged);

  const duplicatePairs: DuplicateAssessment[] = [];

  // Determine incidents to evaluate
  const candidates = targetId
    ? incidents.filter((i) => i.id === targetId)
    : incidents;

  resolveGeminiApiKey();
  const apiKey = process.env.GEMINI_API_KEY;

  for (const incA of candidates) {
    for (const incB of incidents) {
      if (incA.id >= incB.id) continue; // Avoid self-comparisons and duplicate pairs

      // 1. Deterministic Geospatial Filter: Distance <= 500 meters
      const distance = calculateDistanceMeters(
        incA.latitude,
        incA.longitude,
        incB.latitude,
        incB.longitude
      );
      if (distance > 500) continue;

      // 2. Deterministic Temporal Filter: Created within 7 days of each other
      const timeDiffMs = Math.abs(
        new Date(incA.createdAt).getTime() - new Date(incB.createdAt).getTime()
      );
      if (timeDiffMs > 7 * 24 * 60 * 60 * 1000) continue;

      // 3. Category Filter: Either exact match or related category (e.g. flood & blocked_drain)
      const sameCategory = incA.incidentType === incB.incidentType;
      const relatedCategory =
        (incA.incidentType === 'flood' && incB.incidentType === 'blocked_drain') ||
        (incA.incidentType === 'blocked_drain' && incB.incidentType === 'flood');

      if (!sameCategory && !relatedCategory) continue;

      // Prefer older or verified report as canonical
      const canonicalId =
        incA.isVerified && !incB.isVerified
          ? incA.id
          : !incA.isVerified && incB.isVerified
          ? incB.id
          : new Date(incA.createdAt).getTime() <= new Date(incB.createdAt).getTime()
          ? incA.id
          : incB.id;
      const duplicateId = canonicalId === incA.id ? incB.id : incA.id;

      // 4. Gemini Semantic Analysis (or fallback to deterministic assessment)
      let assessed: DuplicateAssessment | null = null;

      if (apiKey && apiKey.trim().length > 0) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `You are a municipal safety engineer for Bandar Elmina township. Compare these two citizen hazard reports to determine if they describe the EXACT SAME underlying physical incident/event.

INCIDENT A:
- ID: ${incA.id}
- Type: ${incA.incidentType}
- Title: ${incA.title}
- Location: ${incA.locationName} (${incA.latitude.toFixed(5)}, ${incA.longitude.toFixed(5)})
- Time: ${incA.createdAt}
- Details: "${incA.description}"

INCIDENT B:
- ID: ${incB.id}
- Type: ${incB.incidentType}
- Title: ${incB.title}
- Location: ${incB.locationName} (${incB.latitude.toFixed(5)}, ${incB.longitude.toFixed(5)})
- Time: ${incB.createdAt}
- Details: "${incB.description}"

Physical distance: ~${distance} meters.

Respond with strict JSON ONLY:
{
  "isDuplicate": true or false,
  "confidence": number between 0.0 and 1.0,
  "rationale": "Concise 1-2 sentence explanation of why this is the same event or different events.",
  "canonicalId": "${canonicalId}"
}`;

          const res = await ai.models.generateContent({
            model: GEMINI_CONFIG.model || 'gemini-3.5-flash-lite',
            contents: prompt,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });

          const rawText = res.text?.trim() || '{}';
          const parsed = JSON.parse(rawText);

          if (parsed && typeof parsed.isDuplicate === 'boolean') {
            assessed = {
              canonicalIncidentId: canonicalId,
              duplicateIncidentId: duplicateId,
              distanceMeters: distance,
              confidence: Number(parsed.confidence) || 0.85,
              rationale: parsed.rationale || `Physical distance of ${distance}m with overlapping hazard descriptions.`,
              isDuplicate: parsed.isDuplicate,
              modelUsed: GEMINI_CONFIG.model,
            };
          }
        } catch (geminiErr) {
          console.warn('[Incident Duplicate API] Gemini semantic check failed, applying deterministic rule:', geminiErr);
        }
      }

      // Deterministic heuristic fallback if Gemini is offline or unavailable
      if (!assessed) {
        const isClose = distance <= 250;
        const confidence = isClose ? 0.88 : 0.72;
        assessed = {
          canonicalIncidentId: canonicalId,
          duplicateIncidentId: duplicateId,
          distanceMeters: distance,
          confidence,
          rationale: `Proximity match (~${distance}m apart) reported within 7 days in ${incA.locationName} with matching ${incA.incidentType} category.`,
          isDuplicate: true,
          modelUsed: 'deterministic-proximity-engine',
        };
      }

      if (assessed && assessed.isDuplicate) {
        duplicatePairs.push(assessed);
      }
    }
  }

  return NextResponse.json({
    success: true,
    count: duplicatePairs.length,
    duplicates: duplicatePairs,
  });
}
