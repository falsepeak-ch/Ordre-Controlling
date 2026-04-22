import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Topbar } from '~/components/layout/Topbar';
import { Icon } from '~/components/ui/Icon';
import { Input } from '~/components/ui/Input';
import { Spinner } from '~/components/ui/Spinner';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useProjectData } from '~/hooks/useProjectData';
import { useSuppliers } from '~/hooks/useSuppliers';
import { projectMetrics } from '~/lib/reconcile';
import {
  spendByCategory,
  spendBySupplier,
  spendOverTime,
  statusDistribution,
  type DateRange,
} from '~/lib/reportHelpers';
import { eur } from '~/lib/format';
import '~/theme/page-layout.css';
import './ReportsPage.css';

// Reads CSS custom property values (SVG fill cannot use var(--x)).
function useChartColors() {
  const [colors, setColors] = useState({ fg: '#242424', fgMuted: '#6b6b6b', fgSubtle: '#b8b8b8' });

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    setColors({
      fg: style.getPropertyValue('--fg').trim() || '#242424',
      fgMuted: style.getPropertyValue('--fg-muted').trim() || '#6b6b6b',
      fgSubtle: style.getPropertyValue('--fg-subtle').trim() || '#b8b8b8',
    });
  }, []);

  return colors;
}

const STATUS_SHADES = ['#242424', '#555555', '#888888', '#aaaaaa', '#cccccc'];

