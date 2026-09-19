"use client";

import { useState, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, XCircle, Loader2 } from "lucide-react";

type ChatActionButtonProps = {
  onAction: (e?: React.FormEvent) => Promise<{ success: boolean }>;
  disabled?: boolean;
  label?: string;
  retryLabel?: string;
};

type ButtonState =
  | "idle"
  | "loading"
  | "success"
  | "error";

export function ChatActionButton({
  onAction,
  disabled = false,
  label: labelProp = "Send message",
  retryLabel = "Retry",
}: ChatActionButtonProps) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<ButtonState>("idle");

  const guardRef = useRef(0);
  const isInFlight = () => {
    guardRef.current += 1;
    return guardRef.current > 1;
  };

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    if (isInFlight() || reducedMotion && state !== "idle") return;
    e.preventDefault();

    setState("loading");

    try {
      await onAction();
      setState("success");
    } catch {
      setState("error");
    }
  }, [onAction, reducedMotion, state]);

  const getLabel = useCallback(() => {
    if (state === "error") return retryLabel;
    return state !== "idle" ? "" : labelProp;
  }, [state, retryLabel, labelProp]);

  return (
    <button
      type="button"
      disabled={disabled || state !== "idle"}
      onClick={handleClick}
      className="relative inline-flex items-center rounded-lg border border-border bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-ring/50 hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      aria-busy={state !== "idle"}
      aria-label={state === "loading" ? "Sending…" : getLabel()}
    >
      <span className="relative inline-block px-4 py-2 text-sm font-medium">
        {state !== "loading" && <span>{getLabel()}</span>}
      </span>

      {state === "loading" && (
        <div className="relative flex size-4 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Loader2 aria-hidden="true" className="size-3.5" />
        </div>
      )}

      {state === "success" && (
        <div className="relative flex size-4 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Check aria-hidden="true" className="size-3.5" />
        </div>
      )}

      {state === "error" && (
        <div className="relative flex size-4 shrink-0 items-center justify-center rounded-md bg-primary/10 text-danger">
          <XCircle aria-hidden="true" className="size-3.5" />
          <span className="ml-2 text-xs text-danger/80">{retryLabel}</span>
        </div>
      )}
    </button>
  );
}