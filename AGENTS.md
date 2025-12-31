# Rules

1. ALWAYS use GH CLI key commands to access repo files:

- `gh repo view`
- `gh api`

2. AlWAYS check `@opentui/core`/`@opentui/react` (sst/opentui) repo docs as primary source of truth, best practices, recommendations and main decision-making guide:

- README.md file
- packages/core/README.md file
- packages/core/docs/ folder
- packages/core/examples/ folder
- packages/react/README.md file
- packages/react/docs/ folder
- packages/react/examples/ folder

3. ALWAYS recheck plan state to make sure it strictly follows it.

4. In the end, ALWAYS run `bun tsc --noEmit` and `bun dev` to check if app properly compiles and have no errors.
