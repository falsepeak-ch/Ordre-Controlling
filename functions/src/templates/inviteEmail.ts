/**
 * Renders the HTML + plain-text body for a "you've been invited to a
 * project on Ordre" email. Inline CSS only — most mail clients (Gmail,
 * Outlook, Apple Mail) strip <style> tags or don't honour external
 * fonts, so we lean on system stacks with a Cal-inspired monochrome
 * palette that degrades gracefully.
 */

export type InviteLocale = 'ca' | 'es' | 'en';

export interface InviteEmailInput {
  projectName: string;
  inviterName: string;
  inviterEmail: string;
  role: 'owner' | 'editor' | 'viewer';
  recipientName?: string;
  ctaUrl: string;
  locale?: InviteLocale;
}

interface Copy {
  preheader: (project: string) => string;
  heading: (project: string) => string;
  greeting: (name: string) => string;
  body: (inviter: string, project: string, role: string) => string;
  roleLabel: Record<'owner' | 'editor' | 'viewer', string>;
  roleDescription: Record<'owner' | 'editor' | 'viewer', string>;
  cta: string;
  fallback: string;
  footerNote: string;
  signedOff: string;
  brand: string;
  tagline: string;
}

const COPY: Record<InviteLocale, Copy> = {
  ca: {
    preheader: (p) => `Has estat convidat a col·laborar a ${p}.`,
    heading: (p) => `T'han convidat a ${p}`,
    greeting: (name) => `Hola ${name},`,
    body: (inviter, project, role) =>
      `${inviter} t'ha convidat a col·laborar al projecte <strong>${project}</strong> a Ordre com a <strong>${role}</strong>.`,
    roleLabel: { owner: 'propietari', editor: 'editor', viewer: 'lector' },
    roleDescription: {
      owner: 'Pots gestionar membres, configuració i facturació.',
      editor: 'Pots crear i editar ordres de compra, proveïdors i factures.',
      viewer: 'Pots consultar els registres del projecte.',
    },
    cta: 'Obrir el projecte',
    fallback: 'Si el botó no funciona, copia aquest enllaç al navegador:',
    footerNote:
      "Has rebut aquest correu perquè la teva adreça ha estat afegida com a membre del projecte. Si creus que és un error, ignora'l.",
    signedOff: 'Amb afecte,',
    brand: 'Ordre',
    tagline: 'Gestió de compres per a produccions i oficines.',
  },
  es: {
    preheader: (p) => `Te han invitado a colaborar en ${p}.`,
    heading: (p) => `Te han invitado a ${p}`,
    greeting: (name) => `Hola ${name},`,
    body: (inviter, project, role) =>
      `${inviter} te ha invitado a colaborar en el proyecto <strong>${project}</strong> en Ordre como <strong>${role}</strong>.`,
    roleLabel: { owner: 'propietario', editor: 'editor', viewer: 'lector' },
    roleDescription: {
      owner: 'Puedes gestionar miembros, configuración y facturación.',
      editor: 'Puedes crear y editar órdenes de compra, proveedores y facturas.',
      viewer: 'Puedes consultar los registros del proyecto.',
    },
    cta: 'Abrir el proyecto',
    fallback: 'Si el botón no funciona, copia este enlace en tu navegador:',
    footerNote:
      'Has recibido este correo porque tu dirección fue añadida como miembro del proyecto. Si crees que es un error, ignóralo.',
    signedOff: 'Con cariño,',
    brand: 'Ordre',
    tagline: 'Gestión de compras para producciones y oficinas.',
  },
  en: {
    preheader: (p) => `You've been invited to collaborate on ${p}.`,
    heading: (p) => `You've been invited to ${p}`,
    greeting: (name) => `Hi ${name},`,
    body: (inviter, project, role) =>
      `${inviter} invited you to collaborate on <strong>${project}</strong> on Ordre as <strong>${role}</strong>.`,
    roleLabel: { owner: 'owner', editor: 'editor', viewer: 'viewer' },
    roleDescription: {
      owner: 'You can manage members, settings, and billing.',
      editor: 'You can create and edit purchase orders, suppliers, and invoices.',
      viewer: 'You can read the project records.',
    },
    cta: 'Open the project',
    fallback: "If the button doesn't work, copy this link into your browser:",
    footerNote:
      'You received this email because your address was added as a project member. If you believe this is a mistake, ignore this message.',
    signedOff: 'With care,',
    brand: 'Ordre',
    tagline: 'Procurement for film productions and small offices.',
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderedInvite {
  subject: string;
  html: string;
  text: string;
}

export function renderInviteEmail(input: InviteEmailInput): RenderedInvite {
  const locale = input.locale ?? 'ca';
  const copy = COPY[locale];

  const project = escapeHtml(input.projectName);
  const inviter = escapeHtml(input.inviterName || input.inviterEmail);
  const inviterEmail = escapeHtml(input.inviterEmail);
  const recipient = escapeHtml(input.recipientName?.trim() || '');
  const roleLabel = copy.roleLabel[input.role];
  const roleDescription = copy.roleDescription[input.role];
  const cta = escapeHtml(input.ctaUrl);

  const greetingName = recipient || (locale === 'en' ? 'there' : '');
  const subject = copy.heading(input.projectName);

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(copy.preheader(input.projectName))}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:32px;height:32px;background-color:#111111;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;text-align:center;line-height:32px;letter-spacing:-0.02em;">O</td>
                  <td style="padding-left:12px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#111111;">${copy.brand}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:14px;box-shadow:0 1px 2px rgba(16,18,27,0.04),0 6px 24px rgba(16,18,27,0.06);padding:40px 36px;">
              <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#111111;">${escapeHtml(copy.heading(input.projectName))}</h1>
              ${greetingName ? `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#4a4a48;">${escapeHtml(copy.greeting(greetingName))}</p>` : ''}
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#111111;">${copy.body(inviter, project, escapeHtml(roleLabel))}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f5;border-radius:10px;padding:14px 16px;margin:0 0 28px 0;width:100%;">
                <tr>
                  <td style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#6b6b68;font-weight:600;padding-bottom:4px;">${escapeHtml(roleLabel)}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;line-height:1.5;color:#2a2a28;">${escapeHtml(roleDescription)}</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:10px;background-color:#111111;">
                    <a href="${cta}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.005em;border-radius:10px;">${escapeHtml(copy.cta)} &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 8px 0;font-size:12px;color:#8a8a87;line-height:1.5;">${escapeHtml(copy.fallback)}</p>
              <p style="margin:0;font-size:12px;color:#4a4a48;word-break:break-all;"><a href="${cta}" style="color:#4a4a48;text-decoration:underline;">${cta}</a></p>
              <hr style="margin:32px 0 20px 0;border:none;border-top:1px solid #ececea;" />
              <p style="margin:0 0 4px 0;font-size:13px;color:#4a4a48;">${escapeHtml(copy.signedOff)}</p>
              <p style="margin:0;font-size:13px;color:#111111;font-weight:600;">${inviter} <span style="font-weight:400;color:#8a8a87;">&lt;${inviterEmail}&gt;</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0 8px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#8a8a87;line-height:1.6;">${escapeHtml(copy.tagline)}</p>
              <p style="margin:0;font-size:11px;color:#b0b0ac;line-height:1.6;">${escapeHtml(copy.footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    copy.heading(input.projectName),
    '',
    greetingName ? copy.greeting(greetingName) : '',
    stripHtml(
      copy.body(input.inviterName || input.inviterEmail, input.projectName, roleLabel),
    ),
    '',
    `${roleLabel.toUpperCase()} — ${roleDescription}`,
    '',
    `${copy.cta}: ${input.ctaUrl}`,
    '',
    '—',
    copy.footerNote,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}
