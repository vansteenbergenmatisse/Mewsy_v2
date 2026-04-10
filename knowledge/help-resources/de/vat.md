---
title: VAT & Steuer Codes
cta_title: Frage zur VAT Einrichtung?
cta_text: Frage Mewsie zu VAT Code Mapping, Sätzen oder wie die Steuerbuchung für dein Buchhaltungssystem funktioniert.
cta_button: Mewsie zu VAT fragen
cta_message: Wie funktioniert das VAT und Steuer Code Mapping in Omniboost?
---

## Was ist VAT Mapping?

VAT Mapping sagt Omniboost, welcher Steuercode in deinem Buchhaltungssystem welchem Steuersatz in Mews entspricht. Beispiel: Mews könnte eine 21 Prozent VAT Kategorie für Übernachtungen haben. Du musst diese dem korrekten 21 Prozent VAT Kontocode in deiner Buchhaltungssoftware zuordnen, damit die Steuer an die richtige Stelle gebucht wird.

## Die wichtigste Regel: aus dem BRUTTO herausrechnen

Wenn du VAT Codes in Omniboost einrichtest, stelle unbedingt sicher, dass sie so konfiguriert sind, dass sie die VAT aus dem Bruttobetrag HERAUSRECHNEN und nicht zum Nettobetrag HINZUFÜGEN. Diese beiden Vorgehensweisen führen zu unterschiedlichen Ergebnissen. Wenn ein Gast 121 EUR für ein Zimmer zahlt (100 EUR netto plus 21 EUR VAT zu 21 Prozent), müssen 21 EUR aus dem Bruttobetrag von 121 EUR herausgerechnet werden. Wenn du es versehentlich so konfigurierst, dass 21 Prozent auf den Nettobetrag addiert werden, erhältst du einen anderen VAT Betrag und deine Steuerauswertung ist falsch.

## So prüfst du deine VAT Code Konfiguration

Prüfe in deinem Buchhaltungssystem die Einstellungen für jeden verwendeten VAT Code. Dort sollte etwas wie inclusive oder extract from gross stehen, nicht exclusive oder add to net. Wenn du dir nicht sicher bist, frage deinen Buchhalter oder den Support deiner Buchhaltungssoftware. Sobald es in deinem Buchhaltungssystem korrekt eingestellt ist, trage den Code einfach im Omniboost Mapping ein.

## Mehrere VAT Sätze

Hotels haben in der Regel mehrere VAT Sätze: Übernachtungen können zu einem reduzierten Satz besteuert werden, Food and Beverage zum Standardsatz, und einige Positionen können steuerbefreit sein. Jede Kategorie in Mews braucht ihren eigenen VAT Code, der dem entsprechenden Satz in deinem Buchhaltungssystem zugeordnet ist. Verwende keinen einzigen Sammel VAT Code für alles.

## Was passiert, wenn ein VAT Code fehlt?

Wenn eine Mews Kategorie keinen zugeordneten VAT Code in Omniboost hat, wird die Steuer für diese Kategorie nicht korrekt gebucht. Je nach Setup kann sie in einem Fallback Konto landen oder einen Buchungsfehler verursachen. Stelle immer sicher, dass jede Umsatzkategorie sowohl ein Umsatzkonto als auch einen VAT Code zugewiesen hat.
