# Christmas animal artwork

Generated with the built-in image generation tool from the user-approved, less exaggerated illustration of Millie and Winston, based on their photographs. The generated sprite drawings are new illustrations, not photo cutouts. Both finished sheets are 1536×1536 transparent PNGs containing 4×4 frames of 384×384 pixels.

## Generation prompt specification

**Shared:** A production animation sprite sheet, exactly four columns and four rows with sixteen equal cells. Transparent background, no text, grid lines, scenery, shadows or glow. Restrained naturalistic hand-drawn adult animals with soft cel shading, normal small dark eyes, natural anatomy, and quiet expressions matching the approved reference. Each complete animal fits within its own tile at consistent scale and ground baseline, facing right. Distinct articulated poses, not duplicate static drawings. Clear transparent padding.

**Millie:** Honey-golden adult golden retriever, broad long muzzle, black nose, hanging ears, cream chest and tail feathering, small red Santa hat. First eight frames: successive phases of a slow four-legged walk in place with contact, weight transfer, passing, opposite contact, paw lift/plant, shoulder shift and ear/tail follow-through. Next eight: neutral standing, blink, nose lowered sniff, looking up, head toward viewer, looking back, resting lying with eyes open, same rest eyes closed.

**Winston:** Adult Holland Lop, compact body, dark hanging brown ears, white chest, irregular tan/grey-brown/white patches, forehead blaze, dark butterfly muzzle mask, tiny pink nose and a narrow burgundy scarf. First eight frames: prepare, crouch, hind-leg push/front reach, extended airborne, tucked airborne, forepaw landing, hind legs forward, settle. Next eight: neutral sitting, blink, sniff down, look up, turn head, flick ear, loaf eyes open, same loaf eyes closed.

**Cleanup:** Remove the paper background and floor shadows completely, preserving every drawing, pose, marking, accessory and grid position. All pixels outside natural silhouettes must be fully transparent; white fur stays opaque. The rabbit sheet received this cleanup before tile preparation.

## Runtime frame map

Frames read left to right and top to bottom. 0–7 are movement; 8 neutral; 9 blink; 10 sniff; 11 look up; 12 head turn; 13 look back / ear flick; 14 rest; 15 sleeping rest. Movement uses actual frame changes in addition to world displacement. Source sheets were mechanically sliced and aligned with a common scale and floor to reduce jitter. No new reading, chart, layout or credential behavior is contained in the art files.

## Babydoll dance addition

`millie-dance.png` and `winston-dance.png` each contain sixteen new front-facing drawings in a transparent 4×4 sheet. Built-in image generation used the same approved likeness preview and the shared adult proportions, coat markings and Christmas accessories described above.

Dance prompt: redraw each animal individually, standing on its two hind legs with natural animal forepaws rather than human hands, in a fixed front-facing camera with consistent scale and floor, sixteen distinct articulated poses. Row one: sit, lift chest, halfway upright, fully upright. Row two: side step left, feet together with forepaws swinging right, side step right swinging paws left, feet together knee bounce. Row three: shoulder shimmy left, shimmy right, point diagonally outward with one forepaw, opposite paw points with weight shifted. Row four: paws sweep open at shoulder height, wide V with one hind foot lifted, paws swing down across chest, open arms with opposite hind foot lifted. Match the restrained illustrated style and likeness; full bodies contained within equal tiles with transparent padding; no paper, floor, shadows, text or scenery.

The timing adapts the Jamie Miller Babydoll two-step's side steps, shimmies, points and open-arm swings described in this [dance reference](https://babydolldance.net/babydoll-dance-trend). Frames 4–7 play for 3 seconds, 8–11 for 3 seconds, and 12–15 for 4 seconds, all synchronized at 8 fps. Frames 0–3 and their reverse provide separate 0.8-second rise/settle transitions. The originals remain unchanged.

## November 21 quality refresh

Reviewed the walking, hopping and both dance sheets. Re-registered all four original packs using `prepare-sheets.ps1 -GridAnchor`, keeping each cell's horizontal root instead of re-centering its changing silhouette. One shared scale per sheet and a common floor keep feet aligned. Original dance sheets now serve only as rise/settle transitions. Runtime scale is fixed across packs and independent of pulse/digit bounds.

New art generated with the built-in image generation tool from the same approved reference:

- `winter-night.png`: wide, very dark navy/spruce Christmas background; large detailed painted snow-laden evergreens at both borders, sparse amber lights, dark open central sky, subdued distant trees, snowbank fading into black chart space. No animals, UI, text or baked-in snowfall. Match the naturalistic illustrated shading of the animals.
- `winston-behaviors.png`: 4×4 transparent equal-grid sheet; identical adult rabbit head/body scale, coat and scarf. Frames 0–3: sit, lean back, chest rising, upright. Frames 4–7: upright look left, up, right, forward. Frames 8–15: lift paws, touch nose, sweep paws over eyes, down cheeks, forehead/ear rub, lower paws, rest. Natural short rabbit forepaws; consistent camera/floor; no shadows or background.
- `millie-dance-v2.png`, `winston-dance-v2.png`: separate 4×4 continuous front-facing upright cycles. Same head size, torso length and stance baseline across all frames. Frames 0–7: small incremental left/right step-touches with swinging forepaws and knee bounce. Frames 8–15: shoulder dips, gradually extend one pointing paw, return through center, extend opposite paw, return to first pose. One coherent smooth loop, not disconnected gestures; preserve likeness, adult proportions and Christmas accessories. Full transparent padding and no floor/shadows/text.

New dance frames loop at 12 fps for exactly 10 seconds, with 0.8-second transitions on either side. Original twelve scenes plus the existing dance remain, with `rabbit-lookout`, `rabbit-face-wash`, and `playful-follow` added. Review checks cover fixed size during changing/pulsing number bounds, hop takeoff/landing, all sixteen scenes, dance duration/synchronization, quiet modes, and optional-art failure.
