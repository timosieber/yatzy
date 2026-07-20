# Würfelblock

Ein vollständiger, mobiler Yatzy-Spielblock für 2–8 Personen. Enthalten sind Standard, Blitz, Maxi Yatzy und freie Regeln, ein lockerer Ablauf ohne Zugzwang, automatische Punktprüfung, Rückgängig/Korrektur, lokale Wiederaufnahme, Spielverlauf und Bestenlisten.

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
3. Verbinde den Webdienst mit PostgreSQL und füge `DATABASE_URL` als Railway-Referenz auf die PostgreSQL-Variable hinzu. Trage dort keine lokale Adresse wie `localhost` ein.
4. Starte das Deployment. `railway.json` verwendet Railpack, baut die Vite-App, startet den Node-Server und prüft `/api/health`.

Weitere Variablen sind nicht erforderlich. Optional kann `PGSSLMODE=require` gesetzt werden, wenn eine externe Datenbank TLS verlangt. Der Webdienst bedient Oberfläche und API über dieselbe Domain; abgeschlossene Spiele werden serverseitig neu berechnet und in PostgreSQL gespeichert.

## Spielregeln

- **Standard:** 5 Würfel, 35 Bonuspunkte ab 63 im oberen Teil.
- **Blitz:** oberer Teil, Yatzy und Chance.
- **Maxi Yatzy:** 6 Würfel, zusätzliche Kategorien, 100 Bonuspunkte ab 84.
- **Freie Regeln:** 5–8 Würfel sowie anpassbares Bonusziel und Bonuswert.
- **Locker:** freier Ablauf ohne Zugzwang mit frei wählbarem Regelsatz (Standard, Blitz, Maxi oder freie Regeln). Jede Person kann jede Zelle jederzeit eintragen, korrigieren oder leeren; über „Weiter/Zurück" oder einen Klick auf den Namen wechselt die aktive Person, ohne dass etwas eingetragen sein muss. Das Spiel endet nur über „Spiel beenden" (leere Felder zählen 0). Locker-Spiele erscheinen im Verlauf, zählen aber nicht in der Bestenliste.

Für alle Spielmodi gelten außerdem diese Hausregeln:

- **1 Paar, 2 Paare, 3 Gleiche und 4 Gleiche:** beliebige nichtnegative ganze Punktzahl.
- **Chance:** beliebige nichtnegative ganze Punktzahl.
- **Full House:** fest 25 Punkte.
- **Kleine Straße:** fest 30 Punkte.
- **Große Straße:** fest 40 Punkte.
- **Yatzy:** jeder Yatzy zählt 50 Punkte. Das Feld kann beliebig oft in 50er-Schritten erhöht werden, zum Beispiel auf 50, 100, 150 oder mehr.

Null ist in jeder Kategorie als gestrichen erlaubt. Alle berechneten Kategorien werden anhand der gewählten Würfelzahl geprüft. Bereits lokal gespeicherte Spiele werden beim nächsten Öffnen automatisch auf die aktuellen Regeln aktualisiert.
