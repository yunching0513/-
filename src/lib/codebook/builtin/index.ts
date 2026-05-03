import type { Codebook } from "../types";
import { dualLayerPJxBE } from "./dual-layer-pj-be-v3";
import { policyStanceCodebook } from "./policy-stance-v1";
import { stakeholderPositionCodebook } from "./stakeholder-position-v1";

/** Codebooks bundled with Strata. Listed in display order. */
export const BUILTIN_CODEBOOKS: Codebook[] = [
  dualLayerPJxBE,
  policyStanceCodebook,
  stakeholderPositionCodebook,
];

export function findBuiltinCodebook(id: string): Codebook | undefined {
  return BUILTIN_CODEBOOKS.find((c) => c.codebook_id === id);
}

export { dualLayerPJxBE, policyStanceCodebook, stakeholderPositionCodebook };
