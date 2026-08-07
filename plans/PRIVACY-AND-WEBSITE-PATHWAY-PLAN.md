# Privacy Model + Website-to-Game Pathway Plan

**Status:** Ready for implementation
**Date:** 2026-08-07
**Author:** the steward, with outside advice the steward chose to take
**Filed:** 2026-08-07. See `plans/NEW-PLANS-RECONCILED-2026-08-07.md` for what
of this is already true in the tree — a good deal of Phase A is.

**Depends on / Extends:**
- `PAVILION-TIERS-AND-COMMONS-SERVER-PLAN.md` — **there is no such document.**
  The three courts were new thinking, not a missing file; they are defined in
  `plans/NEW-PLANS-RECONCILED-2026-08-07.md` under *"The three courts"*, settled
  2026-08-07. In short: **Outer** = everyone (all of the Pavilion is here
  today), **Inner** = contributors, **Core** = those on the path, a layman's
  sangha. They describe *people*, while `data/visibility.js`'s
  private / shared / commons describes *things* — two axes, not two names for
  one.
- Existing local-first promises in the README and `PROTOCOLS.md`
- `plans/COMMONS-BACKEND-PLAN.md` (packets only travel when the user chooses)
- `plans/COMMONS-SERVER-TIGHTENING.md` (the architecture advice, same day)
- Current live web version: https://sandpiviliongame.vercel.app
- Related community/front-end work: https://github.com/zaxaustin/sand-pavion

**Purpose:** Guarantee real machine-level privacy while creating a clear,
respectful pathway from the public website into the living Sand Pavilion. Users
must always be able to see and control their own logs and information on their
own machine. Nothing private ever leaves the device unless the user deliberately
publishes a packet.

---

## 1. Real Privacy Rules (Non-Negotiable)

These rules sit above any feature and must be enforced in code and
documentation.

1. **Nothing phones home by default.**
   The desktop app and the browser version make zero network requests on first
   run or normal use. Any network capability is progressive enhancement and
   user-initiated.

2. **All personal data stays on the machine.**
   - Notes, reading history, graduation status, AI conversation logs, daily
     plans, personal shelves, activity ledgers, and any "logs" live only in
     local storage (Electron `userData` or browser localStorage / IndexedDB).
   - The user can open a clear "My Ledger / Activity Log / Personal Archive"
     surface inside the Pavilion and see everything the app knows about them.
   - Export and delete of this local data is always available and complete.

3. **Published ≠ private.**
   Only content the user explicitly chooses to turn into a packet and publish
   can leave the machine. Even then, the packet carries only what the user put
   in it (plus signature and provenance). No hidden telemetry travels with it.

4. **Website and Commons server see only public packets.**
   - No accounts required to use the Pavilion.
   - No reading history, no private notes, no personal logs, no IP-linked
     profiles are stored or visible on the website or any future Commons server.
   - Allowlists for Inner/Core are based on public keys from Graduation Packets,
     not on personal identity databases.

5. **Local visibility is a feature, not a bug.**
   The user should be able to inspect:
   - Their own activity ledger
   - What packets they have published or pulled
   - Graduation / tier status (local flag)
   - Any local AI conversation history they choose to keep

   This inspection UI lives inside the Pavilion and never requires a network.

6. **No analytics, no tracking pixels, no third-party scripts** on the public
   website that can identify individual visitors beyond basic server access logs
   (which should be minimized and rotated).

These rules keep the three original promises intact while adding the explicit
right for every user to see their own information.

---

## 2. Two Related Projects — Clear Roles

| Project | Role | Primary location |
|---------|------|------------------|
| **sandpiviliongame** | The living Pavilion — the place you walk, read, write, plan, talk to local residents, and do real work. Desktop (Electron) + browser version. | https://github.com/zaxaustin/sandpiviliongame<br>Live: https://sandpiviliongame.vercel.app |
| **sand-pavion** | Outer Court / public face / initiatory & educational website. Realms, journeys, governance language, Living Library steward tools, orientation pages. | https://github.com/zaxaustin/sand-pavion |

**Design decision:**
Treat **sandpiviliongame** as the actual home (the interactive world).
Treat **sand-pavion** (and/or a refined version of the current Vercel landing)
as the **Outer Vessel** — the public website that orients people, explains the
tiers and the path, and hands them cleanly into the Pavilion.

They should feel like one continuous project, not two disconnected sites.

---

## 3. Pathway: Website → Pavilion (the user journey)

### Ideal Outer Court experience (website)

1. Visitor lands on a calm, clear homepage (Outer Court).
2. Sees a short, honest story of what the Sand Pavilion is (a place to think,
   learn, practice, and eventually contribute — local-first, no account
   required).
3. Sees the three tiers explained simply (Outer / Inner / Core) without
   pressure.
4. Sees two clear actions:
   - **Open the Pavilion in the browser** — links to
     https://sandpiviliongame.vercel.app (or a future dedicated domain).
   - **Download the desktop Pavilion** — links to the latest GitHub Release
     (.exe, and later .dmg).
5. Optional secondary paths: "Read the Living Library samples", "See the Charter
   / Eightfold orientation", "How privacy works here".
6. No forced sign-up, no email gate, no "create account to continue".

