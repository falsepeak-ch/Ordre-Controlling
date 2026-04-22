import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './ImageViewer.css';

interface Props {
  url: string | null;
  fileName?: string;
  onClose: () => void;
}

function isPDF(fileName?: string, url?: string | null): boolean {
  return /\.pdf$/i.test(fileName ?? url ?? '');
}

export function ImageViewer({ url, fileName, onClose }: Props) {
  useEffect(() => {
    if (!url) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [url, onClose]);

  if (!url) return null;

  const pdf = isPDF(fileName, url);

  return createPortal(
    <div className="iv-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <button
        type="button"
        className="iv-btn iv-close"
        onClick={onClose}
        aria-label="Close"
      >
        <Icon name="x" size={16} />
      </button>
      <a
        className="iv-btn iv-external"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Open in new tab"
      >
        <Icon name="box-arrow-right-fill" size={14} />
      </a>
      {pdf ? (
        <iframe
          className="iv-pdf"
          src={url}
          title={fileName ?? 'Document'}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          className="iv-img"
          src={url}
          alt=""
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>,
    document.body,
  );
}
