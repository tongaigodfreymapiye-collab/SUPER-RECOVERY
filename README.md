# SUPER RECOVERY — Web Edition

A static, GitHub Pages-ready browser application for inspecting user-selected files and disk images for a set of common file signatures. It runs locally in the browser; it does not upload selected source data to a server.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `super-recovery`.
2. Extract this ZIP on your computer.
3. Upload the **contents** of this folder to the repository root (so `index.html` is at the root; do not upload only the ZIP).
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`, then Save.
7. Wait for the Pages deployment. Your site URL will appear in Settings → Pages.

The included workflow at `.github/workflows/pages.yml` can also deploy the site using GitHub Actions after Pages is configured to use GitHub Actions.

## Local preview

Open `index.html` in a modern browser, or run a local static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Important technical scope and safety

This is a **browser web app**, not a native disk recovery driver. A hosted website cannot enumerate physical drives, access raw sectors, bypass OS permissions, or recover a device that the browser cannot read. The user must explicitly select a file or disk image. Browser APIs provide read access to that selected file only.

The current signature scanner recognizes selected common headers (JPEG, PNG, GIF, PDF, ZIP, GZIP, MP3, WAV, MP4/MOV, AVI, BMP, TIFF, 7z and RAR). It exports bounded byte fragments from the selected source. It does not reconstruct file-system metadata, original names/folders, fragmented files, encrypted data, or deleted SSD blocks affected by TRIM. Header matches are not proof that a complete file is recoverable; some exports may be incomplete or false positives.

For a failing physical drive, stop using it and create a read-only sector image with specialist software or consult a professional recovery lab. Do not save recovered files to the source device. Do not run repair/format operations before imaging.

## Project structure

```text
index.html
styles.css
app.js
assets/logo.svg
.github/workflows/pages.yml
README.md
```
