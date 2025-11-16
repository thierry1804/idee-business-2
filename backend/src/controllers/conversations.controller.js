import { supabase } from '../models/supabase.js';

/**
 * GET /api/v1/conversations - Liste des conversations
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.uid;
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Récupérer les conversations via whatsapp_accounts
    let query = supabase
      .from('conversations')
      .select(`
        *,
        whatsapp_accounts!inner(
          id,
          wa_number,
          user_id
        )
      `, { count: 'exact' })
      .eq('whatsapp_accounts.user_id', user.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error('Conversations fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Nettoyer les données (retirer la structure nested)
    const cleanedConversations = (conversations || []).map(conv => ({
      ...conv,
      wa_account: conv.whatsapp_accounts,
    }));
    delete cleanedConversations.whatsapp_accounts;

    res.status(200).json({
      conversations: cleanedConversations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/conversations/:id - Détails d'une conversation
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.id;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        whatsapp_accounts!inner(
          id,
          wa_number,
          user_id
        )
      `)
      .eq('id', conversationId)
      .eq('whatsapp_accounts.user_id', user.id)
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(200).json({
      conversation: {
        ...conversation,
        wa_account: conversation.whatsapp_accounts,
      },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/conversations/:id/messages - Messages d'une conversation
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        whatsapp_accounts!inner(
          user_id
        )
      `)
      .eq('id', conversationId)
      .eq('whatsapp_accounts.user_id', user.id)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Récupérer les messages
    const { data: messages, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Messages fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.status(200).json({
      messages: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/conversations/:id/status - Changer le statut d'une conversation
 */
export const updateConversationStatus = async (req, res) => {
  try {
    const userId = req.user.uid;
    const conversationId = req.params.id;
    const { status, prospect_status } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Vérifier que la conversation appartient à l'utilisateur
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        whatsapp_accounts!inner(
          user_id
        )
      `)
      .eq('id', conversationId)
      .eq('whatsapp_accounts.user_id', user.id)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (prospect_status !== undefined) updateData.prospect_status = prospect_status;

    const { data: updatedConversation, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Conversation update error:', error);
      return res.status(500).json({ error: 'Failed to update conversation' });
    }

    res.status(200).json({ conversation: updatedConversation });
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/prospects - Liste des prospects (conversations avec statut prospect)
 */
export const getProspects = async (req, res) => {
  try {
    const userId = req.user.uid;
    const prospectStatus = req.query.prospect_status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = supabase
      .from('conversations')
      .select(`
        id,
        contact_phone,
        contact_name,
        prospect_status,
        status,
        last_message,
        last_message_at,
        created_at,
        whatsapp_accounts!inner(
          wa_number,
          user_id
        )
      `, { count: 'exact' })
      .eq('whatsapp_accounts.user_id', user.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (prospectStatus) {
      query = query.eq('prospect_status', prospectStatus);
    }

    const { data: prospects, error, count } = await query;

    if (error) {
      console.error('Prospects fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch prospects' });
    }

    res.status(200).json({
      prospects: prospects || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

