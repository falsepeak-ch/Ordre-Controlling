import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, setLocale, type LocaleCode } from '~/i18n';
import './LocaleToggle.css';

export function LocaleToggle() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = (i18n.resolvedLanguage as LocaleCode) || 'ca';

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const label = current.toUpperCase();

  return (
    <div className="locale-toggle" ref={ref}>
      <button
        type="button"
        className="locale-toggle-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="locale-toggle-label">{label}</span>
      </button>
      {open && (
        <ul className="locale-toggle-menu" role="listbox" aria-label={t('common.language')}>
          {SUPPORTED_LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                className={['locale-option', l.code === current ? 'is-active' : null]
                  .filter(Boolean)
                  .join(' ')}
                role="option"
                aria-selected={l.code === current}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
              >
                <span className="locale-option-code">{l.code.toUpperCase()}</span>
                <span className="locale-option-name">{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
