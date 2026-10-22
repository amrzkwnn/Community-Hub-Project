# TESDH Community Hub — Interaction & Motion Specification (`INTERACTIONS.md`)

> **Project Source:** Google Stitch Screen `projects/12344300653138993483/screens/ec660ac981734a488e0a9a9a702f60c8`  
> **Screen Title:** *Community Feed (Flagship with Refined Motion) — TESDH Community Hub*  
> **Scope:** Success Animation Sequences, Section-Specific Navigation Micro-Animations, and Visual Interaction States

---

## 1. Motion Design Principles & Timing Tokens

All motion across the TESDH Community Hub adheres to three core rules:
1. **Restrained Civility:** Animations must feel subtle, architectural, and functional—never loud, distracting, or playful like casual consumer apps.
2. **Predictable Performance:** Animations run exclusively on GPU-accelerated properties (`transform`, `opacity`).
3. **Label Stability:** When interactive icons animate on hover or focus, text labels must remain completely static without layout shifts.

### 1.1 CSS Easing & Duration Tokens

```css
:root {
  /* Easing curves */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);

  /* Duration tokens */
  --duration-micro: 150ms;   /* Button clicks, tag toggles */
  --duration-short: 240ms;   /* Hover lifts, icon rotations, popovers */
  --duration-medium: 380ms;  /* Page transitions, dialog entrances */
}
```

---

## 2. Approved Success-Animation Sequence (Section 14.A)

When a resident or management user creates a post, logs an incident, publishes an exchange listing, or sends a private message request, the multi-step success choreography executes as follows:

```
[User Clicks "Publish" / "Submit"]
               │
               ▼
   [Step 1: Modal Minimize]
   (scale down 0.7 + translateY 40px, 320ms ease-in-out-cubic)
               │
               ▼
   [Step 2: Modal Closes]
               │
               ▼
   [Step 3: Success Card Pop]  ◀─── [Step 4: Animated SVG Thumbs-up + Sparkles]
   (translateY 24px -> -2px -> 0,        (bounces, rotates to 8deg settle)
    420ms ease-spring)
               │
               ▼
   [Step 5: New Item Insertion & Pulse]
   (inserted at feed top with 2.5s glowing red pulse)
               │
               ▼
   [Auto-Dismiss Hairline Progress Bar]
   (4.2s linear progress countdown)
               │
               ▼
   [Smooth Toast Exit]
   (translateY 12px + scale 0.95 fadeout, 240ms)
```

### 2.1 Step-by-Step Sequence Breakdown

#### Step 1: Modal Minimize
The composer dialog shrinks smoothly towards the bottom anchor instead of disappearing abruptly:
```css
.modal-minimize-out {
  animation: modalMinimize 320ms var(--ease-in-out-cubic) forwards;
}

@keyframes modalMinimize {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.7) translateY(40px);
  }
}
```

#### Step 2 & 3: Success Card Pop
The toast appears in the bottom right corner (or top center on mobile) with a spring overshoot:
```css
.toast-spring-pop {
  animation: toastSpringPop 420ms var(--ease-spring) forwards;
}

@keyframes toastSpringPop {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.85);
  }
  70% {
    opacity: 1;
    transform: translateY(-2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

#### Step 4: Animated SVG Thumbs-Up Illustration & Sparkle Burst
Inside the toast icon container, an SVG thumbs-up icon rises, springs back, and settles at a natural 8-degree celebratory angle, flanked by micro-sparkles:
```css
/* Animated SVG Thumbs-up illustration */
.thumbs-up-svg {
  transform-origin: bottom center;
  animation: thumbBounceSettle 650ms var(--ease-spring) 120ms forwards;
}

@keyframes thumbBounceSettle {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.6) rotate(-14deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.1) rotate(11deg);
  }
  80% {
    opacity: 1;
    transform: translateY(1px) scale(0.98) rotate(7deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(8deg);
  }
}

/* Subtle sparkle burst */
.sparkle-burst {
  animation: sparkleBurst 500ms var(--ease-out-expo) 250ms forwards;
}

