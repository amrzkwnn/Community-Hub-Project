# TESDH Community Hub — Visual Design System (`DESIGN.md`)

> **Project Source:** Google Stitch Project `projects/12344300653138993483`  
> **System Name:** Heritage Civic PropTech  
> **Brand Identity:** Sime Darby Property — City of Elmina  
> **Target Form Factors:** Desktop (1280px+), Tablet (768px–1279px), Mobile (<768px)  
> **Design Movement:** Corporate / Modern Civic Architecture

---

## 1. Brand Philosophy & Aesthetic Direction

The **TESDH Community Hub** design system balances institutional dependability with residential warmth. It explicitly rejects the disposable informality of social media feeds and the sterile coldness of generic SaaS portals.

- **Established & Authoritative:** Instills confidence in municipal advisories, auxiliary police alerts, governance notices, and incident resolutions.
- **Welcoming & Communal:** Designed for effortless readability across all demographics in the City of Elmina (Elmina West, Elmina Valley 1–5, Elmina Green, Ilham Residence, and City Center).
- **Architectural Permanence:** Structural order, restrained ornamentation, subtle elevation, and deliberate whitespace reflect the master-planned township.

---

## 2. Semantic Color Palette

Rooted in Sime Darby Property's heritage crimson, accompanied by prestige gold and municipal verification blue.

### 2.1 Core Brand & Semantic Colors

| Token Name | Hex Code | Semantic Role & Application |
| :--- | :--- | :--- |
| `primary` / `brand-crimson` | `#BA1B1D` (Stitch Base) / `#9E1315` (Screen Variant) | Institutional branding, primary buttons, active nav indicators, alert bars |
| `primary-hover` | `#841012` | Hover state for primary actions |
| `on-primary` | `#FFFFFF` | Text/icons on primary background |
| `primary-container` | `#BA1B1D` / `#FEE2E2` | Container backgrounds for primary notices, high-emphasis tags |
| `on-primary-container` | `#FFCDC8` / `#991B1B` | Text/icons inside primary containers |
| `secondary` / `brand-gold` | `#7F5600` / `#B45309` | Prestige badges, secondary highlights, community events |
| `secondary-container` | `#FEB31D` / `#FEF3C7` | Warm accents, pending request badges, community club tags |
| `on-secondary-container` | `#6B4800` / `#92400E` | High-contrast label color on secondary container fills |
| `tertiary` / `civic-blue` | `#00468F` / `#1D4ED8` | Municipal verification badges, auxiliary police tags, official councils |
| `tertiary-container` | `#005DBB` / `#1E40AF` | Verified header badges, location pin banners |
| `on-tertiary-container` | `#C8DAFF` / `#DBEAFE` | High-legibility text on tertiary containers |
| `error` | `#BA1A1A` / `#DC2626` | Urgent hazards, critical incident alerts, destructive actions |
| `error-container` | `#FFDAD6` / `#FEE2E2` | Critical hazard backgrounds, error callouts |
| `success` | `#16A34A` / `#059669` | Resolved incidents, active monitoring indicators, live passes |
| `success-container` | `#DCFCE7` / `#E8F5E9` | Verified live status chips, resolved incident backdrops |

### 2.2 Surface & Neutral Tokens (Light Mode Default)

| Token Name | Hex Code | Application |
| :--- | :--- | :--- |
| `background` | `#F8F9FA` / `#F8F9FC` | Page body canvas; softens visual fatigue compared to pure white |
| `surface` | `#F9FAFB` / `#F8F9FC` | Section surfaces and base panels |
| `surface-bright` | `#FFFFFF` | Interactive cards, modal dialogs, flyout sheets |
| `surface-container-lowest` | `#FFFFFF` | Clean card interiors, dropdown menus, table rows |
| `surface-container-low` | `#FAFAFB` / `#F2F4F6` | Secondary input fields, subtle segmented buttons |
| `surface-container` | `#F8FAFC` / `#ECEEF0` | Active tab highlights, search backgrounds |
| `surface-container-high` | `#F1F5F9` / `#E7E8EB` | Badges, counter pills, subtle borders |
| `surface-container-highest` | `#E1E2E5` | Heavy divider bars, scrollbar tracks |
| `on-surface` | `#191C1E` / `#0F172A` | Primary typography (body text, titles, headings) |
| `on-surface-variant` | `#5B403D` / `#64748B` | Secondary metadata, timestamps, breadcrumbs, placeholders |
| `outline` | `#CBD5E1` / `#8F6F6C` | Form field borders, secondary button outlines |
| `outline-variant` | `#E5E7EB` / `#E4BEB9` | Card dividing rules, subtle structural lines |

