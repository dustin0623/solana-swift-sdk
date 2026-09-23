# Match the reference playground and menu

## Goal
Bring the SolanaXPH playground, documentation pages, and navigation into the same structure and interaction model as the `/ref` HiveXPH site, while keeping all SolanaXPH SDK calls, safety labels, and content.

## Changes
- Move the shared two-row header to the root layout so every page uses the same menu, instead of each page mounting its own shell.
- Match the reference menu behavior: Docs and API Reference tabs, documentation-only sidebar toggle, desktop collapse, mobile overlay drawer, active-item styling, nested expandable groups, and playground flask markers.
- Reshape the SolanaXPH navigation into a hierarchical documentation tree that places interactive tools beside the related guides.
- Place the playground inside the documentation frame and add a reference-style playground overview with grouped tool links.
- Split the current long playground into focused screens for transaction reading, accounts/RPC, tokens, PDA tools, payment simulation, and token trading, reusing the existing real SDK logic rather than duplicating it.
- Match the reference playground presentation: page header, compact bordered panels, consistent fields/actions, structured output and error panels, and clear network/demo safety state.
- Keep existing documentation articles and APIs unchanged, then update links, search results, previous/next navigation, and page metadata for the new paths.

## Verification
- Check desktop and mobile navigation, sidebar collapse/drawer behavior, search, active menu states, documentation pages, and every playground screen.
- Run the existing SDK tests, TypeScript check, and package/frontend builds through the project harness.
