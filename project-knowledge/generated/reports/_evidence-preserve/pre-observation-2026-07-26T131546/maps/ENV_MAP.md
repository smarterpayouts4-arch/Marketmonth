<!-- GENERATED FILE: DO NOT EDIT -->
<!-- Source: project-knowledge/scripts/update.mjs -->
# ENV_MAP

Names only from `.env.example` + static `process.env.*` in `src/`. Never reads `.env.local` values.

| Variable | inEnvExample | referencedInSrc | Classification |
| --- | --- | --- | --- |
| AUTH_SECRET | Yes | Yes | server-only |
| AUTH_URL | Yes | Yes | server-only |
| DATABASE_URL | Yes | Yes | server-only |
| DEV_AUTH_BYPASS | Yes | No | documented-unused |
| DISCOVERY_PLAYWRIGHT | No | Yes | undocumented |
| GOOGLE_CLIENT_ID | Yes | Yes | server-only |
| GOOGLE_CLIENT_SECRET | Yes | Yes | server-only |
| JSON2VIDEO_API_KEY | No | Yes | undocumented |
| MM_IMAGE_API_KEY | No | Yes | undocumented |
| MM_IMAGE_MODEL | No | Yes | undocumented |
| MM_IMAGE_PROVIDER | No | Yes | undocumented |
| MM_IMAGE_RENDER | No | Yes | undocumented |
| MM_VOICE_MODEL | No | Yes | undocumented |
| MM_VOICE_PROVIDER | No | Yes | undocumented |
| NEXT_PUBLIC_APP_URL | Yes | Yes | client-exposed |
| NEXT_PUBLIC_SITE_URL | Yes | Yes | client-exposed |
| NODE_ENV | Yes | Yes | server-only |
| OPENAI_API_KEY | Yes | Yes | server-only |
| OPENAI_CONTENT_BRAIN_MODEL | No | Yes | undocumented |
| OPENAI_DISCOVERY_MODEL | Yes | Yes | server-only |
| PERPLEXITY_API_KEY | Yes | Yes | server-only |
| PERPLEXITY_SEO_MODEL | Yes | Yes | server-only |
| PERPLEXITY_SEO_TIMEOUT_MS | Yes | Yes | server-only |
| SITE_ORIGIN | Yes | Yes | server-only |
