---
title: Suspense Konten
cta_title: Fragen zur Abstimmung von Zahlungen?
cta_text: Frage Mewsie zu Suspense Konten, Clearing Konten oder dazu, wie bestimmte Zahlungsarten gebucht werden sollten.
cta_button: Mewsie zu Suspense Konten fragen
cta_message: Wie funktionieren Suspense Konten in Omniboost für die Abstimmung von Hotelzahlungen?
---

## Was ist ein Suspense Konto?

Ein Suspense Konto ist ein Sachkonto, auf dem Beträge vorübergehend geparkt werden. Stell es dir wie einen Posteingang vor: Geld kommt an und liegt dort, bis es einer Buchung zugeordnet werden kann. In der Hotelbuchhaltung werden Suspense Konten am häufigsten für Zahlungsarten genutzt, insbesondere Kreditkarten, Stripe und Adyen.

## So funktioniert es Schritt für Schritt

- Ein Gast zahlt mit Kreditkarte in deinem Hotel. Mews erfasst die Zahlung.
- Omniboost liest diese Zahlung und bucht sie als SOLL auf dein Kreditkarten Suspense Konto in deinem Buchhaltungssystem.
- Einige Tage später überweist Stripe oder Adyen den tatsächlichen Betrag auf dein Bankkonto.
- Dein Buchhalter bucht dann ein HABEN auf das Kreditkarten Suspense Konto (passend zum Eingang auf dem Kontoauszug).
- Das Suspense Konto ist jetzt ausgeglichen. Die Zahlung ist vollständig abgestimmt.

## Warum Suspense Konten verwenden?

Die in Mews erfasste Zahlung (wenn der Gast bezahlt) und der tatsächliche Bankeingang (wenn Stripe oder Adyen das Geld überweist) finden zu unterschiedlichen Zeitpunkten statt. Das Suspense Konto überbrückt diese Lücke. Es vereinfacht auch die Abstimmung: du kannst jederzeit genau sehen, welche Zahlungen noch unterwegs sind, indem du den Saldo des Suspense Kontos prüfst.

## Übliche Suspense Konten in Hotel Setups

- Kreditkarten Suspense Konto: für Visa, Mastercard, Amex usw.
- Gateway Suspense Konto: speziell für Stripe oder Adyen Zahlungen
- City Ledger Suspense Konto: für Firmenrechnungen, die noch nicht bezahlt sind
- Deposit Ledger Konto: für Anzahlungen, die vor der Ankunft des Gastes eingehen
