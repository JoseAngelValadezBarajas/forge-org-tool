# @forge-org/tokens

The versioned Forge design-token contract. `tokens.css` emits dark and light semantic variables, and `tokens.json` is the machine-readable source used to generate it.

Status tones expose `--forge-info` and `--forge-status-*-bg` tokens. Dark values
were transcribed from the reviewed Figma component variables; light background
values are code-side contrast adaptations because no corresponding light-mode
Figma values were confirmed. They are implementation tokens, not changes to
the Figma library variables, and remain subject to human visual review.

The SearchField master defines dark `surface-interactive` (`#1b1f22`) and
`surface-tag` (`#202428`) surfaces. These are emitted as semantic tokens;
light-mode values are code adaptations (`#fbfaf8` and `#f6f5f2`) and have not
been visually certified.

Build and validate with `npm run build --workspace=@forge-org/tokens` and `npm test --workspace=@forge-org/tokens`. Package consumers should import `@forge-org/tokens/tokens.css`; applications must not depend on the package's source directory.