### 2.3 Dark Theme Mapping

| Token Name | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `background` | `#F8F9FA` | `#0F1113` | Deep low-glare canvas |
| `surface` | `#FFFFFF` | `#17191C` | Dark elevated card surface |
| `surface-container` | `#F8FAFC` | `#1F2226` | Inputs, sub-panels, segmented controls |
| `on-surface` | `#0F172A` | `#E2E8F0` | High-contrast light text |
| `on-surface-variant` | `#64748B` | `#94A3B8` | Muted metadata and subtext |
| `outline-variant` | `#E5E7EB` | `#2D3139` | Subtle dark card borders |
| `primary` | `#9E1315` | `#FFB4AB` | Glowing accessible crimson tone in dark mode |
| `primary-container` | `#FEE2E2` | `#5C0005` | Darkened crimson accent backing |

---

## 3. Typography Scale

Powered by the **Inter** typeface across all display, headline, body, and label roles.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

| Role | Font Size | Line Height | Weight | Letter Spacing | CSS Utility | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | 48px (42px mobile) | 56px (50px mobile) | 700 (Bold) | -0.02em | `font-display text-display` | Township milestone headers, civic portals |
| `headline-lg` | 36px (30px mobile) | 44px (38px mobile) | 700 (Bold) | -0.015em | `font-headline-lg text-headline-lg` | Hero banners, primary view headers |
| `headline-md` | 24px (22px mobile) | 32px (30px mobile) | 600 (SemiBold) | -0.01em | `font-headline-md text-headline-md` | Section titles (e.g. "Community Feed") |
| `headline-sm` | 20px (18px mobile) | 28px (26px mobile) | 600 (SemiBold) | 0em | `font-headline-sm text-headline-sm` | Card group titles, modal headers |
| `title-md` | 16px (15px mobile) | 24px (22px mobile) | 600 (SemiBold) | 0em | `font-title-md text-title-md` | Author names, post headers, alert titles |
| `body-lg` | 18px (17px mobile) | 28px (26px mobile) | 400 (Regular) | 0em | `font-body-lg text-body-lg` | Lead paragraphs, advisory announcements |
| `body-md` | 15px (14px mobile) | 22px | 400 (Regular) | 0em | `font-body-md text-body-md` | Standard reading text, post descriptions |
| `body-sm` | 13px | 18px | 400 (Regular) | +0.01em | `font-body-sm text-body-sm` | Secondary card details, replies, hints |
| `label-md` | 12px | 16px | 600 (SemiBold) | +0.04em | `font-label-md text-label-md` | Button labels, filter pills, badge text |
| `label-sm` | 11px | 14px | 500 (Medium) | +0.05em | `font-label-sm text-label-sm` | Timestamps, uppercase precinct tags |

---

## 4. Spacing, Grid & Layout Architecture

### 4.1 Spacing Scale

- `space-xs`: `0.25rem` (4px) — Icon-to-text gaps, inline badges
- `space-sm`: `0.5rem` (8px) — Stack gaps, chip padding, nested inputs
- `space-md`: `1.0rem` (16px) — Card padding, form field gaps, grid gaps
- `space-lg`: `1.5rem` (24px) — Section separation, modal padding
- `space-xl`: `2.5rem` (40px) — Major view dividers, dashboard breaks

### 4.2 Breakpoints & Layout Grids

- **Desktop (1280px and above):**
  - Left navigation rail: fixed width `240px` (`w-60`), full height
  - Top operational header: sticky `h-16`, positioned `left-60 right-0`
  - Main content column: `max-w-[840px]`, centered with `px-8 py-8`
  - Right township context rail: fixed `300px` for weather, climate, upcoming circulars
- **Tablet (768px – 1279px):**
  - Collapsible side navigation or condensed rail
  - Right sidebar collapses into bottom cards or drawers
  - Content width adapts to `100%` with `px-6 py-6`
- **Mobile (<768px):**
  - Fixed bottom navigation bar (`h-16`) with 5 primary touch targets
  - Header displays title and quick notification badge
  - Full-width edge-to-edge card flow with `16px` (`margin-mobile`) margins

---

## 5. Shape, Elevation & Depth

### 5.1 Border Radius Tokens

- `sm`: `0.125rem` (2px) — Micro tags, hairline indicators
- `DEFAULT`: `0.25rem` (4px) — Standard inputs, utility badges, checkboxes
- `md`: `0.375rem` (6px) — Small buttons, popover menus
- `lg`: `0.5rem` (8px) — Action buttons, image containers, input fields
- `xl`: `0.75rem` (12px) — Township notice modules, filter pills
- `2xl`: `1.0rem` (16px) — Primary content cards, composer dialogs
- `full`: `9999px` — Resident avatars, verified status pills, round icon housings

