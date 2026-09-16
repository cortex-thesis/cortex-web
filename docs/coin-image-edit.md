# Coin image edit

Update: With user approval, `scripts/prepare_coin_assets.py` now extracts all three original photos using antialiased geometric masks. The app uses `one-peso-coin-transparent.png`, `five-peso-coin-transparent.png`, and `ten-peso-coin-transparent.png` under `frontend/public/assets/life/life-03/`. All are 512 x 512 RGBA PNGs, with approximately 460 x 460 centered coin bounds and transparent corners. This supersedes the generated one-peso cutout below. Source photos remain unchanged.

Built-in image generation was used for background extraction.

Saved accepted asset: `frontend/public/assets/life/life-03/one-peso-coin-transparent.png`.
Its corner alpha is 0; the PNG has an alpha channel. Original coin photos remain unchanged.

Final prompt for the accepted asset:

> Use case: background-extraction. Edit target: the attached Philippine coin photograph. Remove only the background outside the coin, producing genuine transparent alpha. Preserve the entire coin, its exact denomination, inscriptions, portrait, metallic color, texture and outline; do not redraw or change any details. Center the full coin on a square transparent canvas, occupying 90% of its width and height, small equal transparent margins, no shadow or added objects.

Five- and ten-peso attempts were rejected: both initial and retry outputs painted checkerboards and had no alpha channel. Those outputs are not referenced by the app. Their original assets are retained pending another extraction method.
