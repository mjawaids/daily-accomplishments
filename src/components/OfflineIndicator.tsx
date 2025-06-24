import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, FolderSync as Sync, AlertCircle } from 'lucide-react';
import { offlineManager } from '../lib/offline';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ pendingCount: 0 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check sync status periodically
    const checkSyncStatus = async () => {
      const status = await offlineManager.getSyncStatus();
      setSyncStatus(status);
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      await offlineManager.syncPendingOperations();
      const status = await offlineManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && syncStatus.pendingCount === 0) {
    return null; // Don't show indicator when online and synced
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg border transition-all ${
        isOnline 
          ? 'bg-blue-50 border-blue-200 text-blue-800'
          : 'bg-orange-50 border-orange-200 text-orange-800'
      }`}>
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {syncStatus.pendingCount > 0 && (
          <>
            <div className="w-px h-4 bg-current opacity-30" />
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {syncStatus.pendingCount} pending
              </span>
            </div>
          </>
        )}

        {isOnline && syncStatus.pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            <Sync className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}
      </div>
    </div>
  );
}