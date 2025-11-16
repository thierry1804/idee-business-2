import { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [faq, setFaq] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', language: 'fr' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, faqRes] = await Promise.all([
        api.get('/api/v1/settings'),
        api.get('/api/v1/faq'),
      ]);
      setSettings(settingsRes.data.settings || {});
      setFaq(faqRes.data.faq || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/api/v1/settings', settings);
      alert('Paramètres sauvegardés');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleFAQSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFAQ) {
        await api.put(`/api/v1/faq/${editingFAQ.id}`, faqForm);
      } else {
        await api.post('/api/v1/faq', faqForm);
      }
      setShowFAQModal(false);
      setEditingFAQ(null);
      setFaqForm({ question: '', answer: '', language: 'fr' });
      loadData();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteFAQ = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette FAQ ?')) return;
    
    try {
      await api.delete(`/api/v1/faq/${id}`);
      loadData();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Messages automatisés</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Message d'accueil</label>
            <textarea
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="3"
              value={settings.greeting_message || ''}
              onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Message hors heures</label>
            <textarea
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="3"
              value={settings.out_of_hours_message || ''}
              onChange={(e) => setSettings({ ...settings, out_of_hours_message: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Langue</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              value={settings.language || 'fr'}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            >
              <option value="fr">Français</option>
              <option value="mg">Malgache</option>
            </select>
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Sauvegarder
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <button
            onClick={() => {
              setEditingFAQ(null);
              setFaqForm({ question: '', answer: '', language: 'fr' });
              setShowFAQModal(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </button>
        </div>

        <div className="space-y-4">
          {faq.length === 0 ? (
            <p className="text-gray-500">Aucune FAQ</p>
          ) : (
            faq.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.question}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.answer}</p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 rounded">
                      {item.language}
                    </span>
                  </div>
                  <div className="ml-4 flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingFAQ(item);
                        setFaqForm({
                          question: item.question,
                          answer: item.answer,
                          language: item.language,
                        });
                        setShowFAQModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFAQ(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAQ Modal */}
      {showFAQModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingFAQ ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
            </h2>
            <form onSubmit={handleFAQSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Question *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Réponse *</label>
                <textarea
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="4"
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Langue</label>
                <select
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={faqForm.language}
                  onChange={(e) => setFaqForm({ ...faqForm, language: e.target.value })}
                >
                  <option value="fr">Français</option>
                  <option value="mg">Malgache</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowFAQModal(false);
                    setEditingFAQ(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingFAQ ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

