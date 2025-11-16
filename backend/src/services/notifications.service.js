import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service de notifications email
 */
class NotificationsService {
  constructor() {
    // Configuration SMTP (utilise nodemailer)
    this.transporter = null;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true pour 465, false pour autres ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  /**
   * Envoyer un email de notification pour un nouveau lead qualifié
   */
  async sendLeadNotification(userEmail, leadInfo) {
    if (!this.transporter) {
      console.warn('SMTP not configured, skipping email notification');
      return;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: userEmail,
        subject: 'Nouveau lead qualifié - WhatsApp AI Assistant',
        html: `
          <h2>Nouveau lead qualifié</h2>
          <p>Vous avez reçu un nouveau lead qualifié via WhatsApp :</p>
          <ul>
            <li><strong>Nom:</strong> ${leadInfo.contact_name || 'Non renseigné'}</li>
            <li><strong>Téléphone:</strong> ${leadInfo.contact_phone}</li>
            <li><strong>Statut:</strong> ${leadInfo.prospect_status}</li>
            <li><strong>Dernier message:</strong> ${leadInfo.last_message || 'Aucun'}</li>
          </ul>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/conversations/${leadInfo.conversation_id}">Voir la conversation</a></p>
        `,
        text: `
          Nouveau lead qualifié
          
          Nom: ${leadInfo.contact_name || 'Non renseigné'}
          Téléphone: ${leadInfo.contact_phone}
          Statut: ${leadInfo.prospect_status}
          Dernier message: ${leadInfo.last_message || 'Aucun'}
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Lead notification sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending lead notification:', error);
      // Ne pas faire échouer le processus si l'email échoue
    }
  }

  /**
   * Envoyer un email générique
   */
  async sendEmail(to, subject, html, text) {
    if (!this.transporter) {
      console.warn('SMTP not configured, skipping email');
      return;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        html,
        text,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

export default new NotificationsService();

