import { DOCS, type DocSection } from "./docs";

export interface DocsNavSection {
  title: DocSection["group"];
  items: DocSection[];
}

export const docsNav: DocsNavSection[] = Array.from(new Set(DOCS.map((doc) => doc.group))).map(
  (title) => ({ title, items: DOCS.filter((doc) => doc.group === title) }),
);

export function adjacentDocs(slug: string) {
  const index = DOCS.findIndex((doc) => doc.slug === slug);
  return {
    previous: index > 0 ? DOCS[index - 1] : undefined,
    next: index >= 0 && index < DOCS.length - 1 ? DOCS[index + 1] : undefined,
  };
}