---
title: GL Mapping & Kontocodes
cta_title: Brauchst du Hilfe bei deinem Mapping Setup?
cta_text: Frage Mewsie zu bestimmten Mapping Konfigurationen, Kontocodes oder nicht zugeordneten Kategorien.
cta_button: Mewsie zum Mapping fragen
cta_message: Wie funktioniert GL Mapping und Kontocodes in Omniboost?
---

## Was ist Mapping?

Mapping ist ein Wörterbuch. Auf der einen Seite hast du Mews mit Kategorien wie Übernachtung, Frühstück, Minibar, Visa Kartenzahlung usw. Auf der anderen Seite hast du deine Buchhaltungssoftware mit Kontocodes wie 4000, 4100, 5500 usw. Mapping sagt Omniboost: wenn du Übernachtung in Mews siehst, buche es auf Konto 4000 in der Buchhaltung. Wenn du eine Visa Kartenzahlung siehst, buche sie auf Konto 5500. Ohne Mapping weiß Omniboost nicht, wohin etwas gehört.

## Wo Mapping in Mews geschieht

Jeder Accounting Kategorie in Mews muss ein Ledger Account Code zugewiesen sein. Dieser Code muss exakt einem Konto entsprechen, das im Kontenplan deiner Buchhaltungssoftware vorhanden ist. Fehlt ein Code oder ist er falsch, schlägt die Synchronisation für diese Kategorie fehl. Die Spalten Code, External Code und Posting Account Code in Mews werden von Omniboost in der Regel nicht genutzt und können leer bleiben.

## Revenue Mapping

Jeder Umsatzservice in Mews (Übernachtung, Food & Beverage, Spa, Extras usw.) muss einem Umsatzkonto in deinem Buchhaltungssystem zugeordnet werden. Nicht zugeordnete Umsatzeinträge landen entweder in deinem Fallback Revenue Konto oder verursachen Warnungen im Omniboost Portal.

## Payment Mapping

Jede Zahlungsart in Mews (Bargeld, Karte, City Ledger, Stripe, Adyen, Banküberweisung usw.) muss dem korrekten Clearing oder Suspense Konto in deinem Buchhaltungssystem zugeordnet werden. So weiß Omniboost, ob eine Kartenzahlung auf ein Stripe Suspense Konto gehen soll, eine Barzahlung auf ein Bargeldkonto usw.

## VAT / Steuer Mapping

Steuercodes aus Mews müssen den richtigen VAT oder Steuersätzen in deinem Buchhaltungssystem zugeordnet werden. Stelle sicher, dass die eingegebenen VAT Codes so konfiguriert sind, dass sie die Steuer aus dem BRUTTOBETRAG herausrechnen und nicht zum Nettobetrag hinzufügen. Wenn dies falsch herum gemacht wird, werden die Steuerbeträge falsch berechnet.

## Kostenstellen (optional)

Wenn dein Buchhaltungssystem Kostenstellen oder Profit Center verwendet, kannst du optional Kostenstellen Codes in dein Mapping aufnehmen. Omniboost hängt dann an jede Buchungszeile die passende Kostenstelle an, wodurch du Reporting auf Abteilungsebene in deiner Buchhaltung erhältst.

## Omniboost erkennt Änderungen automatisch

Wenn du neue Accounting Kategorien oder Ledger Codes in Mews anlegst oder änderst, musst du Omniboost nicht benachrichtigen. Omniboost erkennt Änderungen an Accounting Kategorien und Ledger Codes automatisch. Du solltest jedoch sicherstellen, dass die neuen Codes im Kontenplan deines Buchhaltungssystems vorhanden sind, bevor sie verwendet werden, sonst schlägt die Synchronisation dafür fehl.
