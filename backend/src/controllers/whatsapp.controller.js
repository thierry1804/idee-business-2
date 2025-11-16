import { supabase } from '../models/supabase.js';
import whatsappService from '../services/whatsapp.service.js';

/**
 * POST /api/v1/wa/send - Envoyer un message WhatsApp manuel
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { phone, message, conversation_id } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Récupérer le compte WhatsApp de l'utilisateur
    const { data: waAccount } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!waAccount) {
      return res.status(404).json({ error: 'WhatsApp account not configured' });
    }

    // Envoyer le message via WhatsApp
    const result = await whatsappService.sendTextMessage(
      phone,
      message,
      waAccount.phone_number_id
    );

    // Si conversation_id fourni, stocker le message
    if (conversation_id) {
      await supabase
        .from('messages')
        .insert({
          conversation_id,
          direction: 'out',
          content: message,
          message_type: 'text',
          timestamp: new Date(),
          wa_message_id: result.messageId,
          metadata: {
            sent_manually: true,
          },
        });

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({
          last_message: message.substring(0, 200),
          last_message_at: new Date(),
          updated_at: new Date(),
        })
        .eq('id', conversation_id);
    }

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

