"use client";

import { suggestDirect, shouldRouteDirect, type Provider } from "./client-direct";
import type { Codebook } from "../codebook/types";

export interface SuggestArgs {
  text: string;
  speaker?: string;
  codebook_id: string;
  user_codebooks?: Codebook[];
  provider?: Provider;
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
 * Unified AI suggestion call. When the user has a BYO API key, route directly
 * from their browser to the provider — bypassing Strata's backend entirely
 * (better privacy + no Vercel region issues + Tauri-ready).
 *
 * Falls back to /api/ai/suggest only when no BYO key is set, so the deployer's
 * env var key can serve casual visitors who haven't pasted their own.
 */
export async function callAiSuggest(args: SuggestArgs): Promise<SuggestResult> {
  if (shouldRouteDirect(args.provider, args.api_key) && args.provider) {
    return suggestDirect({
      text: args.text,
      speaker: args.speaker,
      codebook_id: args.codebook_id,
      user_codebooks: args.user_codebooks,
      provider: args.provider,
      model: args.model ?? defaultModelFor(args.provider),
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

function defaultModelFor(provider: Provider): string {
  return provider === "anthropic"
    ? "claude-haiku-4-5-20251001"
    : provider === "openai"
      ? "gpt-4o-mini"
      : provider === "gemini"
        ? "gemini-2.5-flash"
        : "Llama3-TAIDE-LX-8B-Chat-Alpha1";
}
