---
title: GL Mapping & Grootboekcodes
cta_title: Hulp nodig met je mapping setup?
cta_text: Vraag Mewsie naar specifieke mapping configuraties, grootboekcodes of niet gemapte categorieën.
cta_button: Vraag Mewsie over mapping
cta_message: Hoe werkt GL mapping en grootboekcodes in Omniboost?
---

## Wat is mapping?

Mapping is een woordenboek. Aan de ene kant heb je Mews met categorieën zoals Overnachting, Ontbijt, Minibar, Visa kaartbetaling enz. Aan de andere kant heb je je boekhoudsoftware met grootboekcodes zoals 4000, 4100, 5500 enz. Mapping vertelt Omniboost: als je Overnachting ziet in Mews, boek het dan op rekening 4000 in de boekhouding. Als je een Visa kaartbetaling ziet, boek het op rekening 5500. Zonder mapping weet Omniboost niet waar iets heen moet.

## Waar mapping gebeurt in Mews

Aan elke Accounting Category in Mews moet een Ledger Account Code worden toegewezen. Deze code moet exact overeenkomen met een grootboekcode die bestaat in het rekeningschema van je boekhoudsoftware. Ontbreekt een code of is hij fout, dan mislukt de synchronisatie voor die categorie. De kolommen Code, External Code en Posting Account Code in Mews worden doorgaans niet door Omniboost gebruikt en kunnen leeg blijven.

## Revenue mapping

Elke omzetservice in Mews (overnachting, food and beverage, spa, extra's enz.) moet worden gekoppeld aan een omzetrekening in je boekhoudsysteem. Niet gemapte omzetposten komen ofwel in je Fallback Revenue rekening terecht, ofwel veroorzaken ze waarschuwingen in het Omniboost portaal.

## Payment mapping

Elke betaalmethode in Mews (contant, kaart, city ledger, Stripe, Adyen, bankoverschrijving enz.) moet worden gekoppeld aan de juiste clearing of suspense rekening in je boekhoudsysteem. Zo weet Omniboost of een kaartbetaling naar een Stripe suspense rekening moet, een contante betaling naar een kasrekening, enzovoort.

## BTW / Tax mapping

Belasting codes uit Mews moeten worden gekoppeld aan de juiste BTW of tax tarieven in je boekhoudsysteem. Zorg dat de BTW codes die je invoert zijn geconfigureerd om BTW uit het BRUTO bedrag te halen, en niet om BTW bij het netto bedrag op te tellen. Dit verkeerd om doen levert onjuiste belastingberekeningen op.

## Kostenplaatsen (optioneel)

Als je boekhoudsysteem kostenplaatsen of profit centers gebruikt, kun je optioneel kostenplaatscodes aan je mapping toevoegen. Omniboost koppelt dan de juiste kostenplaats aan elke journaalregel, waardoor je rapportage op afdelingsniveau krijgt in je boekhoudsoftware.

## Omniboost detecteert wijzigingen automatisch

Als je nieuwe boekhoudcategorieën toevoegt of grootboekcodes wijzigt in Mews, hoef je Omniboost niet te waarschuwen. Omniboost detecteert wijzigingen aan Accounting Categories en grootboekcodes automatisch. Zorg er wel voor dat de nieuwe codes in het rekeningschema van je boekhoudsysteem bestaan voordat ze worden gebruikt, anders mislukt de synchronisatie voor die posten.
