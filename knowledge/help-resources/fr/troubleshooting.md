---
title: Résolution de problèmes
cta_title: Votre problème n'est pas listé ici ?
cta_text: Décrivez votre problème spécifique à Mewsie. Il peut aider à diagnostiquer la plupart des problèmes d'intégration courants.
cta_button: Demander de l'aide à Mewsie
cta_message: J'ai un problème avec mon intégration Omniboost. Peux-tu m'aider à le résoudre ?
---

## Catégories non mappées (avertissements fallback)

Si le portail Omniboost affiche des avertissements concernant des éléments non mappés, cela signifie qu'une catégorie de revenu ou de paiement dans Mews n'a pas de code de compte ledger assigné. Allez dans la configuration de mapping du portail Omniboost, trouvez les catégories signalées et assignez les bons codes de compte depuis votre plan comptable. Les futurs pushes seront alors correctement comptabilisés. Les entrées passées qui sont allées dans votre compte fallback devront être corrigées manuellement dans votre système comptable.

## Token API Mews expiré

Si vous voyez une erreur d'authentification de Mews, votre Access Token a probablement expiré. Régénérez un nouvel Access Token dans Mews Commander (Menu Mews, puis Settings, puis Integrations, trouvez votre connexion Omniboost, puis régénérez le token) et mettez-le à jour dans le portail Omniboost sous vos paramètres de propriété. Le push fonctionnera à nouveau à partir du prochain cycle.

## Décalage de données : les chiffres ne correspondent pas à Mews

Si les chiffres dans votre système comptable ne correspondent pas à votre Mews Accounting Report, vérifiez : (1) la plage de dates, assurez-vous de comparer les mêmes dates et le même type d'accounting flow ; (2) les paramètres de fuseau horaire, si votre fin de journée Mews n'est pas minuit, les données peuvent tomber sur des dates différentes ; (3) les corrections et remises, si des corrections ont été faites dans Mews après le push initial, elles doivent peut-être être renvoyées ; (4) si le Consumed ou le Closed flow correspond à la manière dont vous lisez votre rapport Mews.

## Factures en double dans la comptabilité

Si vous voyez des factures en double, la cause la plus probable est que Receivable Tracking était activé dans Mews lors de l'activation de l'intégration. Mews et Omniboost ont tous les deux créé des factures pour les mêmes transactions. Désactivez Receivable Tracking dans Mews (Menu, puis Settings, puis Property, puis Finance, puis Accounting Configuration) et contactez le support Omniboost pour régler les doublons.

## Paiements NORMAL qui apparaissent (Lightspeed K-Series)

Si vous utilisez Lightspeed K-Series et voyez des paiements étiquetés NORMAL dans votre système comptable, ils proviennent de reçus qui ont été clôturés avec un montant zéro parce qu'un membre du personnel a retiré tous les articles au lieu d'annuler correctement le ticket. La solution est opérationnelle : formez le personnel à toujours utiliser la fonction Cancel ou Void dans Lightspeed au lieu de retirer des articles d'un reçu. Cela empêche la création d'entrées à montant zéro dès le départ.

## Le push ne se lance pas automatiquement

Si l'automatisation quotidienne s'est arrêtée, vérifiez : (1) que l'automatisation est toujours activée pour votre propriété dans le portail Omniboost ; (2) que votre abonnement Omniboost est actif et non expiré ; (3) que votre token Mews et vos identifiants de système comptable ne sont pas expirés. Si tout semble correct, contactez le support Omniboost.

## Période comptable verrouillée

Si votre système comptable a une période verrouillée (courant après la clôture mensuelle), Omniboost ne pourra pas comptabiliser dans cette période. Déverrouillez la période dans votre logiciel de comptabilité, puis relancez manuellement le push pour les dates concernées depuis le portail Omniboost.
