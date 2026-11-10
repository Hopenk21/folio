# Folio

PDF toolkit for Windows (.exe) and Android: merge, organize, split, watermark and number, optimize, PDF to Word, Word to PDF, and (Android only) document scanning.

One React + TypeScript codebase. Electron wraps it for Windows, Capacitor for Android.
- Android save: files go through the system share sheet ("Save to Files" etc.).
- The APK is a debug build. A Play Store release needs a signing key.
- Windows installer is unsigned, so SmartScreen will warn on first run.

## Honest limits
- Optimize is lossless only; it does not recompress images.
- PDF to Word rebuilds text and headings only. Scanned PDFs (no text layer) are rejected.
- Word to PDF reproduces headings, paragraphs and lists, not original fonts or layout.
- Watermark text is limited to Latin characters.
