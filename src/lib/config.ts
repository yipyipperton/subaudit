// Feature flags derived from env. Everything degrades gracefully when unset.
export const features = {
  db: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
  authSecret: Boolean(process.env.AUTH_SECRET),
  emailLogin: Boolean(process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY),
  github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  ai: Boolean(process.env.OPENAI_API_KEY),
  emailReminders: Boolean(process.env.RESEND_API_KEY),
};
export const authEnabled = features.db && features.authSecret && (features.emailLogin || features.github);
