import { shortHash } from "@/brain/content/evidence";
import { wordSafeClamp } from "@/brain/lib/word-safe-clamp";
import {
  assertStrategyLock,
  buildStrategyLock,
} from "@/brain/strategy-lock";

import type { YouTubeVideoFormatPackage } from "../schemas/format-package";
import {
  buildIdempotencyKey,
  collectUnresolvedResearch,
  evidenceRefsFromAtom,
  resolvePackageStatus,
  type ContentFormatAdapter,
  type FormatProductionInput,
  type FormatValidationResult,
} from "./types";

export const YOUTUBE_VIDEO_ADAPTER_VERSION = "youtube-video-format-v1" as const;
export const YOUTUBE_VIDEO_TEMPLATE_VERSION =
  "youtube-video-template-v1" as const;

function clamp(value: string, max: number): string {
  return wordSafeClamp(value, max);
}

/**
 * Long-form adapter — restructures the atom into chapters independently.
 * Must not pad or copy a Short script.
 */
export const youtubeVideoAdapter: ContentFormatAdapter<YouTubeVideoFormatPackage> =
  {
    formatId: "youtube_video",
    adapterVersion: YOUTUBE_VIDEO_ADAPTER_VERSION,
    templateVersion: YOUTUBE_VIDEO_TEMPLATE_VERSION,

    canProduce(input) {
      return (
        input.format.id === "youtube_video" &&
        (input.atom.approvalStatus === "locked" ||
          input.atom.approvalStatus === "approved")
      );
    },

    async produce(input: FormatProductionInput): Promise<YouTubeVideoFormatPackage> {
      const { atom, validationReport, atomRevision } = input;
      const lock = buildStrategyLock(atom);
      const claimIds = [atom.kernel.central_claim.claim_id];
      const proofIds = atom.kernel.supporting_proof.map((p) => p.proof_id);
      const lockCheck = assertStrategyLock(atom, lock, {
        claim_ids: claimIds,
        proof_ids: proofIds,
      });
      if (!lockCheck.ok) {
        throw new Error(lockCheck.violations.join("; "));
      }

      const narrative = atom.narrativeModules[atom.lineage.angle];
      const spine = narrative?.canonicalNarrativeSpine;
      const framework = narrative?.framework ?? [];
      const steps = narrative?.steps ?? [];

      const openingHook = clamp(
        atom.kernel.hook_strategy.opening_intent ||
          atom.kernel.hook_strategy.planted_question,
        400
      );

      const chapterSources: Array<{
        title: string;
        narration: string;
        keyPoint: string;
        visual: string;
        seconds: number;
      }> = [
        {
          title: "Hook — why this decision feels hard",
          narration: clamp(
            [
              openingHook,
              atom.kernel.audience_problem,
              atom.kernel.core_tension,
            ].join(" "),
            4000
          ),
          keyPoint: clamp(atom.kernel.audience_problem, 280),
          visual: clamp(
            `16:9 establishing shot: ${atom.engagementBlueprint.visual_concept}. Tension: ${atom.kernel.core_tension}`,
            800
          ),
          seconds: 45,
        },
        {
          title: "The belief that quietly misleads",
          narration: clamp(
            [
              `Most people start from: ${atom.kernel.belief_shift.from}`,
              spine?.explanation || atom.kernel.why_problem_exists,
              `The shift: ${atom.kernel.belief_shift.to}`,
            ].join(" "),
            4000
          ),
          keyPoint: clamp(atom.kernel.belief_shift.to, 280),
          visual: clamp(
            `Belief contrast visual (no new claims): ${atom.kernel.belief_shift.from} → ${atom.kernel.belief_shift.to}`,
            800
          ),
          seconds: 60,
        },
        {
          title: "The central claim, with proof",
          narration: clamp(
            [
              atom.kernel.central_claim.canonical_wording,
              ...atom.kernel.supporting_proof
                .slice(0, 4)
                .map((p) => p.meaning),
              atom.kernel.hook_strategy.resolution || atom.kernel.resolution,
            ].join(" "),
            4000
          ),
          keyPoint: clamp(atom.kernel.central_claim.meaning, 280),
          visual: clamp(
            `Evidence-forward 16:9: ${atom.kernel.central_claim.meaning}`,
            800
          ),
          seconds: 75,
        },
      ];

      // Expand with framework / steps as additional chapters (long-form depth).
      const extras = [
        ...framework.map((line, i) => ({
          title: `Check ${i + 1}: ${clamp(line, 60)}`,
          narration: clamp(
            `Apply this check carefully: ${line}. Keep it educational — no medical outcomes.`,
            4000
          ),
          keyPoint: clamp(line, 280),
          visual: clamp(`Chapter visual for checklist item: ${line}`, 800),
          seconds: 40,
        })),
        ...steps.map((line, i) => ({
          title: `Step ${i + 1}`,
          narration: clamp(line, 4000),
          keyPoint: clamp(line, 280),
          visual: clamp(`Practical step visual: ${line}`, 800),
          seconds: 35,
        })),
      ].slice(0, 4);

      if (extras.length === 0) {
        chapterSources.push({
          title: "How to apply this without guessing",
          narration: clamp(
            [
              atom.kernel.payoff,
              atom.kernel.intended_action,
              spine?.resolution || atom.kernel.resolution,
            ].join(" "),
            4000
          ),
          keyPoint: clamp(atom.kernel.payoff, 280),
          visual: clamp(
            `Payoff / next step visual: ${atom.kernel.intended_action}`,
            800
          ),
          seconds: 50,
        });
      } else {
        chapterSources.push(...extras);
      }

      chapterSources.push({
        title: "Close — what to do next",
        narration: clamp(
          [
            atom.kernel.payoff,
            `Your next move: ${atom.kernel.intended_action}`,
            atom.distributionContract.ctaIntent ?? "",
          ].join(" "),
          4000
        ),
        keyPoint: clamp(atom.kernel.intended_action, 280),
        visual: clamp(
          `Closing bridge visual (brand soft): ${atom.distributionContract.ctaIntent || atom.kernel.intended_action}`,
          800
        ),
        seconds: 40,
      });

      const chapters = chapterSources.map((c, i) => ({
        id: `ch_${i + 1}`,
        order: i,
        title: c.title,
        durationSeconds: c.seconds,
        narration: c.narration,
        visualPrompt: c.visual,
        keyPoint: c.keyPoint,
      }));

      // Two scenes per chapter for storyboard granularity (distinct from Short).
      const scenes = chapters.flatMap((ch, ci) => {
        const half = Math.max(8, Math.round(ch.durationSeconds / 2));
        return [
          {
            id: `s_${ci + 1}a`,
            order: ci * 2,
            durationSeconds: half,
            narration: clamp(ch.narration.slice(0, Math.ceil(ch.narration.length / 2)), 1200),
            onScreenText: clamp(ch.title, 80),
            visualPrompt: ch.visualPrompt,
            chapterId: ch.id,
          },
          {
            id: `s_${ci + 1}b`,
            order: ci * 2 + 1,
            durationSeconds: Math.max(8, ch.durationSeconds - half),
            narration: clamp(ch.narration.slice(Math.floor(ch.narration.length / 2)), 1200),
            onScreenText: clamp(ch.keyPoint, 80),
            visualPrompt: clamp(`${ch.visualPrompt} — detail beat`, 800),
            chapterId: ch.id,
          },
        ];
      });

      const durationSeconds = chapters.reduce(
        (s, c) => s + c.durationSeconds,
        0
      );
      const script = chapters
        .map((c) => `## ${c.title}\n${c.narration}`)
        .join("\n\n");

      const unresolved = collectUnresolvedResearch(atom, validationReport);
      const status = resolvePackageStatus(atom, unresolved);
      const key = buildIdempotencyKey({
        atomId: atom.atom_id,
        atomRevision,
        formatId: "youtube_video",
        adapterVersion: YOUTUBE_VIDEO_ADAPTER_VERSION,
        templateVersion: YOUTUBE_VIDEO_TEMPLATE_VERSION,
      });

      const title = clamp(
        atom.lineage.specificTopic || atom.lineage.masterTitle,
        120
      );

      return {
        id: `fmt_yt_video_${shortHash(`${atom.atom_id}|${atomRevision}|${key}`)}`,
        atomId: atom.atom_id,
        atomRevision,
        formatId: "youtube_video",
        status,
        title,
        description: clamp(
          `${atom.kernel.central_claim.canonical_wording} ${atom.kernel.payoff}`,
          2000
        ),
        durationSeconds,
        aspectRatio: "16:9",
        openingHook,
        voiceoverPrompt: clamp(
          `Long-form educational narration, calm and clear. Chapters:\n${chapters.map((c) => `- ${c.title}`).join("\n")}\n\nFull script:\n${script}`,
          4000
        ),
        imagePrompt: clamp(
          `${atom.engagementBlueprint.visual_concept}. 16:9 thumbnail energy for: ${title}`,
          800
        ),
        script,
        chapters,
        scenes,
        thumbnailPrompt: clamp(
          `YouTube thumbnail (no text baked in): ${atom.kernel.hook_strategy.planted_question}`,
          800
        ),
        audienceAction: clamp(atom.kernel.intended_action, 280),
        brandBridge:
          clamp(atom.distributionContract.ctaIntent ?? "", 280) || undefined,
        disclaimer:
          atom.safety.banned_claims[0] != null
            ? clamp(
                `Educational only. Avoid: ${atom.safety.banned_claims.slice(0, 2).join("; ")}`,
                280
              )
            : "Educational only — not medical advice.",
        evidenceRefs: evidenceRefsFromAtom(atom),
        unresolvedResearch: unresolved,
        warnings: [
          ...(validationReport?.warnings?.map((w) => w.message) ?? []),
          "Visual preview only — image/voice/video render stubs are not live.",
          "Long-form package is a structured draft, not a finished render.",
        ],
        generation: {
          provider: "deterministic",
          model: "none",
          templateVersion: YOUTUBE_VIDEO_TEMPLATE_VERSION,
          adapterVersion: YOUTUBE_VIDEO_ADAPTER_VERSION,
          generatedAt: new Date().toISOString(),
          idempotencyKey: key,
        },
      };
    },

    validate(
      output: YouTubeVideoFormatPackage,
      input: FormatProductionInput
    ): FormatValidationResult {
      const errors: string[] = [];
      const warnings: string[] = [];
      if (output.atomId !== input.atom.atom_id) {
        errors.push("package atomId mismatch");
      }
      if (output.atomRevision !== input.atomRevision) {
        errors.push("package atomRevision mismatch");
      }
      if (output.aspectRatio !== "16:9") {
        errors.push("youtube_video must be 16:9");
      }
      if (output.chapters.length < 2) {
        errors.push("youtube_video requires at least 2 chapters");
      }
      if (!output.openingHook.trim()) {
        errors.push("openingHook required");
      }
      if (
        output.unresolvedResearch.length > 0 &&
        output.status !== "research_required"
      ) {
        errors.push("unresolved research must keep status research_required");
      }
      if (!output.audienceAction.trim()) {
        errors.push("audienceAction required");
      }
      // Distinctness vs short: script should mention chapter markers
      if (!output.script.includes("## ")) {
        warnings.push("long-form script missing chapter headings");
      }
      return { ok: errors.length === 0, errors, warnings };
    },
  };
