# Spielmodus „Locker" – Design

## Ziel
Ein Ablaufmodus ohne Zugzwang: Jede Person kann jede Zelle jederzeit eintragen, korrigieren oder
leeren. Die „aktive" Person dient nur der Orientierung und lässt sich frei wechseln (Weiter/Zurück
oder Klick auf den Namen), ohne dass etwas eingetragen sein muss. Das Spiel endet ausschließlich
über einen „Spiel beenden"-Button.

## Kernentscheidung: orthogonales Flag statt eigenem Modus
`mode` bleibt immer eines der bestehenden Regelsets (`standard | blitz | maxi | free`). Der lockere
Ablauf ist ein separates Boolean `locker` auf dem Spielobjekt. Damit entfällt jede Regel-Duplikation,
und `getMode()` in Verlauf/Detail/Bestenliste bleibt unverändert nutzbar. Im Setup ist „Locker" ein
eigener Listeneintrag (`flow: 'strict' | 'locker'`) mit eigener Regelwahl.

## Domain (`src/domain/game.js`)
- `createGame(config, names, id, { locker = false })` setzt `game.locker`.
- Neue Reducer-Actions, nur gültig wenn `state.locker === true` (sonst Fehler):
  - `set` – setzt eine beliebige Zelle (validiert), ohne Zugzwang, ohne Auto-Weiterschalten, ohne Auto-Ende.
  - `clear` – löscht eine Zelle (undo-bar).
  - `setActive` – wechselt die aktive Person (nicht in der Undo-Historie).
  - `finish` – setzt `status = 'finished'` manuell.
- `score | correct | undo` und das strenge Verhalten bleiben unverändert.
- `toSubmission` ergänzt `locker` und füllt leere Zellen mit `0` (der Server verlangt vollständige Keys).

## Server
- `gameService`: Schema um `locker` erweitert, im kanonischen Spiel durchgereicht. Vollständigkeits-
  und Wertprüfungen unverändert (Client füllt `0` auf).
- `getLeaderboard` (Memory + Postgres) schließt Locker-Spiele aus; Verlauf (`listGames`/`getGame`)
  enthält sie weiterhin.
- Migration `003_add_locker_flag.sql`: `games.locker BOOLEAN NOT NULL DEFAULT false`.

## UI
- `Setup`: Locker-Eintrag + Sub-Regelwahl (inkl. Schieber der freien Regeln).
- `GameBoard`: jede Zelle editierbar, Weiter/Zurück-Buttons, klickbare Spaltennamen, „Spiel beenden"
  (Bestätigung → `finish` → Gewinner-Dialog). Kein automatisches Spielende.
- `ScoreDialog`: zusätzlicher „Leeren"-Button. `WinnerDialog`, `History`, `GameDetail` kennzeichnen
  Locker-Spiele und den Bestenlisten-Ausschluss.

## Bewusst nicht enthalten
Kein Solo-Modus, kein serverseitiges Zwischenspeichern laufender Spiele, keine Änderung der Bonusregel
(Oberbonus weiterhin nur bei vollständig ausgefülltem oberen Block).
