import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '~/components/ui/Modal';
import { Button } from '~/components/ui/Button';
import { Field, Textarea } from '~/components/ui/Input';
import { Icon } from '~/components/ui/Icon';
import { useToast } from '~/hooks/useToast';
import {
  importCategories,
  parseCategoriesCsv,
  type ParsedCategoryRow,
} from '~/lib/categories';
import './ImportCategoriesModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const MAX_BYTES = 2 * 1024 * 1024;

export function ImportCategoriesModal({ open, onClose, projectId }: Props) {
  const { t } = useTranslation();
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { rows, collisions } = useMemo(() => {
    const parsed = parseCategoriesCsv(text);
    const seen = new Map<string, number>();
    let dup = 0;
    for (const r of parsed) {
      const count = (seen.get(r.code) ?? 0) + 1;
      seen.set(r.code, count);
      if (count === 2) dup += 1;
    }
    return { rows: parsed, collisions: dup };
  }, [text]);

  function readFile(file: File) {
    if (file.size > MAX_BYTES) {
      push({ message: t('invoiceForm.fileTooLarge'), icon: 'x-circle-fill', tone: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result;
      if (typeof content === 'string') {
        setText(content);
        setFileName(file.name);
      }
    };
    reader.readAsText(file);
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    readFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function reset() {
    setText('');
    setFileName(null);
  }

  async function doImport() {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const report = await importCategories(projectId, rows);
      push({
        message: t('categories.import.resultToast', {
          total: report.total,
          created: report.created,
          updated: report.updated,
        }),
        icon: 'check-circle-fill',
      });
      reset();
      onClose();
    } catch (err) {
      console.warn('[categories] import failed', err);
      push({ message: t('categories.import.resultError'), icon: 'x-circle-fill', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const previewRows: ParsedCategoryRow[] = rows.slice(0, 8);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (busy) return;
        reset();
        onClose();
      }}
      size="lg"
      title={t('categories.import.title')}
      subtitle={t('categories.import.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('categories.import.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={doImport}
            isLoading={busy}
            disabled={rows.length === 0}
            leading={<Icon name="upload-fill" size={13} />}
          >
            {busy
              ? t('categories.import.importing')
              : t('categories.import.importCta', { count: rows.length })}
          </Button>
        </>
      }
    >
      <div className="import-cats">
        <Field label={t('categories.import.pasteLabel')}>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName(null);
            }}
            placeholder={t('categories.import.pastePlaceholder')}
            rows={7}
            className="import-cats-paste mono"
          />
        </Field>

        <div className="import-cats-or">{t('categories.import.dropOr')}</div>

        <button
          type="button"
          className={['import-cats-drop', isDragging ? 'is-dragging' : null]
            .filter(Boolean)
            .join(' ')}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <span className="import-cats-drop-icon">
            <Icon name="upload-fill" size={18} />
          </span>
          <div className="import-cats-drop-text">
            {fileName ? (
              <>
                <span className="import-cats-drop-prompt">{fileName}</span>
                <span className="import-cats-drop-meta">
                  {t('categories.import.previewHint')}
                </span>
              </>
            ) : (
              <>
                <span className="import-cats-drop-prompt">
                  {t('categories.import.dropPrompt')}
                </span>
                <span className="import-cats-drop-meta">
                  {t('categories.import.dropAccept')} · {t('categories.import.dropLimit')}
                </span>
              </>
            )}
          </div>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
          hidden
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />

        {collisions > 0 ? (
          <div className="import-cats-warning">
            <Icon name="clock-fill" size={13} />
            <span>{t('categories.import.collisionsWarning', { count: collisions })}</span>
          </div>
        ) : null}

        <section className="import-cats-preview">
          <div className="import-cats-preview-head">
            <h4 className="display-xs" style={{ margin: 0 }}>
              {t('categories.import.previewTitle')}
            </h4>
            <span className="muted" style={{ fontSize: 12 }}>
              {rows.length > 0
                ? t(
                    rows.length === 1
                      ? 'categories.countOne'
                      : 'categories.countOther',
                    { count: rows.length },
                  )
                : ''}
            </span>
          </div>

          {previewRows.length === 0 ? (
            <div className="import-cats-empty muted">
              {t('categories.import.previewEmpty')}
            </div>
          ) : (
            <div className="import-cats-table">
              <div className="import-cats-row import-cats-row-head">
                <div>{t('categories.tableCode')}</div>
                <div>{t('categories.tableConcept')}</div>
              </div>
              {previewRows.map((r) => (
                <div key={`${r.line}-${r.code}`} className="import-cats-row">
                  <div className="mono">{r.code}</div>
                  <div>{r.concept}</div>
                </div>
              ))}
              {rows.length > previewRows.length ? (
                <div className="import-cats-more muted">
                  + {rows.length - previewRows.length}…
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
