// ── Language configuration ─────────────────────────────────────────────────────

export interface Language {
  code: string;
  flag: string;
  label: string;
  systemName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en',    flag: '🇺🇸', label: 'English',           systemName: 'English' },
  { code: 'de',    flag: '🇩🇪', label: 'Deutsch',            systemName: 'German' },
  { code: 'de-ch', flag: '🇨🇭', label: 'Schweizerdeutsch',   systemName: 'Swiss German' },
  { code: 'de-at', flag: '🇦🇹', label: 'Österreichisch',     systemName: 'Austrian German' },
  { code: 'fr',    flag: '🇫🇷', label: 'Français',           systemName: 'French' },
  { code: 'nl',    flag: '🇳🇱', label: 'Nederlands',         systemName: 'Dutch' },
];

// ── Translated UI strings ──────────────────────────────────────────────────────
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  SINGLE SOURCE OF TRUTH FOR ALL UI LABELS                                  │
// │  To add a language: add its code to LANGUAGES above, then add a column     │
// │  here for every key. To rename a label: edit the relevant row.             │
// └─────────────────────────────────────────────────────────────────────────────┘

export const UI_STRINGS: Record<string, Record<string, string>> = {
  // ── Chat bubbles / input ──────────────────────────────────────────────────
  somethingElse:  { en: 'Something else',                  de: 'Etwas anderes',                        'de-ch': 'Etwas anderes',                        'de-at': 'Etwas anderes',                        fr: 'Autre chose',                            nl: 'Iets anders'                          },
  typeOwn:        { en: 'Or type your own answer...',      de: 'Oder eigene Antwort eingeben...',       'de-ch': 'Oder eigene Antwort eingeben...',       'de-at': 'Oder eigene Antwort eingeben...',       fr: 'Ou tapez votre propre réponse...',       nl: 'Of typ uw eigen antwoord...'          },
  typeMsg:        { en: 'Type your message...',            de: 'Nachricht eingeben...',                 'de-ch': 'Nachricht eingeben...',                 'de-at': 'Nachricht eingeben...',                 fr: 'Tapez votre message...',                 nl: 'Typ uw bericht...'                    },
  scrollLatest:   { en: 'Latest',                         de: 'Neueste',                               'de-ch': 'Neueste',                               'de-at': 'Neueste',                               fr: 'Dernier',                                nl: 'Nieuwste'                             },

  // ── Sidebar nav ───────────────────────────────────────────────────────────
  newChat:        { en: 'New chat',                        de: 'Neuer Chat',                            'de-ch': 'Neuer Chat',                            'de-at': 'Neuer Chat',                            fr: 'Nouvelle conversation',                  nl: 'Nieuw gesprek'                        },
  search:         { en: 'Search',                          de: 'Suchen',                                'de-ch': 'Suchen',                                'de-at': 'Suchen',                                fr: 'Rechercher',                             nl: 'Zoeken'                               },
  helpResources:  { en: 'Help & Resources',                de: 'Hilfe & Ressourcen',                    'de-ch': 'Hilfe & Ressourcen',                    'de-at': 'Hilfe & Ressourcen',                    fr: 'Aide & Ressources',                      nl: 'Hulp & Bronnen'                       },
  chats:          { en: 'Chats',                           de: 'Chats',                                 'de-ch': 'Chats',                                 'de-at': 'Chats',                                 fr: 'Conversations',                          nl: 'Gesprekken'                           },
  settings:       { en: 'Settings',                        de: 'Einstellungen',                         'de-ch': 'Einstellungen',                         'de-at': 'Einstellungen',                         fr: 'Paramètres',                             nl: 'Instellingen'                         },

  // ── Top bar ───────────────────────────────────────────────────────────────
  openSidebar:    { en: 'Open sidebar',                    de: 'Seitenleiste öffnen',                   'de-ch': 'Seitenleiste öffnen',                   'de-at': 'Seitenleiste öffnen',                   fr: 'Ouvrir le panneau',                      nl: 'Zijbalk openen'                       },
  expandFullscreen:{ en: 'Expand to fullscreen',           de: 'Vollbild',                              'de-ch': 'Vollbild',                              'de-at': 'Vollbild',                              fr: 'Plein écran',                            nl: 'Volledig scherm'                      },
  shrinkToPanel:  { en: 'Shrink to side panel',            de: 'Seitenansicht',                         'de-ch': 'Seitenansicht',                         'de-at': 'Seitenansicht',                         fr: 'Réduire en panneau',                     nl: 'Zijpaneel'                            },

  // ── Hero section ──────────────────────────────────────────────────────────
  heroHeadlinePre:  { en: 'How can I ',                    de: 'Wie kann ich Ihnen heute ',             'de-ch': 'Wie kann ich Ihnen heute ',             'de-at': 'Wie kann ich Ihnen heute ',             fr: 'Comment puis-je vous ',                  nl: 'Hoe kan ik u vandaag '                },
  heroHighlight:    { en: 'help',                          de: 'helfen',                                'de-ch': 'helfen',                                'de-at': 'helfen',                                fr: 'aider',                                  nl: 'helpen'                               },
  heroHeadlinePost: { en: ' you today?',                   de: '?',                                     'de-ch': '?',                                     'de-at': '?',                                     fr: '\u00a0aujourd\u2019hui\u00a0?',           nl: '?'                                    },

  // ── Quick action buttons ──────────────────────────────────────────────────
  qaOnboarding:   { en: 'Onboarding help',                 de: 'Onboarding-Hilfe',                      'de-ch': 'Onboarding-Hilfe',                      'de-at': 'Onboarding-Hilfe',                      fr: "Aide à l\u2019intégration",              nl: 'Onboarding hulp'                      },
  qaSearchDocs:   { en: 'Search the docs',                 de: 'Dokumentation durchsuchen',             'de-ch': 'Dokumentation durchsuchen',             'de-at': 'Dokumentation durchsuchen',             fr: 'Rechercher dans la doc',                 nl: 'Documentatie doorzoeken'              },
  qaConfigureMapping:{ en: 'Configure mapping',            de: 'Mapping konfigurieren',                 'de-ch': 'Mapping konfigurieren',                 'de-at': 'Mapping konfigurieren',                 fr: 'Configurer le mapping',                  nl: 'Mapping instellen'                    },
  qaTroubleshoot: { en: 'Troubleshoot issue',              de: 'Problem beheben',                       'de-ch': 'Problem beheben',                       'de-at': 'Problem beheben',                       fr: 'Résoudre un problème',                   nl: 'Probleem oplossen'                    },
  qaBilling:      { en: 'Billing & plans',                 de: 'Abrechnung & Pläne',                    'de-ch': 'Abrechnung & Pläne',                    'de-at': 'Abrechnung & Pläne',                    fr: 'Facturation & abonnements',              nl: 'Facturering & plannen'                },

  // ── Help panel ────────────────────────────────────────────────────────────
  helpSearchPlaceholder: { en: 'Search for help',          de: 'Nach Hilfe suchen',                     'de-ch': 'Nach Hilfe suchen',                     'de-at': 'Nach Hilfe suchen',                     fr: "Rechercher de l\u2019aide",              nl: 'Zoek naar hulp'                       },

  // ── Input placeholder ─────────────────────────────────────────────────────
  askMewsie:      { en: 'Ask Mewsie\u2026',               de: 'Mewsie fragen\u2026',                   'de-ch': 'Mewsie fragen\u2026',                   'de-at': 'Mewsie fragen\u2026',                   fr: 'Demandez \u00e0 Mewsie\u2026',           nl: 'Vraag het Mewsie\u2026'               },

  // ── Toast warnings ────────────────────────────────────────────────────────
  timeoutWarning: { en: 'Mewsie is taking longer than expected. Please try again.', de: 'Mewsie braucht länger als erwartet. Bitte erneut versuchen.', 'de-ch': 'Mewsie braucht länger als erwartet. Bitte erneut versuchen.', 'de-at': 'Mewsie braucht länger als erwartet. Bitte erneut versuchen.', fr: 'Mewsie prend plus de temps que prévu. Veuillez réessayer.', nl: 'Mewsie doet er langer over dan verwacht. Probeer het opnieuw.' },
  emptyWarning:   { en: 'Please enter a message first.',   de: 'Bitte zuerst eine Nachricht eingeben.', 'de-ch': 'Bitte zuerst eine Nachricht eingeben.', 'de-at': 'Bitte zuerst eine Nachricht eingeben.', fr: 'Veuillez saisir un message.',            nl: 'Voer eerst een bericht in.'           },
};

