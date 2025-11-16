import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Service WhatsApp pour envoyer des messages via Meta API
 */
class WhatsAppService {
  /**
   * Envoyer un message texte
   */
  async sendTextMessage(phoneNumber, message, phoneNumberId = null) {
    try {
      const to = phoneNumber.replace(/[^0-9]/g, ''); // Nettoyer le numéro
      const from = phoneNumberId || WHATSAPP_PHONE_NUMBER_ID;
      
      if (!from || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp credentials not configured');
      }

      const url = `${WHATSAPP_API_URL}/${from}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Envoyer un message avec média (image, document)
   */
  async sendMediaMessage(phoneNumber, mediaUrl, mediaType = 'image', caption = '', phoneNumberId = null) {
    try {
      const to = phoneNumber.replace(/[^0-9]/g, '');
      const from = phoneNumberId || WHATSAPP_PHONE_NUMBER_ID;
      
      if (!from || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp credentials not configured');
      }

      const url = `${WHATSAPP_API_URL}/${from}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption || undefined,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('WhatsApp media send error:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp media: ${error.message}`);
    }
  }

  /**
   * Envoyer un document (PDF, etc.)
   */
  async sendDocument(phoneNumber, documentUrl, filename, caption = '', phoneNumberId = null) {
    try {
      const to = phoneNumber.replace(/[^0-9]/g, '');
      const from = phoneNumberId || WHATSAPP_PHONE_NUMBER_ID;
      
      if (!from || !WHATSAPP_ACCESS_TOKEN) {
        throw new Error('WhatsApp credentials not configured');
      }

      const url = `${WHATSAPP_API_URL}/${from}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename,
          caption: caption || undefined,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        data: response.data,
      };
    } catch (error) {
      console.error('WhatsApp document send error:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp document: ${error.message}`);
    }
  }

  /**
   * Vérifier la signature du webhook (pour sécurité)
   */
  verifyWebhookSignature(payload, signature, appSecret) {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', appSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }
}

export default new WhatsAppService();

