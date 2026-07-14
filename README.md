# Würfelblock

Ein vollständiger, mobiler Yatzy-Spielblock für 2–8 Personen. Enthalten sind Standard, Blitz, Maxi Yatzy und freie Regeln, automatische Punktprüfung, Rückgängig/Korrektur, lokale Wiederaufnahme, Spielverlauf und Bestenlisten.

## Lokal starten

Voraussetzungen: Node.js 22 oder neuer und PostgreSQL.

```bash
npm ci
cp .env.example .env
npm run dev
```

Passe `DATABASE_URL` in `.env` an deine lokale Datenbank an. Die Tabellen werden beim Serverstart automatisch und transaktionssicher angelegt. Die App läuft anschließend über `http://localhost:5173`.

## Prüfung

```bash
npm run lint
npm test
npm run build
```

## Railway-Deployment

1. Erstelle auf Railway ein Projekt aus diesem GitHub-Repository.
2. Füge im Projekt einen PostgreSQL-Dienst hinzu.
3. Verbinde den Webdienst mit PostgreSQL, sodass `DATABASE_URL` verfügbar ist.
4. Starte das Deployment. `railway.json` verwendet Railpack, baut die Vite-App, startet den Node-Server und prüft `/api/health`.

Weitere Variablen sind nicht erforderlich. Optional kann `PGSSLMODE=require` gesetzt werden, wenn eine externe Datenbank TLS verlangt. Der Webdienst bedient Oberfläche und API über dieselbe Domain; abgeschlossene Spiele werden serverseitig neu berechnet und in PostgreSQL gespeichert.

## Spielregeln

- **Standard:** 5 Würfel, 35 Bonuspunkte ab 63 im oberen Teil.
- **Blitz:** oberer Teil, Yatzy und Chance.
- **Maxi Yatzy:** 6 Würfel, zusätzliche Kategorien, 100 Bonuspunkte ab 84.
- **Freie Regeln:** 5–8 Würfel sowie anpassbares Bonusziel und Bonuswert.

Null ist in jeder Kategorie als gestrichen erlaubt. Andere Einträge werden nur akzeptiert, wenn sie mit der gewählten Würfelzahl tatsächlich erreichbar sind.
