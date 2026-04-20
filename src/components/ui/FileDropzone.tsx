import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Button } from './Button';
import { formatFileSize } from '~/lib/invoices';
import './FileDropzone.css';

interface FileDropzoneProps {
  value: File | null;
  existingFileName?: string | null;
  existingFileSize?: string | null;
  onChange: (file: File | null) => void;
  /** Max file size in bytes. Defaults to 25 MB to match Storage rules. */
  maxBytes?: number;
  accept?: string;
}

export function FileDropzone({
  value,
  existingFileName,
  existingFileSize,
  onChange,
  maxBytes = 25 * 1024 * 1024,
  accept = '.pdf,application/pdf,image/*',
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function accepts(file: File) {
    if (file.size > maxBytes) {
      setError(t('invoiceForm.fileTooLarge'));
      return false;
    }
    setError(null);
    return true;
  }

  function handleSelect(file: File | null) {
    if (!file) {
      onChange(null);
      return;
    }
    if (!accepts(file)) return;
    onChange(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleSelect(file);
  }

  const displayName = value?.name ?? existingFileName ?? null;
  const displaySize = value ? formatFileSize(value.size) : existingFileSize ?? null;

  return (
    <div className="dropzone-wrap">
      {displayName ? (
        <div className="dropzone-filled">
          <div className="dropzone-filled-icon">
            <Icon name="file-earmark-text-fill" size={18} />
          </div>
          <div className="dropzone-filled-text">
            <span className="dropzone-filled-name">{displayName}</span>
            {displaySize ? (
              <span className="dropzone-filled-meta">{displaySize}</span>
            ) : null}
          </div>
          <div className="dropzone-filled-actions">
            <Button variant="ghost" size="sm" onClick={pick}>
              {t('invoiceForm.fileReplace')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              aria-label={t('invoiceForm.fileRemove')}
            >
              <Icon name="x" size={13} />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={['dropzone', isDragging ? 'is-dragging' : null].filter(Boolean).join(' ')}
          onClick={pick}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon">
            <Icon name="upload-fill" size={18} />
          </div>
          <div className="dropzone-copy">
            <span className="dropzone-prompt">{t('invoiceForm.dropPrompt')}</span>
            <span className="dropzone-or">
              {t('invoiceForm.dropOr')}{' '}
              <span className="dropzone-browse">{t('invoiceForm.dropBrowse')}</span>
            </span>
            <span className="dropzone-meta">
              {t('invoiceForm.dropAccept')} · {t('invoiceForm.dropLimit')}
            </span>
          </div>
        </button>
      )}

      {error ? <div className="dropzone-error">{error}</div> : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
