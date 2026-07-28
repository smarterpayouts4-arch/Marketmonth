# MarketMonth Discovery MCP (stdio).
# Intended for Docker MCP Toolkit custom catalog → profile marketmonth_development → gateway.
# Do not use docker compose for v1 — register the image in a custom catalog.

FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY mcp ./mcp
COPY src/engine/discovery ./src/engine/discovery
COPY src/db ./src/db
COPY project-knowledge ./project-knowledge
COPY AGENTS.md ./AGENTS.md
COPY docs ./docs
COPY tsconfig.json ./tsconfig.json

# Stdio MCP entry — gateway wires stdin/stdout
CMD ["npx", "tsx", "mcp/src/stdio-server.ts"]
