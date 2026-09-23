import { createFileRoute, redirect } from "@tanstack/react-router";

// Old URL: the playground now lives under /docs.
export const Route = createFileRoute("/playground")({
  beforeLoad: () => {
    throw redirect({ to: "/docs/playground", statusCode: 301 });
  },
});
