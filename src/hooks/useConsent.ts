import { useContext } from 'react';
import { ConsentContext } from '~/contexts/ConsentContext';

export function useConsent() {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used inside a <ConsentProvider>');
  }
  return ctx;
}
