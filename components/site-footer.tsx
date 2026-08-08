import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          SEO Audit Dashboard — FlyRank AI capstone project.
        </p>
        <Link
          href="/health"
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Health
        </Link>
      </div>
    </footer>
  );
}
