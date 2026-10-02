import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  headers?: Record<string, string>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MailTransport {
  sendMail(options: SendMailOptions): Promise<SendMailResult>;
}

/**
 * Development / console mail transport.
 * Writes formatted JSON email payloads to logs/outbox-dev.log.
 */
export class ConsoleMailTransport implements MailTransport {
  private logPath: string;

  constructor(logPath: string = path.resolve(process.cwd(), 'logs', 'outbox-dev.log')) {
    this.logPath = logPath;
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      to: options.to,
      subject: options.subject,
      messageId: options.messageId,
      headers: options.headers,
      text: options.text,
      html: options.html,
    };

    fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n', 'utf8');

    return {
      success: true,
      messageId: options.messageId || `console-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
  }
}

/**
 * Production SMTP mail transport using nodemailer.
 */
export class SmtpMailTransport implements MailTransport {
  private transporter: Transporter;

  constructor(transporter?: Transporter) {
    if (transporter) {
      this.transporter = transporter;
    } else {
      if (!process.env.SMTP_FROM) {
        throw new Error('SMTP_FROM is required when MAIL_TRANSPORT=smtp');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });
    }
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    try {
      const from = process.env.SMTP_FROM;
      if (!from) {
        throw new Error('SMTP_FROM is required');
      }

      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        messageId: options.messageId,
        headers: options.headers,
      });

      return {
        success: true,
        messageId: info.messageId || options.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function getMailTransport(): MailTransport {
  if (process.env.MAIL_TRANSPORT === 'smtp') {
    return new SmtpMailTransport();
  }
  return new ConsoleMailTransport();
}
