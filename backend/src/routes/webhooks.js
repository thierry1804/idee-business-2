import express from 'express';
import { supabase } from '../models/supabase.js';
import whatsappService from '../services/whatsapp.service.js';
import openaiService from '../services/openai.service.js';
import pdfService from '../services/pdf.service.js';
import notificationsService from '../services/notifications.service.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

/**
 * GET /webhooks/whatsapp - Vérification webhook (requis par Meta)
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * POST /webhooks/whatsapp - Réception des messages WhatsApp
 */
router.post('/whatsapp', express.json(), async (req, res) => {
  try {
    // Vérifier la signature (optionnel mais recommandé)
    const signature = req.headers['x-hub-signature-256'];
    if (signature && WHATSAPP_APP_SECRET) {
      const isValid = whatsappService.verifyWebhookSignature(
        req.body,
        signature.replace('sha256=', ''),
        WHATSAPP_APP_SECRET
      );
      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.sendStatus(403);
      }
    }

    // Répondre immédiatement à Meta (200 OK)
    res.status(200).send('OK');

    // Traiter les messages de manière asynchrone
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Traiter les messages entrants
            if (value.messages) {
              for (const message of value.messages) {
                await processIncomingMessage(message, value);
              }
            }
            
            // Traiter les statuts (livré, lu, etc.)
            if (value.statuses) {
              // Optionnel: mettre à jour le statut des messages
              console.log('Message statuses:', value.statuses);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Ne pas renvoyer d'erreur à Meta pour éviter les retries
  }
});

/**
 * Traiter un message entrant
 */
async function processIncomingMessage(message, webhookValue) {
  try {
    const phoneNumberId = webhookValue.metadata?.phone_number_id;
    const from = message.from; // Numéro de l'expéditeur
    const messageType = message.type;
    const messageId = message.id;
    const timestamp = parseInt(message.timestamp) * 1000; // Convertir en millisecondes
    
    // Extraire le contenu selon le type
    let content = '';
    let mediaUrl = null;
    
    if (messageType === 'text') {
      content = message.text?.body || '';
    } else if (messageType === 'image' || messageType === 'document') {
      const mediaId = message[messageType]?.id;
      if (mediaId) {
        // Note: Pour récupérer l'URL du média, il faut faire un appel API séparé
        // Pour le MVP, on stocke juste l'ID
        mediaUrl = mediaId;
        content = message[messageType]?.caption || '';
      }
    } else if (messageType === 'location') {
      content = `Location: ${message.location?.latitude}, ${message.location?.longitude}`;
    } else {
      content = `[${messageType} message]`;
    }

    // Trouver ou créer le compte WhatsApp
    const { data: waAccount } = await supabase
      .from('whatsapp_accounts')
      .select('*, user_id')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (!waAccount) {
      console.error(`WhatsApp account not found for phone_number_id: ${phoneNumberId}`);
      return;
    }

    // Trouver ou créer la conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('wa_account_id', waAccount.id)
      .eq('contact_phone', from)
      .single();

    if (!conversation) {
      // Créer nouvelle conversation
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          wa_account_id: waAccount.id,
          contact_phone: from,
          contact_name: webhookValue.contacts?.[0]?.profile?.name || null,
          last_message: content.substring(0, 200),
          last_message_at: new Date(timestamp),
          status: 'open',
        })
        .select()
        .single();

      conversation = newConversation;
    } else {
      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({
          last_message: content.substring(0, 200),
          last_message_at: new Date(timestamp),
          updated_at: new Date(),
        })
        .eq('id', conversation.id);
    }

    // Stocker le message
    const { data: storedMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'in',
        content,
        message_type: messageType,
        media_url: mediaUrl,
        timestamp: new Date(timestamp),
        wa_message_id: messageId,
        metadata: {
          from,
          phone_number_id: phoneNumberId,
          webhook_data: webhookValue,
        },
      })
      .select()
      .single();

    console.log(`Message stored: ${from} -> ${content.substring(0, 50)}...`);

    // Traiter avec OpenAI et envoyer la réponse
    if (content && messageType === 'text') {
      await processWithAI(conversation, waAccount, content, from);
    }

  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
}

/**
 * Traiter le message avec OpenAI et envoyer la réponse
 */
