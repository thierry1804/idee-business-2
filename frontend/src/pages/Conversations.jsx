import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import ConversationView from '../components/ConversationView.jsx';

export default function Conversations() {
  const { id } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversations();
    if (id) {
      loadConversation(id);
    }
  }, [id]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/api/v1/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const response = await api.get(`/api/v1/conversations/${convId}`);
      setSelectedConversation(response.data.conversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    (conv.contact_name || conv.contact_phone || '').toLowerCase().includes(search.toLowerCase())
  );

  if (id && selectedConversation) {
    return <ConversationView conversation={selectedConversation} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-6 text-center">Chargement...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Aucune conversation</div>
          ) : (
            filteredConversations.map((conv) => (
              <a
                key={conv.id}
                href={`/conversations/${conv.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {conv.contact_name || conv.contact_phone}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {conv.last_message || 'Aucun message'}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-xs text-gray-500">
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleDateString('fr-FR')
                        : ''}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                        conv.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {conv.status}
                    </span>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

