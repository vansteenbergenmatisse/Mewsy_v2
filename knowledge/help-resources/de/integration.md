---
title: So funktioniert die Integration
cta_title: Möchtest du dein spezifisches Setup verstehen?
cta_text: Frage Mewsie zu deinem Buchhaltungssystem, Flow Typ oder deiner Mapping Konfiguration.
cta_button: Mewsie zur Integration fragen
cta_message: Wie funktioniert die Integration von Mews und Omniboost?
---

## Das einfache Bild

Deine Hoteldaten liegen in Mews. Deine Buchhaltungssoftware braucht diese Daten. Omniboost ist die Brücke dazwischen. Jeden Tag liest Omniboost die Daten des Vortages aus Mews, wandelt sie in das passende Format für dein Buchhaltungssystem um und sendet sie automatisch weiter. Du musst nichts tun, sobald es eingerichtet ist.

## Schritt für Schritt: was jeden Tag passiert

- Zu deinem konfigurierten Tagesabschluss (Standard: Mitternacht) finalisiert Mews die Daten des Tages im Accounting Report.
- Omniboost ruft diese Daten über die Mews API ab.
- Omniboost wendet deine Mapping Regeln an und ordnet jede Mews Kategorie dem richtigen Kontocode in deinem Buchhaltungssystem zu.
- Omniboost erstellt Buchungen (oder Rechnungen, je nach deinem Flow) und übermittelt sie an dein Buchhaltungssystem.
- Alles erscheint am nächsten Morgen in deiner Buchhaltungssoftware, bereit zur Prüfung.

## Zwei Integrationsarten

API Integrationen posten Daten direkt und automatisch in deine Buchhaltungssoftware. Financial Export Integrationen erzeugen eine CSV oder TXT Datei im richtigen Format für dein Buchhaltungssystem, die täglich an eine angegebene E-Mail Adresse oder einen sicheren FTP Speicherort gesendet wird, bereit für den Import. Die meisten Mews Integrationen sind API basiert.

## Welche Daten übertragen werden

- Umsätze: aufgeschlüsselt nach Servicekategorie (Übernachtung, F&B, Spa, Extras usw.)
- Zahlungen: nach Zahlungsart (Bargeld, Karte, City Ledger, Gateway usw.)
- Mehrwertsteuer / Tax: aus Bruttobeträgen extrahiert und auf die richtigen Steuerkonten gebucht
- Forderungen: Debitorenrechnungen beim Closed Bills Flow
- Statistiken (nur Gold Tier): Anreisen, Abreisen, außer Betrieb genommene Zimmer, Gästeanzahl usw.

## Kann ich es manuell auslösen?

Ja. Über das Omniboost Portal kannst du jederzeit einen Push für ein bestimmtes Datum oder einen Datumsbereich manuell auslösen. Das ist nützlich zum Testen, zum Nachholen nach einer Lücke oder zum erneuten Senden eines bestimmten Tages, falls etwas schiefgegangen ist.
