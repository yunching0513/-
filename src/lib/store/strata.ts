"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Codebook, CodedSegment, ConfidenceLevel } from "../codebook/types";
import { dualLayerPJxBE, BUILTIN_CODEBOOKS } from "../codebook/builtin";
import { SAMPLE_DOCUMENT, SAMPLE_SEGMENTS } from "../seed/sample-segments";

/**
 * Single source of truth for the user's active project: which codebook,
 * which document, and the full list of coded segments. Persisted to
 * localStorage so work survives reloads.
 *
 * Until Supabase is wired in (Phase 3), this acts as the entire data layer.
 */

export interface StrataDocument {
  id: string;
  name: string;
  parsed_text: string;
  uploaded_at: string;
  size_bytes: number;
  page_count?: number;
}

interface State {
  codebook_id: string;
  document: StrataDocument;
  segments: CodedSegment[];
  /** User-imported codebooks (Phase 3). */
  userCodebooks: Codebook[];
  /** AI tier preference. */
  ai_tier: "free" | "pro" | "institute";
}

interface Actions {
  /** Replace the active codebook (also clears segments if axis ids differ). */
  setCodebook: (codebook_id: string) => void;
  /** Replace the active document and reset segments. */
  setDocument: (doc: StrataDocument) => void;
  /** Append a brand-new segment (no codes applied yet). */
  addSegment: (
    init: Pick<CodedSegment, "text" | "start" | "end" | "speaker">,
  ) => CodedSegment;
  /** Remove a segment by id. */
  removeSegment: (id: string) => void;
  /** Toggle a code on/off for a given segment. If axis is exclusive,
   *  replaces any existing code on that axis. */
  toggleCode: (segment_id: string, axis_id: string, code: string) => void;
  /** Clear any code on the given axis for this segment. */
  clearAxis: (segment_id: string, axis_id: string) => void;
  setConfidence: (segment_id: string, level: ConfidenceLevel | null) => void;
  setMemo: (segment_id: string, memo: string) => void;
  setInterweaving: (segment_id: string, text: string) => void;
  /** Add a user-imported codebook. */
  addUserCodebook: (cb: Codebook) => void;
  removeUserCodebook: (codebook_id: string) => void;
  setAiTier: (tier: "free" | "pro" | "institute") => void;
  /** Reset all data to the seeded sample project. */
  resetToSample: () => void;
}

const initialState: State = {
  codebook_id: dualLayerPJxBE.codebook_id,
  document: { ...SAMPLE_DOCUMENT },
  segments: SAMPLE_SEGMENTS,
  userCodebooks: [],
  ai_tier: "free",
};

