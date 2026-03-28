# Jansori 잔소리 — Browser Extension (Chrome + Firefox)

## What This Is
A cross-browser extension (Manifest V3) that reminds users to maintain good posture, take walk breaks, and stay hydrated. The name means "caring nagging" in Korean — like a parent telling you to sit up straight.

**Brand:** Built under the [BurgundyTable](http://burgundytable.com) umbrella. Warm, grounded, a little cheeky — not corporate wellness. Think "good coffee at a quiet table," not "productivity hack."

**Creator:** Brandon (천명우), bilingual Korean-American based in Seoul.

## Architecture

```
jansori/
├── manifest.json          # MV3 manifest, permissions: alarms, storage, offscreen, notifications
├── background.js          # Service worker — alarm management, notification dispatch, cross-browser sound playback
├── i18n.js                # EN/KO string definitions including snarky reminder messages
├── popup.html             # Extension popup UI (350px wide, burgundy dark theme)
├── popup.js               # Popup logic — settings management, UI state, language toggle
├── offscreen.html         # Offscreen document for audio playback (Chrome only)
├── offscreen.js           # Audio playback handler (Chrome only)
├── icons/                 # 16, 48, 128px PNGs — burgundy speech bubble with cream heart
├── README.md              # Project documentation
├── LICENSE                # MIT license
├── PRIVACY.md             # Privacy policy
└── sounds/                # 4 built-in MP3s (~1.5s each)
    ├── gentle-bell.mp3
    ├── singing-bowl.mp3
    ├── wood-knock.mp3
    └── soft-chime.mp3
```

## Key Design Decisions

- **One shared sound** for all reminder types (posture/walk/hydration). The notification message itself differentiates them. Don't add per-type sound settings — it's UI bloat.
- **Custom sound upload** stored as base64 dataURLs in chrome.storage.local. Max 1MB per file.
- **Bilingual EN/KO** via simple toggle, NOT a full i18n framework. All strings live in `i18n.js`. Korean messages are written naturally, not translated from English.
- **No inline scripts** anywhere — MV3 CSP requirement. All JS in separate files.
- **Cross-browser audio:** Chrome uses offscreen document pattern (service workers can't play audio directly). Firefox plays audio directly in the background script. Detection via `!!chrome.offscreen`.

## Settings Schema (chrome.storage.local)

```js
{
  posture:   { enabled: true,  intervalMinutes: 20 },
  walk:      { enabled: false, intervalMinutes: 45 },
  hydration: { enabled: false, intervalMinutes: 30 },
  sound: "gentle-bell",       // or "singing-bowl", "wood-knock", "soft-chime", "custom-{timestamp}"
  volume: 0.7,                // 0–1
  showNotification: true,
  lang: "en",                 // or "ko"
  customSounds: []            // [{ id, name, dataUrl }]
}
```

## Visual Identity

- **Palette:** Dark bg `#1c1618`, surface `#271e21`, burgundy `#a3454a` / `#c75a5f`, cream text `#e8ddd0`, dim text `#9a8b80`
- **Walk accent:** `#b89a6e` (warm gold)
- **Hydration accent:** `#6e9fb8` (cool blue)
- **Fonts:** Libre Baskerville (display/brand), Noto Sans KR (body/UI) — loaded from Google Fonts
- **Icon:** Burgundy speech bubble with cream heart (from Gemini), transparent background

## Generating Sounds

Built-in sounds are ~1.5 seconds each. Can be regenerated with `sox` or via Python (numpy + ffmpeg):

```bash
# Gentle Bell (1.5s, dual sine tones)
sox -n /tmp/b1.wav synth 1.5 sine 660 fade 0.01 1.5 1.0 vol 0.4
sox -n /tmp/b2.wav synth 1.5 sine 990 fade 0.01 1.5 1.0 vol 0.3
sox -m /tmp/b1.wav /tmp/b2.wav sounds/gentle-bell.mp3

# Singing Bowl (1.5s, with tremolo)
sox -n sounds/singing-bowl.mp3 synth 1.5 sine 396 fade 0.05 1.5 1.0 tremolo 4 20 vol 0.5

# Wood Knock (1.5s, percussive)
sox -n sounds/wood-knock.mp3 synth 1.5 sine 220 fade 0.005 1.5 1.2 vol 0.5

# Soft Chime (1.5s, high shimmer)
sox -n sounds/soft-chime.mp3 synth 1.5 sine 880 fade 0.01 1.5 1.1 tremolo 6 15 vol 0.4

# All sounds should be ~1.5 seconds with proper fade-outs.
```

## Known Issues / Future Work

- **Sound quality:** Built-in sounds are synthesized via sox — functional but basic. The custom upload feature is the real solution here.
- **v2 ideas:**
  - Differentiate reminder types by chime count (1 for posture, 2 for walk, 3 for hydration) — same sound, different pattern
  - Chrome sync storage so settings persist across devices
  - Streak/stats tracking
  - Schedule mode (only remind during work hours)
- **Chrome Web Store:** One-time $5 developer registration fee to publish. No fee for local "Load unpacked" use.

## Code Style

- Vanilla JS, no frameworks, no build step
- CSS in `popup.html` `<style>` block (single-file approach for extension simplicity)
- `i18n.js` loaded as a shared script in both popup and background contexts (`importScripts` in service worker, `<script>` tag in popup)
- Use `const $ = (sel) => document.querySelector(sel)` pattern in popup.js

## Testing

### Chrome
1. `chrome://extensions` → Developer mode → Load unpacked → select project folder
2. Click extension icon to open popup, verify UI renders
3. Toggle reminders on, set short intervals (5 min) for testing
4. Use "Test Sound" and "Test Notification" buttons
5. Switch language toggle and verify all strings update
6. Upload a custom sound file and verify it plays
7. Check `chrome://extensions` → service worker "Inspect" for background errors

### Firefox
1. `about:debugging` → This Firefox → Load Temporary Add-on → select manifest.json
2. Same functional tests as Chrome
3. Verify audio plays without offscreen document (Firefox uses direct Audio() in background)