@keyframes sparkleBurst {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.9; }
}
```

#### Step 5: Newly Inserted Item Pulse Highlight
The newly submitted card appears at the top of the feed with an attention-guiding crimson glow that gently fades out over 2.5 seconds:
```css
.new-dispatch-highlight {
  animation: highlightGlow 2.5s var(--ease-out-expo) forwards;
}

@keyframes highlightGlow {
  0% {
    border-color: #9E1315;
    background-color: rgba(254, 242, 242, 0.7);
    box-shadow: 0 0 0 3px rgba(158, 19, 21, 0.15);
  }
  100% {
    border-color: rgba(226, 232, 240, 0.8);
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }
}
```

---

## 3. Section-Specific Navigation Micro-Animations (Section 14.B)

Each primary navigation item in the sidebar and mobile bar features an iconic micro-animation triggered on hover and keyboard `:focus-visible`.

| Nav Target | Icon Type | Trigger | Microinteraction Behavior | CSS Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Community Feed** | `forum` | Hover / Focus | Speech bubble dual-dot pulse + 1.08 scale | `.nav-link:hover .nav-icon-feed { transform: scale(1.08); transition: transform 240ms var(--ease-spring); }` with `feedPulse` keyframes |
| **Resilience Map** | `map` | Hover / Focus | Gentle pin drop stroke lift (-2px) | `transform: translateY(-2px); transition: transform 240ms var(--ease-spring);` |
| **Circular Exchange** | `swap_horiz` | Hover / Focus | Gentle 180° rotation | `transform: rotate(180deg); transition: transform 600ms var(--ease-out-expo);` |
| **Local Services** | `handyman` | Hover / Focus | Tool pulse & slight tilt (-8°) | `transform: scale(1.12) rotate(-8deg); transition: transform 240ms var(--ease-spring);` |
| **Secure Messages** | `chat_bubble` | Hover / Focus | Envelope lift & scale (+1.08) | `transform: translateY(-1px) scale(1.08); transition: transform 240ms var(--ease-spring);` |
| **Notifications** | `notifications` | Hover / Focus | Restrained bell swing | `animation: bellSwing 0.6s var(--ease-spring); transform-origin: top center;` |
| **Settings** | `settings` | Hover / Focus | Calm 45° gear rotation | `transform: rotate(45deg); transition: transform 400ms var(--ease-out-expo);` |

### 3.1 Bell Swing Keyframes

```css
@keyframes bellSwing {
  0% { transform: rotate(0); }
  25% { transform: rotate(14deg); }
  50% { transform: rotate(-10deg); }
  75% { transform: rotate(6deg); }
  100% { transform: rotate(0); }
}
```

### 3.2 Dual-Dot Feed Pulse Keyframes

```css
@keyframes feedPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}
```

---

## 4. Other In-App Micro-Interactions

### 4.1 Like / Helpful Button Bounce
Clicking the like/helpful button produces an instantaneous compression followed by a spring pop:
- Mouse down: `scale(0.9)`
- Release: `scale(1)` with `transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)`

### 4.2 Accordion Comments Expansion
Opening comment threads or replies smoothly slides in without abrupt popping:
- Starts: `opacity: 0; transform: translateY(-4px)`
- Transitions: `all 240ms cubic-bezier(0.16, 1, 0.3, 1)`
- Settles: `opacity: 1; transform: translateY(0)`

### 4.3 Modal Lifecycle States
- **Idle / Open:** Backdrop fade in 200ms (`bg-slate-950/40`), dialog scale `100%`.
- **Loading State:** Form hides, skeleton pulse overlays with spinning `progress_activity` spinner.
- **Failure State:** Modal stays open, banner slides down in `bg-rose-50` with retry instructions.
- **Success State:** Triggers Step 1 through Step 5 of the Success Sequence.

---

## 5. Reduced-Motion Accessibility Rule

When a resident enables the OS accessibility option **Reduce motion**, all animation durations and iteration counts are collapsed to prevent dizziness or vestibular discomfort:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