export const useStrata = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCodebook: (codebook_id) => set({ codebook_id }),

      setDocument: (doc) =>
        set({ document: doc, segments: [] }),

      addSegment: (init) => {
        const seg: CodedSegment = {
          id: `seg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          document_id: get().document.id,
          start: init.start,
          end: init.end,
          text: init.text,
          speaker: init.speaker,
          applied: [],
          derived: { is_hybrid_strategy: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((s) => ({ segments: [...s.segments, seg].sort((a, b) => a.start - b.start) }));
        return seg;
      },

      removeSegment: (id) =>
        set((s) => ({ segments: s.segments.filter((x) => x.id !== id) })),

      toggleCode: (segment_id, axis_id, code) => {
        const cb = findCodebook(get().codebook_id, get().userCodebooks);
        const axis = cb.axes.find((a) => a.axis_id === axis_id);
        if (!axis) return;
        set((s) => ({
          segments: s.segments.map((seg) => {
            if (seg.id !== segment_id) return seg;
            const existing = seg.applied.find(
              (a) => a.axis_id === axis_id && a.code === code,
            );
            let nextApplied = seg.applied;
            if (existing) {
              nextApplied = seg.applied.filter(
                (a) => !(a.axis_id === axis_id && a.code === code),
              );
            } else if (axis.cardinality === "multiple") {
              nextApplied = [...seg.applied, { axis_id, code }];
            } else {
              // Exclusive: replace any existing code on this axis
              nextApplied = [
                ...seg.applied.filter((a) => a.axis_id !== axis_id),
                { axis_id, code },
              ];
            }
            return applyDerived(
              { ...seg, applied: nextApplied, updated_at: new Date().toISOString() },
              cb,
            );
          }),
        }));
      },

      clearAxis: (segment_id, axis_id) => {
        const cb = findCodebook(get().codebook_id, get().userCodebooks);
        set((s) => ({
          segments: s.segments.map((seg) => {
            if (seg.id !== segment_id) return seg;
            return applyDerived(
              {
                ...seg,
                applied: seg.applied.filter((a) => a.axis_id !== axis_id),
                updated_at: new Date().toISOString(),
              },
              cb,
            );
          }),
        }));
      },

      setConfidence: (segment_id, level) =>
        set((s) => ({
          segments: s.segments.map((seg) =>
            seg.id === segment_id
              ? {
                  ...seg,
                  confidence: level ?? undefined,
                  updated_at: new Date().toISOString(),
                }
              : seg,
          ),
        })),

      setMemo: (segment_id, memo) =>
        set((s) => ({
          segments: s.segments.map((seg) =>
            seg.id === segment_id
              ? { ...seg, memo: memo || undefined, updated_at: new Date().toISOString() }
              : seg,
          ),
        })),

      setInterweaving: (segment_id, text) =>
        set((s) => ({
          segments: s.segments.map((seg) =>
            seg.id === segment_id
              ? {
                  ...seg,
                  interweaving_analysis: text || undefined,
                  updated_at: new Date().toISOString(),
                }
              : seg,
          ),
        })),

      addUserCodebook: (cb) =>
        set((s) => ({
          userCodebooks: [
            ...s.userCodebooks.filter((c) => c.codebook_id !== cb.codebook_id),
            cb,
          ],
        })),

      removeUserCodebook: (codebook_id) =>
        set((s) => ({
          userCodebooks: s.userCodebooks.filter((c) => c.codebook_id !== codebook_id),
          codebook_id: s.codebook_id === codebook_id ? dualLayerPJxBE.codebook_id : s.codebook_id,
        })),

      setAiTier: (tier) => set({ ai_tier: tier }),

      resetToSample: () => set({ ...initialState }),
    }),
    {
      name: "strata-project-v1",
      storage: createJSONStorage(() => localStorage),
      // Skip hydration-flash by only persisting once mounted on client
      skipHydration: false,
    },
  ),
);

/** Re-evaluate derived codes (currently: is_hybrid_strategy, pattern_id) */
function applyDerived(seg: CodedSegment, cb: Codebook): CodedSegment {
  const surfaceCode = seg.applied.find((a) => a.axis_id === "surface")?.code;
  const deepCode = seg.applied.find((a) => a.axis_id === "deep")?.code;
  const is_hybrid_strategy = !!(surfaceCode && deepCode);
  const pattern = cb.patterns?.find(
    (p) => p.surface_code === surfaceCode && p.deep_code === deepCode,
  );
  return {
    ...seg,
    derived: { ...(seg.derived ?? {}), is_hybrid_strategy },
    pattern_id: pattern?.pattern_id,
  };
}

function findCodebook(id: string, userCodebooks: Codebook[] = []): Codebook {
  return (
    BUILTIN_CODEBOOKS.find((c) => c.codebook_id === id) ??
    userCodebooks.find((c) => c.codebook_id === id) ??
    dualLayerPJxBE
  );
}

export function useActiveCodebook(): Codebook {
  const id = useStrata((s) => s.codebook_id);
  const userCodebooks = useStrata((s) => s.userCodebooks);
  return findCodebook(id, userCodebooks);
}

/** All codebooks (built-in + user-imported). */
export function useAllCodebooks(): Codebook[] {
  const userCodebooks = useStrata((s) => s.userCodebooks);
  return [...BUILTIN_CODEBOOKS, ...userCodebooks];
}
