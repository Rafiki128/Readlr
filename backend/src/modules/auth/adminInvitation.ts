import { createHash, timingSafeEqual } from 'node:crypto';

export function registrationRole(email:string, invitation:unknown): 'learner' | 'admin' {
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@admin.readlr.com')) return 'learner';
  const approved = (process.env.ADMIN_EMAIL_ALLOWLIST ?? '').split(',').map(x=>x.trim().toLowerCase());
  const secret = process.env.ADMIN_INVITATION_CODE ?? '';
  const digest = (value:string) => createHash('sha256').update(value).digest();
  if (!/^[a-z]+\.[a-z]+(?:-[a-z]+)*@admin\.readlr\.com$/.test(normalized) ||
      !approved.includes(normalized) || secret.length < 24 || typeof invitation !== 'string' ||
      !timingSafeEqual(digest(secret),digest(invitation))) throw new Error('A valid administrator invitation is required for this email.');
  return 'admin';
}
