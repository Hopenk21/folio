# Folio

PDF toolkit for Windows (.exe) and Android: merge, organize, split, watermark and number, optimize, PDF to Word, Word to PDF, and (Android only) document scanning.

One React + TypeScript codebase. Electron wraps it for Windows, Capacitor for Android.

## Run it
    npm install
    npm run dev            # browser preview (add ?android=1 to see the Scan tab)
    npm run electron:dev   # desktop window

## Get the .exe and .apk without installing anything locally
1. Push this folder to a GitHub repo.
2. Actions tab -> "Build Folio" -> Run workflow.
3. Download `folio-windows` (installer + portable .exe) and `folio-android` (debug .apk) from the run.

## Things to verify on first build (written without being able to run them)
- `npm run build` runs the TypeScript check; fix any type errors it reports.
- Scanner: `src/platform.ts` -> `scanPages()` wraps `@capgo/capacitor-document-scanner`. If that plugin's API differs from what is called there, only that function needs changing. Needs Google Play services on the phone.
- Android save: files go through the system share sheet ("Save to Files" etc.).
- The APK is a debug build. A Play Store release needs a signing key.
- Windows installer is unsigned, so SmartScreen will warn on first run.

## Honest limits
- Optimize is lossless only; it does not recompress images.
- PDF to Word rebuilds text and headings only. Scanned PDFs (no text layer) are rejected.
- Word to PDF reproduces headings, paragraphs and lists, not original fonts or layout.
- Watermark text is limited to Latin characters.
