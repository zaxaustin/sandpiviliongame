# Character Customization Plan

Not started. Written down now (2026-07-08) so the idea survives between
sessions, same discipline as every other plan doc here. Explicitly
deferred when raised this session — the quick sprite redesign (robe
silhouette, sash, hair/topknot — see `render.js`'s `drawRobedFigure`)
happened instead, and now sits as the actual foundation this plan
builds on, not a placeholder to throw away.

## The actual goal

Right now every visitor draws through the exact same `drawRobedFigure()`
call with one hardcoded color (`#4a2f66`, purple). The ask, from
README's Hopes and Dreams: **pick your own robe color, and eventually a
hairstyle** — a real character-creator moment, not a palette swap
buried in a settings menu.

## Why this is a real system, not a quick add

The rendering half is already halfway there — `drawRobedFigure(x,y,dir,
color,bobb)` already takes `color` as a parameter; every NPC already
proves the function works with any color. **The actual work is
everywhere else:**

1. **A real picker UI** — a new panel (matching the existing
   panel/overlay pattern in `ui/overlays.js`), not a raw color input.
   Needs real choices, not infinite RGB: a curated palette of sect
   colors (the existing NPC roster is a natural starting palette —
   Quill's violet, Moss's green, Cobalt's blue, the Monk's gold — plus
   room for more) reads as "pick your sect," which fits this project's
   whole aesthetic, better than a generic color wheel would.
2. **Persisted appearance data** — a new field on `data` (see
   `entities.js`'s `freshData()`), saved/loaded/exported the same way
   everything else already is. Small, but has to actually be wired into
   `Store`'s save shape, including an upgrade path for existing saves
   that predate the field (same pattern `plannerDay()`'s `sparks` field
   used this session).
3. **Threaded through every render site** — the overworld, every
   interior, and the three meditation poses (`drawMeditating`) all call
   into person-drawing separately; the appearance data has to actually
   reach all of them, not just the main walking sprite. This is the
   part most likely to get a spot missed on a first pass — worth a
   deliberate checklist, not just "search for drawPerson."
4. **Hairstyles, if pursued past color** — a real second axis, not a
   free extension of the color picker. The current hair/topknot is one
   fixed shape (`drawHairTopknot()`); a second or third style means
   real new geometry, not a parameter tweak. Worth shipping color alone
   first and deciding separately whether hairstyle variety earns its
   own follow-up.

## A sane build order, if picked up

1. **Data model + save/export first**, no UI yet — add the field,
   confirm it round-trips through save/load/export/import cleanly
   (including the upgrade path for old saves). Boring but load-bearing;
   get it right before anything visual depends on it.
2. **The picker panel**, reading/writing that field, with a live
   preview using the actual `drawRobedFigure()` code (not a separate
   mockup) so what you pick is exactly what you'll see in the world.
3. **Wire it into every render site** — walking, every interior,
   sitting/lying/standing meditation. Test each one explicitly rather
   than assuming "it's the same function everywhere" covers it.
4. **Hairstyles**, only if color alone doesn't feel like enough once
   it's actually in hand — a separate decision point, not baked into
   the plan up front.

## What this explicitly is not, at least for v1

Not a clothing system (different robe cuts, accessories) — README's
own framing keeps color/hairstyle as the real scope; adding garment
variety would be a genuinely separate, larger project layered on top of
this one, not a natural extension of it.
