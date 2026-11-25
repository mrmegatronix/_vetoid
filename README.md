# VetoID — New Zealand Hospitality 18+ ID Scanner (MVP)

Offline-first, zero-retention, cross-platform mobile ID verification app built for New Zealand licensed hospitality venues under the **Sale and Supply of Alcohol Act 2012 (SSAA 2012)** and **NZ Privacy Act 2020**.

## Key Features (Phase 1 MVP)
- **Approved NZ IDs Only:** NZ Driver Licence, Kiwi Access / Legacy HNZ 18+ Card, Current NZ/Overseas Passports (ICAO 9303 TD3 MRZ check-digit validation).
- **Hard Rejections:** Overseas driver licences, expired IDs, temporary paper licences, student IDs, SuperGold, Community Services, and Firearms licences.
- **Zero-PII RAM-Only Processing:** Never writes patron names, photos, or ID numbers to disk; Android `FLAG_SECURE` / iOS screen-capture prevention enabled.
- **Nightlife Ergonomics:** OLED `#000000` UI, torch toggle, 4-state full-screen peripheral verdicts (`PASS 18+`, `UNDER 18`, `EXPIRED`, `NOT ACCEPTED`), distinct haptics, `<25` Ask-25 cue, `SHOW PATRON` legal de-escalation card, and IPP 4 Manual DOB fallback.
- **PIN-Gated Shift Tally & Quick Standby:** Staff PIN loaded from `.env` (`EXPO_PUBLIC_STAFF_PIN=3528`), with Keep-Unlocked Quick Standby OLED blackout mode and instant 1-tap wake.
- **Built-In Info Guide & Offline QR Share:** One-tap `INFO` how-to / NZ SSAA 2012 reference page and offline `QR` share modal.

## Commands
```bash
npm install
npm run typecheck
npm test
npm run web      # Browser preview
npm run android  # Android device / emulator
npm run ios      # iOS simulator / device
```
