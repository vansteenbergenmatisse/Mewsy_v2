---
title: Comment fonctionne l'intégration
cta_title: Vous voulez comprendre votre configuration spécifique ?
cta_text: Demandez à Mewsie des informations sur votre système comptable, votre type de flow ou votre configuration de mapping.
cta_button: Poser une question à Mewsie sur l'intégration
cta_message: Comment fonctionne l'intégration Mews et Omniboost ?
---

## L'image simple

Les données de votre hôtel vivent dans Mews. Votre logiciel de comptabilité a besoin de ces données. Omniboost est le pont entre les deux. Chaque jour, Omniboost lit les données de la veille depuis Mews, les transforme au bon format pour votre système comptable et les envoie automatiquement. Vous n'avez rien à faire une fois que c'est configuré.

## Étape par étape : ce qui se passe chaque jour

- À votre fin de journée configurée (par défaut : minuit), Mews finalise les données de la journée dans son Accounting Report.
- Omniboost récupère ces données via l'API Mews.
- Omniboost applique vos règles de mapping, associant chaque catégorie Mews au bon code de compte dans votre système comptable.
- Omniboost crée des écritures comptables (ou des factures, selon votre flow) et les envoie à votre système comptable.
- Tout apparaît dans votre logiciel de comptabilité le lendemain matin, prêt à être examiné.

## Deux types d'intégration

Les intégrations API envoient les données directement et automatiquement dans votre logiciel de comptabilité. Les intégrations Financial Export produisent un fichier CSV ou TXT au bon format pour votre système comptable, envoyé chaque jour à une adresse e-mail ou à un emplacement FTP sécurisé, prêt à être importé. La plupart des intégrations Mews sont de type API.

## Quelles données sont transférées

- Revenus : ventilés par catégorie de service (hébergement, F&B, spa, extras, etc.)
- Paiements : par type (espèces, carte, city ledger, gateway, etc.)
- TVA / Taxe : extraite des montants bruts et imputée aux bons comptes de taxe
- Comptes clients : factures débiteurs avec le flow Closed bills
- Statistiques (Gold tier uniquement) : arrivées, départs, chambres hors service, nombre de clients, etc.

## Puis-je le déclencher manuellement ?

Oui. Depuis le portail Omniboost, vous pouvez déclencher manuellement un push pour une date ou une plage de dates à tout moment. C'est utile pour tester, rattraper une coupure ou renvoyer un jour précis si quelque chose s'est mal passé.
