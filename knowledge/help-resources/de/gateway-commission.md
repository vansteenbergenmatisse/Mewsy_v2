---
title: Gateway Commission Kosten
cta_title: Möchtest du Gateway Commission Tracking einrichten?
cta_text: Frage Mewsie zu Gateway Zahlungen, Commission Kostenkonten oder wie du Stripe und Adyen abstimmst.
cta_button: Mewsie zu Gateway Gebühren fragen
cta_message: Wie handhabt Omniboost Gateway Commission Kosten von Stripe oder Adyen?
---

## Was sind Gateway Zahlungen?

Gateway Zahlungen sind Kartenzahlungen, die über ein Payment Gateway abgewickelt werden, typischerweise Stripe oder Adyen. Wenn ein Gast 100 EUR per Karte über eines dieser Gateways zahlt, behält das Gateway eine Provision ein (die Gebühr für die Zahlungsabwicklung, in der Regel ein kleiner Prozentsatz) und überweist den Rest auf dein Bankkonto. Statt 100 EUR erhältst du also zum Beispiel 97,50 EUR, weil Stripe 2,50 EUR als Provision einbehalten hat.

## Das daraus entstehende Problem

In Mews wird die gesamte Zahlung von 100 EUR erfasst. Auf deinem Bankkonto kommen nur 97,50 EUR an. Wenn du die 2,50 EUR Provision nirgendwo buchst, wird dein Bankauszug nie mit deinen Buchhaltungsdaten abgestimmt werden können. Jemand müsste jeden Tag die Differenz manuell nachbuchen, was schnell mühsam wird.

## Wie Omniboost das löst

Wenn du die Gateway Commission Kosten Option in Omniboost aktivierst, teilt es die Bruttozahlung automatisch in zwei Teile: der Nettobetrag (97,50 EUR) geht auf dein Gateway Suspense Konto, und die Provision (2,50 EUR) geht auf ein separates Commission Cost Konto. Wenn die Banküberweisung eintrifft, passt sie exakt und es ist keine manuelle Korrektur nötig.

## Was du einrichten musst

Um diese Funktion zu nutzen, brauchst du einen Kontocode in deinem Buchhaltungssystem für Gateway Commission Kosten (ein Aufwandskonto). Gib diesen Code Omniboost während der Mapping Einrichtung an. Der Provisionsbetrag wird automatisch anhand der tatsächlichen Beträge berechnet.

## Nur für Gateway Zahlungen

Diese automatische Aufteilung gilt nur für Zahlungen, die über ein Payment Gateway wie Stripe oder Adyen abgewickelt werden. Sie gilt nicht für Barzahlungen, City Ledger oder andere Nicht Gateway Zahlungsarten.
