/* ==========================================================================
   Ordre — Seed data
   A small film studio ("Studio Verdera") with a few recurring suppliers,
   POs at every stage of the lifecycle, and partial invoice reconciliation.
   ========================================================================== */

window.Ordre = (function () {
  const workspace = {
    name: 'Studio Verdera',
    initial: 'V',
    currency: 'EUR',
    user: { name: 'Ariadna Puig', role: 'Admin', initials: 'AP' },
    team: [
      { name: 'Ariadna Puig',   initials: 'AP', role: 'Admin · Producer' },
      { name: 'Marc Ribera',    initials: 'MR', role: 'Head of Production' },
      { name: 'Clara Navarro',  initials: 'CN', role: 'Director' },
      { name: 'Biel Domènech',  initials: 'BD', role: 'Art Director' },
      { name: 'Laia Soler',     initials: 'LS', role: 'Line Producer' },
      { name: 'Oriol Baixas',   initials: 'OB', role: 'Finance Controller' },
    ],
  };

  const suppliers = [
    {
      id: 'sup_001',
      legalName: 'Mobiliari Sant Martí S.L.',
      tradeName: 'Mobiliari Sant Martí',
      taxId: 'ESB66892104',
      email: 'comandes@mobiliaristm.cat',
      phone: '+34 93 412 55 80',
      address: 'Carrer del Dos de Maig 241, 08013 Barcelona',
      paymentTerms: 'Net 30',
      notes: 'Set dressing furniture, vintage props. Our go-to for period interiors.',
      tags: ['furniture', 'props'],
      createdAt: '2024-11-12',
      monogram: 'MS',
      docs: [
        { name: 'Contract 2026.pdf', size: '214 KB', kind: 'Contract' },
        { name: 'VAT certificate.pdf', size: '86 KB', kind: 'Tax' },
      ],
    },
    {
      id: 'sup_002',
      legalName: 'Papereria Costa S.A.',
      tradeName: 'Papereria Costa',
      taxId: 'ESA08574412',
      email: 'vendes@costapaper.cat',
      phone: '+34 93 270 18 24',
      address: 'Av. Diagonal 412, 08037 Barcelona',
      paymentTerms: 'Net 15',
      notes: 'Office supplies and on-set stationery. Small orders, quick delivery.',
      tags: ['office'],
      createdAt: '2024-09-01',
      monogram: 'PC',
      docs: [
        { name: 'Framework agreement.pdf', size: '142 KB', kind: 'Contract' },
      ],
    },
    {
      id: 'sup_003',
      legalName: 'Tèxtils Badalona S.L.',
      tradeName: 'Tèxtils Badalona',
      taxId: 'ESB65001234',
      email: 'info@textilsbad.cat',
      phone: '+34 93 389 77 01',
      address: 'Carrer del Marroc 18, 08930 Sant Adrià de Besòs',
      paymentTerms: 'Net 30',
      notes: 'Upholstery, drape fabrics, costume base. Custom dyeing available.',
      tags: ['textiles', 'costume'],
      createdAt: '2025-01-20',
      monogram: 'TB',
      docs: [
        { name: 'Certificate of origin.pdf', size: '98 KB', kind: 'Tax' },
        { name: 'Rate sheet 2026.pdf', size: '76 KB', kind: 'Pricing' },
      ],
    },
    {
      id: 'sup_004',
      legalName: 'Enllumenats Bravo S.C.',
      tradeName: 'Bravo Lights',
      taxId: 'ESG09117456',
      email: 'lloguer@bravolights.cat',
      phone: '+34 93 604 21 10',
      address: 'Polígon Can Magarola, 08100 Mollet del Vallès',
      paymentTerms: 'Net 45',
      notes: 'Lighting rental, generators, on-set technicians.',
      tags: ['lighting', 'rental'],
      createdAt: '2024-07-14',
      monogram: 'BL',
      docs: [
        { name: 'Insurance certificate.pdf', size: '118 KB', kind: 'Insurance' },
        { name: 'Contract 2026.pdf', size: '184 KB', kind: 'Contract' },
        { name: 'Rate sheet rental.pdf', size: '64 KB', kind: 'Pricing' },
      ],
    },
    {
      id: 'sup_005',
      legalName: 'Càtering La Vinya S.L.',
      tradeName: 'La Vinya',
      taxId: 'ESB65998877',
      email: 'reserves@catvinya.cat',
      phone: '+34 93 218 60 40',
      address: 'Passeig de Sant Joan 168, 08037 Barcelona',
      paymentTerms: 'Net 7',
      notes: 'On-location lunches and craft service. Dietary tagging supported.',
      tags: ['catering'],
      createdAt: '2025-02-03',
      monogram: 'LV',
      docs: [
        { name: 'Health cert.pdf', size: '72 KB', kind: 'Health' },
      ],
    },
    {
      id: 'sup_006',
      legalName: 'Tallers Corominas S.L.',
      tradeName: 'Corominas Props',
      taxId: 'ESB64311290',
      email: 'hola@corominasprops.cat',
      phone: '+34 93 442 88 12',
      address: 'Carrer Marina 331, 08025 Barcelona',
      paymentTerms: 'Net 30',
      notes: 'Custom set construction, carpentry, small structures.',
      tags: ['construction', 'props'],
      createdAt: '2024-06-09',
      monogram: 'CP',
      docs: [
        { name: 'Contract.pdf', size: '201 KB', kind: 'Contract' },
      ],
    },
  ];

  const purchaseOrders = [
    {
      id: 'po_042',
      number: 'PO-2026-0042',
      supplierId: 'sup_001',
      status: 'approved',
      currency: 'EUR',
      createdBy: 'Ariadna Puig',
      createdAt: '2026-04-08T10:12:00',
      submittedAt: '2026-04-08T14:24:00',
      approvedAt: '2026-04-09T09:05:00',
      notes: 'Set dressing for La Fàbrica — interior apartment, week 3 of the shoot. Style brief in shared drive, section "Verdera/LaFabrica/Set/Apartment".',
      lines: [
        { id: 'l1', description: 'Sofà de tela 3 places model "Cànem"', category: 'shoot', quantity: 1, unitPrice: 480 },
        { id: 'l2', description: 'Tauleta de cafè, roure massís', category: 'shoot', quantity: 1, unitPrice: 180 },
        { id: 'l3', description: 'Cadires butaca vintage de segona mà', category: 'shoot', quantity: 2, unitPrice: 125 },
        { id: 'l4', description: 'Làmpada de peu de ceràmica, Anys 70', category: 'shoot', quantity: 2, unitPrice: 95 },
        { id: 'l5', description: 'Catifa kilim berber 180×240', category: 'shoot', quantity: 1, unitPrice: 220 },
      ],
      approvals: [
        { approver: 'Marc Ribera', initials: 'MR', role: 'Head of Production', decision: 'approved', comment: 'Aligns with the set budget. Approved — go ahead.', decidedAt: '2026-04-09T09:05:00' },
      ],
      invoices: [
        {
          id: 'inv_042_1',
          number: 'A-2026-0187',
          issueDate: '2026-04-12',
          dueDate: '2026-05-12',
          total: 430,
          file: 'fact-mst-0187.pdf',
          fileSize: '312 KB',
          lines: [ { lineId: 'l2', amount: 180 }, { lineId: 'l3', amount: 250 } ],
          uploadedBy: 'Ariadna Puig',
        },
        {
          id: 'inv_042_2',
          number: 'A-2026-0204',
          issueDate: '2026-04-16',
          dueDate: '2026-05-16',
          total: 460,
          file: 'fact-mst-0204.pdf',
          fileSize: '298 KB',
          lines: [ { lineId: 'l1', amount: 460 } ],
          uploadedBy: 'Laia Soler',
        },
      ],
    },
    {
      id: 'po_041',
      number: 'PO-2026-0041',
      supplierId: 'sup_004',
      status: 'approved',
      currency: 'EUR',
      createdBy: 'Laia Soler',
      createdAt: '2026-04-05T11:20:00',
      submittedAt: '2026-04-05T16:00:00',
      approvedAt: '2026-04-06T10:12:00',
      notes: 'Lighting rental for external night scenes — week 3. 3 days on-site support.',
      lines: [
        { id: 'l1', description: 'HMI 2.5kW Fresnel (lloguer, 3 dies)', category: 'shoot', quantity: 2, unitPrice: 420 },
        { id: 'l2', description: 'Generador silenciós 20kVA (3 dies)', category: 'shoot', quantity: 1, unitPrice: 360 },
        { id: 'l3', description: 'Tècnic elèctric de guàrdia (3 torns de nit)', category: 'shoot', quantity: 3, unitPrice: 280 },
      ],
      approvals: [
        { approver: 'Marc Ribera', initials: 'MR', role: 'Head of Production', decision: 'approved', comment: 'Approved. Coordinate with gaffer on call.', decidedAt: '2026-04-06T10:12:00' },
      ],
      invoices: [
        {
          id: 'inv_041_1',
          number: 'B-2026-0089',
          issueDate: '2026-04-14',
          dueDate: '2026-05-29',
          total: 2040,
          file: 'bravolights-0089.pdf',
          fileSize: '244 KB',
          lines: [ { lineId: 'l1', amount: 840 }, { lineId: 'l2', amount: 360 }, { lineId: 'l3', amount: 840 } ],
          uploadedBy: 'Laia Soler',
        },
      ],
    },
    {
      id: 'po_040',
      number: 'PO-2026-0040',
      supplierId: 'sup_002',
      status: 'closed',
      currency: 'EUR',
      createdBy: 'Ariadna Puig',
      createdAt: '2026-03-28T09:40:00',
      submittedAt: '2026-03-28T10:00:00',
      approvedAt: '2026-03-28T14:22:00',
      closedAt: '2026-04-10T12:00:00',
      notes: 'Office restock — Q2 start.',
      lines: [
        { id: 'l1', description: 'Paper A4 500 fulls (caixa 5)', category: 'office', quantity: 4, unitPrice: 24 },
        { id: 'l2', description: 'Bolígrafs negres (paquet 50)', category: 'office', quantity: 2, unitPrice: 18 },
        { id: 'l3', description: 'Post-it 76×76 grocs (pack 12)', category: 'office', quantity: 1, unitPrice: 22 },
      ],
      approvals: [
        { approver: 'Oriol Baixas', initials: 'OB', role: 'Finance Controller', decision: 'approved', comment: 'Under €500 threshold — auto-approved by rule.', decidedAt: '2026-03-28T14:22:00' },
      ],
      invoices: [
        {
          id: 'inv_040_1',
          number: 'C-2026-0521',
          issueDate: '2026-03-30',
          dueDate: '2026-04-14',
          total: 154,
          file: 'costa-0521.pdf',
          fileSize: '92 KB',
          lines: [ { lineId: 'l1', amount: 96 }, { lineId: 'l2', amount: 36 }, { lineId: 'l3', amount: 22 } ],
          uploadedBy: 'Ariadna Puig',
        },
      ],
    },
    {
      id: 'po_039',
      number: 'PO-2026-0039',
      supplierId: 'sup_003',
      status: 'pending_approval',
      currency: 'EUR',
      createdBy: 'Biel Domènech',
      createdAt: '2026-04-17T15:40:00',
      submittedAt: '2026-04-18T09:10:00',
      notes: 'Set drapery for the cafe scene — large window backdrop plus table cloths.',
      lines: [
        { id: 'l1', description: 'Vellut vermell fosc (metre)', category: 'shoot', quantity: 18, unitPrice: 22 },
        { id: 'l2', description: 'Lli cru 140cm (metre)', category: 'shoot', quantity: 24, unitPrice: 14 },
        { id: 'l3', description: 'Cosit a mida (servei)', category: 'shoot', quantity: 1, unitPrice: 280 },
      ],
      approvals: [
        { approver: 'Marc Ribera', initials: 'MR', role: 'Head of Production', decision: 'pending', comment: null, decidedAt: null },
      ],
      invoices: [],
    },
    {
      id: 'po_038',
      number: 'PO-2026-0038',
      supplierId: 'sup_005',
      status: 'pending_approval',
      currency: 'EUR',
      createdBy: 'Laia Soler',
      createdAt: '2026-04-18T08:05:00',
      submittedAt: '2026-04-18T10:40:00',
      notes: 'Craft catering for shoot week 3 — 22 persons, 4 days including 2 nights.',
      lines: [
        { id: 'l1', description: 'Menú complet (22 pax × 4 dies)', category: 'shoot', quantity: 88, unitPrice: 18 },
        { id: 'l2', description: 'Sopar nocturn (22 pax × 2 nits)', category: 'shoot', quantity: 44, unitPrice: 14 },
        { id: 'l3', description: 'Craft service (càtering continuat)', category: 'shoot', quantity: 4, unitPrice: 180 },
      ],
      approvals: [
        { approver: 'Marc Ribera', initials: 'MR', role: 'Head of Production', decision: 'pending', comment: null, decidedAt: null },
        { approver: 'Oriol Baixas', initials: 'OB', role: 'Finance Controller', decision: 'pending', comment: null, decidedAt: null },
      ],
      invoices: [],
    },
    {
      id: 'po_037',
      number: 'PO-2026-0037',
      supplierId: 'sup_006',
      status: 'draft',
      currency: 'EUR',
      createdBy: 'Biel Domènech',
      createdAt: '2026-04-18T18:10:00',
      notes: 'Custom balcony riser for the apartment set. Awaiting final drawings.',
      lines: [
        { id: 'l1', description: 'Estructura de fusta 3×2m (disseny + construcció)', category: 'shoot', quantity: 1, unitPrice: 1400 },
        { id: 'l2', description: 'Pintura i acabat vintage', category: 'shoot', quantity: 1, unitPrice: 220 },
      ],
      approvals: [],
      invoices: [],
    },
    {
      id: 'po_036',
      number: 'PO-2026-0036',
      supplierId: 'sup_001',
      status: 'approved',
      currency: 'EUR',
      createdBy: 'Biel Domènech',
      createdAt: '2026-04-01T10:00:00',
      submittedAt: '2026-04-01T11:12:00',
      approvedAt: '2026-04-02T09:00:00',
      notes: 'Office seating refresh — despatx meeting room.',
      lines: [
        { id: 'l1', description: 'Cadires de despatx ergonòmiques', category: 'office', quantity: 6, unitPrice: 165 },
        { id: 'l2', description: 'Prestatge de llibres roure', category: 'office', quantity: 1, unitPrice: 240 },
      ],
      approvals: [
        { approver: 'Oriol Baixas', initials: 'OB', role: 'Finance Controller', decision: 'approved', comment: 'OK.', decidedAt: '2026-04-02T09:00:00' },
      ],
      invoices: [
        {
          id: 'inv_036_1',
          number: 'A-2026-0174',
          issueDate: '2026-04-05',
          dueDate: '2026-05-05',
          total: 990,
          file: 'mst-0174.pdf',
          fileSize: '176 KB',
          lines: [ { lineId: 'l1', amount: 990 } ],
          uploadedBy: 'Biel Domènech',
        },
      ],
    },
    {
      id: 'po_035',
      number: 'PO-2026-0035',
      supplierId: 'sup_004',
      status: 'rejected',
      currency: 'EUR',
      createdBy: 'Laia Soler',
      createdAt: '2026-03-25T11:30:00',
      submittedAt: '2026-03-25T15:00:00',
      notes: 'Extended lighting package — rejected, scope reduced and resubmitted as PO-2026-0041.',
      lines: [
        { id: 'l1', description: 'Paquet il·luminació extesa (5 dies)', category: 'shoot', quantity: 1, unitPrice: 4200 },
      ],
      approvals: [
        { approver: 'Marc Ribera', initials: 'MR', role: 'Head of Production', decision: 'rejected', comment: 'Scope too wide. Please re-scope to actual shoot days (3).', decidedAt: '2026-03-26T08:50:00' },
      ],
      invoices: [],
    },
  ];

  // ---- Helpers ----
  const eur = (n) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const eurFull = (n) => new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  function supplierById(id) { return suppliers.find((s) => s.id === id); }
  function poById(id) { return purchaseOrders.find((p) => p.id === id); }

  function lineCommitted(line) { return line.quantity * line.unitPrice; }
  function lineInvoiced(po, lineId) {
    let total = 0;
    for (const inv of po.invoices) {
      for (const l of inv.lines) if (l.lineId === lineId) total += l.amount;
    }
    return total;
  }
  function lineRemaining(po, line) { return lineCommitted(line) - lineInvoiced(po, line.id); }

  function poTotals(po) {
    let committed = 0, invoiced = 0;
    for (const l of po.lines) committed += lineCommitted(l);
    for (const inv of po.invoices) for (const l of inv.lines) invoiced += l.amount;
    return { committed, invoiced, remaining: committed - invoiced };
  }

  function relDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date('2026-04-20T12:00:00');
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    const days = Math.floor(diff / 86400);
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' · ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function statusLabel(s) {
    return ({
      draft: 'Draft',
      pending_approval: 'Pending approval',
      approved: 'Approved',
      rejected: 'Rejected',
      closed: 'Closed',
    })[s] || s;
  }

  function statusClass(s) {
    return ({
      draft: 'pill-status-draft',
      pending_approval: 'pill-status-pending',
      approved: 'pill-status-approved',
      rejected: 'pill-status-rejected',
      closed: 'pill-status-closed',
    })[s] || '';
  }

  // ---- Workspace-level metrics ----
  function workspaceMetrics() {
    let committed = 0, invoiced = 0;
    for (const po of purchaseOrders) {
      if (po.status === 'draft' || po.status === 'rejected') continue;
      const t = poTotals(po);
      committed += t.committed;
      invoiced += t.invoiced;
    }
    const remaining = committed - invoiced;
    const pendingApprovals = purchaseOrders.filter((p) => p.status === 'pending_approval').length;
    const open = purchaseOrders.filter((p) => p.status !== 'closed' && p.status !== 'rejected').length;
    return { committed, invoiced, remaining, pendingApprovals, open };
  }

  // ---- Public API ----
  return {
    workspace, suppliers, purchaseOrders,
    eur, eurFull, supplierById, poById,
    lineCommitted, lineInvoiced, lineRemaining, poTotals,
    relDate, formatDate, formatDateTime,
    statusLabel, statusClass,
    workspaceMetrics,
  };
})();
