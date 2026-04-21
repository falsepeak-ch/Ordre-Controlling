import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Topbar } from '~/components/layout/Topbar';
import { Card } from '~/components/ui/Card';
import { Icon } from '~/components/ui/Icon';
import { Button } from '~/components/ui/Button';
import { Field, Input } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { CategoryFormModal } from '~/components/CategoryFormModal';
import { ImportCategoriesModal } from '~/components/ImportCategoriesModal';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useCategories } from '~/hooks/useCategories';
import { useToast } from '~/hooks/useToast';
import { useConfirm } from '~/hooks/useConfirm';
import { canEdit } from '~/lib/roles';
import { categoriesToCsv, deleteCategory } from '~/lib/categories';
import type { Category } from '~/types';
import './CategoriesPage.css';

export function CategoriesPage() {
  const { t } = useTranslation();
  const { project, role } = useCurrentProject();
  const { categories, loading } = useCategories(project.id);
  const { push } = useToast();
  const confirm = useConfirm();

  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const writable = canEdit(role);
  const existingCodes = useMemo(
    () => new Set(categories.map((c) => c.code)),
    [categories],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.concept.toLowerCase().includes(q),
    );
  }, [categories, query]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: Category) {
    setEditing(c);
    setFormOpen(true);
  }

  async function onDelete(c: Category) {
    const ok = await confirm({
      title: t('categories.form.confirmDelete', { code: c.code, concept: c.concept }),
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteCategory(project.id, c.id);
      push({ message: t('categories.form.deletedToast'), icon: 'check-circle-fill' });
    } catch {
      push({ message: t('categories.form.error'), icon: 'x-circle-fill', tone: 'error' });
    }
  }

  function onExport() {
    const csv = categoriesToCsv(categories);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-categories.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar
        title={t('categories.pageTitle')}
        actions={
          writable ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                leading={<Icon name="download-fill" size={13} />}
                onClick={onExport}
                disabled={categories.length === 0}
              >
                {t('categories.exportCta')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leading={<Icon name="upload-fill" size={13} />}
                onClick={() => setImportOpen(true)}
              >
                {t('categories.importCta')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                leading={<Icon name="plus" size={13} />}
                onClick={openCreate}
              >
                {t('categories.newCta')}
              </Button>
            </>
          ) : null
        }
      />

      <div className="categories-page">
        <section className="categories-hero reveal">
          <span className="eyebrow">
            {categories.length === 1
              ? t('categories.countOne')
              : t('categories.countOther', { count: categories.length })}
          </span>
          <h1 className="display-xl">{t('categories.pageTitle')}</h1>
          <p className="categories-hero-sub">
            {t('categories.heroSubtitle', { project: project.name })}
          </p>
        </section>

        {categories.length > 0 ? (
          <section className="categories-filter reveal reveal-d1">
            <Field>
              <div className="input-with-icon">
                <span className="input-with-icon-glyph">
                  <Icon name="search" size={14} />
                </span>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('categories.searchPlaceholder')}
                />
              </div>
            </Field>
          </section>
        ) : null}

        {loading ? (
          <div className="categories-loader"><Spinner size={22} /></div>
        ) : categories.length === 0 ? (
          <section className="categories-empty reveal reveal-d1">
            <div className="categories-empty-inner">
              <div className="categories-empty-mark">
                <Icon name="clipboard-fill" size={24} />
              </div>
              <h2 className="display-md">{t('categories.empty.title')}</h2>
              <p>{t('categories.empty.body')}</p>
              {writable ? (
                <div className="categories-empty-ctas">
                  <Button
                    variant="primary"
                    size="lg"
                    leading={<Icon name="upload-fill" size={14} />}
                    onClick={() => setImportOpen(true)}
                  >
                    {t('categories.empty.import')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    leading={<Icon name="plus" size={14} />}
                    onClick={openCreate}
                  >
                    {t('categories.empty.manual')}
                  </Button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12 }}>
                  {t('categories.viewerNotice')}
                </p>
              )}
            </div>
          </section>
        ) : filtered.length === 0 ? (
          <Card size="lg" tone="muted" className="categories-empty-filter">
            <h3 className="display-sm">{t('categories.emptyFilter.title')}</h3>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              {t('categories.emptyFilter.body')}
            </p>
          </Card>
        ) : (
          <section className="categories-list reveal reveal-d2">
            <div className="categories-row categories-row-head">
              <div>{t('categories.tableCode')}</div>
              <div>{t('categories.tableConcept')}</div>
              <div />
            </div>
            {filtered.map((c) => (
              <div key={c.id} className="categories-row">
                <div className="mono categories-code">{c.code}</div>
                <div className="categories-concept">{c.concept}</div>
                <div className="categories-actions">
                  {writable ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        aria-label={t('common.edit')}
                      >
                        <Icon name="pencil-fill" size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(c)}
                        aria-label={t('common.remove')}
                      >
                        <Icon name="trash-fill" size={13} />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}

        {!writable ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {t('categories.viewerNotice')}
          </p>
        ) : null}
      </div>

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        projectId={project.id}
        category={editing}
        existingCodes={existingCodes}
      />
      <ImportCategoriesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        projectId={project.id}
      />
    </>
  );
}
