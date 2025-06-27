import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Edit3, Trash2, Calendar, LogOut, User, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { offlineManager } from '../lib/offline';
import { OfflineIndicator } from './OfflineIndicator';
import { ThemeToggle } from './ThemeToggle';
import { InstallPrompt } from './InstallPrompt';
import type { Database } from '../lib/supabase';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];

const categoryColors = {
  work: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  personal: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  learning: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  health: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700'
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

interface GroupedAccomplishments {
  [date: string]: Accomplishment[];
}

const ITEMS_PER_PAGE = 10;

export function AccomplishmentApp({ onSignOut, userEmail }: AccomplishmentAppProps) {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Accomplishment['category']>('work');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize offline manager
  useEffect(() => {
    offlineManager.init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync when coming back online
      offlineManager.syncPendingOperations();
      // Reload data from server
      loadAccomplishments();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentPage]);

  // Load accomplishments from Supabase or cache
  useEffect(() => {
    loadAccomplishments();
  }, [currentPage]);

  const loadAccomplishments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isOnline) {
        // Try to load from Supabase
        try {
          // Get total count
          const { count } = await supabase
            .from('accomplishments')
            .select('*', { count: 'exact', head: true });

          setTotalCount(count || 0);

          // Get paginated data
          const { data, error } = await supabase
            .from('accomplishments')
            .select('*')
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

          if (error) throw error;
          
          setAccomplishments(data || []);
          
          // Cache the data
          if (data) {
            await offlineManager.cacheAccomplishments(data);
          }
        } catch (error) {
          console.error('Error loading from Supabase, falling back to cache:', error);
          await loadFromCache(user.id);
        }
      } else {
        // Load from cache when offline
        await loadFromCache(user.id);
      }
    } catch (error) {
      console.error('Error loading accomplishments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFromCache = async (userId: string) => {
    const cached = await offlineManager.getCachedAccomplishments(userId, currentPage, ITEMS_PER_PAGE);
    setAccomplishments(cached.data);
    setTotalCount(cached.total);
  };

  const addAccomplishment = async () => {
    if (!newAccomplishment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accomplishment = await offlineManager.addAccomplishment({
        text: newAccomplishment.trim(),
        category: selectedCategory,
        user_id: user.id
      });
      
      // If we're on the first page, add the new item to the list
      if (currentPage === 1) {
        setAccomplishments(prev => [accomplishment, ...prev.slice(0, ITEMS_PER_PAGE - 1)]);
      }
      
      setTotalCount(prev => prev + 1);
      setNewAccomplishment('');
    } catch (error) {
      console.error('Error adding accomplishment:', error);
    }
  };

  const deleteAccomplishment = async (id: string) => {
    try {
      await offlineManager.deleteAccomplishment(id);
      
      setAccomplishments(prev => prev.filter(a => a.id !== id));
      setTotalCount(prev => prev - 1);
      
      // If current page becomes empty and it's not the first page, go to previous page
      if (accomplishments.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
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
      await offlineManager.updateAccomplishment(editingId, editText.trim());
      
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupAccomplishmentsByDate = (accomplishments: Accomplishment[]): GroupedAccomplishments => {
    return accomplishments.reduce((groups, accomplishment) => {
      const date = new Date(accomplishment.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(accomplishment);
      return groups;
    }, {} as GroupedAccomplishments);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const groupedAccomplishments = groupAccomplishmentsByDate(accomplishments);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with User Info */}
        <div className="text-center mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-slate-600 dark:text-slate-400 mr-3" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Daily Wins</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">{userEmail}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">{today}</p>
        </div>

        {/* Add New Accomplishment */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.keys(categoryColors).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as Accomplishment['category'])}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                    selectedCategory === category 
                      ? categoryColors[category as Accomplishment['category']]
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <input
                type="text"
                value={newAccomplishment}
                onChange={(e) => setNewAccomplishment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAccomplishment()}
                placeholder="What did you accomplish today?"
                className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
              />
              <button
                onClick={addAccomplishment}
                disabled={!newAccomplishment.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
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
              <CheckCircle2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">No accomplishments yet.</p>
              <p className="text-slate-400 dark:text-slate-500">Start by adding what you've achieved!</p>
            </div>
          ) : (
            <>
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
              
              {/* Grouped Timeline items */}
              <div className="space-y-8">
                {Object.entries(groupedAccomplishments).map(([dateString, dayAccomplishments]) => (
                  <div key={dateString} className="space-y-6">
                    {/* Date Header */}
                    <div className="flex items-center space-x-4">
                      <div className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-sm border border-slate-200 dark:border-slate-700 z-10 relative">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                          {formatDate(dayAccomplishments[0].created_at)}
                        </h3>
                      </div>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>

                    {/* Accomplishments for this date */}
                    <div className="space-y-6 ml-0 sm:ml-8">
                      {dayAccomplishments.map((accomplishment) => {
                        const CategoryIcon = categoryIcons[accomplishment.category];
                        
                        return (
                          <div key={accomplishment.id} className="relative flex items-start space-x-6">
                            {/* Timeline dot */}
                            <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shadow-sm flex-shrink-0 ${
                              accomplishment.category === 'work' ? 'bg-blue-500' :
                              accomplishment.category === 'personal' ? 'bg-green-500' :
                              accomplishment.category === 'learning' ? 'bg-purple-500' : 'bg-pink-500'
                            }`}>
                              <CategoryIcon className="w-5 h-5 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 group hover:shadow-md transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[accomplishment.category]}`}>
                                      {accomplishment.category}
                                    </span>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {formatTime(accomplishment.created_at)}
                                    </div>
                                  </div>
                                  
                                  {editingId === accomplishment.id ? (
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                      <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        autoFocus
                                      />
                                      <div className="flex space-x-2">
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
                                    </div>
                                  ) : (
                                    <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed break-words">
                                      {accomplishment.text}
                                    </p>
                                  )}
                                </div>

                                {editingId !== accomplishment.id && (
                                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
                                    <button
                                      onClick={() => startEditing(accomplishment.id, accomplishment.text)}
                                      className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteAccomplishment(accomplishment.id)}
                                      className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} accomplishments
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {accomplishments.length > 0 && (
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Current Page Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(categoryColors).map(category => {
                const count = accomplishments.filter(a => a.category === category).length;
                return (
                  <div key={category} className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      category === 'work' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      category === 'personal' ? 'bg-green-100 dark:bg-green-900/30' :
                      category === 'learning' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-pink-100 dark:bg-pink-900/30'
                    }`}>
                      <span className={`text-xl font-bold ${
                        category === 'work' ? 'text-blue-600 dark:text-blue-400' :
                        category === 'personal' ? 'text-green-600 dark:text-green-400' :
                        category === 'learning' ? 'text-purple-600 dark:text-purple-400' : 'text-pink-600 dark:text-pink-400'
                      }`}>
                        {count}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{category}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Credits */}
        <div className="mt-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-slate-600 dark:text-slate-400">
              Developed with ❤️ by{' '}
              <a
                href="https://jawaid.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Jawaid
              </a>
            </div>
            
            <a
              href="https://bolt.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Built with Bolt.new</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Install Prompt */}
      <InstallPrompt />
    </div>
  );
}