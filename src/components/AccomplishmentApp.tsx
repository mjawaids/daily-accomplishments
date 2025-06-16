import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Edit3, Trash2, Calendar, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

const categoryColors = {
  work: 'bg-blue-100 text-blue-800 border-blue-200',
  personal: 'bg-green-100 text-green-800 border-green-200',
  learning: 'bg-purple-100 text-purple-800 border-purple-200',
  health: 'bg-pink-100 text-pink-800 border-pink-200'
};

const categoryIcons = {
  work: CheckCircle2,
  personal: CheckCircle2,
  learning: CheckCircle2,
  health: CheckCircle2
};

interface AccomplishmentAppProps {
  onSignOut: () => void;
  userEmail: string;
}

export function AccomplishmentApp({ onSignOut, userEmail }: AccomplishmentAppProps) {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Accomplishment['category']>('work');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);

  // Load accomplishments from Supabase
  useEffect(() => {
    loadAccomplishments();
  }, []);

  const loadAccomplishments = async () => {
    try {
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccomplishments(data || []);
    } catch (error) {
      console.error('Error loading accomplishments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAccomplishment = async () => {
    if (!newAccomplishment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accomplishments')
        .insert({
          text: newAccomplishment.trim(),
          category: selectedCategory,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setAccomplishments(prev => [data, ...prev]);
      setNewAccomplishment('');
    } catch (error) {
      console.error('Error adding accomplishment:', error);
    }
  };

  const deleteAccomplishment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accomplishments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAccomplishments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting accomplishment:', error);
    }
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editingId) return;

    try {
      const { error } = await supabase
        .from('accomplishments')
        .update({ text: editText.trim() })
        .eq('id', editingId);

      if (error) throw error;
      
      setAccomplishments(prev => 
        prev.map(a => a.id === editingId ? { ...a, text: editText.trim() } : a)
      );
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating accomplishment:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header with User Info */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-slate-600 mr-3" />
              <h1 className="text-3xl font-bold text-slate-800">Daily Wins</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-slate-600">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">{userEmail}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
          <p className="text-slate-600 text-lg">{today}</p>
        </div>

        {/* Add New Accomplishment */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              {Object.keys(categoryColors).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as Accomplishment['category'])}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    selectedCategory === category 
                      ? categoryColors[category as Accomplishment['category']]
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <input
                type="text"
                value={newAccomplishment}
                onChange={(e) => setNewAccomplishment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAccomplishment()}
                placeholder="What did you accomplish today?"
                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <button
                onClick={addAccomplishment}
                disabled={!newAccomplishment.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {accomplishments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No accomplishments yet today.</p>
              <p className="text-slate-400">Start by adding what you've achieved!</p>
            </div>
          ) : (
            <>
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              
              {/* Timeline items */}
              <div className="space-y-6">
                {accomplishments.map((accomplishment) => {
                  const CategoryIcon = categoryIcons[accomplishment.category];
                  
                  return (
                    <div key={accomplishment.id} className="relative flex items-start space-x-6">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow-sm ${
                        accomplishment.category === 'work' ? 'bg-blue-500' :
                        accomplishment.category === 'personal' ? 'bg-green-500' :
                        accomplishment.category === 'learning' ? 'bg-purple-500' : 'bg-pink-500'
                      }`}>
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 group hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[accomplishment.category]}`}>
                                {accomplishment.category}
                              </span>
                              <div className="flex items-center text-slate-500 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatTime(accomplishment.created_at)}
                              </div>
                            </div>
                            
                            {editingId === accomplishment.id ? (
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={saveEdit}
                                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <p className="text-slate-700 text-lg leading-relaxed">
                                {accomplishment.text}
                              </p>
                            )}
                          </div>

                          {editingId !== accomplishment.id && (
                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(accomplishment.id, accomplishment.text)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAccomplishment(accomplishment.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        {accomplishments.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Today's Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(categoryColors).map(category => {
                const count = accomplishments.filter(a => a.category === category).length;
                return (
                  <div key={category} className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      category === 'work' ? 'bg-blue-100' :
                      category === 'personal' ? 'bg-green-100' :
                      category === 'learning' ? 'bg-purple-100' : 'bg-pink-100'
                    }`}>
                      <span className={`text-xl font-bold ${
                        category === 'work' ? 'text-blue-600' :
                        category === 'personal' ? 'text-green-600' :
                        category === 'learning' ? 'text-purple-600' : 'text-pink-600'
                      }`}>
                        {count}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 capitalize">{category}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}