### 5.2 Elevation Levels

- **Level 0 (Canvas):** Flat background `#F8F9FA`. Zero shadow.
- **Level 1 (Structural Cards):** White surface `#FFFFFF`, `border: 1px solid rgba(226, 232, 240, 0.8)`, `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03)`.
- **Level 2 (Hovered / Popover):** `box-shadow: 0 4px 12px rgba(25, 28, 30, 0.08)`, border `1px solid rgba(25, 28, 30, 0.12)`.
- **Level 3 (Modals & Emergency Sheets):** `box-shadow: 0 12px 32px rgba(25, 28, 30, 0.14)`. Backdrop scrim: `rgba(15, 23, 42, 0.4)` with `backdrop-blur-sm`.

---

## 6. Component Style Specifications

### 6.1 Buttons
- **Primary:** Background `bg-[#9E1315]` (or `#BA1B1D`), text `#FFFFFF`, rounded `0.5rem` (`rounded-lg`), font `text-[13px] font-medium`. Hover: `bg-[#841012]`. Active: `active:scale-[0.98]`.
- **Secondary:** Transparent with `border border-slate-200/90`, text `text-slate-700`, hover `bg-slate-50`.
- **Accent (Prestige/Club):** `bg-[#FEB31D]` / `bg-[#F1A80A]`, text `#451A03`.
- **Destructive:** `bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200`.

### 6.2 Form Inputs & Controls
- **Text Inputs & Textareas:** Height 36px–44px, background `bg-slate-50/80` transitioning to `bg-white` on focus, border `border-slate-200/80`. Focus ring: `2px solid rgba(158, 19, 21, 0.4)`.
- **Selects:** Custom caret (`expand_more`), background `bg-white`, border `border-slate-200/90`, shadow `shadow-xs`.
- **Checkboxes:** 4px radius, checked state `#9E1315` with crisp white check glyph.

### 6.3 Badges & Chips
- **Verified Resident:** Background `bg-blue-50`, text `text-blue-700`, border `border-blue-100`, icon `verified`.
- **Township Advisory / Civic Alert:** Background `bg-rose-100/80`, text `text-[#9E1315]`, uppercase font `font-semibold text-[11px]`.
- **Active Monitoring:** Pill with pulse dot `bg-[#9E1315] animate-pulse`.

### 6.4 Cards
- **Management Official Notice Card:** White surface, bordered with `border-rose-200/90`, featuring a **3px solid crimson top bar** (`h-1 bg-[#9E1315]`).
- **Resident Feed Card:** White surface, `rounded-2xl`, subtle border `border-slate-200/80`, 16px–20px padding.

---

## 7. Accessibility (A11y) & Interaction States

1. **Color Contrast:** All body text meets WCAG AAA standards (minimum 7:1 for normal text, 4.5:1 for large text).
2. **Keyboard Focus Rings:** Visible outline with 2px offset:
   ```css
   button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
     outline: none;
     box-shadow: 0 0 0 2px rgba(158, 19, 21, 0.4);
   }
   ```
3. **Touch Targets:** Minimum 44px x 44px touch targets on mobile touch surfaces.
4. **Motion Accessibility:** Strict adherence to `prefers-reduced-motion: reduce`:
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

---

## 8. Official Nadikomuniti Brand & Logo Integration System

The **Nadikomuniti** brand (`NadiKomuniti Connect & Relax`) serves as the official community identity of the City of Elmina portal under Sime Darby Property.

### 8.1 Brand Assets & Extraction
- **Master Asset:** `public/images/nadikomuniti-logo.png`
- **Transparent Alpha Asset:** `public/images/nadikomuniti-logo-transparent.png`
- **Asset Integrity Policy:** The authentic brand artwork, including the organic twin-leaf green flourish, the flowing cursive script typography, and the burgundy/maroon tagline ("CONNECT & RELAX"), is preserved without modification or synthetic redrawing. Transparent rendering uses strict chroma-key extraction on the white canvas boundary.

### 8.2 Dimension & Placement Standards