async function processWithAI(conversation, waAccount, userMessage, contactPhone) {
  try {
    // Récupérer les settings de l'utilisateur pour la langue
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('user_id', waAccount.user_id)
      .eq('key', 'language')
      .single();

    const language = settings?.value || 'fr';

    // Générer la réponse avec OpenAI
    const aiResult = await openaiService.generateResponse(
      conversation.id,
      waAccount.user_id,
      userMessage,
      language
    );

    const aiResponse = aiResult.response;
    const intentions = aiResult.intentions;

    // Envoyer la réponse via WhatsApp
    const sendResult = await whatsappService.sendTextMessage(
      contactPhone,
      aiResponse,
      waAccount.phone_number_id
    );

    // Stocker la réponse envoyée
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'out',
        content: aiResponse,
        message_type: 'text',
        timestamp: new Date(),
        wa_message_id: sendResult.messageId,
        metadata: {
          ai_generated: true,
          intentions,
        },
      });

    // Mettre à jour la conversation
    await supabase
      .from('conversations')
      .update({
        last_message: aiResponse.substring(0, 200),
        last_message_at: new Date(),
        updated_at: new Date(),
      })
      .eq('id', conversation.id);

    // Si demande de devis détectée, créer le devis automatiquement
    if (intentions.wantsQuote && intentions.mentionedProducts.length > 0) {
      await createDevisFromIntentions(conversation, waAccount, intentions, contactPhone);
    }

    // Mettre à jour le statut prospect si nécessaire
    if (intentions.wantsQuote || intentions.wantsProduct) {
      await supabase
        .from('conversations')
        .update({
          prospect_status: 'qualified',
        })
        .eq('id', conversation.id);

      // Envoyer notification email pour lead qualifié
      try {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('id', waAccount.user_id)
          .single();

        if (user && user.email) {
          await notificationsService.sendLeadNotification(user.email, {
            contact_name: conversation.contact_name,
            contact_phone: contactPhone,
            prospect_status: 'qualified',
            last_message: userMessage,
            conversation_id: conversation.id,
          });
        }
      } catch (notifError) {
        console.error('Error sending lead notification:', notifError);
        // Ne pas faire échouer le processus
      }
    }

    console.log(`AI response sent to ${contactPhone}`);

  } catch (error) {
    console.error('Error processing with AI:', error);
    
    // En cas d'erreur, envoyer un message de fallback
    try {
      const fallbackMessage = 'Désolé, je rencontre un problème technique. Un membre de notre équipe vous contactera bientôt.';
      await whatsappService.sendTextMessage(
        contactPhone,
        fallbackMessage,
        waAccount.phone_number_id
      );
    } catch (fallbackError) {
      console.error('Error sending fallback message:', fallbackError);
    }
  }
}

/**
 * Créer un devis depuis les intentions détectées
 */
async function createDevisFromIntentions(conversation, waAccount, intentions, contactPhone) {
  try {
    const products = intentions.mentionedProducts;
    
    if (products.length === 0) {
      return;
    }

    // Créer les items du devis
    const items = products.map(product => ({
      product_id: product.id,
      title: product.title,
      quantity: 1, // Par défaut 1, pourrait être extrait du message
      price: parseFloat(product.price) || 0,
    }));

    // Calculer les totaux
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = 0; // Par défaut pas de taxe
    const total = subtotal + tax;

    // Créer le devis
    const { data: devis } = await supabase
      .from('devis')
      .insert({
        conversation_id: conversation.id,
        user_id: waAccount.user_id,
        contact_phone: contactPhone,
        contact_name: conversation.contact_name,
        items,
        subtotal,
        tax,
        total,
        currency: 'MGA',
        status: 'draft',
      })
      .select()
      .single();

    if (devis) {
      // Générer le PDF
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', waAccount.user_id)
        .single();

      if (user) {
        const pdfResult = await pdfService.generateDevisPDF(devis, user);
        
        // Mettre à jour avec le chemin du PDF
        await supabase
          .from('devis')
          .update({ pdf_path: pdfResult.pdfPath })
          .eq('id', devis.id);

        // Envoyer le PDF au client
        await whatsappService.sendDocument(
          contactPhone,
          pdfResult.pdfUrl,
          `devis-${devis.id}.pdf`,
          'Voici votre devis. N\'hésitez pas à nous contacter pour toute question.',
          waAccount.phone_number_id
        );
      }
    }

  } catch (error) {
    console.error('Error creating devis from intentions:', error);
  }
}

export default router;

