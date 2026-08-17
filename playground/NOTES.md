# Hand-Built vs shadcn/ui — Gap Analysis

## How shadcn/ui Works

shadcn/ui's dialog and tabs components are thin wrappers around **Base UI** (`@base-ui/react`), a headless component library from the MUI team. They handle all ARIA behavior, focus management, keyboard navigation, and portal rendering internally. The shadcn layer adds Tailwind styling and a consistent API surface.

---

## Gap 1: Portal Rendering (Dialog)

**shadcn:** `DialogContent` wraps its popup in `<DialogPortal>`, which renders the dialog at the root of the document body via `ReactDOM.createPortal`. This prevents z-index stacking issues, overflow clipping from parent containers, and ensures the dialog always appears above all other content.

**Hand-built:** The modal renders inline — wherever the `<ModalDialog>` component sits in the React tree, the overlay and dialog DOM go there. If a parent has `overflow: hidden` or a low `z-index`, the dialog gets clipped or hidden behind other elements.

**Why it matters:** In a real app with sidebars, sticky headers, or modals nested inside scrollable containers, inline rendering breaks the dialog visually. Portal rendering is table-stakes for production dialog components.

---

## Gap 2: Enter/Exit Animation Coordination (Dialog)

**shadcn:** The overlay and popup use `data-open` and `data-closed` state attributes (provided by Base UI) combined with Tailwind's `animate-in`/`animate-out` and `fade-in-0`/`fade-out-0`/`zoom-in-95`/`zoom-out-95` utilities. The dialog doesn't just appear — it fades and scales in, and reverses on close. Base UI coordinates the animation lifecycle: the dialog stays in the DOM until the exit animation completes.

**Hand-built:** The modal uses a hard conditional render (`if (!open) return null`). It appears and disappears instantly with no transition. Adding animations to an inline conditional render is tricky because the element is removed from the DOM before an exit animation can play.

**Why it matters:** Animations aren't cosmetic — they provide spatial context (where did this come from?) and reduce cognitive load. The animation lifecycle coordination (staying in DOM until animation ends) is something most developers miss when building from scratch.

---

## Gap 3: Body Scroll Lock (Dialog)

**shadcn:** Base UI automatically locks scroll on the `<body>` when the dialog is open, preventing the background page from scrolling while the modal is visible. This is done without manual `document.body.style.overflow` hacks — it handles edge cases like iOS Safari弹性滚动 (rubber-banding) and nested scrollable regions.

**Hand-built:** The modal sets `document.body.style.overflow = "hidden"` in a `useEffect`. This works on desktop but fails on iOS Safari, where the body can still scroll via touch events. It also doesn't handle the "scrollbar disappearing" layout shift.

**Why it matters:** Mobile users can scroll the background behind a modal on iOS with the simple `overflow: hidden` approach. Base UI handles the platform-specific quirks.

---

## Gap 4: Built-in Close Button (Dialog)

**shadcn:** `DialogContent` includes a default close button (`X` icon from lucide-react) positioned in the top-right corner, wrapped in `DialogPrimitive.Close`. It's focusable, announced by screen readers ("Close"), and can be hidden via the `showCloseButton` prop.

**Hand-built:** The consumer must manually add a close button and wire up the `onClose` handler. If they forget, there's no way to close the dialog other than Escape or clicking the overlay.

**Why it matters:** The close button is a UX safety net. shadcn makes it the default; the hand-built version puts the burden on the consumer.

---

## Gap 5: Vertical Orientation and Variant Support (Tabs)

**shadcn:** `Tabs` accepts an `orientation` prop (`"horizontal"` | `"vertical"`) that changes arrow key behavior — Left/Right for horizontal, Up/Down for vertical. `TabsList` also has a `variant` prop (`"default"` | `"line"`) for different visual styles. Both are built on Base UI's `TabsPrimitive` which handles the full keyboard interaction model.

**Hand-built:** Only horizontal orientation is implemented. Adding vertical support would require modifying the `onKeyDown` handler to use ArrowUp/ArrowDown and updating ARIA attributes. The variant system is also missing — styling is baked into a single CSS class set.

**Why it matters:** Vertical tabs are common in settings panels and dashboards. The orientation also affects which arrow keys users expect to work, so getting it wrong breaks mental models.

---

## Gap 6: Controlled vs Uncontrolled API (Tabs)

**shadcn:** Base UI's `TabsPrimitive.Root` supports both controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`) patterns out of the box. The consumer chooses which to use.

**Hand-built:** Only uncontrolled state is supported — internal `useState` with no way for a parent to control which tab is active externally. To make it controlled, you'd need to refactor the component to accept `value` and `onChange` props and lift state up.

**Why it matters:** In real apps, tab state often needs to be synchronized with URL parameters, form state, or other components. Without controlled mode, the component can't participate in those patterns.

---

## What the Hand-Built Version Got Right

- **ARIA roles and attributes:** All three components use correct `role`, `aria-selected`, `aria-expanded`, `aria-controls`, `aria-labelledby`, and `aria-modal` attributes.
- **Focus trap with Tab cycling:** The modal correctly cycles focus between the first and last focusable elements using Tab and Shift+Tab.
- **Escape to close:** The modal closes on Escape and stops propagation so parent modals (if nested) aren't affected.
- **Focus return:** The trigger element receives focus when the dialog closes, using a ref to store the previously focused element.
- **Arrow key navigation in tabs:** Left/Right arrows move between tabs with wrapping, and Home/End jump to first/last.
- **Roving tabindex in tabs:** The active tab has `tabIndex={0}` and inactive tabs have `tabIndex={-1}`, so Tab moves focus into the panel, not to the next tab.
- **Disclosure is straightforward:** Correct `aria-expanded`, `aria-controls`, and native `<button>` handles Enter/Space activation.
