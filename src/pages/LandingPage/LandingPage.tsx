import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ButtonAnchor } from '~/components/ui/Button';
import { Icon } from '~/components/ui/Icon';
import { Progress } from '~/components/ui/Progress';
import { Pill } from '~/components/ui/Pill';
import { useSubscription } from '~/hooks/useSubscription';
import type { IconName } from '~/icons/manifest';
import { eur } from '~/lib/format';
import './LandingPage.css';

const PILLARS: Array<{ key: 'commit' | 'approve' | 'reconcile'; icon: IconName }> = [
  { key: 'commit', icon: 'receipt-fill' },
  { key: 'approve', icon: 'shield-fill-check' },
  { key: 'reconcile', icon: 'check-circle-fill' },
];

export function LandingPage() {
  const { t } = useTranslation();

  const previewLines = [
    { key: 'previewLine1', committed: 480, invoiced: 460 },
    { key: 'previewLine2', committed: 250, invoiced: 250 },
    { key: 'previewLine3', committed: 180, invoiced: 180 },
    { key: 'previewLine4', committed: 190, invoiced: 0 },
  ];

  const totalCommitted = previewLines.reduce((s, l) => s + l.committed, 0);
  const totalInvoiced = previewLines.reduce((s, l) => s + l.invoiced, 0);
  const totalRemaining = totalCommitted - totalInvoiced;

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <span className="landing-eyebrow">{t('landing.heroEyebrow')}</span>
          <h1 className="landing-hero-title display-hero">{t('landing.heroTitle')}</h1>
          <p className="landing-hero-sub">{t('landing.heroSubtitle')}</p>
          <div className="landing-hero-ctas">
            <ButtonAnchor href="/signup" variant="primary" size="lg">
              {t('landing.ctaPrimary')}
            </ButtonAnchor>
            <Button variant="ghost" size="lg" onClick={() => (window.location.href = '/login')}>
              {t('landing.ctaSecondary')}
            </Button>
          </div>
        </div>
        <div className="landing-hero-preview" aria-hidden="true">
          <LandingPreviewCard
            committed={totalCommitted}
            invoiced={totalInvoiced}
            remaining={totalRemaining}
            lines={previewLines}
          />
        </div>
      </section>

      {/* ===== Three pillars ===== */}
      <section className="landing-pillars">
        <div className="landing-pillars-inner">
          {PILLARS.map((p) => (
            <article key={p.key} className="landing-pillar reveal reveal-d1">
              <span className="landing-pillar-icon">
                <Icon name={p.icon} size={22} />
              </span>
              <h3 className="display-md">{t(`landing.pillar${cap(p.key)}Title`)}</h3>
              <p>{t(`landing.pillar${cap(p.key)}Body`)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <LandingPricing />
    </>
  );
}

function LandingPricing() {
  const { t } = useTranslation();
  const { offerings, loading } = useSubscription();

  const monthly = offerings?.current?.monthly ?? null;
  const annual = offerings?.current?.annual ?? null;

  const monthlyPriceLive = monthly?.webBillingProduct?.currentPrice?.formattedPrice ?? null;
  const annualPriceLive = annual?.webBillingProduct?.currentPrice?.formattedPrice ?? null;

  const monthlyPrice = monthlyPriceLive ?? t('pricing.plans.proMarketingMonthly');
  const annualPrice = annualPriceLive ?? t('pricing.plans.proMarketingYearly');

  return (
    <section className="landing-pricing" id="pricing">
      <div className="landing-pricing-inner">
        <div className="landing-pricing-head">
          <span className="eyebrow">{t('pricing.eyebrow')}</span>
          <h2 className="display-xl">{t('pricing.title')}</h2>
          <p className="landing-pricing-sub">{t('pricing.subtitle')}</p>
        </div>

        <div className="landing-pricing-grid">
          {/* ---- Free ---- */}
          <article className="pricing-card pricing-card-free reveal reveal-d1">
            <header className="pricing-card-head">
              <h3 className="display-md">{t('pricing.plans.freeTitle')}</h3>
              <p className="pricing-card-subtitle">{t('pricing.plans.freeSubtitle')}</p>
            </header>
            <div className="pricing-card-price">
              <span className="pricing-card-amount">{t('pricing.plans.freePrice')}</span>
              <span className="pricing-card-period">{t('pricing.plans.freePeriod')}</span>
            </div>
            <ul className="pricing-card-features">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>
                  <Icon name="check-circle-fill" size={13} />
                  <span>{t(`pricing.featureFree${n}`)}</span>
                </li>
              ))}
            </ul>
            <ButtonAnchor
              href="/signup"
              variant="ghost"
              size="lg"
              fullWidth
            >
              {t('pricing.ctaFree')}
            </ButtonAnchor>
          </article>

          {/* ---- Pro ---- */}
          <article className="pricing-card pricing-card-pro reveal reveal-d2">
            <header className="pricing-card-head">
              <div className="pricing-card-head-row">
                <h3 className="display-md">{t('pricing.plans.proTitle')}</h3>
                <span className="pricing-card-tag">{t('pricing.annualSavings')}</span>
              </div>
              <p className="pricing-card-subtitle">{t('pricing.plans.proSubtitle')}</p>
            </header>

            <div className="pricing-card-toggle" aria-hidden="true">
              <div className="pricing-toggle">
                <div className="pricing-toggle-option">
                  <span className="pricing-toggle-label">{t('pricing.annualBadge')}</span>
                  <span className="pricing-toggle-price num">{annualPrice}</span>
                  <span className="pricing-toggle-meta">
                    {t('pricing.billedAnnually')}
                  </span>
                </div>
                <div className="pricing-toggle-sep" />
                <div className="pricing-toggle-option">
                  <span className="pricing-toggle-label">{t('pricing.monthlyBadge')}</span>
                  <span className="pricing-toggle-price num">{monthlyPrice}</span>
                  <span className="pricing-toggle-meta">
                    {t('pricing.billedMonthly')}
                  </span>
                </div>
              </div>
            </div>

            <ul className="pricing-card-features">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n}>
                  <Icon name="check-circle-fill" size={13} />
                  <span>{t(`pricing.featurePro${n}`)}</span>
                </li>
              ))}
            </ul>

            <ButtonAnchor
              href="/signup"
              variant="primary"
              size="lg"
              fullWidth
            >
              {t('pricing.ctaPro')}
            </ButtonAnchor>

            <p className="pricing-card-footnote">
              {loading ? t('pricing.loadingLive') : t('pricing.fallbackNote')}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function LandingPreviewCard({
  committed,
  invoiced,
  remaining,
  lines,
}: {
  committed: number;
  invoiced: number;
  remaining: number;
  lines: Array<{ key: string; committed: number; invoiced: number }>;
}) {
  const { t } = useTranslation();
  const pct = committed ? Math.min(100, Math.round((invoiced / committed) * 100)) : 0;

  return (
    <div className="landing-preview-card">
      <div className="landing-preview-head">
        <div className="landing-preview-head-left">
          <span className="landing-preview-num mono">PO-2026-0042</span>
          <Pill status="approved">{t('nav.purchaseOrders')}</Pill>
        </div>
        <div className="landing-preview-head-right">
          <Icon name="receipt-fill" size={14} />
          <span className="muted" style={{ fontSize: 12 }}>Mobiliari Sant Martí</span>
        </div>
      </div>

      <h4 className="landing-preview-title">{t('landing.previewTitle')}</h4>

      <div className="landing-preview-totals">
        <div>
          <span className="landing-preview-label">{t('landing.previewCommitted')}</span>
          <span className="landing-preview-value num">{eur(committed)}</span>
        </div>
        <div>
          <span className="landing-preview-label">{t('landing.previewInvoiced')}</span>
          <span className="landing-preview-value num">{eur(invoiced)}</span>
        </div>
        <div>
          <span className="landing-preview-label">{t('landing.previewRemaining')}</span>
          <span className="landing-preview-value num">{eur(remaining)}</span>
        </div>
      </div>

      <div className="landing-preview-overall">
        <div className="landing-preview-overall-row">
          <span className="landing-preview-label">{t('landing.previewProgress')}</span>
          <span className="num" style={{ fontSize: 12, fontWeight: 500 }}>{pct}%</span>
        </div>
        <Progress value={pct} size="default" tone="solid" />
      </div>

      <ul className="landing-preview-lines">
        {lines.map((l) => {
          const lpct = l.committed ? Math.min(100, Math.round((l.invoiced / l.committed) * 100)) : 0;
          const full = l.committed > 0 && l.invoiced === l.committed;
          return (
            <li key={l.key} className="landing-preview-line">
              <div className="landing-preview-line-row">
                <span className="landing-preview-line-title">{t(`landing.${l.key}`)}</span>
                <span className="landing-preview-line-amount num">{eur(l.committed)}</span>
              </div>
              <div className="landing-preview-line-row sub">
                <Progress value={lpct} size="thin" tone={full ? 'solid' : 'striped'} />
                <span className="num" style={{ fontSize: 10.5, minWidth: 32, textAlign: 'right', color: 'var(--fg-muted)' }}>
                  {lpct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <Link to="/signup" className="landing-preview-cta">
        {t('landing.ctaPrimary')} →
      </Link>
    </div>
  );
}

function cap<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}
