# Concourse CI – offene Punkte

- [ ] GitHub-Branch-Protection für `develop` und `main` um den Status `concourse-ci/status` ergänzen (kommt aus den Jobs `pr-develop` / `pr-main`).
- [ ] GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/release.yml`) entfernen, sobald die Concourse-Pipeline verifiziert ist.
- [ ] Falls `node:latest` auf Node ≥ 26 zeigt: Image pinnen oder im Verify-Task `NODE_OPTIONS="--localstorage-file=..."` setzen (jsdom-`localStorage`-Nebenbefund).
- [ ] Nach dem ersten Release-Lauf prüfen, ob der `[skip ci]`-Commit von semantic-release einen zusätzlichen (harmlosen) `release`-Job auslöst; ggf. Release-Job manuell-only stellen.
