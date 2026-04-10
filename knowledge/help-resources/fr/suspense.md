---
title: Comptes suspense
cta_title: Questions sur le rapprochement des paiements ?
cta_text: Demandez à Mewsie des informations sur les comptes suspense, les comptes de clearing ou comment des types de paiement spécifiques devraient être comptabilisés.
cta_button: Poser une question à Mewsie sur les comptes suspense
cta_message: Comment fonctionnent les comptes suspense dans Omniboost pour le rapprochement des paiements hôteliers ?
---

## Qu'est-ce qu'un compte suspense ?

Un compte suspense est un compte de grand livre sur lequel des montants sont temporairement parqués. Imaginez-le comme une boîte de réception : l'argent arrive et y reste jusqu'à ce qu'il puisse être rattaché à quelque chose. En comptabilité hôtelière, les comptes suspense sont le plus souvent utilisés pour les moyens de paiement, en particulier les cartes de crédit, Stripe et Adyen.

## Comment ça marche étape par étape

- Un client paie par carte de crédit dans votre hôtel. Mews enregistre le paiement.
- Omniboost lit ce paiement et l'enregistre au DÉBIT de votre compte suspense carte de crédit dans votre système comptable.
- Quelques jours plus tard, Stripe ou Adyen transfère effectivement l'argent sur votre compte bancaire.
- Votre comptable enregistre alors un CRÉDIT sur le compte suspense carte de crédit (correspondant à l'entrée du relevé bancaire).
- Le compte suspense est maintenant équilibré à zéro. Le paiement est entièrement rapproché.

## Pourquoi utiliser des comptes suspense ?

Le paiement enregistré dans Mews (lorsque le client paie) et le crédit bancaire réel (lorsque Stripe ou Adyen transfère l'argent) se produisent à des moments différents. Le compte suspense comble cet écart. Il facilite aussi le rapprochement : vous pouvez toujours voir exactement quels paiements sont encore en transit en regardant le solde du compte suspense.

## Comptes suspense courants dans les configurations hôtelières

- Compte suspense carte de crédit : pour Visa, Mastercard, Amex, etc.
- Compte gateway suspense : spécifiquement pour les paiements Stripe ou Adyen
- Compte city ledger suspense : pour les factures d'entreprise non encore payées
- Compte deposit ledger : pour les acomptes reçus avant l'arrivée du client
