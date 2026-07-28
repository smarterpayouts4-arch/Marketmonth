# Example: SEO / LLM readiness

## Input

```text
We need to make this easier for Google and AI systems to understand.
Go through it and improve it.
```

## Expected routing

- `improve-seo-and-llm-readiness`
- Often pair with `audit-existing-system` first if scope is vague
- `test-and-verify` before claiming rendered fixes

## Interpretation

- SEO + LLM-readiness investigation
- Determine affected pages/entities
- Inspect metadata, structured data, hierarchy, internal links, rendered output
- Avoid unsupported health/product/retailer claims (product-context PRODUCT.md)
- Separate findings from implementation unless user asked to fix
- Use integrity/SEO tooling listed in COMMANDS.md / Project MCP when available
- Verify rendered results; do not treat stubs as production proof
