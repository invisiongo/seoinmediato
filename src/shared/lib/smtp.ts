import nodemailer from 'nodemailer'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from?: string
}

interface SendMailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
  from?: string
  config: SmtpConfig
}

function buildTransporter(cfg: SmtpConfig): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
    },
  })
}

export async function sendMail(opts: SendMailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const cfg = opts.config
    const transporter = buildTransporter(cfg)
    const from = opts.from || cfg.from || cfg.user
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown SMTP error'
    return { ok: false, error }
  }
}
