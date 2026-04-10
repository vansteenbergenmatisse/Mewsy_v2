---
title: Gateway commissiekosten
cta_title: Gateway commissie tracking instellen?
cta_text: Vraag Mewsie naar gateway betalingen, commissiekostenrekeningen of hoe je Stripe en Adyen reconcilieert.
cta_button: Vraag Mewsie over gateway fees
cta_message: Hoe gaat Omniboost om met gateway commissiekosten van Stripe of Adyen?
---

## Wat zijn gateway betalingen?

Gateway betalingen zijn kaartbetalingen die via een payment gateway verlopen, meestal Stripe of Adyen. Als een gast 100 EUR met kaart betaalt via zo'n gateway, houdt de gateway een commissie in (hun fee voor het verwerken van de betaling, meestal een klein percentage) en maakt het restant over naar je bankrekening. In plaats van 100 EUR ontvang je dus bijvoorbeeld 97,50 EUR omdat Stripe 2,50 EUR als commissie heeft ingehouden.

## Het probleem dat dit oplevert

In Mews wordt de volledige betaling van 100 EUR vastgelegd. Op je bankrekening komt maar 97,50 EUR binnen. Als je de 2,50 EUR commissie nergens verantwoordt, zul je je bankafschrift nooit kunnen reconciliëren met je boekhouding. Iemand zou elke dag het verschil handmatig moeten boeken, wat al snel tijdrovend wordt.

## Hoe Omniboost dit oplost

Als je de gateway commissiekosten optie in Omniboost inschakelt, splitst het de bruto gateway betaling automatisch in twee delen: het netto bedrag (97,50 EUR) gaat naar je gateway suspense rekening en de commissie (2,50 EUR) gaat naar een aparte commissiekostenrekening. Wanneer de bankoverschrijving binnenkomt, sluit het precies aan en is geen handmatige correctie nodig.

## Wat je moet instellen

Om deze functie te gebruiken heb je een grootboekcode nodig in je boekhoudsysteem voor gateway commissiekosten (een kostenrekening). Geef deze code op aan Omniboost tijdens je mapping setup. Het commissiebedrag wordt automatisch berekend op basis van de werkelijke bedragen.

## Alleen voor gateway betalingen

Deze automatische splitsing geldt alleen voor betalingen die via een payment gateway zoals Stripe of Adyen worden verwerkt. Het geldt niet voor contante betalingen, city ledger of andere niet gateway betaalmethodes.
