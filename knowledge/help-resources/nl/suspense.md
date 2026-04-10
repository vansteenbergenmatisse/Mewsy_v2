---
title: Suspense rekeningen
cta_title: Vragen over het reconciliëren van betalingen?
cta_text: Vraag Mewsie naar suspense rekeningen, clearing rekeningen of hoe specifieke betaalmethodes geboekt moeten worden.
cta_button: Vraag Mewsie over suspense rekeningen
cta_message: Hoe werken suspense rekeningen in Omniboost voor de reconciliatie van hotelbetalingen?
---

## Wat is een suspense rekening?

Een suspense rekening is een grootboekrekening waarop bedragen tijdelijk worden geparkeerd. Zie het als een inbox: er komt geld binnen en dat blijft daar staan totdat het aan iets kan worden gekoppeld. In de hotelboekhouding worden suspense rekeningen het meest gebruikt voor betaalmethodes, met name creditcards, Stripe en Adyen.

## Hoe het stap voor stap werkt

- Een gast betaalt met creditcard in je hotel. Mews registreert de betaling.
- Omniboost leest die betaling en boekt hem als DEBET op je creditcard suspense rekening in je boekhoudsysteem.
- Een paar dagen later maakt Stripe of Adyen het geld daadwerkelijk over naar je bankrekening.
- Je boekhouder boekt dan een CREDIT op de creditcard suspense rekening (passend bij de bankafschriftregel).
- De suspense rekening staat nu op nul. De betaling is volledig gereconcilieerd.

## Waarom suspense rekeningen gebruiken?

De betaling die in Mews wordt geregistreerd (als de gast betaalt) en de daadwerkelijke bankontvangst (als Stripe of Adyen het geld overmaakt) gebeuren op verschillende momenten. De suspense rekening overbrugt dat gat. Het maakt reconciliatie ook eenvoudig: je ziet altijd precies welke betalingen nog onderweg zijn door te kijken naar het saldo van de suspense rekening.

## Veel voorkomende suspense rekeningen in hotelsetups

- Creditcard suspense rekening: voor Visa, Mastercard, Amex enz.
- Gateway suspense rekening: specifiek voor Stripe of Adyen betalingen
- City ledger suspense rekening: voor nog niet betaalde zakelijke facturen
- Deposit ledger rekening: voor aanbetalingen die binnenkomen voordat de gast aankomt
