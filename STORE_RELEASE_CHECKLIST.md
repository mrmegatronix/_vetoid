# VetoID — Google Play & Apple App Store Publishing Guide

## 1. Store Listing Metadata (Copy-Paste Ready)
- **App Name:** VetoID — NZ 18+ ID Scanner
- **Short Description (80 chars):** Fast, zero-PII 18+ ID scanner for New Zealand bars, venues & bottle stores.
- **Category:** Business / Utilities
- **Content Rating:** 17+ / 18+ (Alcohol / Licensed Hospitality Operations Tool)
- **Privacy Policy URL:** https://mrmegatronix.github.io/_vetoid/privacy.html
- **Support URL (Required by Apple):** https://mrmegatronix.github.io/_vetoid/support.html
- **Marketing / Website URL:** https://mrmegatronix.github.io/_vetoid/
- **Google Play Store Screenshots (`1080×1920`):** `store-assets/screenshots/google-play-*.png`
- **Apple App Store 6.7" Screenshots (`1290×2796`):** `store-assets/screenshots/apple-ios-67-*.png`
- **Google Play Feature Graphic (`1024×500`):** `assets/feature-graphic.png`
- **Signed Google Play `.aab` (`v2.0.1`, `versionCode 3`):** https://expo.dev/artifacts/eas/X-O0S-NUbhRGu6vi7M1G6UBTEQAGu0sMQjzFLHdf_sY.aab
- **Bundle ID / Package Name:** `nz.vetoid.scanner`
- **App Review Test Instructions:**
  - Tap `TEST / DRILL` to test all 5 synthetic NZ IDs (Valid NZDL, Under-18 Kiwi Access, Expired Passport MRZ, Overseas Driver Licence, NZ DISTF Digital ID) without physical IDs.
  - Tap `MANUAL DOB` to test the smart DOB keypad.
  - Tap `SHIFT` and enter Staff PIN `3528` to review Shift Roles, End-of-Day CSV Backup, Trespass Register, and Settings.

## 2. Google Play Data Safety & Apple App Privacy Declarations
- **Data Collected:** None (Zero patron PII collected, stored, or shared with third parties).
- **Camera Usage:** Processed 100% on-device in volatile RAM; zero images persisted or uploaded.
- **Encryption:** `ITSAppUsesNonExemptEncryption = false` (standard OS HTTPS/SHA-256 only).

## 3. Prerequisites (User Account Setup)
1. **Expo Account (Free):** https://expo.dev/signup
2. **Google Play Console ($25 USD one-time):** https://play.google.com/console
3. **Apple Developer Program ($99 USD/yr):** https://developer.apple.com/programs/

## 4. Build & Submit Commands (Runs From Linux — No Mac Required)
```bash
npm install -g eas-cli
eas login
cd "/run/media/zeus/6TB-1/__GITHUB NUC/_vetoid"

# 1. Link project to your Expo account
eas init

# 2. Build signed Production Android App Bundle (.aab) & iOS (.ipa)
eas build --platform android --profile production
eas build --platform ios --profile production

# 3. Submit directly to Google Play Internal Track & Apple App Store Connect / TestFlight
eas submit --platform android --profile production
eas submit --platform ios --profile production
```
