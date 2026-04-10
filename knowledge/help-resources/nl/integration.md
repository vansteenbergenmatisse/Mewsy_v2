---
title: Hoe de integratie werkt
cta_title: Wil je je specifieke setup begrijpen?
cta_text: Vraag Mewsie naar je boekhoudsysteem, flow type of mapping configuratie.
cta_button: Vraag Mewsie over de integratie
cta_message: Hoe werkt de integratie tussen Mews en Omniboost?
---

## Het simpele plaatje

Je hotelgegevens staan in Mews. Je boekhoudsoftware heeft die gegevens nodig. Omniboost is de brug ertussen. Elke dag leest Omniboost de gegevens van de vorige dag uit Mews, zet ze om naar het juiste formaat voor je boekhoudsysteem en stuurt ze automatisch door. Als het eenmaal is ingesteld hoef je niks meer te doen.

## Stap voor stap: wat er elke dag gebeurt

- Op je geconfigureerde einde van de dag (standaard: middernacht) sluit Mews de dagcijfers af in het Accounting Report.
- Omniboost haalt die gegevens op via de Mews API.
- Omniboost past je mapping regels toe en koppelt elke Mews categorie aan de juiste grootboekrekening in je boekhoudsysteem.
- Omniboost maakt journaalposten (of facturen, afhankelijk van je flow) en boekt ze in je boekhoudsysteem.
- Alles staat de volgende ochtend in je boekhoudsoftware, klaar om te controleren.

## Twee soorten integraties

API integraties boeken gegevens direct en automatisch in je boekhoudsoftware. Financial Export integraties maken een CSV of TXT bestand in het juiste formaat voor je boekhoudsysteem, dat elke dag naar een opgegeven e-mail of beveiligde FTP locatie wordt gestuurd, klaar om te importeren. De meeste Mews integraties zijn API gebaseerd.

## Welke gegevens worden overgezet

- Omzet: uitgesplitst naar service categorie (overnachting, F&B, spa, extra's, enz.)
- Betalingen: per type (contant, kaart, city ledger, gateway, enz.)
- BTW / Tax: geëxtraheerd uit brutobedragen en geboekt op de juiste belastingrekeningen
- Debiteuren: debiteurenfacturen bij de Closed bills flow
- Statistieken (alleen Gold tier): aankomsten, vertrekken, kamers buiten gebruik, aantal gasten, enz.

## Kan ik het handmatig starten?

Ja. Vanuit het Omniboost portaal kun je op elk moment handmatig een push starten voor een specifieke datum of datumbereik. Dat is handig om te testen, om na een onderbreking in te halen of om een specifieke dag opnieuw te sturen als er iets is misgegaan.
