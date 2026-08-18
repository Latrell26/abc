import { useState, useCallback } from "react";
import { ModalDialog } from "./ModalDialog";
import { Tabs } from "./Tabs";
import { Disclosure } from "./Disclosure";

function useModalControl() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}

export function Playground() {
  const modalState = useModalControl();
  const tabsData = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <div>
          <h3>Project Overview</h3>
          <p>
            This is the overview panel. It demonstrates automatic tab activation
            and proper ARIA role assignments. Try navigating with arrow keys.
          </p>
        </div>
      ),
    },
    {
      id: "details",
      label: "Details",
      content: (
        <div>
          <h3>Technical Details</h3>
          <p>
            Each tab panel has <code>role=&quot;tabpanel&quot;</code> and{" "}
            <code>aria-labelledby</code> pointing back to its tab trigger. The
            active tab has <code>aria-selected=&quot;true&quot;</code>.
          </p>
        </div>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      content: (
        <div>
          <h3>Configuration</h3>
          <p>
            Press Tab to move focus into this panel. The panel is focusable via{" "}
            <code>tabIndex={0}</code> because it contains no other focusable
            elements. Press Home/End to jump to the first/last tab.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1>A11y Playground</h1>
      <p style={{ marginBottom: "1.5rem", color: "#475569" }}>
        Three interactive components built from scratch against the W3C ARIA
        Authoring Practices. Test each one with keyboard only.
      </p>

      {/* ── Modal Dialog ── */}
      <section>
        <h2>1. Modal Dialog</h2>
        <p style={{ marginBottom: "1rem", color: "#475569" }}>
          Click the button or press Enter to open. Tab cycles through the
          dialog&apos;s focusable elements. Escape closes it. Focus returns to
          the trigger button.
        </p>
        <button
          className="btn-open"
          onClick={modalState.open}
        >
          Open Dialog
        </button>
        <ModalDialog
          open={modalState.isOpen}
          onClose={modalState.close}
          title="Confirm Action"
          description="This is a modal dialog. Focus is trapped inside — try Tab and Shift+Tab to verify. Press Escape to close."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Your name</span>
              <input
                type="text"
                placeholder="Enter your name"
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              />
            </label>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={modalState.close}>
                Cancel
              </button>
              <button className="btn-primary" onClick={modalState.close}>
                Confirm
              </button>
            </div>
          </div>
        </ModalDialog>
      </section>

      {/* ── Tabs ── */}
      <section>
        <h2>2. Tabs</h2>
        <p style={{ marginBottom: "1rem", color: "#475569" }}>
          Left/Right arrows move between tabs. Home/End jump to first/last. Tab
          moves focus into the active panel.
        </p>
        <Tabs tabs={tabsData} label="Demo tabs" />
      </section>

      {/* ── Disclosure ── */}
      <section>
        <h2>3. Disclosure (Show/Hide)</h2>
        <p style={{ marginBottom: "1rem", color: "#475569" }}>
          Enter or Space toggles the content. The button has{" "}
          <code>aria-expanded</code> and <code>aria-controls</code>.
        </p>
        <Disclosure label="What is an SEO audit?">
          <p>
            An SEO audit scans a website for technical issues that affect search
            engine visibility — things like missing title tags, broken links, slow
            page speed, and poor heading structure.
          </p>
        </Disclosure>
        <Disclosure label="How does the AI summary work?">
          <p>
            After all deterministic checks finish, the structured findings are
            sent to the Gemini API (free tier). It produces a plain-language
            summary and prioritized fix recommendations — no jargon, just
            actionable steps.
          </p>
        </Disclosure>
        <Disclosure label="Is my data stored?">
          <p>
            No. In the MVP, audits are ephemeral. Nothing is persisted to a
            database. A future version may add Supabase for audit history and
            score trends.
          </p>
        </Disclosure>
      </section>
    </div>
  );
}
