# OCR Bridge

OCR Bridge sends images from a phone camera to a Node.js server on a laptop, recognizes English text with Tesseract.js, and displays the latest result on the laptop through WebSockets.

This README describes the source supplied in the attached project text. No application changes have been applied.

## Features

- Laptop page with a text area, Copy and Clear buttons, connection status, and QR code for the phone URL.
- Phone page with camera preview, Pause/Resume, and front/rear camera switching.
- Camera frames sent approximately every 1.5 seconds, resized to 800 pixels wide.
- English OCR performed on the server.
- Automatic WebSocket reconnection after approximately two seconds.
- One shared, in-memory text buffer for all connected clients.

## Project files

| File | Purpose |
| --- | --- |
| `server.js` | Express HTTP server, WebSockets, OCR worker, shared buffer, and LAN IP detection |
| `public/laptop.html` | Laptop interface and phone QR code |
| `public/phone.html` | Camera interface and frame transmission |
| `public/qrcode.min.js` | Browser QR code library |
| `package.json` | Project metadata, dependencies, and start command |
| `package-lock.json` | Dependency lockfile |
| `eng.traineddata` | English OCR data present in the supplied directory listing |
| `.gitignore` | Git exclusions; contents were not included in the attachment |

Dependencies declared in `package.json`: Express `^4.19.2`, ws `^8.17.0`, and Tesseract.js `^5.0.5`. The supplied terminal session used Node.js `v24.11.0`.

## Install and start

Install Node.js and npm. In PowerShell, open your project directory:

```powershell
Set-Location 'E:\New folder\ocr-bridge'
npm ci
npm start
```

`npm ci` uses the supplied lockfile. If you do not have that lockfile, use `npm install` instead.

Wait for `OCR worker ready` before scanning. The server uses port **3000**, listens on all network interfaces, and prints laptop and phone URLs. Stop it with **Ctrl+C**.

The existing code calls `Tesseract.createWorker('eng')` without an explicit language-data path. The presence of `eng.traineddata` alone does not establish a fully offline setup.

## Use

1. Connect the laptop and phone to the same local network.
2. On the laptop, open `http://localhost:3000/laptop.html`.
3. Scan the QR code or open the displayed phone URL on the phone.
4. If the browser permits camera access, allow it and point the camera at clear English text.
5. Read or copy the latest OCR result on the laptop.
6. Use Pause on the phone to stop sending new frames, or Flip to switch cameras.
7. Use Clear on the laptop to reset the shared text buffer.

Open the explicit `/laptop.html` path: the supplied project does not define a homepage route or provide an `index.html`.

## Current behavior and limitations

- **Camera access:** the generated phone link uses plain HTTP over a LAN IP. Modern mobile browsers generally require a secure context for camera access, so this link can open while camera access remains unavailable. The supplied code does not provide HTTPS.
- **HTTPS compatibility:** the phone page hardcodes `ws://`; it needs a corresponding change before use over HTTPS. The laptop page already selects `ws://` or `wss://` based on the page protocol.
- **Latest result only:** OCR replaces the previous text; it does not append a transcript. Whitespace and line breaks are collapsed to single spaces. Results shorter than three characters are ignored.
- **No persistence:** restarting the server loses the buffer. There is no database or saved scan history.
- **Shared session:** all clients use the same buffer; there is no login or device pairing.
- **Manual edits:** typing in the laptop text area changes only that browser's text. A later OCR broadcast can overwrite those edits.
- **Clear during scanning:** an in-flight or subsequent OCR result can repopulate the buffer after Clear.
- **OCR workload:** frames are sent on a timer without an application-level busy check or backpressure.
- **Network selection:** LAN detection chooses the first non-internal IPv4 address, which may belong to a VPN or virtual adapter.
- **Error handling:** camera startup and OCR-worker initialization do not have user-facing error handling.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Phone cannot open the page | Same network, correct laptop IP, port 3000 access, firewall, and Wi-Fi client isolation |
| Camera never starts | Browser camera permission and the secure-context limitation described above |
| QR code fails | `public/qrcode.min.js` exists and loads; try the displayed phone URL manually |
| No recognized text | `OCR worker ready` appears; phone is connected and not paused; text is clear and well lit; inspect server errors |
| Copy fails | Browser clipboard permissions or context restrictions; manually select and copy the text |
| Wrong IP in QR code | Check whether the detected address belongs to a VPN or virtual adapter |
| Port 3000 is occupied | Stop the conflicting process or request a change to the `PORT` constant in `server.js` |

## Applying future changes with a patch

Future requested changes can be delivered as a unified `.patch` file targeting paths relative to the project root. Keep the project at the version used to generate the patch, and back up or commit your changes first.

Save the supplied patch in your project folder. With Git installed, run:

```powershell
Set-Location 'E:\New folder\ocr-bridge'
git apply --check .\changes.patch
git apply .\changes.patch
npm start
```

Run the second command only if the check succeeds. If dependencies changed, run `npm install` before starting the server, following the patch's accompanying instructions.

To reverse that patch, provided subsequent edits do not conflict:

```powershell
git apply --reverse --check .\changes.patch
git apply --reverse .\changes.patch
```

If a patch check fails, share the error and the current contents of the affected files so the patch can be regenerated against your actual version.

## Verification status

This README was checked against the supplied source text. The application has not been run or tested with a physical phone in this workspace.


## Photo enhancement

See [PHOTO_ENHANCEMENT.md](PHOTO_ENHANCEMENT.md) for the single phone photo-to-text workflow, optional filters, preview, setup and tests. Barcode scanning is not part of this version.
