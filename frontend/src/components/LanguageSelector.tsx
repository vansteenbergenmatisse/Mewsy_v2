import React, { useState, useEffect, useRef } from 'react';
import { LANGUAGES } from '../config/chat-config';

// ── LanguageSelector ───────────────────────────────────────────────────────────
// Dropdown button showing the current language flag.
// Opens a menu of all available languages; clicking one calls onChange.

interface LanguageSelectorProps {
  selectedLanguage: string | null;
  onChange: (code: string) => void;
}

export function LanguageSelector({ selectedLanguage, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when user clicks outside
  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const currentEntry = LANGUAGES.find(l => l.code === selectedLanguage);
  const flagDisplay = currentEntry ? currentEntry.flag : '🌐';

  return (
    <div id="lang-dropdown-wrapper" ref={wrapperRef}>
      <button
        id="lang-dropdown-btn"
        title="Select language"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
      >
        <span id="lang-flag-display">{flagDisplay}</span>
      </button>
      <div id="lang-dropdown-menu" className={open ? 'open' : ''}>
        {LANGUAGES.map(({ code, flag, label }) => (
          <div
            key={code}
            className={'lang-option' + (selectedLanguage === code ? ' active' : '')}
            onClick={(e) => {
              e.stopPropagation();
              onChange(code);
              setOpen(false);
            }}
          >
            <span className="lang-option-flag">{flag}</span>
            <span>{label}</span>
            {selectedLanguage === code && <span className="lang-option-check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
