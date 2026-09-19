# Button Lifecycle Rationale

## Duration & Easing Choices

### 150ms ease-out (idle → loading, loading → success/error)
**Why:** Fast enough to feel instantaneous, slow enough to perceive direction and intent. The `ease-out` curve starts quickly then decelerates, creating a natural "settling" feeling without overshoot. Shorter than typical UI transitions (200-300ms) to keep the chat feel snappy, but longer than instant snap which feels broken.

### 300/30 spring (success checkmark animation)
**Why:** A spring with stiffness 300 and damping 30 creates a slightly overshooting, "lively" motion that feels organic rather than mechanical. The checkmark needs to feel like it's "springing in" with confidence. The 30ms frequency parameter provides 30 cycles per second — enough to feel bouncy but not jarring.

### 800ms pause before idle → success resets
**Why:** 800ms gives the user sufficient time to read the success checkmark before it fades. Shorter (500ms) feels rushed; longer (1200ms) feels like the system is lagging. This pause is critical for feedback — without it, the success state feels transient and the user may not register the positive outcome.

### 300ms error state (no shake per assignment)
**Why:** Per the assignment requirements, the error shake is skipped. The error color (destructive red) and X icon provide immediate visual signaling that something went wrong. Removing the shake reduces motion for users who may be sensitive, while retaining the essential feedback that the action failed and a retry is available.

### prefers-reduced-motion behavior
- All durations halved (150ms → 75ms, 300ms → 150ms, 800ms → 400ms)
- Spring animations switch to immediate fade/scale
- Error shake completely omitted
- Feedback preserved via color changes (primary → success green, primary → error red) and label text changes (Send → Sending → Retry)

### Key Principle: Compositor-Friendly
All state transitions use `transform` and `opacity` properties only (no height/width/layout changes). This ensures the browser can animate on the compositor thread, avoiding jank even on devices with limited GPU resources. The Framer Motion `whileHover` and `whileFocus` variants animate these same compositor-friendly properties for smooth hover and focus states without layout thrash.