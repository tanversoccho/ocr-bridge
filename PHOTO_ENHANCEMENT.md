# Photo-to-text with enhancement filters

This update removes the separate barcode scanner, barcode login/pairing controls, dedicated barcode fields, scanner routes, decoder dependency and scanner tests. It restores the original laptop interface and OCR server from the confirmed working `8f1004a` source. There is one phone workflow: `/phone.html`.

## Apply (after the previous barcode patch)

Stop the server with Ctrl+C. From the project directory:

```powershell
git apply --check 'C:\Users\Acer\Downloads\ocr-bridge-photo-only.patch'
git apply 'C:\Users\Acer\Downloads\ocr-bridge-photo-only.patch'
npm ci
npm test
npm start
```

This patch targets the source produced by `ocr-bridge-barcode.patch`. It does not reset Git history or data. If the check fails, stop and provide the error/current source rather than forcing a partial application. No password or scanner pairing configuration is needed. The old BRIDGE_PASSWORD environment variable is unused.

Refresh the laptop with Ctrl+F5. Close old phone/barcode tabs, then scan the **existing hamburger-menu QR** or open the Phone URL printed at startup. Both devices use the same reachable Wi-Fi.

## Workflow

Take photo → crop → choose enhancement/rotation → Preview enhanced crop → Send picture → recognized text on laptop.

- Original is the default; no filter is required.
- Auto contrast stretches tonal range. Other choices are grayscale, mild sharpening + contrast, global black-and-white, adaptive black-and-white and inversion.
- Rotation includes quarter turns and small correction angles. Estimate tilt suggests a small angle using pixel projections; inspect it and adjust manually if needed. It is a heuristic, not reliable perspective correction.
- Reset enhancement restores Original and 0°. Reset crop restores crop edges.
- Enhancement happens locally in a Web Worker. Stop enhancement terminates it and keeps the source/crop. Original mode needs no worker and remains available if filters cannot run.
- The exact preview image is sent; settings/crop changes invalidate it so the next preview/send regenerates from the unmodified source. Only one selected enhanced image is uploaded for OCR, not a batch of filter attempts.
- Enhanced working crops have a longest edge of at most 1800 pixels. Original mode retains up to the existing 2400-pixel source limit. Input files over 20 MB are rejected. Browser decoding can temporarily use more memory before resizing. Adaptive thresholding uses a bounded integral image. Rotation adds white padding and expands dimensions to avoid cutting corners.
- Filters can help contrast/lighting but do not guarantee better OCR. They cannot reconstruct severe blur, glare, missing text or extreme perspective. Preview first; use Original if filtering loses detail.

## Sync and privacy

The original WebSocket shared-buffer sync is retained. This is photo-to-text, with no barcode decoding and no new login or token pairing. Like the original working application, recognized text is shared with connected laptop pages; it is not routed to one selected tab. No persistence or database is introduced. The phone sends the selected crop to the laptop for Tesseract English/Bangla OCR.

The original unauthenticated HTTP/LAN behavior is unchanged. Use a trusted local network. OCR setup and language-data requirements remain those of the working source. No CDN or paid API is added. `@napi-rs/canvas` is only a development dependency for filter/preview tests; no barcode library is needed.

## Verification

Tests exercise all filter pixel outputs, source preservation, tilt/dimension checks, photo capture model, original and filtered preview/send, sending the exact preview bytes, rotation bounds, cancellation/crop retention, and server coexistence with the original OCR WebSocket (mock Tesseract). They use generated images/native test canvases and a simulated DOM, not a physical phone. The removal of the barcode page is checked through HTTP.

Real phone/browser rendering, Wi-Fi, actual camera picker and OCR quality before/after filtering are not verified here. Manually verify capture→crop→preview→send for Original first, then Auto contrast, then other filters as useful. Confirm that text appears on the laptop and that stopping a filter does not lose the photo.