| Viewport / Placement | Render Dimensions | CSS Utility Classes | Behavior & Clear Space |
| :--- | :--- | :--- | :--- |
| **Desktop Expanded Sidebar** | `170px` (W) × `42px` (H) | `w-[170px] h-[42px] object-contain object-left` | Anchored at top of fixed sidebar navigation with 16px horizontal and 12px vertical padding. |
| **Desktop Collapsed Sidebar** | `36px` (W) × `36px` (H) | `w-9 h-9 rounded-xl object-contain object-left` | Clipped to the green leaf emblem with an elegant rounded container. |
| **Mobile Header** | `140px` (W) × `34px` (H) | `w-[140px] h-[34px] object-contain object-left` | Aligned with hamburger trigger and notification badge in sticky top mobile bar. |
| **Mobile Drawer Header** | `150px` (W) × `36px` (H) | `w-[150px] h-[36px] object-contain object-left` | Displayed above the mobile drawer's precinct switcher with 16px bottom divider. |

### 8.3 Light & Dark Mode Harmonization
- **Light Canvas (`#F8F9FA`):** Native transparent asset renders directly against light container surfaces.
- **Dark Canvas (`#0F1113` / `#15181C`):** Subtly enhanced with `dark:brightness-105 dark:contrast-105` to ensure maximum legibility of the burgundy typography against dark backgrounds without altering the original artwork colors.

---

## 9. Google Stitch Mobile Architecture (The 7 Core Screens)

Implemented from the approved Google Stitch project (`projects/12344300653138993483`) with pixel-level responsiveness across 360px, 390px, and 430px mobile viewports:

1. **Screen 1: Mobile Home / Dashboard (`/`)**
   - High-priority emergency broadcast ribbon at top.
   - Pinned township notices with 3px crimson brand bar.
   - Live precinct environmental telemetry (air quality, temperature, rainfall forecast).
   - Quick navigation action grid (Report Hazard, Resident Exchange, Find Service, Chat).
2. **Screen 2: Community Feed & Discussion Detail (`/feed`)**
   - Chronological and trending township feed with category filters (All, Notices, Safety, Lost & Found, Recommendations).
   - Touch-friendly 40px back navigation pill button (`arrow_back` icon + "Back to Feed" label) for instant single-tap return from discussion threads.
   - Unsent comment draft protection confirmation dialog.
3. **Screen 3: Resilience Navigator & Map View (`/map`)**
   - Full-bleed Mapbox interactive precinct map with hazard markers (Fallen Tree, Flash Flood, Streetlight Outage, Gate Congestion).
   - Emergency shelter locator and water point distribution pins.
   - Dynamic clustering with 500m radius threshold indicator.
4. **Screen 4: Resident Exchange (`/exchange`)**
   - Peer-to-peer neighborhood circular economy hub (giveaways, tool loans, book swapping).
   - Item status badges (`available`, `reserved`, `completed`).
   - Direct resident-to-resident contact trigger.
5. **Screen 5: Local Services Directory (`/services`)**
   - Vetted township contractors and resident handymen (Aircond Service, Plumbing, Electrical, Landscaping, Tutoring).
   - Verification status badge and resident rating stars.
   - One-tap WhatsApp inquiry and direct phone call links.
6. **Screen 6: Direct Messages & Community Chat (`/messages`)**
   - Real-time conversation threads between verified residents and management duty officers.
   - Read receipts, timestamps, and attachment previews.
7. **Screen 7: Profile, Identity & Security Settings (`/settings`)**
   - Resident S&P / Tenancy agreement verification standing.
   - PDPA privacy controls (PII masking, phone number masking).
   - System theme switcher (Light, Dark, System Preference).

---

## 10. Incident Safety & Approval-Only Visibility Architecture

To protect township tranquility and prevent unverified rumors or panic, all incident submissions follow a strict **human-in-the-loop governance protocol**.

```
[Resident Reports Hazard on Map]
               │
               ▼
   [Status: 'pending' (Default)]
               │
      ┌────────┴────────┐
      ▼                 ▼
[Public Map]      [Management Console]
(Hidden / 404)     (Queued in "Pending Approval" Tab)
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      [Approve & Publish]    [Decline / Reject]
             │                     │
             ▼                     ▼
    [Status: 'under_review']  [Status: 'rejected']
    (Visible on Public Map,   (Stored in Audit Trail;
     isVerified: true)         Never visible publicly)
```

### 10.1 Dual-Layer Backend Enforcement
- **Client Enforcement:** `ResilienceView.tsx` filters `filteredIncidents` to exclude any incident where `status === 'pending' || status === 'rejected' || status === 'dismissed'`, unless the active user has role `management` or matches `reporterId`.
- **Server-Side RLS Enforcement:** `GET /api/sync` strictly strips pending and rejected incidents before returning the payload to non-management sessions. URL tampering or client state injection cannot expose unapproved incidents.

