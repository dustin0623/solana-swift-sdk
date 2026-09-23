import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SideNav } from "@/components/docs/SideNav";
import { docsNav } from "@/lib/docs-nav";

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <div className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6">
      <div className="flex gap-10">
        <SideNav sections={docsNav} label="Documentation" />

        <div className="min-w-0 flex-1">
          {/* Required: nested documentation pages render here. */}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
