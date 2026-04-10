---
title: Premiers pas
cta_title: Prêt à commencer votre intégration ?
cta_text: Réservez un appel gratuit sur calendly.com/omniboost/30-min-onboarding-call ou écrivez à integrations@omniboost.io.
cta_button: Poser une question à Mewsie sur l'onboarding
cta_message: Comment démarrer avec l'intégration Mews et Omniboost ?
---

## Avant de commencer : une étape cruciale

Désactivez Receivable Tracking dans Mews avant toute autre action. Emplacement : Menu Mews, puis Settings, puis Property, puis Finance, puis Accounting Configuration. Si vous le laissez activé et que vous activez l'intégration Omniboost, vous obtiendrez des factures en double dans votre système comptable. Cette étape doit être effectuée en premier, sans exception.

## Étape 1 : demander la connexion dans Mews

Connectez-vous à Mews, allez dans Marketplace, puis Accounting, trouvez votre système comptable, cliquez sur Explore et cliquez sur le bouton pour demander la connexion. Omniboost recevra la demande et enverra un e-mail d'invitation à l'adresse e-mail du profil Mews utilisé.

## Étape 2 : compléter l'assistant d'onboarding Omniboost

Suivez l'assistant d'onboarding dans le portail Omniboost. Vous passerez par : le choix de votre accounting flow (Consumed ou Closed), la saisie des coordonnées de votre entreprise, l'acceptation des conditions générales, la connexion de votre token Mews, la connexion de votre système comptable et la finalisation de votre GL mapping.

## Étape 3 : rassembler les éléments nécessaires au GL mapping

- Un export de votre plan comptable depuis votre système comptable
- Les codes de TVA / taxe de votre plateforme comptable
- Votre code de journal général et votre code de journal des ventes
- Les codes de comptes pour Fallback Revenue et Fallback Payments
- Le code de compte pour guest ledger et city ledger (le cas échéant)
- Le code de compte pour les comptes gateway suspense
- Si vous souhaitez comptabiliser les Gateway Commission Costs (si oui, fournissez le code de compte)
- Votre fin de journée préférée (par défaut minuit, contactez Omniboost pour la modifier)

## Étape 4 : période de test

Omniboost lance une période de test pendant laquelle les écritures sont envoyées à votre système comptable mais ne doivent pas encore être finalisées. Bronze tier : 7 jours, vous validez vous-même. Silver tier : 21 jours, Omniboost vous aide à valider. Gold tier : 1 mois, Omniboost vous accompagne pour la validation complète. Examinez attentivement les écritures de test par rapport à votre Mews Accounting Report avant le passage en production.

## Étape 5 : passage en production

Une fois les écritures de test validées et correctes, Omniboost active l'automatisation complète. À partir de ce moment, les données de la veille seront envoyées automatiquement à votre système comptable chaque matin. Vous pourrez également déclencher des pushes manuels pour n'importe quelle plage de dates depuis le portail Omniboost.

## Qui fait quoi ?

Omniboost effectue un contrôle final de la configuration mais ne modifie pas lui-même votre environnement Mews. Toute modification recommandée dans Mews doit être réalisée par l'hôtel. Omniboost n'est pas non plus responsable de la génération des codes de votre plan comptable, ceux-ci proviennent de votre système comptable.
