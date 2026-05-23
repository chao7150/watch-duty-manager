# Icons accessibility notes

All icon SVGs include `aria-hidden="true"` and `focusable="false"` so they are
hidden from assistive technology. The generic `<title>icon</title>` has been
removed.

Accessibility is handled at usage sites:
- **Decorative icons** (alongside text): rely on the adjacent text for context.
- **Meaning-bearing standalone icons**: the interactive parent element (button,
  summary, etc.) provides an accessible name via `aria-label` or `title`.

This keeps accessibility intent at usage sites, not globally in icon files.