### 10.2 Management Incident Sub-Tabs
1. **Active Incidents:** Currently published hazards (`under_review`, `in_progress`, `resolved`).
2. **Pending Approval [Count Badge]:** Real-time queue of new resident reports awaiting Duty Officer verification. Includes photo evidence, precinct location, and one-click "Approve & Publish to Map" or "Decline / Reject".
3. **AI Duplicate Merge [Count Badge]:** Candidate pairs identified by the AI deduplication engine.
4. **Archived / History:** Complete historical record of resolved or rejected incidents.

---

## 11. AI Duplicate Incident Merging System

When multiple residents report the same localized event (e.g., a fallen tree blocking Persiaran Elmina), the system clusters reports to prevent map clutter while preserving all resident evidence.

### 11.1 Tri-Factor Deduplication Heuristics
1. **Spatial Proximity:** Haversine formula calculation:
   $$\text{Distance} \le 500\text{ meters}$$
2. **Temporal Proximity:** Timestamp delta:
   $$\Delta t \le 7\text{ days (604,800,000 ms)}$$
3. **Gemini Semantic Comparison:** Hazard category alignment and natural language description comparison via Gemini 2.5 Flash, generating:
   - Match Confidence Score ($0\% - 100\%$)
   - Human-readable AI rationale explaining the physical similarity

### 11.2 Non-Destructive Consolidation Mechanics
- **Canonical Incident Selection:** The earliest or highest-detail report is retained as the parent (`canonical`).
- **Merged Child Incident:** Marked `isMerged: true` with `parentIncidentId` pointing to the canonical report.
- **Evidence Preservation:** Child photo attachments, reporter notes, and timestamps are appended to the parent's `mergedIncidentIds` array.
- **Public Map Clutter Prevention:** Merged child reports are automatically filtered out from public map rendering (`isMerged !== true`), while duty officers can view the full consolidated cluster in the Management Console.

---

## 12. Community Moderation Engine & Review Dossier

### 12.1 Durable Moderation Persistence
- **State Integrity:** Manual resident reports (`moderation_reports`) are persisted directly to Supabase and synchronized into a durable in-memory server store (`moderationStore.ts`).
- **Unified Case Synthesis:** Automated AI background scans and manual resident claims targeting the same post, listing, or service are consolidated into a single actionable case (`unifiedCases`) keyed by `targetId`.
- **Negative Guardrails:** Civic criticism of township management, complaints regarding gate delays, or facility maintenance tickets are protected as legitimate feedback and immune to automatic suppression.

### 12.2 Comprehensive Moderation Dossier Modal
Each case card provides a "View Dossier" action opening a 5-section investigative modal:
1. **Dossier Header:** Target type, current moderation status, priority score badge, and modal dismiss.
2. **Reported Content Display:** Full original title, verbatim content preview, author name, township precinct, creation timestamp, and deep link to view in situ.
3. **Resident Claims Breakdown:** Specific claim categories (e.g. `scam_fraud`, `harassment`, `offensive`), reporter identity, submission timestamp, and verbatim resident notes.
4. **AI Safety Rationale:** Gemini safety evaluation, confidence percentage, and policy explanation.
5. **Review History & Duty Officer Decision Console:** Previous audit entries, reviewer notes, and one-click actions:
   - **Keep Content (Approved):** Clears flag and confirms content compliance.
   - **Dismiss Flag (False Positive):** Closes report as benign or protected civic feedback.
   - **Take Down (Remove Content):** Soft-deletes target content from all public views.
   - **Mark Under Review:** Escalates to Senior Estate Management with mandatory auditor notes.

---

## 13. Management Console Dark Mode Tokens & Standards

The Management Console utilizes a bespoke dark color system engineered for extended security-monitoring shifts:

| Token Name | Light Token | Dark Token | Purpose & Context |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F8F9FA` | `#0F1113` | Deep low-glare backdrop preventing eye fatigue |
| **Console Panel Card** | `#FFFFFF` | `#15181C` | Structural containers for tables, queues, and modals |
| **Card Border** | `#E2E8F0` | `#1E293B` | Subtle hairline container boundary (`slate-800`) |
| **Subtle Table Row / Input** | `#F8FAFC` | `#0F172A` / `#1E293B` | Alternating table rows, input fields, filter bars |
| **Primary Typography** | `#0F172A` | `#F8FAFC` | High-contrast titles, numbers, and data points |
| **Secondary Typography** | `#64748B` | `#94A3B8` | Subtitles, field labels, timestamps (`slate-400`) |
| **Primary Brand Action** | `#065F46` (Emerald) | `#047857` / `#10B981` | Duty officer verification and approval actions |
| **Destructive Brand Action** | `#DC2626` (Rose) | `#EF4444` / `#F87171` | Decline, suspension, and take-down actions |

