/**
 * Single source of truth for branding, version and external package links.
 * Keep UI components free of hardcoded names, versions and URLs.
 */
export const SITE = {
  name: "HiveXPH SDK",
  packageName: "hivexph-sdk",
  subtitle: "Developer toolkit for Hive Custom JSON and Hive Engine transactions.",
  description:
    "A TypeScript SDK for building, broadcasting, reading and streaming Hive Custom JSON transactions.",
  /** Mirrors package-manager/package.json — update both together when releasing. */
  version: "1.2.0",
} as const;

/**
 * External links. `null` means the URL is not configured yet, and the UI
 * hides the link instead of pointing at an invented repository.
 */
export const PACKAGE_LINKS: { github: string | null; npm: string | null } = {
  github: "https://github.com/rhiaji/hivex-sdk",
  npm: "https://www.npmjs.com/package/hivexph-sdk",
};

export const versionLabel = `v${SITE.version}`;