### Inside the Pavilion (game/app)

- On first run (or via a quiet "About / Pathway" panel): a short note that says
  "You are in the Outer Pavilion. Everything here is on your machine. When you
  are ready, you can graduate an independent course and step into Inner
  contribution."
- Clear, calm links or buttons that open the public website in the system
  browser (for orientation, public packet index, or downloads for other
  machines).
- Ability to pull public packets from the Commons index (user-initiated).
- Ability to export a Graduation Packet once F-rank conditions are met.

### Moving content between them

- **Discovery → local**: Website shows public packet titles / short
  descriptions. User can copy a packet ID or download the packet file and import
  it into their local Pavilion.
- **Local → public**: User exports a packet from the Pavilion and either uploads
  it via the website's steward tools (if they have rights) or uses the future
  signed publish endpoint.
- Deep links (optional later): `sandpavilion://` or simple
  `https://…/packet/<id>` that the desktop app can register to open.

---

## 4. Concrete Linking Architecture

### Short-term (no new server required)

1. **Unify the public face**
   - Keep https://sandpiviliongame.vercel.app as the interactive web Pavilion.
   - Use (or evolve) the sand-pavion pages as the static orientation / Outer
     Court site.
   - Cross-link both directions clearly and consistently.

2. **In-game "Website" / "Outer Court" button**
   - Opens the public site in the system browser.
   - Never loads the website inside the game's own webview for private data
     reasons (avoids any accidental cookie / storage leakage).

3. **Shared visual language and charter text**
   - Pull the same short charter / tier explanation into both the website and
     the in-game About / Inheritance Hall panels so the two feel continuous.

4. **Packet hand-off**
   - Simple "Export packet" → save .json / .pavilion file.
   - Simple "Import packet" in the Pavilion.
   - Website can host a static list of public packets with download links.

### Medium-term (with the Commons server)

- Website hosts (or mirrors) the public `index.json`.
- Pavilion can fetch the index on user request and show "Community notes /
  packets available for this book".
- Signed publish from the Pavilion still goes only to the thin write endpoint;
  the website never receives private data.

### Privacy-preserving local ledger (must implement)

Add a quiet, always-available surface inside the Pavilion:

- **My Ledger / Personal Archive**
  - List of local activity (courses completed, packets exported, books read,
    etc.) — all generated from local data only.
  - Graduation status and any local tier flags.
  - Buttons: Export full local archive, Delete selected history, Clear AI
    conversation logs.
  - No network calls. Ever.

This satisfies "they should be able to see their own logs and information" while
keeping real privacy.

---

## 5. Implementation Phases

### Phase A — Privacy hardening & local ledger (do first)
- [ ] Audit the current store / localStorage / Electron userData paths and
      confirm nothing is sent automatically.
- [ ] Implement a simple "My Ledger" panel that surfaces the user's own local
      history and graduation status.
- [ ] Add explicit Export / Clear controls for personal data.
- [ ] Document the privacy rules in the in-game charter and on the website.

### Phase B — Clear website pathway (no new backend)
- [ ] Decide the canonical public domain / landing page.
- [ ] Add prominent, consistent "Open Pavilion" / "Download desktop" buttons.
- [ ] Write a short, shared "How privacy works here" page.
- [ ] Add an in-game button that opens the public website in the system browser.
- [ ] Ensure the three-tier explanation appears on both the website and inside
      the Pavilion.

### Phase C — Packet bridge
- [ ] Standardize the packet envelope (see
      `plans/COMMONS-SERVER-TIGHTENING.md`).
- [ ] Make Export / Import of packets polished and obvious.
- [ ] On the website, publish a static or lightly dynamic list of public packets
      with download links.
- [ ] In the Pavilion, add "Pull public index" (user-initiated only) that can
      later talk to the Commons server.

### Phase D — Deeper integration (only after A–C are solid)
- [ ] Optional deep-link support.
- [ ] Optional "Open this packet in my Pavilion" flow from the website.
- [ ] Align any sand-pavion realm pages with the actual in-game rooms so the
      narrative and the lived place match.

---

## 6. Success Criteria

- A new visitor can go from the public website to a working Pavilion (web or
  desktop) in under two minutes with zero account creation.
- A long-time user can open "My Ledger" and see everything the app knows about
  them, export it, or delete it, with no network required.
- No private note, reading history, or AI log ever appears on the website or any
  server unless the user deliberately published a packet containing it.
- The website and the game feel like two doors into the same place rather than
  two separate projects.
- The original three promises remain true: Esc closes everything, nothing phones
  home by default, the Pavilion arrives mostly empty so the work is the filling.

---

## 7. Immediate Next Actions

1. Confirm which site will be the canonical Outer Court (recommendation: make a
   clean landing that points strongly to both the live web Pavilion and the
   desktop download, and keep sand-pavion's realm pages as deeper orientation
   material).
2. Implement the local "My Ledger" surface — this is pure local work and
   immediately strengthens privacy transparency.
3. Add the cross-links (website → game, game → website) and the shared short
   privacy + tiers text.

This plan keeps the hard-won privacy of the Pavilion intact while giving the
website a clear, respectful job: orient people and hand them into the place you
built.
