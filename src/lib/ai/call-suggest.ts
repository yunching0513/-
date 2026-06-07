"use client";

import { suggestDirectGemini, shouldRouteDirect } from "./client-direct";
import type { Codebook } from "../codebook/types";

export interface SuggestArgs {
  text: string;
  speaker?: string;
  codebook_id: string;
  user_codebooks?: Codebook[];
  provider?: "anthropic" | "openai" | "gemini" | "taide";
  model?: string;
  api_key?: string;
}

export interface SuggestResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

/**
 * Unified AI suggestion call. Routes Gemini (with BYO key) through the user's
 * browser to bypass Vercel Hobby's region lock; everything else goes through
 * the /api/ai/suggest server endpoint as usual.
 */
export async function callAiSuggest(args: SuggestArgs): Promise<SuggestResult> {
  if (shouldRouteDirect(args.provider, args.api_key)) {
    return suggestDirectGemini({
      text: args.text,
      speaker: args.speaker,
      codebook_id: args.codebook_id,
      user_codebooks: args.user_codebooks,
      model: args.model ?? "gemini-2.5-flash",
      api_key: args.api_key!,
    });
  }

  const res = await fetch("/api/ai/suggest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: args.text,
      speaker: args.speaker,
      codebook_id: args.codebook_id,
      provider: args.provider,
      model: args.model || undefined,
      api_key: args.api_key || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SuggestResult;
}
