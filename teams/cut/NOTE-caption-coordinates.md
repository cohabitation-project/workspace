# Caption coordinates: what the Words editor's `transform.positionX/Y` and `fontSize` mean

Answers `t_74bbe3046f`, from upstream source and not from saved captions. Read 2026-11-22 by Claude with `urllib` against
`raw.githubusercontent.com/OpenCut-app/opencut-classic/cf5e79e919144200294fb9fed22a222592a0aeea/` (the commit our
`captions-words.mjs` pins). Nothing was run in ffmpeg and nothing was placed or changed. Our planner's side was read
earlier (the `words-to-text.mjs` and `plan.mjs` readings in the cut room). The pin is the commit our code names, so this
shows what that upstream code does. It does not show what Cohabi's live browser editor saves. If the live editor is a
fork with different code, a saved caption is still the check.

## Findings (read from source)

1. **Position is centre-relative, in canvas pixels.** `services/renderer/nodes/text-node.ts`, `renderTextToContext`:
   `x = resolved.transform.position.x + node.params.canvasCenter.x`, and the same for y.
   `services/renderer/scene-builder.ts` sets `canvasCenter: { x: canvasSize.width / 2, y: canvasSize.height / 2 }`
   and builds `transform` from the flat params with `buildTransformFromParams`. Default position is (0, 0)
   (`timeline/defaults.ts`, `defaultTransform.position = {x: 0, y: 0}`), so a default caption is at the frame centre.
2. **The anchor is the text's centre, not its top-left corner.** `drawMeasuredTextLayout` (`text/primitives.ts`) sets
   `ctx.textAlign = layout.textAlign` (default `"center"`, from `defaults.ts`) and `ctx.textBaseline = "middle"` and draws
   with `fillText(line, 0, lineY)` after `ctx.translate(x, y)`. So position (0, 0) puts the text's horizontal centre and
   vertical middle at the frame centre. Positive y is down (canvas).
3. **`fontSize` is not pixels.** `resolveTextLayout` (`text/primitives.ts`): `scaledFontSize = fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE)`,
   with `FONT_SIZE_SCALE_REFERENCE = 90` (`text/typography.ts`). Default `fontSize` is 15, so the pixel size is
   15 × 1920 / 90 = 320 px at 1080×1920, and 15 × 960 / 90 = 160 px at 540×960 (inferred by arithmetic from the source, not rendered).
4. **Key form is flat.** `defaults.ts` lists `"transform.positionX"` and `"transform.positionY"` as flat keys in `params`.
   Our adapter reads the same flat keys. Key form is therefore not the problem.

## What it means for our code (inferred, not run)

- `words-to-text.mjs` passes `transform.positionX/Y` straight to drawtext `x`/`y`, which are the text box's **top-left** in
  pixels. Under the source above that is wrong in both ways: the offset is from the centre, and the anchor is the text's centre.
  Every generated caption (positions default to 0) would be drawn with its top-left at the frame's top-left corner, where the editor shows it centred.
- It passes `fontSize` straight to drawtext, so a stored 15 would render at 15 px where the editor shows about 1/6 of the frame height.
- `wrap.mjs`'s refusal of a negative `x` or `y` (`wrap-origin.test.mjs`) would, under this convention, reject any caption dragged
  left of centre or above it. Do not place it on the Words path as it stands. It would fit only after a conversion step has made the values top-left pixels.
- A conversion belongs in the adapter or just before `wrapCaptionParams`: `fontPx = fontSize * height / 90`, wrap at that size, then
  `x = width/2 + positionX - lineWidth/2` per line and a y from the block centre. Block centre comes from `height/2 + positionY`, minus half of
  `lines × lineHeight`. drawtext also accepts expressions (`(w-text_w)/2+posX`) that avoid a width estimate for the centred case.
  I have not written or tested this conversion.
- At that font size a normal sentence will wrap to many lines or not fit. Whether Cohabi's editor stores smaller `fontSize` values for
  captions than the 15 default is unknown, because `caption-defaults.ts` upstream was not read.

## Still open

- Is Cohabi's live editor this upstream code, or a fork? One saved caption (flush top-left, centred, and no position) from the live editor would confirm.
- `transcription/caption-defaults.ts` (upstream caption font size and position) not read.
- Who writes the conversion, and is it a new Cut job? That is Ash's call. It is a larger change than the origin check, so I'm not starting it unasked.