export function ReportsPage() {
  const { t } = useTranslation();
  const { project } = useCurrentProject();
  const { purchaseOrders, loading } = useProjectData(project.id);
  const { suppliers } = useSuppliers(project.id);
  const colors = useChartColors();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Memo so the reference stays stable when the dates are empty — the
  // downstream useMemo calls list `range` as a dep and would otherwise
  // bust their caches on every render.
  const range: DateRange | undefined = useMemo(
    () => (dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined),
    [dateFrom, dateTo],
  );

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );

  const filteredPOs = useMemo(() => {
    if (!range) return purchaseOrders;
    return purchaseOrders.filter((po) => {
      const d = (po.createdAt ?? '').slice(0, 10);
      return d >= range.from && d <= range.to;
    });
  }, [purchaseOrders, range]);

  const metrics = useMemo(
    () => projectMetrics(filteredPOs, suppliers.length),
    [filteredPOs, suppliers.length],
  );

  const categoryData = useMemo(() => spendByCategory(filteredPOs, range), [filteredPOs, range]);
  const supplierData = useMemo(
    () => spendBySupplier(filteredPOs, supplierMap, range),
    [filteredPOs, supplierMap, range],
  );
  const timeData = useMemo(() => spendOverTime(filteredPOs, range), [filteredPOs, range]);
  const statusData = useMemo(() => statusDistribution(filteredPOs), [filteredPOs]);

  const hasPOs = purchaseOrders.length > 0;

  const eurFormatter = (v: number) => eur(v);
  const eurTooltip = (v: number) => eur(v);

  return (
    <>
      <Topbar
        title={t('reports.pageTitle')}
        actions={
          <div className="rpt-date-filter">
            <label>{t('reports.dateFrom')}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: 140 }}
            />
            <label>{t('reports.dateTo')}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: 140 }}
            />
            {(dateFrom || dateTo) ? (
              <button
                type="button"
                className="rpt-date-clear"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >
                {t('reports.clearDates')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="rpt-page page-container">
        {loading ? (
          <div className="rpt-loader">
            <Spinner size={22} />
          </div>
        ) : !hasPOs ? (
          <EmptyState />
        ) : (
          <>
            {/* KPI cards */}
            <section className="rpt-kpis reveal reveal-d1">
              <div className="rpt-kpi-card">
                <span className="rpt-kpi-label">{t('reports.kpi.committed')}</span>
                <span className="rpt-kpi-value num">{eur(metrics.committed)}</span>
              </div>
              <div className="rpt-kpi-card">
                <span className="rpt-kpi-label">{t('reports.kpi.invoiced')}</span>
                <span className="rpt-kpi-value num">{eur(metrics.invoiced)}</span>
              </div>
              <div className="rpt-kpi-card">
                <span className="rpt-kpi-label">{t('reports.kpi.remaining')}</span>
                <span className="rpt-kpi-value num">{eur(metrics.remaining)}</span>
              </div>
              <div className="rpt-kpi-card">
                <span className="rpt-kpi-label">{t('reports.kpi.activePOs')}</span>
                <span className="rpt-kpi-value num">{metrics.open}</span>
              </div>
            </section>

            <div className="rpt-charts reveal reveal-d2">
              {/* Spend by Category */}
              <div className="rpt-chart-card">
                <span className="rpt-chart-title">{t('reports.charts.spendByCategory')}</span>
                {categoryData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="rpt-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryData}
                        layout="vertical"
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid horizontal={false} stroke="var(--ring-border)" />
                        <XAxis
                          type="number"
                          tickFormatter={eurFormatter}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="code"
                          width={48}
                          tick={{ fontSize: 11, fill: colors.fgMuted, fontFamily: 'var(--font-mono)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [eurTooltip(v as number)]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ring-border)' }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="committed"
                          name={t('reports.charts.committed')}
                          fill={colors.fg}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={20}
                        />
                        <Bar
                          dataKey="invoiced"
                          name={t('reports.charts.invoiced')}
                          fill={colors.fgMuted}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* PO Status Distribution */}
              <div className="rpt-chart-card">
                <span className="rpt-chart-title">{t('reports.charts.poStatusDistribution')}</span>
                {statusData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="rpt-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statusData}
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="var(--ring-border)" />
                        <XAxis
                          dataKey="status"
                          tickFormatter={(s) => t(`pos.statusLabel.${s}`)}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [v, t('pos.table.number')]}
                          labelFormatter={(l) => t(`pos.statusLabel.${l}`)}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ring-border)' }}
                        />
                        <Bar dataKey="count" maxBarSize={48} radius={[3, 3, 0, 0]}>
                          {statusData.map((entry, index) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_SHADES[index % STATUS_SHADES.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Spend Over Time (full width) */}
              <div className="rpt-chart-card rpt-chart-full">
                <span className="rpt-chart-title">{t('reports.charts.spendOverTime')}</span>
                {timeData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="rpt-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timeData}
                        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="rptCommitted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.fg} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={colors.fg} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="rptInvoiced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.fgMuted} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={colors.fgMuted} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--ring-border)" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={eurFormatter}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                          width={72}
                        />
                        <Tooltip
                          formatter={(v) => [eurTooltip(v as number)]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ring-border)' }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                        <Area
                          type="monotone"
                          dataKey="committed"
                          name={t('reports.charts.committed')}
                          stroke={colors.fg}
                          strokeWidth={2}
                          fill="url(#rptCommitted)"
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="invoiced"
                          name={t('reports.charts.invoiced')}
                          stroke={colors.fgMuted}
                          strokeWidth={2}
                          fill="url(#rptInvoiced)"
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Spend by Supplier */}
              <div className="rpt-chart-card rpt-chart-full">
                <span className="rpt-chart-title">{t('reports.charts.spendBySupplier')}</span>
                {supplierData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="rpt-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={supplierData}
                        layout="vertical"
                        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid horizontal={false} stroke="var(--ring-border)" />
                        <XAxis
                          type="number"
                          tickFormatter={eurFormatter}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 11, fill: colors.fgMuted }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(v) => [eurTooltip(v as number)]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--ring-border)' }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                        <Bar
                          dataKey="committed"
                          name={t('reports.charts.committed')}
                          fill={colors.fg}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={20}
                        />
                        <Bar
                          dataKey="invoiced"
                          name={t('reports.charts.invoiced')}
                          fill={colors.fgMuted}
                          radius={[0, 3, 3, 0]}
                          maxBarSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function NoData() {
  const { t } = useTranslation();
  return <div className="rpt-chart-nodata">{t('reports.charts.noData')}</div>;
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <section className="rpt-empty reveal reveal-d1">
      <div className="rpt-empty-inner">
        <div className="rpt-empty-mark">
          <Icon name="bar-chart-fill" size={24} />
        </div>
        <h2 className="display-md">{t('reports.empty.title')}</h2>
        <p>{t('reports.empty.body')}</p>
      </div>
    </section>
  );
}
