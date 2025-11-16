import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { Send, FileText } from 'lucide-react';

export default function ConversationView({ conversation: initialConversation }) {
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    // Polling pour nouveaux messages (simplifié pour MVP)
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  const loadMessages = async () => {
    try {
      const response = await api.get(`/api/v1/conversations/${conversation.id}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post('/api/v1/wa/send', {
        phone: conversation.contact_phone,
        message: newMessage,
        conversation_id: conversation.id,
      });
      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleCreateDevis = async () => {
    try {
      // Récupérer les messages pour extraire les produits mentionnés
      // Pour le MVP, on crée un devis simple
      const response = await api.post('/api/v1/devis', {
        conversation_id: conversation.id,
        contact_phone: conversation.contact_phone,
        contact_name: conversation.contact_name,
        items: [
          {
            title: 'Produit exemple',
            quantity: 1,
            price: 0,
          },
        ],
        tax: 0,
        currency: 'MGA',
      });
      
      alert('Devis créé avec succès');
      navigate('/devis');
    } catch (error) {
      console.error('Error creating devis:', error);
      alert('Erreur lors de la création du devis');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/conversations')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              ← Retour
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {conversation.contact_name || conversation.contact_phone}
            </h2>
            <p className="text-sm text-gray-500">{conversation.contact_phone}</p>
          </div>
          <button
            onClick={handleCreateDevis}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Créer un devis
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center py-8">Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun message</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'in' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.direction === 'in'
                    ? 'bg-white text-gray-900'
                    : 'bg-primary-600 text-white'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.direction === 'in' ? 'text-gray-500' : 'text-primary-100'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

