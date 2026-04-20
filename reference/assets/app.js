/* ==========================================================================
   Ordre — Shared shell, nav, and interaction glue.
   ========================================================================== */

(function () {
  const Ordre = window.Ordre;

  // ---- Icons (inline SVG strings so we can inject into the shell) ----
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M3 21h8v-6H3z"/><path d="M13 9h8V3h-8z"/></svg>',
    orders:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><path d="m16.5 3.5 4 4L12 16l-4 1 1-4z"/></svg>',
    suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    approvals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
    invoices:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h6"/></svg>',
    reports:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/></svg>',
    settings:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    chevron:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    bell:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    filter:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/></svg>',
    download:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/></svg>',
    upload:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/></svg>',
    check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    mail:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
    phone:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 19.5 19.5 0 0 1-6-6 20 20 0 0 1-3.1-8.8A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/></svg>',
    file:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    edit:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    print:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 18h12v4H6z"/></svg>',
    more:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    trash:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    arrow:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    back:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>',
    kbdCmd:    '⌘',
  };

  window.icons = icons;

  // ---- Shell renderer ----
  // Each page sets data-page="..." on the <body>. We build the sidebar,
  // wire basic behaviours, and expose helpers.

  const navItems = [
    { key: 'dashboard', label: 'Dashboard',       href: 'index.html',             icon: 'dashboard' },
    { key: 'orders',    label: 'Purchase orders', href: 'purchase-orders.html',   icon: 'orders'    },
    { key: 'approvals', label: 'Approvals',       href: 'approvals.html',         icon: 'approvals' },
    { key: 'suppliers', label: 'Suppliers',       href: 'suppliers.html',         icon: 'suppliers' },
  ];

  const secondaryNav = [
    { key: 'invoices', label: 'Invoices', href: '#', icon: 'invoices' },
    { key: 'reports',  label: 'Reports',  href: '#', icon: 'reports' },
    { key: 'settings', label: 'Settings', href: '#', icon: 'settings' },
  ];

  function buildSidebar() {
    const page = document.body.dataset.page;
    const pendingApprovals = Ordre.workspaceMetrics().pendingApprovals;

    const navHtml = navItems.map((it) => {
      const active = it.key === page ? ' is-active' : '';
      const badge = it.key === 'approvals' && pendingApprovals
        ? `<span class="nav-badge">${pendingApprovals}</span>` : '';
      return `
        <a class="nav-item${active}" href="${it.href}">
          <span class="nav-icon">${icons[it.icon]}</span>
          <span>${it.label}</span>${badge}
        </a>`;
    }).join('');

    const secondaryHtml = secondaryNav.map((it) => `
      <a class="nav-item" href="${it.href}">
        <span class="nav-icon">${icons[it.icon]}</span>
        <span>${it.label}</span>
      </a>`).join('');

    const ws = Ordre.workspace;

    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">O</div>
          <div class="brand-name">Ordre</div>
        </div>

        <div class="workspace" title="Switch workspace">
          <div class="workspace-info">
            <div class="workspace-avatar">${ws.initial}</div>
            <div class="workspace-meta">
              <span class="workspace-name">${ws.name}</span>
              <span class="workspace-role">${ws.user.role} · EUR</span>
            </div>
          </div>
          <span class="workspace-chevron">${icons.chevronDown}</span>
        </div>

        <nav class="nav">
          ${navHtml}
          <div class="nav-section-label">Finance</div>
          ${secondaryHtml}
        </nav>

        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="user-avatar">${ws.user.initials}</div>
            <div class="user-info">
              <span class="user-name">${ws.user.name}</span>
              <span class="user-role">${ws.user.role}</span>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  function injectShell() {
    const mount = document.getElementById('sidebar-mount');
    if (mount) mount.outerHTML = buildSidebar();
  }

  // ---- Toasts ----
  function toast(message, icon = 'check') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast-icon">${icons[icon] || icons.check}</span><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'none';
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  // ---- Sparklines (monochrome) ----
  function sparkline(values, w = 120, h = 40) {
    if (!values || !values.length) return '';
    const min = Math.min(...values), max = Math.max(...values);
    const range = Math.max(1, max - min);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
    const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const fill = d + ` L${w} ${h} L0 ${h} Z`;
    return `
      <svg class="metric-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        <path class="sparkline-fill" d="${fill}" />
        <path class="sparkline-stroke" d="${d}" />
      </svg>`;
  }
  window.sparkline = sparkline;

  // ---- DOM ready ----
  document.addEventListener('DOMContentLoaded', () => {
    injectShell();

    // Global ⌘K hint — opens a fake command palette toast
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toast('Command palette is a v2 feature.', 'search');
      }
    });
  });

  // ---- Public helpers ----
  window.Ordre.toast = toast;
})();
