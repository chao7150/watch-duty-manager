# Icons accessibility notes

Current status:
- To satisfy Biome `lint/a11y/noSvgWithoutTitle`, each icon currently includes `<title>icon</title>`.
- This is a temporary lint-pass approach and does not provide meaningful accessible names.

Planned follow-up:
1. Define icon accessibility policy by usage:
   - Decorative icons: `aria-hidden="true"` and `focusable="false"`.
   - Meaning-bearing standalone icons: provide explicit accessible name from call site (for example, button `aria-label`).
2. Remove generic fixed title text from icon components.
3. Keep accessibility intent at usage sites, not globally in all icon files.

Notes:
- This follow-up was intentionally postponed in the current change set.
