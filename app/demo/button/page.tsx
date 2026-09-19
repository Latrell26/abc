"use client";

import { useState, useCallback } from "react";
import { ChatActionButton } from "@/components/ui/ChatActionButton";

function fakeAsync(success: boolean, delayMs: number): Promise<{ success: boolean }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({ success: true });
      } else {
        reject(new Error("Simulated failure"));
      }
    }, delayMs);
  });
}

export default function ButtonDemoPage() {
  const [lastResult, setLastResult] = useState<"success" | "error" | null>(null);
  const [lastDelay, setLastDelay] = useState<number | null>(null);

  const handleSuccess = useCallback(async () => {
    setLastResult(null);
    const delay = Math.floor(Math.random() * 700) + 800; // 800-1500ms
    setLastDelay(delay);
    try {
      await fakeAsync(true, delay);
      setLastResult("success");
      return { success: true };
    } catch {
      setLastResult("error");
      return { success: false };
    }
  }, []);

  const handleFailure = useCallback(async () => {
    setLastResult(null);
    const delay = Math.floor(Math.random() * 700) + 800; // 800-1500ms
    setLastDelay(delay);
    // 20% failure rate
    const shouldFail = Math.random() < 0.2;
    try {
      await fakeAsync(!shouldFail, delay);
      setLastResult(shouldFail ? "error" : "success");
      return { success: !shouldFail };
    } catch {
      setLastResult("error");
      return { success: false };
    }
  }, []);

  const handleErrorRetry = useCallback(async () => {
    setLastResult(null);
    const delay = Math.floor(Math.random() * 700) + 800;
    setLastDelay(delay);
    try {
      await fakeAsync(true, delay);
      setLastResult("success");
      return { success: true };
    } catch {
      setLastResult("error");
      return { success: false };
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Button Lifecycle Demo</h1>
        <p className="mt-2 text-muted-foreground">
          Demonstrates choreographed state transitions using ChatActionButton component.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Test Success</h2>
        <p className="text-sm text-muted-foreground">
          Click to trigger a guaranteed success after a random delay (800–1500ms).
        </p>
        <ChatActionButton
          onAction={handleSuccess}
          label="Send message"
        />
        {lastResult === "success" && (
          <p className="text-sm text-green-600 dark:text-green-400" role="status">
            ✓ Success! (delay: {lastDelay}ms)
          </p>
        )}
        {lastResult === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400" role="status">
            ✗ Unexpected error (delay: {lastDelay}ms)
          </p>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Test Failure (20% rate)</h2>
        <p className="text-sm text-muted-foreground">
          Click to trigger a random outcome — 20% chance of failure after a random delay (800–1500ms).
        </p>
        <ChatActionButton
          onAction={handleFailure}
          label="Test random outcome"
        />
        {lastResult === "success" && (
          <p className="text-sm text-green-600 dark:text-green-400" role="status">
            ✓ Success! (delay: {lastDelay}ms)
          </p>
        )}
        {lastResult === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400" role="status">
              ✗ Failed (delay: {lastDelay}ms)
            </p>
            <ChatActionButton
              onAction={handleErrorRetry}
              label="Retry"
            />
          </div>
        )}
      </section>

      <section className="space-y-6 border-t pt-8">
        <h2 className="text-xl font-semibold">Duration & Easing Rationale</h2>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <ul className="space-y-2">
            <li><strong>150ms ease-out</strong> for state entry/exit &mdash; fast enough to feel instant, slow enough to perceive direction.</li>
            <li><strong>Spring(300, 30)</strong> for success checkmark &mdash; lively, confident &ldquo;pop&rdquo; without overshoot.</li>
            <li><strong>800ms pause</strong> on success before auto-reset — time to register positive outcome.</li>
            <li><strong>prefers-reduced-motion</strong> halves durations (&rarr;75ms) and disables shake; feedback preserved via color and label.</li>
            <li><strong>Compositor-friendly</strong> — only transform/opacity animated; no layout thrash.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-6 border-t pt-8">
        <h2 className="text-xl font-semibold">Second Button (Same Motion Language)</h2>
        <p className="text-sm text-muted-foreground">
          The Stop button in the chat panel shares the exact same component and motion language.
        </p>
        <ChatActionButton
          onAction={async () => {
            await new Promise(r => setTimeout(r, 500));
            return { success: true };
          }}
          label="Stop"
        />
      </section>
    </div>
  );
}