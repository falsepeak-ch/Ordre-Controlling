import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Spinner } from '~/components/ui/Spinner';
import { ImageViewer } from '~/components/ui/ImageViewer';
import './AttachmentsList.css';

function isViewable(fileName?: string, url?: string | null): boolean {
  return /\.(jpe?g|png|gif|webp|svg|avif|heic|pdf)$/i.test(fileName ?? url ?? '');
}

export interface AttachmentItem {
  id?: string;
  fileName?: string;
  /** Legacy alias used by seeded supplier docs. */
  name?: string;
  fileSize?: string;
  /** Legacy alias used by seeded supplier docs. */
  size?: string;
  fileUrl?: string;
  /** Legacy alias used by seeded supplier docs. */
  url?: string;
  storagePath?: string;
  kind?: string | null;
  uploadedBy?: string;
  uploadedAt?: string;
}

interface Props {
  items: AttachmentItem[];
  canEdit: boolean;
  uploading: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onDelete?: (item: AttachmentItem) => void | Promise<void>;
  emptyLabel?: string;
  accept?: string;
  maxBytes?: number;
}

const DEFAULT_MAX = 25 * 1024 * 1024;

export function AttachmentsList({
  items,
  canEdit,
  uploading,
  onUpload,
  onDelete,
  emptyLabel,
  accept = '.pdf,application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt',
  maxBytes = DEFAULT_MAX,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (file.size > maxBytes) {
      setSizeError(t('attachments.fileTooLarge'));
      return;
    }
    setSizeError(null);
    void onUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="att-list">
      {canEdit ? (
        <button
          type="button"
          className={['att-drop', isDragging ? 'is-dragging' : null, uploading ? 'is-busy' : null]
            .filter(Boolean)
            .join(' ')}
          onClick={pick}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          disabled={uploading}
        >
          <span className="att-drop-icon">
            {uploading ? <Spinner size={14} /> : <Icon name="upload-fill" size={16} />}
          </span>
          <span className="att-drop-text">
            {uploading ? t('attachments.uploading') : t('attachments.uploadCta')}
          </span>
        </button>
      ) : null}

      {sizeError ? <div className="att-error">{sizeError}</div> : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {items.length === 0 ? (
        <div className="att-empty muted">
          {emptyLabel ??
            (canEdit ? t('attachments.empty') : t('attachments.emptyReadOnly'))}
        </div>
      ) : (
        <ul className="att-items">
          {items.map((item) => {
            const name = item.fileName ?? item.name ?? '—';
            const size = item.fileSize ?? item.size ?? '';
            const url = item.fileUrl ?? item.url ?? null;
            return (
              <li key={item.id ?? name} className="att-item">
                {url && isViewable(name, url) ? (
                  <button
                    type="button"
                    className="att-item-doc"
                    onClick={() => setViewer({ url, name })}
                  >
                    <Icon name="file-earmark-text-fill" size={16} />
                  </button>
                ) : (
                  <a
                    className="att-item-doc"
                    href={url ?? undefined}
                    target={url ? '_blank' : undefined}
                    rel={url ? 'noopener noreferrer' : undefined}
                    aria-disabled={!url}
                  >
                    <Icon name="file-earmark-text-fill" size={16} />
                  </a>
                )}
                <div className="att-item-main">
                  <span className="att-item-name">
                    {url ? (
                      isViewable(name, url) ? (
                        <button type="button" className="att-item-link" onClick={() => setViewer({ url, name })}>
                          {name}
                        </button>
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {name}
                        </a>
                      )
                    ) : (
                      name
                    )}
                    {item.kind ? <span className="att-item-kind">{item.kind}</span> : null}
                  </span>
                  <span className="att-item-meta">
                    {size ? <span>{size}</span> : null}
                    {item.uploadedBy ? (
                      <>
                        {size ? <span className="sep">·</span> : null}
                        <span>{t('attachments.uploadedBy', { name: item.uploadedBy })}</span>
                      </>
                    ) : null}
                  </span>
                </div>
                {canEdit && onDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item)}
                    aria-label={t('attachments.removeCta')}
                  >
                    <Icon name="trash-fill" size={12} />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <ImageViewer url={viewer?.url ?? null} fileName={viewer?.name} onClose={() => setViewer(null)} />
    </div>
  );
}
