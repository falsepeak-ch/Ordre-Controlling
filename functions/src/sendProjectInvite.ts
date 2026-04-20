import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import * as nodemailer from 'nodemailer';
import { renderInviteEmail, type InviteLocale } from './templates/inviteEmail';

const EMAIL_USER = defineString('EMAIL_USER');
const EMAIL_PASS = defineSecret('EMAIL_PASS');
const APP_BASE_URL = defineSecret('APP_BASE_URL');

let transporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_USER.value(),
        pass: EMAIL_PASS.value(),
      },
    });
  }
  return transporter;
};

type Role = 'owner' | 'editor' | 'viewer';

interface InvitePayload {
  projectId: string;
  email: string;
  role?: Role;
  recipientName?: string;
  locale?: InviteLocale;
}

/**
 * Sends the "you were invited to a project" email via Namecheap Private Email.
 * Called from the client right after `addMemberByEmail` writes the new role to
 * the project doc. The function re-verifies that the caller is a member of the
 * project before sending, so a leaked callable endpoint can't be used to spam.
 */
export const sendProjectInvite = onCall(
  {
    region: 'europe-west1',
    secrets: [EMAIL_PASS, APP_BASE_URL],
    cors: true,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in to invite members.');
    }

    const payload = (req.data ?? {}) as Partial<InvitePayload>;
    const projectId = (payload.projectId ?? '').trim();
    const email = (payload.email ?? '').toLowerCase().trim();
    const role: Role = payload.role === 'owner' || payload.role === 'viewer' ? payload.role : 'editor';
    const locale = normalizeLocale(payload.locale);
    const recipientName = payload.recipientName?.trim() || undefined;

    if (!projectId) throw new HttpsError('invalid-argument', 'Missing projectId.');
    if (!isValidEmail(email)) throw new HttpsError('invalid-argument', 'Invalid email.');

    const db = getFirestore();
    const projectSnap = await db.doc(`projects/${projectId}`).get();
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }
    const project = projectSnap.data() as {
      name?: string;
      members?: Record<string, Role>;
      memberProfiles?: Record<
        string,
        { displayName?: string; email?: string; photoURL?: string | null }
      >;
    };

    const callerRole = project.members?.[uid];
    if (callerRole !== 'owner' && callerRole !== 'editor') {
      throw new HttpsError('permission-denied', 'Only owners or editors can invite.');
    }

    const inviterProfile = project.memberProfiles?.[uid];
    const inviterName = inviterProfile?.displayName?.trim() || inviterProfile?.email || 'A teammate';
    const inviterEmail = inviterProfile?.email || '';

    const base = (APP_BASE_URL.value() || '').replace(/\/+$/, '');
    const ctaUrl = base ? `${base}/app/p/${projectId}` : `https://ordre.app/app/p/${projectId}`;

    const { subject, html, text } = renderInviteEmail({
      projectName: project.name || 'your project',
      inviterName,
      inviterEmail,
      role,
      recipientName,
      ctaUrl,
      locale,
    });

    const from = `Ordre <${EMAIL_USER.value()}>`;

    try {
      const info = await getTransporter().sendMail({
        from,
        to: email,
        replyTo: inviterEmail || undefined,
        subject,
        html,
        text,
      });
      logger.info('[sendProjectInvite] sent', {
        projectId,
        to: email,
        messageId: info.messageId,
      });
      return { ok: true, id: info.messageId ?? null };
    } catch (err) {
      logger.error('[sendProjectInvite] unexpected failure', err);
      throw new HttpsError('internal', 'Could not send invite email.');
    }
  },
);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeLocale(raw: unknown): InviteLocale {
  if (raw === 'es' || raw === 'en' || raw === 'ca') return raw;
  return 'ca';
}