// ── Quick action keys (ordered) ────────────────────────────────────────────────
// Maps to UI_STRINGS keys above. Add/remove entries here to change the buttons.
export const QUICK_ACTION_KEYS = [
  'qaOnboarding',
  'qaSearchDocs',
  'qaConfigureMapping',
  'qaTroubleshoot',
  'qaBilling',
] as const;

// Returns the UI string for the given key and language code
export function uiStr(key: string, lang: string | null): string {
  const l = lang || 'en';
  const map = UI_STRINGS[key];
  if (!map) return '';
  return map[l] || map[l.split('-')[0]] || map['en'] || '';
}

// ── Welcome text ───────────────────────────────────────────────────────────────

export const welcomeText: Record<string, string[]> = {
  en: [
    "Hi! I'm Mewsie, the Mews x Omniboost support assistant.",
    "Whether you're onboarding, configuring your mapping, or troubleshooting an issue — I'm here to help. What do you need?"
  ],
  de: [
    "Hallo! Ich bin Mewsie, der Support-Assistent für Mews x Omniboost.",
    "Egal ob Onboarding, Mapping-Konfiguration oder Fehlerbehebung — ich bin für dich da. Was brauchst du?"
  ],
  fr: [
    "Bonjour ! Je suis Mewsie, l'assistant support pour Mews x Omniboost.",
    "Que vous soyez en cours d'intégration, de configuration ou de dépannage, je suis là pour vous aider. De quoi avez-vous besoin ?"
  ],
  nl: [
    "Hoi! Ik ben Mewsie, de support-assistent voor Mews x Omniboost.",
    "Of je nu onboarding doet, je mapping instelt of een probleem oplost — ik ben hier om te helpen. Wat heb je nodig?"
  ],
};

