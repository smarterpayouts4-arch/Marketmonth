import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { BrandProfile, StrategyPreview } from "@/engine/discovery";
import type { CrawlMeta, DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

/** Profile lifecycle: draft is immutable after insert; publish copies to candidate then published. */
export type ProfileStatus =
  | "draft"
  | "publish_candidate"
  | "published"
  | "rejected";

export type PublicationStatus = "pending" | "complete" | "failed";

/** Auth.js adapter tables */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const brands = pgTable(
  "brands",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Stable development fixture key (e.g. dev-zynava). Null for normal brands. */
    devKey: text("dev_key"),
    name: text("name").notNull(),
    website: text("website").notNull(),
    /**
     * Published (gate-passed) brand_profiles row for materialize → CSV.
     * Draft Analyze inserts do not update this until publish:company-profile.
     */
    publishedBrandProfileId: text("published_brand_profile_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("brands_dev_key_idx").on(table.devKey)]
);

export const websiteAnalyses = pgTable(
  "website_analyses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    brandId: text("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    normalizedUrl: text("normalized_url").notNull(),
    crawlMeta: jsonb("crawl_meta").$type<CrawlMeta | Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("website_analyses_normalized_url_idx").on(table.normalizedUrl)]
);

export const brandProfiles = pgTable("brand_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => websiteAnalyses.id, { onDelete: "cascade" }),
  brandId: text("brand_id").references(() => brands.id, {
    onDelete: "set null",
  }),
  profile: jsonb("profile").$type<BrandProfile>().notNull(),
  evidence: jsonb("evidence").$type<DiscoveryEvidence[]>().default([]),
  /** Lifecycle status — published rows are immutable knowledge payloads. */
  status: text("status").$type<ProfileStatus>().notNull().default("draft"),
  /** When status is candidate/published, the raw draft this came from. */
  sourceDraftProfileId: text("source_draft_profile_id"),
  /** Stable hash of approved knowledge (post-overrides), excludes timestamps/ids. */
  knowledgeHash: text("knowledge_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const strategyPreviews = pgTable("strategy_previews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  brandProfileId: text("brand_profile_id")
    .notNull()
    .references(() => brandProfiles.id, { onDelete: "cascade" }),
  preview: jsonb("preview").$type<StrategyPreview>().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

/** Dual DB marker — must match MARKETMONTH_DB_MARKER env for mutate ops. */
export const appMetadata = pgTable("app_metadata", {
  applicationId: text("application_id").primaryKey(),
  environment: text("environment").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/** Cross-store publish recovery (Neon pointer + filesystem CSV). */
export const companyPublications = pgTable("company_publications", {
  publicationId: text("publication_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").notNull(),
  brandProfileId: text("brand_profile_id")
    .notNull()
    .references(() => brandProfiles.id, { onDelete: "cascade" }),
  knowledgeHash: text("knowledge_hash").notNull(),
  status: text("status").$type<PublicationStatus>().notNull().default("pending"),
  previousBrandProfileId: text("previous_brand_profile_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

/** CSV v2 artifacts (draft/approved) — serverless-safe mirror of disk store. */
export const companyProfileArtifacts = pgTable(
  "company_profile_artifacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id").notNull(),
    state: text("state").$type<"draft" | "approved">().notNull(),
    csvText: text("csv_text").notNull(),
    artifactHash: text("artifact_hash").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("company_profile_artifacts_company_state_idx").on(
      table.companyId,
      table.state
    ),
  ]
);
