# Individuelle Wertungen und wiederholte Yatzys

## Ziel

Der digitale Spielblock soll die am Tisch verwendeten Hausregeln direkt abbilden. Vier variable Kategorien werden frei eingegeben, Full House und Straßen erhalten feste Werte, und ein Spieler kann beliebig viele Yatzys in demselben Feld sammeln. Die Regeln gelten einheitlich in Standard, Blitz, Maxi Yatzy und Freie Regeln, sofern die jeweilige Kategorie im Modus vorhanden ist.

## Wertungsregeln

### Frei eingebbare Kategorien

Die folgenden Kategorien akzeptieren jede nichtnegative ganze Zahl:

- 1 Paar
- 2 Paare
- 3 gleiche
- 4 gleiche

Null bedeutet weiterhin gestrichen. Negative Werte, Dezimalzahlen, leere Eingaben, Werte außerhalb des sicheren ganzzahligen Bereichs und Eingaben, durch die die Gesamtsumme den sicheren ganzzahligen Bereich verlässt, werden abgelehnt. Die freie Eingabe gilt in allen Modi, in denen die Kategorie vorhanden ist. Andere variable Kategorien von Maxi Yatzy, etwa 3 Paare, 5 gleiche und Turm, behalten ihre bisherige regelbasierte Punkteauswahl.

### Feste Kategorien

- Full House: 25 Punkte
- Kleine Straße: 30 Punkte
- Große Straße: 40 Punkte

Für diese Kategorien kann ausschließlich der feste Wert oder null als gestrichen gespeichert werden. Die Werte gelten einheitlich für alle Modi. Die volle Straße in Maxi Yatzy bleibt unverändert bei 21 Punkten.

### Wiederholte Yatzys

Jeder Yatzy zählt in allen Modi 50 Punkte. Das Yatzy-Feld enthält die kumulierte Punktzahl und akzeptiert ausschließlich nichtnegative Vielfache von 50: 0, 50, 100, 150 und so weiter. Es gibt keine fachliche Obergrenze für die Anzahl der Yatzys; technisch bleibt die Summe auf sichere Ganzzahlen begrenzt.

## Bedienung

Der vorhandene Punkte-Dialog passt sich an den Kategorietyp an:

- Für die vier frei eingebbaren Kategorien zeigt er ein numerisches Eingabefeld. Der Spieler trägt die fertige Punktzahl ein und speichert sie. Ein separater „Streichen“-Knopf speichert null.
- Für Full House sowie kleine und große Straße zeigt er weiterhin eine eindeutige Punkteauswahl mit dem neuen festen Wert und dem „Streichen“-Knopf.
- Für Yatzy zeigt er einen Zähler mit „−50“ und „+50“. Der Startwert ist bei einer neuen Eingabe null und bei einer Korrektur der bereits gespeicherte Wert. Der Minusknopf ist bei null deaktiviert.
- Alle anderen Kategorien behalten die vorhandene Auswahl möglicher Punktwerte.

Korrektur und Rückgängig erfassen weiterhin den vollständigen vorherigen Spielzustand. Eine Korrektur verändert den aktiven Spieler nicht. Die Tabellenzelle zeigt bei mehreren Yatzys direkt die kumulierte Punktzahl.

## Gemeinsame Validierung

Browser und Server verwenden dieselbe zentrale Regeldefinition. Kategorien kennzeichnen ihre Eingabeart deklarativ als freie Zahl, festen Wert, wiederholbaren 50er-Wert oder berechnete Auswahl. Dadurch müssen Dialog, Spielzustand und API keine separaten Sonderregeln pflegen.

Die Servervalidierung berechnet Summen, Bonus, Rang und Sieger weiterhin selbst. Manipulierte negative Zahlen, Dezimalwerte, ungültige feste Werte und Yatzy-Werte außerhalb des 50er-Rasters werden mit einer strukturierten 4xx-Antwort abgelehnt.

## Versionierung und vorhandene Daten

Neue Spielübermittlungen verwenden `categoryVersion: 2`. Bereits in PostgreSQL gespeicherte Spiele der Version 1 werden unverändert aus Verlauf und Detailansicht gelesen; ihre gespeicherten Punkte und Summen werden nicht nachträglich verändert. Eine nummerierte Datenbankmigration erweitert die Spalten für Teil- und Gesamtsummen von `INTEGER` auf `BIGINT`, damit übliche hohe Hausregelwerte sicher gespeichert werden. Bestehende Datensätze benötigen dabei keine inhaltliche Umschreibung.

Lokal gespeicherte, noch nicht abgeschlossene Runden werden beim Laden auf die neuen Regeln gehoben: nichtnull Full-House- und Straßenwerte werden auf 25, 30 beziehungsweise 40 normalisiert; vorhandene Yatzy-Werte werden auf das nächste gültige Vielfache von 50 abgerundet; freie Kategorien bleiben unverändert. Die Migration wird in der versionierten Browser-Speicherung einmalig auf den aktuellen Zustand und jeden Rückgängig-Snapshot angewendet; Zugreihenfolge und Historie bleiben erhalten.

## Tests und Abnahme

- Regellogik: freie Ganzzahlen, feste Werte, wiederholte 50er-Yatzys und unveränderte Maxi-Sonderkategorien.
- Spielzustand: Eingabe, Korrektur, Rückgängig, Abschluss und Rangfolge mit mehreren Yatzys.
- Oberfläche: freies Zahlenfeld, feste Auswahl und bedienbarer Yatzy-Zähler per Maus und Tastatur.
- API: akzeptierte und abgelehnte neue Werte, serverseitige Neuberechnung und `categoryVersion: 2`.
- Speicherung: Migration einer lokalen Version-1-Runde und unverändertes Lesen alter Datenbankspiele.
- Abschluss: vollständiger Testlauf, Linter, Produktions-Build und Browserprüfung auf Handy und Desktop.

Die Änderung ist abgenommen, wenn alle vier Modi die neuen Regeln konsistent verwenden, mehrere Yatzys ohne fachliche Obergrenze erfasst werden können, freie Werte bis zum Server gelangen und bestehende Verlaufsdaten lesbar bleiben.
