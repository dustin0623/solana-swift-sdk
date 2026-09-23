# Match the Reference Documentation Layout

## Goal
Rebuild the SolanaXPH documentation shell to faithfully follow the live HiveXPH reference layout, while retaining SolanaXPH branding, routes, and documentation content.

## Changes
- Replace the current simple header with the reference-style two-row header:
  - compact brand bar with SolanaXPH identity, documentation search, GitHub, and package link
  - lower section bar with the sidebar control and Docs / API Reference navigation
- Replace the basic documentation list with a responsive navigation tree:
  - grouped sections with a thin active indicator
  - collapsible nested groups where useful
  - sticky desktop sidebar and overlay drawer on smaller screens
- Rework each documentation article into the same three-column reading layout:
  - left navigation
  - focused article column with eyebrow, title, summary, content, and previous/next links
  - sticky “On this page” outline generated from article sections
- Restyle documentation typography, spacing, borders, code samples, notes, scrollbars, and active states to match the reference’s dark technical aesthetic.
- Upgrade search into a keyboard-accessible documentation dialog instead of filtering only the sidebar.
- Keep the current dynamic `/docs/$slug` route and existing SolanaXPH documentation data; no SDK behavior changes.
- Ensure the documentation remains usable at desktop and mobile widths and keep route-specific page metadata intact.

## Technical Notes
- Reuse the project’s existing TanStack routing and UI primitives.
- Add small focused layout/navigation/search components rather than copying the reference application wholesale.
- Define all new visual roles as semantic tokens in the global stylesheet.
- Derive article outline entries from documentation blocks by extending the existing documentation data model with titled sections.

## Verification
- Check the documentation page visually against the live reference at desktop and mobile sizes.
- Verify sidebar opening/closing, search, navigation, active states, page outline anchors, code copying, and previous/next links.
- Confirm the app’s automated build checks remain clean.
