"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/results", label: "Dashboard" },
  { href: "/results/ai-summary", label: "AI Summary" },
];

export function ResultsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Results sections"
      className="flex gap-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary"
                : "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
