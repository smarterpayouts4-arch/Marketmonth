/** Env marker required before migrate / reset / seed / publish. */
export const MARKETMONTH_DB_MARKER_ENV = "MARKETMONTH_DB_MARKER";

/** Expected env marker value for local development Neon. */
export const MARKETMONTH_DB_MARKER_DEV = "marketmonth-dev";

/** Resident application id stored in app_metadata. */
export const MARKETMONTH_APPLICATION_ID = "marketmonth";

/** Schema version stamped into app_metadata (bump with structural migrations). */
export const MARKETMONTH_SCHEMA_VERSION = 7;

export type MarketMonthEnvironment = "development" | "test" | "production";
