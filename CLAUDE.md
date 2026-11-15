# Tideworks

Insel- und Fabrikbauspiel im Browser (Canvas, Pixel-Art, Vanilla-JS mit ES-Modulen, Vite), mit Story, NPC-Handel und Koop für bis zu 4 Spieler über WebRTC (PeerJS).
Die Simulation läuft im Web Worker (`src/sim/`), die Oberfläche im Hauptthread (`src/ui/`), Spielzahlen stehen in `src/data/`.
Veröffentlicht über GitHub Pages: https://crinklycrown.github.io/tideworks/ (jeder Push auf `main` baut und deployt, siehe `.github/workflows/deploy.yml`).

## Befehle

```bash
npm install        # Abhängigkeiten
npm run dev        # Entwicklungsserver: http://localhost:5173/tideworks/
npm run build      # fertige Version nach dist/ (plus Einzeldatei dist/tideworks.html)
npm run preview    # dist/ ansehen: http://localhost:4173/tideworks/
npm run check:coop # weitere Prüfskripte: check:tree, check:world, check:story, check:npc, check:extract, check:wonder, check:dive, check:akt4, check:ending
```

## Doku

- `README.md`: Aufbau, Systeme, Debug-Funktionen, Spielstände.
- `NOTES.md`: Entscheidungen, Abweichungen und Tests je Version, offene Punkte.
- `docs/`: `STORY.md` (Geschichte), `SYSTEMS.md` (Spielsysteme), `PLAN.md` (Plan), `TEST-*.md` (Testanleitungen).

## Regeln

- **Koop darf nicht kaputtgehen.** Spieleraktionen laufen über den Befehls-/Host-Weg, Weltzustand synchronisiert der Host. Nach Änderungen `npm run check:coop` (und passende weitere Checks) laufen lassen.
- **NOTES.md nach jeder Aufgabe aktualisieren:** neuer Abschnitt mit Version, Entscheidungen, Abweichungen, was geprüft und was nicht geprüft wurde.
- **Version wie gewohnt erhöhen** in `package.json` (Neues: Minor, z. B. 0.23.0 → 0.24.0; Fehlerbehebung: Patch, z. B. 0.20.1). `SAVE_VERSION` in `src/config.js` nur bei geändertem Spielstand-Format, mit Migration.
- **Spielzahlen in Datendateien (`src/data/`) statt im Code.**
- `base` in `vite.config.js` bleibt `/tideworks/`, sonst bricht GitHub Pages.
