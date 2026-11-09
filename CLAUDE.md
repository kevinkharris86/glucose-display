# Glucose Display — Project Brief

## What this is
A small web app (`index.html` + `sprites.js`) that displays real-time Dexcom CGM glucose data on a large screen. It's deployed on 1 Amazon Fire 10 tablet as a monitoring display.

## How it works
- Connects to the **Dexcom Share API** (`share2.dexcom.com` for US, `shareous1.dexcom.com` for outside US)
- Uses the wearer's Dexcom credentials (Share must be enabled in their Dexcom app)
- Polls every ~5 minutes (timed to arrive ~20 s after Dexcom posts a new reading)
- Credentials stored in `localStorage` on each device — never sent anywhere except Dexcom

## Display features
- Giant BG number colored green (in-range), yellow (high), red (low)
- **Every new reading the number grows, holds, and settles (`pulse()`). This is permanent and must stay on in every mode.**
- Trend arrow, delta, reading age (dims/turns red when stale ≥12 min), rolling graph (3/6/12/24 h), clock
- Burn-in drift protection, wake lock, full-screen button, settings panel (tap anywhere to reveal)

## Settings (stored in localStorage as `gd.cfg`)
`user`, `pass`, `region`, `units`, `low`, `high`, `hours`, `shift`, plus:
- `simple` — `"1"` = Simple mode (no characters/themes; the reading pulse still runs). Also toggled by the **Animations: On/Off** button that appears when the screen is tapped.
- `theme` — `auto` (by date) or a theme id to pin one.

## FX system (Millie the golden retriever & Winston the Holland Lop)
All decoration is the `FX` module near the bottom of `index.html`.

**Safety rule: everything decorative lives in `#fx`, a fixed layer with `z-index:0` BEHIND `#app`.** Characters, props and particles can pass behind the number but can never cover it, and FX code never touches polling/rendering. When a reading is low, stale or missing the characters go quiet ("calm" mode: no scenes); 9 pm–6:30 am they sleep and the layer dims. Keep it that way.

- **Characters** are cutouts of the family's real photos (white sticker outline), stored as data-URI WebP in `sprites.js` (`window.GD_SPRITES`). If `sprites.js` is missing the app falls back to the plain display.
  - `SPRITES` — per-photo display size, facing, and hat/neck/mouth anchor points.
  - `CAST` — maps poses (`""`, `lie`, `toy`, `sleep`, `move`, `up`, `loaf`, `peek`…) to photos. Motion is puppet-style: CSS classes on the actor (`walk`, `run`, `hop`, `wag`, `tilt`, `shake`, `chew`, `asleep`…) plus `go()/jump()/liftTo()`.
  - `b_*` sprites are round portrait bubbles (`bubble(actor, name)`).
  - To add photos/poses: see `tools/` (`server.js` + `cut.html` do in-browser background removal and outlining, `build.js` packs `sprites.js`; paths inside point at a temp folder and need updating). Then add entries to `SPRITES`/`CAST`.
- **Scenes** — `scene(name, async fn, {tags, w, big})`. ~37 of them: generic duo scenes, seasonal ones (run only when a theme has a matching tag), and `big` full-screen moments (gust, flyover, aurora, grandparade). The director picks with weights and a no-repeat history: small idles every few seconds, a scene every 1–2.5 min, a big one every 12–25 min. Add more with `FX.addScene(...)`; helpers come from `FX.api()`.
- **Themes** — the `THEMES` array; first match wins, so holidays sit above seasons. Each has `when(date, mmdd, year)`, sky tint, ambient particles, `hats`, `decor()`, optional `tick`, `flyer`, `flutter`, `toy`, and `tags`.
  - New Year (Dec 31–Jan 1), Valentine's (Feb 7–14), Good Friday + Holy Saturday (quiet), Easter (Palm Sunday–Easter Monday, computed), St. Patrick's (Mar 15–17), Memorial Day weekend, Independence Day (Jul 1–4), Halloween (Oct 25–31), Thanksgiving Day, **Christmas (Nov 1–Dec 30 — owner's choice)**, then Winter / Spring / Summer / Fall.
  - Theme changes are checked every minute and cross-fade.
- **Props / accessories** — `PROPS` (name → `[w, h, svg]`) and `ACC` (hats etc. drawn around 0,0).

## Testing
URL params: `?demo` (synthetic data, new "reading" every minute), `&theme=easter`, `&date=2026-07-04`, `&scene=ride` (loop one scene), `&fast` (short gaps), `&night`.
Dev server: `glucose` in `.claude/launch.json` (port 8200).

## Tech / deployment
- Pure HTML/CSS/JS, no build tools. Designed for Fire Silk in full-screen.
- Copy **both `index.html` and `sprites.js`** (same folder) to the tablet and open `index.html`. Enter Dexcom credentials once in Settings.
