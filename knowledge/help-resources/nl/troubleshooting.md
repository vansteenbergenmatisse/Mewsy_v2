---
title: Problemen oplossen
cta_title: Jouw probleem staat er niet bij?
cta_text: Beschrijf je specifieke probleem aan Mewsie. Het kan de meeste veelvoorkomende integratieproblemen helpen diagnosticeren.
cta_button: Vraag Mewsie om hulp
cta_message: Ik heb een probleem met mijn Omniboost integratie. Kun je me helpen het op te lossen?
---

## Niet gemapte categorieën (fallback waarschuwingen)

Als het Omniboost portaal waarschuwingen toont over niet gemapte items, betekent dat dat een omzet of betaalcategorie in Mews geen grootboekcode toegewezen heeft. Ga naar de mapping configuratie in het Omniboost portaal, zoek de gemarkeerde categorieën en wijs ze de juiste grootboekcodes uit je rekeningschema toe. Toekomstige pushes worden dan correct geboekt. Eerdere posten die naar je fallback rekening zijn gegaan moeten handmatig in je boekhoudsysteem worden gecorrigeerd.

## Mews API token verlopen

Als je een authenticatiefout van Mews ziet, is je Access Token waarschijnlijk verlopen. Genereer een nieuwe Access Token in Mews Commander (Mews Menu, dan Settings, dan Integrations, zoek je Omniboost verbinding, dan genereer token opnieuw) en update die in het Omniboost portaal onder je property instellingen. De push werkt weer vanaf de volgende run.

## Verschillen in data: cijfers komen niet overeen met Mews

Als de cijfers in je boekhoudsysteem niet overeenkomen met je Mews Accounting Report, controleer dan: (1) het datumbereik, zorg dat je dezelfde data en hetzelfde accounting flow type vergelijkt; (2) tijdzone instellingen, als je Mews einde van de dag niet op middernacht ligt, kunnen gegevens op verschillende dagen vallen; (3) correcties en rebates, als er na de eerste push correcties in Mews zijn gedaan, moeten die mogelijk opnieuw verstuurd worden; (4) of de Consumed of Closed flow overeenkomt met hoe je je Mews rapport leest.

## Dubbele facturen in de boekhouding

Als je dubbele facturen ziet, is de meest waarschijnlijke oorzaak dat Receivable Tracking in Mews aan stond toen de integratie werd geactiveerd. Zowel Mews als Omniboost hebben facturen gemaakt voor dezelfde transacties. Zet Receivable Tracking uit in Mews (Menu, dan Settings, dan Property, dan Finance, dan Accounting Configuration) en neem contact op met Omniboost support om de duplicaten op te ruimen.

## NORMAL betalingen verschijnen (Lightspeed K-Series)

Als je Lightspeed K-Series gebruikt en betalingen met de label NORMAL ziet in je boekhoudsysteem, komen die van bonnetjes die met een nul bedrag zijn afgesloten doordat een medewerker alle items heeft verwijderd in plaats van het ticket netjes te annuleren. De oplossing is operationeel: train het personeel om in Lightspeed altijd de Cancel of Void functie te gebruiken in plaats van items uit een bonnetje te verwijderen. Dat voorkomt dat er überhaupt posten met nul bedrag worden aangemaakt.

## Push loopt niet automatisch

Als de dagelijkse automatisering is gestopt, controleer dan: (1) of de automatisering nog ingeschakeld is voor je property in het Omniboost portaal; (2) of je Omniboost abonnement nog actief is en niet verlopen; (3) of je Mews token en de inloggegevens voor je boekhoudsysteem niet verlopen zijn. Als alles correct lijkt, neem contact op met Omniboost support.

## Vergrendelde boekhoudperiode

Als je boekhoudsysteem een periode heeft vergrendeld (gebruikelijk na de maandafsluiting), kan Omniboost niet in die periode boeken. Ontgrendel de periode in je boekhoudsoftware en trigger de push voor de betreffende data daarna handmatig opnieuw vanuit het Omniboost portaal.
