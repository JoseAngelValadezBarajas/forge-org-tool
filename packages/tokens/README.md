# @forge-org/tokens

The versioned Forge design-token contract. `tokens.css` emits dark and light semantic variables, and `tokens.json` is the machine-readable source used to generate it.

Build and validate with `npm run build --workspace=@forge-org/tokens` and `npm test --workspace=@forge-org/tokens`. Package consumers should import `@forge-org/tokens/tokens.css`; applications must not depend on the package's source directory.
