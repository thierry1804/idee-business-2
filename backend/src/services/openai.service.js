import OpenAI from 'openai';
import { supabase } from '../models/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

// Vérifier si OpenAI est configuré
const openaiApiKey = process.env.OPENAI_API_KEY;
const isOpenAIConfigured = openaiApiKey && !openaiApiKey.includes('your_');

let openai = null;
if (isOpenAIConfigured) {
  openai = new OpenAI({
    apiKey: openaiApiKey,
  });
  console.log('✅ OpenAI initialisé avec succès');
} else {
  console.warn('⚠️ OpenAI non configuré - les variables d\'environnement sont manquantes');
  console.warn('📝 Veuillez configurer OPENAI_API_KEY dans le fichier .env');
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

/**
 * Service OpenAI pour générer des réponses intelligentes
 */
class OpenAIService {
  /**
   * Construire le prompt system personnalisé
   */
  buildSystemPrompt(userId, language = 'fr') {
    const basePrompt = language === 'mg' 
      ? `Anao mpampiasa ara-barotra malagasy. Manome tolotra tsara, mamaly fanontaniana, ary manolotra devis raha ilaina. Be resaka, be fahasoavana, ary mifantoka amin'ny fampiroboroboana ny varotra.`
      : `Tu es un assistant commercial professionnel et poli. Tu aides les clients à trouver les produits qu'ils cherchent, réponds à leurs questions, et génères des devis quand nécessaire. Tu es concis, amical, et orienté vers la conversion.`;

    return basePrompt;
  }

  /**
   * Rechercher des produits pertinents pour une requête
   */
  async searchProducts(userId, query, limit = 5) {
    try {
      // Recherche simple par texte (pour MVP)
      // Plus tard, on pourrait utiliser des embeddings vectoriels
      const { data: products, error } = await supabase
        .from('products')
        .select('id, title, description, price, currency, stock, sku')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        console.error('Product search error:', error);
        return [];
      }

      return products || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Récupérer les FAQ de l'utilisateur
   */
  async getFAQ(userId, language = 'fr') {
    try {
      const { data: faqItems, error } = await supabase
        .from('faq_items')
        .select('question, answer')
        .eq('user_id', userId)
        .eq('language', language);

      if (error) {
        console.error('FAQ fetch error:', error);
        return [];
      }

      return faqItems || [];
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      return [];
    }
  }

  /**
   * Récupérer les messages récents d'une conversation (6 derniers)
   */
  async getRecentMessages(conversationId, limit = 6) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('direction, content, timestamp')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Messages fetch error:', error);
        return [];
      }

      // Inverser pour avoir l'ordre chronologique
      return (messages || []).reverse();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Construire le contexte pour l'IA
   */
  async buildContext(conversationId, userId, language = 'fr') {
    const [messages, products, faq] = await Promise.all([
      this.getRecentMessages(conversationId),
      this.searchProducts(userId, ''), // Top produits par défaut
      this.getFAQ(userId, language),
    ]);

    // Construire le contexte produits
    let productsContext = '';
    if (products.length > 0) {
      productsContext = '\n\nProduits disponibles:\n';
      products.forEach((p, i) => {
        productsContext += `${i + 1}. ${p.title} - ${p.price} ${p.currency}${p.stock > 0 ? ' (En stock)' : ' (Rupture)'}\n`;
        if (p.description) {
          productsContext += `   ${p.description.substring(0, 100)}\n`;
        }
      });
    }

    // Construire le contexte FAQ
    let faqContext = '';
    if (faq.length > 0) {
      faqContext = '\n\nQuestions fréquentes:\n';
      faq.forEach((item, i) => {
        faqContext += `Q: ${item.question}\nR: ${item.answer}\n\n`;
      });
    }

    // Construire l'historique des messages
    let messagesContext = '';
    if (messages.length > 0) {
      messagesContext = '\n\nHistorique de la conversation:\n';
      messages.forEach(msg => {
        const role = msg.direction === 'in' ? 'Client' : 'Assistant';
        messagesContext += `${role}: ${msg.content}\n`;
      });
    }

    return {
      messagesContext,
      productsContext,
      faqContext,
      products,
    };
  }

  /**
   * Générer une réponse avec OpenAI
   */
  async generateResponse(conversationId, userId, userMessage, language = 'fr') {
    if (!openai) {
      throw new Error('OpenAI non configuré. Veuillez configurer OPENAI_API_KEY dans le fichier .env');
    }

    try {
      // Construire le contexte
      const context = await this.buildContext(conversationId, userId, language);

      // Construire le prompt system
      const systemPrompt = this.buildSystemPrompt(userId, language) + 
        context.productsContext + 
        context.faqContext +
        '\n\nInstructions: Réponds de manière naturelle et professionnelle. Si le client demande un devis, propose-lui de créer un devis avec les produits mentionnés.';

      // Construire les messages pour l'API
      const messages = [
        { role: 'system', content: systemPrompt },
      ];

      // Ajouter l'historique
      if (context.messagesContext) {
        // Parser l'historique pour créer des messages séparés
        const historyLines = context.messagesContext.split('\n').filter(l => l.trim());
        for (const line of historyLines) {
          if (line.startsWith('Client:')) {
            messages.push({
              role: 'user',
              content: line.replace('Client:', '').trim(),
            });
          } else if (line.startsWith('Assistant:')) {
            messages.push({
              role: 'assistant',
              content: line.replace('Assistant:', '').trim(),
            });
          }
        }
      }

      // Ajouter le message actuel
      messages.push({
        role: 'user',
        content: userMessage,
      });

      // Appel OpenAI
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';

      // Détecter les intentions
      const intentions = this.detectIntentions(userMessage, response, context.products);

      return {
        response,
        intentions,
        products: context.products,
      };
    } catch (error) {
      console.error('OpenAI error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Détecter les intentions dans le message (devis, question produit, etc.)
   */
  detectIntentions(userMessage, aiResponse, products) {
    const message = userMessage.toLowerCase();
    const response = aiResponse.toLowerCase();
    
    const intentions = {
      wantsQuote: false,
      wantsProduct: false,
      mentionedProducts: [],
      needsHuman: false,
    };

    // Détecter demande de devis
    const quoteKeywords = ['devis', 'prix', 'commande', 'acheter', 'commander', 'tarif'];
    if (quoteKeywords.some(keyword => message.includes(keyword) || response.includes(keyword))) {
      intentions.wantsQuote = true;
    }

    // Détecter mention de produits
    products.forEach(product => {
      const productTitle = product.title.toLowerCase();
      if (message.includes(productTitle) || message.includes(product.sku?.toLowerCase() || '')) {
        intentions.mentionedProducts.push(product);
        intentions.wantsProduct = true;
      }
    });

    // Détecter si escalade humaine nécessaire
    const uncertainKeywords = ['je ne sais pas', 'je ne comprends pas', 'humain', 'personne'];
    if (uncertainKeywords.some(keyword => response.includes(keyword))) {
      intentions.needsHuman = true;
    }

    return intentions;
  }
}

export default new OpenAIService();

