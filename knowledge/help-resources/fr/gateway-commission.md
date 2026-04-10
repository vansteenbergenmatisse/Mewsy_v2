---
title: Gateway Commission Costs
cta_title: Configurer le suivi des commissions gateway ?
cta_text: Demandez à Mewsie des informations sur les paiements gateway, les comptes de coûts de commission ou comment rapprocher Stripe et Adyen.
cta_button: Poser une question à Mewsie sur les frais gateway
cta_message: Comment Omniboost gère-t-il les Gateway Commission Costs de Stripe ou Adyen ?
---

## Que sont les paiements gateway ?

Les paiements gateway sont des paiements par carte traités via un payment gateway, généralement Stripe ou Adyen. Lorsqu'un client paie 100 EUR par carte via l'un de ces gateways, le gateway prélève une commission (ses frais de traitement du paiement, généralement un petit pourcentage) et transfère le reste sur votre compte bancaire. Ainsi, au lieu de recevoir 100 EUR, vous pourriez recevoir 97,50 EUR parce que Stripe a conservé 2,50 EUR en commission.

## Le problème que cela crée

Dans Mews, le paiement complet de 100 EUR est enregistré. Sur votre compte bancaire, seulement 97,50 EUR arrivent. Si vous ne comptabilisez pas les 2,50 EUR de commission quelque part, votre relevé bancaire ne sera jamais réconcilié avec vos données comptables. Quelqu'un devrait passer manuellement la différence chaque jour, ce qui devient vite fastidieux.

## Comment Omniboost résout ce problème

Si vous activez l'option Gateway Commission Costs dans Omniboost, il divisera automatiquement le paiement gateway brut en deux parties : le montant net (97,50 EUR) va sur votre compte gateway suspense, et la commission (2,50 EUR) va sur un compte de coûts de commission séparé. Lorsque le virement bancaire arrive, il correspond exactement et aucun ajustement manuel n'est nécessaire.

## Ce que vous devez configurer

Pour utiliser cette fonctionnalité, vous avez besoin d'un code de compte ledger dans votre système comptable pour les Gateway Commission Costs (un compte de charges). Fournissez ce code à Omniboost lors de la configuration du mapping. Le montant de la commission est calculé automatiquement en fonction des montants réels.

## Uniquement pour les paiements gateway

Ce splitting automatique ne s'applique qu'aux paiements traités via un payment gateway comme Stripe ou Adyen. Il ne s'applique pas aux paiements en espèces, au city ledger ou à d'autres types de paiements non gateway.
