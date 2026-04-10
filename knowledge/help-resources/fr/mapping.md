---
title: GL Mapping & Codes de compte
cta_title: Besoin d'aide avec votre configuration de mapping ?
cta_text: Demandez à Mewsie des informations sur des configurations de mapping spécifiques, des codes de compte ou des catégories non mappées.
cta_button: Poser une question à Mewsie sur le mapping
cta_message: Comment fonctionnent le GL mapping et les codes de compte dans Omniboost ?
---

## Qu'est-ce que le mapping ?

Le mapping est un dictionnaire. D'un côté, vous avez Mews, qui possède des catégories comme Hébergement, Petit-déjeuner, Minibar, paiement par carte Visa, etc. De l'autre côté, vous avez votre logiciel de comptabilité, qui a des codes de compte comme 4000, 4100, 5500, etc. Le mapping indique à Omniboost : quand tu vois Hébergement dans Mews, mets-le dans le compte 4000. Quand tu vois un paiement par carte Visa, mets-le dans le compte 5500. Sans mapping, Omniboost ne sait pas où placer chaque chose.

## Où se fait le mapping dans Mews

Chaque Accounting Category dans Mews doit se voir attribuer un Ledger Account Code. Ce code doit correspondre exactement à un code de compte existant dans le plan comptable de votre logiciel de comptabilité. Si un code est manquant ou incorrect, la synchronisation échouera pour cette catégorie. Les colonnes Code, External Code et Posting Account Code dans Mews ne sont généralement pas utilisées par Omniboost et peuvent rester vides.

## Revenue mapping

Chaque service de revenu dans Mews (hébergement, food and beverage, spa, extras, etc.) doit être mappé sur un compte de revenus dans votre système comptable. Les éléments de revenu non mappés iront soit dans votre compte Fallback Revenue, soit provoqueront des avertissements dans le portail Omniboost.

## Payment mapping

Chaque type de paiement dans Mews (espèces, carte, city ledger, Stripe, Adyen, virement bancaire, etc.) doit être mappé sur le bon compte de clearing ou de suspense dans votre système comptable. C'est ainsi qu'Omniboost sait si un paiement par carte doit aller dans un compte Stripe suspense, un paiement en espèces sur un compte caisse, et ainsi de suite.

## VAT / Tax mapping

Les codes de taxe de Mews doivent être associés aux bons taux de TVA ou taxe dans votre système comptable. Assurez-vous que les codes de TVA saisis sont configurés pour extraire la TVA du montant BRUT, et non l'ajouter au montant net. Faire l'inverse produira des calculs de taxe incorrects.

## Centres de coûts (optionnel)

Si votre système comptable utilise des centres de coûts ou des profit centres, vous pouvez optionnellement ajouter les codes de centre de coûts à votre mapping. Omniboost attachera alors le bon centre de coûts à chaque ligne de journal, vous donnant un reporting au niveau département dans votre logiciel de comptabilité.

## Omniboost détecte automatiquement les changements

Si vous ajoutez de nouvelles catégories comptables ou modifiez des codes de ledger dans Mews, vous n'avez pas besoin de prévenir Omniboost. Omniboost détecte automatiquement les changements apportés aux Accounting Categories et aux codes de ledger. Cependant, vous devez vous assurer que les nouveaux codes existent dans le plan comptable de votre système comptable avant qu'ils ne soient utilisés, sinon la synchronisation échouera pour ces éléments.
