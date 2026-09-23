import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("a", props, children),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useChat: vi.fn(),
    DefaultChatTransport: vi.fn().mockImplementation(function DefaultChatTransportMock() { return {}; }),
  };
});

vi.mock("@/lib/audit-storage", () => ({
  loadAuditResult: vi.fn(),
  subscribeAuditStorage: vi.fn(() => vi.fn()),
  CHAT_STORAGE_KEY: "seo-audit-chat",
  CHAT_DOMAIN_KEY: "seo-audit-chat-domain",
  clearAuditStorage: vi.fn(),
}));

Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

const createMockIcon = (name: string) => {
  const Component = ({ ...props }: Record<string, unknown>) =>
    React.createElement("span", { "data-testid": `icon-${name}`, ...props });
  Component.displayName = `MockIcon${name}`;
  return Component;
};

const lucideIcons = [
  "Search", "CheckCircle2", "AlertTriangle", "XCircle", "Gauge", "ListChecks",
  "Sparkles", "ChevronDown", "Loader2", "RotateCcw", "TriangleAlert", "ArrowLeftRight",
  "CircleAlert", "Info", "ArrowRight", "Trophy", "DefaultChatTransport", "Check"
];

vi.mock("lucide-react", () => {
  const mockExports: Record<string, React.ComponentType<Record<string, unknown>>> = {};
  for (const name of lucideIcons) {
    mockExports[name] = createMockIcon(name);
  }
  return mockExports;
});

vi.mock("recharts", () => ({
  Bar: vi.fn(() => null),
  BarChart: vi.fn(({ children, ...props }: Record<string, unknown>) => React.createElement("div", props, children)),
  CartesianGrid: vi.fn(() => null),
  Cell: vi.fn(() => null),
  ResponsiveContainer: vi.fn(({ children }: Record<string, unknown>) => React.createElement("div", null, children)),
  Tooltip: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: vi.fn(() => false),
}));