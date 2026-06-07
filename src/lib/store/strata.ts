"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Codebook, CodedSegment, ConfidenceLevel } from "../codebook/types";
import { dualLayerPJxBE, BUILTIN_CODEBOOKS } from "../codebook/builtin";
import { SAMPLE_DOCUMENT, SAMPLE_SEGMENTS } from "../seed/sample-segments";

/**
 * Single source of truth for Strata. Persisted to localStorage so work
 * survives reloads. Until Supabase is wired in (Phase 4), this is the
 * entire data layer.
 */

export type SourceKind = "upload" | "join" | "ly" | "gazette";

export interface StrataDocument {
  id: string;
  name: string;
  parsed_text: string;
  uploaded_at: string;
  size_bytes: number;
  page_count?: number;
  /** Which source produced this document; defaults to "upload" */
  source_kind?: SourceKind;
  /** The document's content date (publish/meeting/submission), ISO format.
   *  Used by the timeline visualization. Falls back to uploaded_at if absent. */
  source_date?: string;
}

interface State {
  codebook_id: string;
  documents: StrataDocument[];
  active_document_id: string;
  /** All coded segments across all documents. */
  segments: CodedSegment[];
  /** User-imported codebooks. */
  userCodebooks: Codebook[];
  /** AI tier preference (legacy Strata-managed mode). */
  ai_tier: "free" | "pro" | "institute";
  /** User-chosen AI provider for BYO key mode. */
  ai_provider: "anthropic" | "openai" | "gemini";
  /** User-pasted API key. Stored in localStorage only — never sent off-device
   *  except in request bodies to /api/ai/*. Leave empty to fall back to the
   *  server's env var (deployer-managed mode). */
  ai_api_key: string;
  /** User-chosen model id within the active provider. Empty = provider default. */
  ai_model: string;
}

interface Actions {
  setCodebook: (codebook_id: string) => void;
  /** Append a new document and make it active. */
  addDocument: (doc: StrataDocument) => void;
  /** Switch the active document (must already exist). */
  setActiveDocument: (id: string) => void;
  /** Remove a document and all its coded segments. */
  removeDocument: (id: string) => void;
  addSegment: (
    init: Pick<CodedSegment, "text" | "start" | "end" | "speaker"> & {
      document_id?: string;
    },
  ) => CodedSegment;
  removeSegment: (id: string) => void;
  toggleCode: (segment_id: string, axis_id: string, code: string) => void;
  clearAxis: (segment_id: string, axis_id: string) => void;
  setConfidence: (segment_id: string, level: ConfidenceLevel | null) => void;
  setMemo: (segment_id: string, memo: string) => void;
  setInterweaving: (segment_id: string, text: string) => void;
  addUserCodebook: (cb: Codebook) => void;
  removeUserCodebook: (codebook_id: string) => void;
  setAiTier: (tier: "free" | "pro" | "institute") => void;
  setAiProvider: (provider: "anthropic" | "openai" | "gemini") => void;
  setAiApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  resetToSample: () => void;
}

const initialState: State = {
  codebook_id: dualLayerPJxBE.codebook_id,
  documents: [{ ...SAMPLE_DOCUMENT }],
  active_document_id: SAMPLE_DOCUMENT.id,
  segments: SAMPLE_SEGMENTS,
  userCodebooks: [],
  ai_tier: "free",
  ai_provider: "anthropic",
  ai_api_key: "",
  ai_model: "",
};

export const useStrata = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCodebook: (codebook_id) => set({ codebook_id }),

      addDocument: (doc) =>
        set((s) => ({
          documents: [...s.documents.filter((d) => d.id !== doc.id), doc],
          active_document_id: doc.id,
        })),

      setActiveDocument: (id) => {
        const doc = get().documents.find((d) => d.id === id);
        if (doc) set({ active_document_id: id });
      },

      removeDocument: (id) =>
        set((s) => {
          const remaining = s.documents.filter((d) => d.id !== id);
          if (remaining.length === 0) {
            // Don't allow removing the last document; reset to sample instead
            return {
              documents: [{ ...SAMPLE_DOCUMENT }],
              active_document_id: SAMPLE_DOCUMENT.id,
              segments: SAMPLE_SEGMENTS,
            };
          }
          return {
            documents: remaining,
            active_document_id:
              s.active_document_id === id ? remaining[0].id : s.active_document_id,
            segments: s.segments.filter((seg) => seg.document_id !== id),
          };
        }),

      addSegment: (init) => {
        const docId = init.document_id ?? get().active_document_id;
        const seg: CodedSegment = {
          id: `seg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          document_id: docId,
          start: init.start,
          end: init.end,
          text: init.text,
          speaker: init.speaker,
          applied: [],
          derived: { is_hybrid_strategy: false },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((s) => ({ segments: [...s.segments, seg].sort(byStart) }));
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
          codebook_id:
            s.codebook_id === codebook_id ? dualLayerPJxBE.codebook_id : s.codebook_id,
        })),

      setAiTier: (tier) => set({ ai_tier: tier }),

      setAiProvider: (provider) => set({ ai_provider: provider, ai_model: "" }),

      setAiApiKey: (key) => set({ ai_api_key: key }),

      setAiModel: (model) => set({ ai_model: model }),

      resetToSample: () => set({ ...initialState }),
    }),
    {
      name: "strata-project-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        // v1 had { document: StrataDocument, segments }
        // v2 splits into { documents: [], active_document_id, segments }
        const s = persistedState as Partial<State> & { document?: StrataDocument };
        if (version < 2 && s.document) {
          return {
            ...s,
            documents: [s.document],
            active_document_id: s.document.id,
            document: undefined,
          } as State;
        }
        return s as State;
      },
    },
  ),
);

function byStart(a: CodedSegment, b: CodedSegment) {
  if (a.document_id !== b.document_id) return a.document_id.localeCompare(b.document_id);
  return a.start - b.start;
}

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

/* ----- Selectors ----- */

export function useActiveCodebook(): Codebook {
  const id = useStrata((s) => s.codebook_id);
  const userCodebooks = useStrata((s) => s.userCodebooks);
  return findCodebook(id, userCodebooks);
}

export function useAllCodebooks(): Codebook[] {
  const userCodebooks = useStrata((s) => s.userCodebooks);
  return [...BUILTIN_CODEBOOKS, ...userCodebooks];
}

export function useActiveDocument(): StrataDocument {
  const id = useStrata((s) => s.active_document_id);
  const documents = useStrata((s) => s.documents);
  return documents.find((d) => d.id === id) ?? documents[0];
}

/** Coded segments belonging to the currently active document. */
export function useActiveSegments(): CodedSegment[] {
  const id = useStrata((s) => s.active_document_id);
  const segments = useStrata((s) => s.segments);
  return segments.filter((s) => s.document_id === id);
}
