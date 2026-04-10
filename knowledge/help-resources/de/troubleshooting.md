---
title: Fehlerbehebung
cta_title: Dein Problem ist hier nicht aufgeführt?
cta_text: Beschreibe Mewsie dein konkretes Problem. Es kann die meisten gängigen Integrationsprobleme eingrenzen.
cta_button: Mewsie um Hilfe fragen
cta_message: Ich habe ein Problem mit meiner Omniboost Integration. Kannst du mir bei der Fehlerbehebung helfen?
---

## Nicht zugeordnete Kategorien (Fallback Warnungen)

Wenn das Omniboost Portal Warnungen zu nicht zugeordneten Einträgen anzeigt, bedeutet das, dass einer Umsatz oder Zahlungskategorie in Mews kein Ledger Account Code zugewiesen ist. Gehe zur Mapping Konfiguration im Omniboost Portal, finde die markierten Kategorien und weise ihnen die korrekten Kontocodes aus deinem Kontenplan zu. Zukünftige Pushes werden dann korrekt gebucht. Vergangene Einträge, die in dein Fallback Konto gegangen sind, müssen manuell in deinem Buchhaltungssystem korrigiert werden.

## Mews API Token abgelaufen

Wenn du einen Authentifizierungsfehler von Mews siehst, ist dein Access Token wahrscheinlich abgelaufen. Erzeuge einen neuen Access Token im Mews Commander (Mews Menü, dann Einstellungen, dann Integrations, finde deine Omniboost Verbindung, dann Token neu generieren) und aktualisiere ihn im Omniboost Portal unter deinen Property Einstellungen. Der Push wird ab dem nächsten Lauf wieder funktionieren.

## Datenabweichung: Zahlen stimmen nicht mit Mews überein

Wenn die Zahlen in deinem Buchhaltungssystem nicht mit deinem Mews Accounting Report übereinstimmen, prüfe: (1) den Datumsbereich, stelle sicher, dass du dieselben Daten und denselben Accounting Flow Typ vergleichst; (2) Zeitzonen Einstellungen, wenn dein Mews Tagesabschluss nicht um Mitternacht liegt, können Daten auf unterschiedliche Tage fallen; (3) Korrekturen und Rabatte, wenn nach dem ersten Push Korrekturen in Mews vorgenommen wurden, müssen sie eventuell erneut gesendet werden; (4) ob der Consumed oder Closed Flow zu der Art passt, wie du deinen Mews Report liest.

## Doppelte Rechnungen in der Buchhaltung

Wenn du doppelte Rechnungen siehst, ist die wahrscheinlichste Ursache, dass Receivable Tracking in Mews bei der Aktivierung der Integration eingeschaltet war. Sowohl Mews als auch Omniboost haben Rechnungen für dieselben Vorgänge erstellt. Schalte Receivable Tracking in Mews aus (Menü, dann Einstellungen, dann Property, dann Finance, dann Accounting Configuration) und wende dich an den Omniboost Support, um die Duplikate zu bereinigen.

## NORMAL Zahlungen erscheinen (Lightspeed K-Series)

Wenn du Lightspeed K-Series verwendest und in deinem Buchhaltungssystem Zahlungen mit der Bezeichnung NORMAL siehst, stammen diese von Belegen, die mit einem Nullbetrag geschlossen wurden, weil ein Mitarbeiter alle Positionen entfernt hat, anstatt das Ticket ordentlich zu stornieren. Die Lösung ist operativ: schule dein Team, in Lightspeed immer die Funktion Cancel oder Void zu verwenden, anstatt Positionen aus einem Beleg zu entfernen. So entstehen solche Nullbetrags Einträge gar nicht erst.

## Push läuft nicht automatisch

Wenn die tägliche Automatisierung gestoppt ist, prüfe: (1) ob die Automatisierung für dein Property im Omniboost Portal noch aktiviert ist; (2) ob dein Omniboost Abonnement aktiv und nicht abgelaufen ist; (3) ob dein Mews Token und deine Zugangsdaten zum Buchhaltungssystem noch gültig sind. Wenn alles in Ordnung aussieht, wende dich an den Omniboost Support.

## Gesperrter Buchhaltungszeitraum

Wenn dein Buchhaltungssystem einen Zeitraum gesperrt hat (üblich nach einem Monatsabschluss), kann Omniboost nicht in diesen Zeitraum posten. Entsperre den Zeitraum in deiner Buchhaltungssoftware und löse dann den Push für die betroffenen Daten manuell aus dem Omniboost Portal aus.
