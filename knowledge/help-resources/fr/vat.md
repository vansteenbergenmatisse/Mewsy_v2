---
title: TVA & Codes de taxe
cta_title: Question sur la configuration TVA ?
cta_text: Demandez à Mewsie des informations sur le mapping des codes TVA, les taux ou le fonctionnement de la comptabilisation des taxes pour votre système comptable.
cta_button: Poser une question à Mewsie sur la TVA
cta_message: Comment fonctionne le mapping des codes TVA et taxe dans Omniboost ?
---

## Qu'est-ce que le mapping TVA ?

Le mapping TVA indique à Omniboost quel code de taxe de votre système comptable correspond à chaque taux de taxe dans Mews. Par exemple, Mews peut avoir une catégorie TVA à 21 pour cent pour l'hébergement. Vous devez mapper cette catégorie au bon code de compte TVA à 21 pour cent dans votre logiciel de comptabilité afin que la taxe soit imputée au bon endroit.

## La règle la plus importante : extraire du BRUT

Lorsque vous configurez les codes TVA dans Omniboost, assurez-vous absolument qu'ils sont configurés pour EXTRAIRE la TVA du montant brut, et non pour AJOUTER la TVA au montant net. Ces deux approches produisent des résultats différents. Si un client paie 121 EUR pour une chambre (100 EUR net plus 21 EUR de TVA à 21 pour cent), la bonne approche est d'extraire 21 EUR des 121 EUR bruts. Si vous le configurez par erreur pour ajouter 21 pour cent au net, vous obtiendrez un montant de TVA différent et votre déclaration fiscale sera erronée.

## Comment vérifier la configuration de vos codes TVA

Dans votre système comptable, vérifiez les paramètres de chaque code TVA que vous utilisez. Il devrait indiquer quelque chose comme inclusive ou extract from gross, et non exclusive ou add to net. Si vous n'êtes pas sûr, demandez à votre comptable ou à l'équipe de support de votre logiciel comptable. Une fois qu'il est correctement défini dans votre système comptable, il vous suffit de saisir le code dans le mapping Omniboost.

## Plusieurs taux de TVA

Les hôtels ont généralement plusieurs taux de TVA : l'hébergement peut être à un taux réduit, la restauration à un taux standard, et certains articles peuvent être à taux zéro. Chaque catégorie dans Mews doit avoir son propre code TVA mappé sur le taux correspondant dans votre système comptable. N'utilisez pas un seul code TVA fourre-tout pour tout.

## Que se passe-t-il si un code TVA est manquant ?

Si une catégorie Mews n'a pas de code TVA mappé dans Omniboost, la taxe pour cette catégorie ne sera pas comptabilisée correctement. Selon votre configuration, elle peut atterrir dans un compte fallback ou provoquer une erreur de comptabilisation. Assurez-vous toujours que chaque catégorie de revenu dispose à la fois d'un compte de revenu ET d'un code TVA mappés.
