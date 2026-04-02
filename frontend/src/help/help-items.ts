// ── Help panel items ──────────────────────────────────────────────────────────
//
// This file defines what appears in the Help & Resources panel list.
// Each entry has a topic key (matched to help-content.ts), an emoji icon,
// and a translated title + subtitle per language.
//
// To add a new language: add a block with the language code below.
// To add a new topic:    add an entry to every language block + a matching
//                        entry in help-content.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface HelpItem {
  topic: string;      // must match a key in helpTopicContent (help-content.ts)
  icon: string;       // emoji shown in the list
  title: string;
  subtitle: string;
}

const helpItemsI18n: Record<string, HelpItem[]> = {
  en: [
    { topic: 'omniboost',           icon: '🌐', title: 'What is Omniboost?',                  subtitle: 'The platform that connects your hotel systems'     },
    { topic: 'mews',                icon: '🏨', title: 'What is Mews?',                        subtitle: 'The hotel software Omniboost works with'           },
    { topic: 'integration',         icon: '🔗', title: 'How the Integration Works',            subtitle: 'How your hotel data flows automatically'           },
    { topic: 'onboarding',          icon: '🚀', title: 'Getting Started',                      subtitle: 'Connect Mews to your accounting system'           },
    { topic: 'tiers',               icon: '🥇', title: 'Bronze, Silver & Gold Plans',          subtitle: 'Which integration tier is right for you'          },
    { topic: 'accounting-flows',    icon: '📊', title: 'Accounting Flows',                     subtitle: 'Consumed vs Closed — what they mean'              },
    { topic: 'mapping',             icon: '🗂️', title: 'GL Mapping & Ledger Codes',            subtitle: 'Linking Mews categories to accounting accounts'   },
    { topic: 'fallback',            icon: '🛡️', title: 'Fallback Accounts',                    subtitle: 'Your safety net when a category is not mapped'    },
    { topic: 'suspense',            icon: '💳', title: 'Suspense Accounts',                    subtitle: 'How payments land correctly in accounting'         },
    { topic: 'vat',                 icon: '📋', title: 'VAT & Tax Codes',                      subtitle: 'Making sure taxes are handled correctly'          },
    { topic: 'ledgers',             icon: '🏦', title: 'Guest Ledger & City Ledger',           subtitle: 'Understanding debtor accounts in hotels'          },
    { topic: 'gateway-commission',  icon: '💸', title: 'Gateway Commission Costs',             subtitle: 'How credit card fees get tracked automatically'   },
    { topic: 'troubleshooting',     icon: '🔧', title: 'Troubleshooting',                      subtitle: 'Common problems and how to fix them'              },
  ],
  de: [
    { topic: 'omniboost',           icon: '🌐', title: 'Was ist Omniboost?',                   subtitle: 'Die Plattform, die Ihre Hotelsysteme verbindet'    },
    { topic: 'mews',                icon: '🏨', title: 'Was ist Mews?',                         subtitle: 'Die Hotelsoftware, mit der Omniboost arbeitet'     },
    { topic: 'integration',         icon: '🔗', title: 'Wie die Integration funktioniert',      subtitle: 'Wie Ihre Hoteldaten automatisch fließen'           },
    { topic: 'onboarding',          icon: '🚀', title: 'Erste Schritte',                        subtitle: 'Mews mit Ihrer Buchhaltung verbinden'             },
    { topic: 'tiers',               icon: '🥇', title: 'Bronze, Silver & Gold Pakete',          subtitle: 'Welcher Tier passt zu Ihnen'                      },
    { topic: 'accounting-flows',    icon: '📊', title: 'Buchhaltungsflows',                     subtitle: 'Consumed vs Closed — was das bedeutet'            },
    { topic: 'mapping',             icon: '🗂️', title: 'GL-Mapping & Sachkonten',               subtitle: 'Mews-Kategorien mit Buchungskonten verknüpfen'    },
    { topic: 'fallback',            icon: '🛡️', title: 'Fallback-Konten',                       subtitle: 'Ihr Sicherheitsnetz bei fehlenden Mappings'       },
    { topic: 'suspense',            icon: '💳', title: 'Verrechnungskonten',                    subtitle: 'Wie Zahlungen korrekt in der Buchhaltung landen'  },
    { topic: 'vat',                 icon: '📋', title: 'MwSt & Steuercodes',                   subtitle: 'Steuern korrekt verarbeiten'                      },
    { topic: 'ledgers',             icon: '🏦', title: 'Gastkonto & Debitorenkonto',            subtitle: 'Debitorenkonten im Hotel verstehen'               },
    { topic: 'gateway-commission',  icon: '💸', title: 'Gateway-Provisionskosten',              subtitle: 'Kreditkartengebühren automatisch verbuchen'       },
    { topic: 'troubleshooting',     icon: '🔧', title: 'Fehlerbehebung',                        subtitle: 'Häufige Probleme und Lösungen'                    },
  ],
  fr: [
    { topic: 'omniboost',           icon: '🌐', title: 'Qu\'est-ce qu\'Omniboost ?',            subtitle: 'La plateforme qui connecte vos systèmes hôteliers' },
    { topic: 'mews',                icon: '🏨', title: 'Qu\'est-ce que Mews ?',                 subtitle: 'Le logiciel hôtelier utilisé avec Omniboost'       },
    { topic: 'integration',         icon: '🔗', title: 'Comment fonctionne l\'intégration',     subtitle: 'Comment vos données hôtelières circulent'         },
    { topic: 'onboarding',          icon: '🚀', title: 'Premiers pas',                          subtitle: 'Connecter Mews à votre comptabilité'              },
    { topic: 'tiers',               icon: '🥇', title: 'Plans Bronze, Silver & Gold',           subtitle: 'Quel niveau d\'intégration vous convient'         },
    { topic: 'accounting-flows',    icon: '📊', title: 'Flux comptables',                       subtitle: 'Consumed vs Closed — ce que cela signifie'        },
    { topic: 'mapping',             icon: '🗂️', title: 'Mapping GL & Codes de compte',          subtitle: 'Lier les catégories Mews aux comptes comptables'  },
    { topic: 'fallback',            icon: '🛡️', title: 'Comptes de secours',                    subtitle: 'Votre filet de sécurité si un mapping manque'     },
    { topic: 'suspense',            icon: '💳', title: 'Comptes d\'attente',                    subtitle: 'Comment les paiements arrivent en comptabilité'   },
    { topic: 'vat',                 icon: '📋', title: 'TVA & Codes fiscaux',                   subtitle: 'Gérer correctement les taxes'                     },
    { topic: 'ledgers',             icon: '🏦', title: 'Grand livre client & City Ledger',      subtitle: 'Comprendre les comptes débiteurs hôteliers'       },
    { topic: 'gateway-commission',  icon: '💸', title: 'Commissions de passerelle',             subtitle: 'Suivi automatique des frais de carte'             },
    { topic: 'troubleshooting',     icon: '🔧', title: 'Dépannage',                             subtitle: 'Problèmes courants et solutions'                  },
  ],
  nl: [
    { topic: 'omniboost',           icon: '🌐', title: 'Wat is Omniboost?',                    subtitle: 'Het platform dat uw hotelsystemen verbindt'        },
    { topic: 'mews',                icon: '🏨', title: 'Wat is Mews?',                          subtitle: 'De hotelsoftware waarmee Omniboost werkt'          },
    { topic: 'integration',         icon: '🔗', title: 'Hoe de integratie werkt',               subtitle: 'Hoe uw hoteldata automatisch stroomt'             },
    { topic: 'onboarding',          icon: '🚀', title: 'Aan de slag',                           subtitle: 'Mews verbinden met uw boekhoudsysteem'            },
    { topic: 'tiers',               icon: '🥇', title: 'Bronze, Silver & Gold pakketten',       subtitle: 'Welk integratieniveau past bij u'                 },
    { topic: 'accounting-flows',    icon: '📊', title: 'Boekhoudstromen',                       subtitle: 'Consumed vs Closed — wat betekent dat'            },
    { topic: 'mapping',             icon: '🗂️', title: 'GL-mapping & grootboekrekeningen',      subtitle: 'Mews-categorieën koppelen aan boekhoudrekeringen' },
    { topic: 'fallback',            icon: '🛡️', title: 'Fallback-rekeningen',                   subtitle: 'Uw vangnet als een categorie niet is gekoppeld'   },
    { topic: 'suspense',            icon: '💳', title: 'Tussenrekeningen',                      subtitle: 'Hoe betalingen correct in de boekhouding belanden'},
    { topic: 'vat',                 icon: '📋', title: 'BTW & belastingcodes',                  subtitle: 'Belastingen correct verwerken'                    },
    { topic: 'ledgers',             icon: '🏦', title: 'Gastenledger & city ledger',            subtitle: 'Debiteurenrekeningen in hotels begrijpen'         },
    { topic: 'gateway-commission',  icon: '💸', title: 'Gateway-provisiekosten',                subtitle: 'Creditcardkosten automatisch bijhouden'           },
    { topic: 'troubleshooting',     icon: '🔧', title: 'Probleemoplossing',                     subtitle: 'Veelvoorkomende problemen en oplossingen'         },
  ],
};

export function getHelpItems(lang: string | null): HelpItem[] {
  const l = lang || 'en';
  const base = l.split('-')[0];
  return helpItemsI18n[l] ?? helpItemsI18n[base] ?? helpItemsI18n['en'];
}
