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
    { topic: 'integration',     icon: '🔗', title: 'Mews x Omniboost Integration',     subtitle: 'Overview of how the integration works'     },
    { topic: 'onboarding',      icon: '🚀', title: 'Onboarding & Initial Setup',        subtitle: 'Get connected step by step'                },
    { topic: 'mapping',         icon: '🗂️', title: 'Mapping Configuration',             subtitle: 'Set up your accounting mappings'           },
    { topic: 'revenue-push',    icon: '📊', title: 'Full Revenue Push',                 subtitle: 'Understanding revenue posting'             },
    { topic: 'troubleshooting', icon: '🔧', title: 'Troubleshooting',                  subtitle: 'Fix common issues'                         },
    { topic: 'contact',         icon: '📧', title: 'Contact Support',                  subtitle: 'Get in touch with our team'                },
  ],
  de: [
    { topic: 'integration',     icon: '🔗', title: 'Mews x Omniboost Integration',     subtitle: 'Überblick über die Integration'             },
    { topic: 'onboarding',      icon: '🚀', title: 'Onboarding & Ersteinrichtung',      subtitle: 'Schritt für Schritt verbinden'             },
    { topic: 'mapping',         icon: '🗂️', title: 'Mapping-Konfiguration',             subtitle: 'Buchhaltungs-Mappings einrichten'          },
    { topic: 'revenue-push',    icon: '📊', title: 'Vollständiger Revenue Push',        subtitle: 'Umsatzbuchungen verstehen'                 },
    { topic: 'troubleshooting', icon: '🔧', title: 'Fehlerbehebung',                   subtitle: 'Häufige Probleme lösen'                    },
    { topic: 'contact',         icon: '📧', title: 'Support kontaktieren',             subtitle: 'Unser Team erreichen'                      },
  ],
  fr: [
    { topic: 'integration',     icon: '🔗', title: 'Intégration Mews x Omniboost',     subtitle: "Vue d'ensemble de l'intégration"           },
    { topic: 'onboarding',      icon: '🚀', title: 'Intégration & Configuration',       subtitle: 'Connexion étape par étape'                 },
    { topic: 'mapping',         icon: '🗂️', title: 'Configuration du mapping',          subtitle: 'Configurer vos mappings comptables'        },
    { topic: 'revenue-push',    icon: '📊', title: 'Push de revenus complet',           subtitle: 'Comprendre les écritures comptables'       },
    { topic: 'troubleshooting', icon: '🔧', title: 'Dépannage',                        subtitle: 'Résoudre les problèmes courants'           },
    { topic: 'contact',         icon: '📧', title: 'Contacter le support',             subtitle: 'Nous contacter'                            },
  ],
  nl: [
    { topic: 'integration',     icon: '🔗', title: 'Mews x Omniboost Integratie',      subtitle: 'Overzicht van de integratie'               },
    { topic: 'onboarding',      icon: '🚀', title: 'Onboarding & Eerste installatie',   subtitle: 'Stap voor stap verbinden'                  },
    { topic: 'mapping',         icon: '🗂️', title: 'Mapping-configuratie',              subtitle: 'Uw boekhoudmappings instellen'             },
    { topic: 'revenue-push',    icon: '📊', title: 'Volledige omzetoverdracht',         subtitle: 'Omzetboekingen begrijpen'                  },
    { topic: 'troubleshooting', icon: '🔧', title: 'Probleemoplossing',                subtitle: 'Veelvoorkomende problemen oplossen'         },
    { topic: 'contact',         icon: '📧', title: 'Ondersteuning contacteren',        subtitle: 'Ons team bereiken'                         },
  ],
};

export function getHelpItems(lang: string | null): HelpItem[] {
  const l = lang || 'en';
  const base = l.split('-')[0];
  return helpItemsI18n[l] ?? helpItemsI18n[base] ?? helpItemsI18n['en'];
}