// ── Thinking messages ──────────────────────────────────────────────────────────

export const thinkingMessagesMap: Record<string, string[]> = {
  en:    ["Mewsie is thinking...", "Checking the documentation...", "Almost there...", "Just a moment longer..."],
  de:    ["Mewsie denkt nach...", "Dokumentation wird geprüft...", "Fast fertig...", "Noch einen Moment..."],
  fr:    ["Mewsie réfléchit...", "Consultation de la documentation...", "Presque terminé...", "Encore un instant..."],
  nl:    ["Mewsie denkt na...", "Documentatie raadplegen...", "Bijna klaar...", "Nog even geduld..."],
};

export function getThinkingMessages(lang: string | null): string[] {
  const l = lang || 'en';
  const base = l.split('-')[0];
  return thinkingMessagesMap[l] || thinkingMessagesMap[base] || thinkingMessagesMap['en'];
}

// ── Option button constants ────────────────────────────────────────────────────

// Maximum number of option buttons to display
export const BUTTON_MAX = 7;

// Imperative verbs that indicate a list is a step list, not an option list.
// Items starting with these words must never become buttons.
export const BUTTON_IMPERATIVE_VERBS = /^(select|enter|go|click|open|navigate|complete|accept|connect|verify|choose|pick|set|configure|enable|add|create|map|copy|paste|tap|press|type|fill|save|check|disable|toggle|submit|upload|download|log in|sign in|make sure|ensure|hit|repeat|scroll|drag|drop|remove|delete|update|edit|move|find|look|visit|return|close|confirm|wait|allow|grant|install|restart|refresh|reload)\b/i;

// Help items and topic content have moved to frontend/src/help/
// Import from '../help' in components that need them.
