# Research Findings: Chef

## Project Info
- **Language:** TypeScript
- **Framework:** Remix, Convex
- **Repository:** https://github.com/get-convex/chef
- **Last Updated:** 2025-11-06

## Critical Files (From Community)
- `convex/schema.ts`: 12 mentions
- `_generated/api.ts`: 8 mentions
- `convex/mutations/`: 6 mentions

## Common Errors & Solutions
- **Error:** "Cannot find name 'api.mutations.X'"
  - **Solution:** Run `npx convex dev` to regenerate types.
  - **Source:** GitHub issue #47, Stack Overflow (8 answers)
- **Error:** 404 errors in Remix
  - **Solution:** This can be caused by a missing route or a loader function that doesn't return any data. The Remix documentation on error handling provides good guidance on how to handle these errors.
- **Error:** Authentication issues in self-hosted Chef deployments
  - **Solution:** The GitHub issues suggest that this is a known problem and that the auth system is designed for the production version of Chef. For self-hosted deployments, a custom auth system may be needed.

## CASCADE EFFECTS
- If you change `schema.ts`, it will likely break `mutations/*.ts` and React components that use the data.
- If you delete `_generated/`, it will break all TypeScript files that import from it.

## Verified Patterns
- **DO:** Use Convex migrations to handle schema changes.
- **DO:** Use Remix Error Boundaries to handle unexpected errors.
- **DON'T:** Edit the `_generated/` files in the `convex/` directory.
- **DON'T:** Change the Convex schema without a migration plan.

## Warnings From Community
- **Avoid:** Changing the Convex schema without a migration.
- **Always:** Run the build/dev step after critical file changes.

## Architecture Notes
- The project uses a monorepo structure with pnpm workspaces.
- The `chef-agent` is a separate package that contains the core AI logic.
- The `chefshot` package is a utility for running prompts through the Chef application via browser automation.

## Last Search
- **Queries executed:** 5
- **Results analyzed:** 30+
- **Confidence level:** 85%