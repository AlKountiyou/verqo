import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.warn('SMTP config manquante, envoi email désactivé.');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private getFromAddress(): string {
    return (
      this.configService.get<string>('SMTP_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'no-reply@verqo.local'
    );
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP non configuré');
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL manquant');
    }
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(
      token,
    )}`;

    await this.transporter.sendMail({
      from: this.getFromAddress(),
      to,
      subject: 'Vérifiez votre email',
      text: `Merci de vérifier votre email: ${verifyUrl}`,
      html: `<p>Merci de vérifier votre email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP non configuré');
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL manquant');
    }
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      token,
    )}`;

    await this.transporter.sendMail({
      from: this.getFromAddress(),
      to,
      subject: 'Réinitialisation de mot de passe',
      text: `Réinitialisez votre mot de passe: ${resetUrl}`,
      html: `<p>Réinitialisez votre mot de passe:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }
}
