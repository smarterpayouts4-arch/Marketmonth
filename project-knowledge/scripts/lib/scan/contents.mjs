import { buildArtifactBundle } from "./artifacts.mjs";
import { normalizeText } from "./fs.mjs";
import { mdTable } from "./md.mjs";
import { GENERATED_HEADER } from "./roots.mjs";

/** Build expected generated file contents (normalized, without writing). */
export function buildGeneratedContents(root) {
  const b = buildArtifactBundle(root);

  const routeMd = normalizeText(
    `# ROUTE_MAP\n\n` +
      `Scanned \`src/app/**/page.tsx\` via \`resolve-next-route.mjs\`. Route groups \`(name)\` omitted from URLs.\n\n` +
      mdTable(
        ["route", "sourceFile", "expectedSurface", "expectedStage"],
        b.routes.map((r) => [
          r.route,
          `\`${r.sourceFile}\``,
          r.expectedSurface,
          r.expectedStage,
        ])
      ) +
      (b.duplicateRoutes.length
        ? `\n\n## Duplicate resolved routes\n\n` +
          b.duplicateRoutes
            .map(
              (d) =>
                `- \`${d.route}\`: ${d.files.map((f) => `\`${f}\``).join(", ")}`
            )
            .join("\n")
        : `\n\n## Duplicate resolved routes\n\nNone.\n`)
  );

  const apiMd = normalizeText(
    `# API_MAP\n\n` +
      mdTable(
        ["path", "sourceFile"],
        b.apis.map((a) => [a.path, `\`${a.sourceFile}\``])
      ) +
      "\n"
  );

  const envMd = normalizeText(
    `# ENV_MAP\n\n` +
      `Names only from \`.env.example\` + static \`process.env.*\` in \`src/\`. Never reads \`.env.local\` values.\n\n` +
      mdTable(
        ["Variable", "inEnvExample", "referencedInSrc", "Classification"],
        b.envRows.map((e) => [
          e.variable,
          e.inEnvExample ? "Yes" : "No",
          e.referencedInSrc ? "Yes" : "No",
          e.classification,
        ])
      ) +
      "\n"
  );

  const ownMd = normalizeText(
    `# FILE_OWNERSHIP\n\n` +
      `From \`ownership-rules.json\` matched against \`src/**\`.\n\n` +
      `## Unowned paths (${b.ownership.unowned.length})\n\n` +
      (b.ownership.unowned.length
        ? b.ownership.unowned
            .slice(0, 200)
            .map((p) => `- \`${p}\``)
            .join("\n") +
          (b.ownership.unowned.length > 200
            ? `\n\n…and ${b.ownership.unowned.length - 200} more\n`
            : "\n")
        : "None.\n") +
      `\n## Sample owned paths\n\n` +
      b.ownership.mapped
        .slice(0, 80)
        .map((m) => `- \`${m.path}\` → **${m.owner}**`)
        .join("\n") +
      "\n"
  );

  const files = {
    "maps/ROUTE_MAP.md": GENERATED_HEADER + routeMd,
    "maps/API_MAP.md": GENERATED_HEADER + apiMd,
    "maps/ENV_MAP.md": GENERATED_HEADER + envMd,
    "maps/FILE_OWNERSHIP.md": GENERATED_HEADER + ownMd,
    "indexes/manifest.json": normalizeText(JSON.stringify(b.manifest, null, 2)),
    "indexes/docs-index.json": normalizeText(
      JSON.stringify(b.docsIndex, null, 2)
    ),
  };

  return { files, bundle: b };
}
