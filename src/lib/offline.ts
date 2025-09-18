import { supabase } from './supabase';
import type { Database } from './supabase';

type Accomplishment = Database['public']['Tables']['accomplishments']['Row'];
type AccomplishmentInsert = Database['public']['Tables']['accomplishments']['Insert'];

interface PendingAccomplishment extends Omit<AccomplishmentInsert, 'user_id'> {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

interface PendingUpdate {
  id: string;
  text: string;
  synced: boolean;
}

interface PendingDelete {
  id: string;
  synced: boolean;
}

class OfflineManager {
  private dbName = 'DailyWinsDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for cached accomplishments
        if (!db.objectStoreNames.contains('accomplishments')) {
          const accomplishmentsStore = db.createObjectStore('accomplishments', { keyPath: 'id' });
          accomplishmentsStore.createIndex('user_id', 'user_id', { unique: false });
          accomplishmentsStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Store for pending operations
        if (!db.objectStoreNames.contains('pending_accomplishments')) {
          db.createObjectStore('pending_accomplishments', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('pending_updates')) {
          db.createObjectStore('pending_updates', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('pending_deletes')) {
          db.createObjectStore('pending_deletes', { keyPath: 'id' });
        }

        // Store for app metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Cache accomplishments locally
  async cacheAccomplishments(accomplishments: Accomplishment[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['accomplishments'], 'readwrite');
    const store = transaction.objectStore('accomplishments');

    for (const accomplishment of accomplishments) {
      await store.put(accomplishment);
    }
  }

  // Get cached accomplishments
  async getCachedAccomplishments(userId: string, page: number = 1, limit: number = 10): Promise<{ data: Accomplishment[], total: number }> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['accomplishments'], 'readonly');
      const store = transaction.objectStore('accomplishments');
      const index = store.index('user_id');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const allAccomplishments = request.result
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = allAccomplishments.slice(startIndex, endIndex);

        resolve({
          data: paginatedData,
          total: allAccomplishments.length
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Add accomplishment (online or offline)
  async addAccomplishment(accomplishment: Omit<AccomplishmentInsert, 'id'>): Promise<Accomplishment> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newAccomplishment: PendingAccomplishment = {
      ...accomplishment,
      id,
      created_at: now,
      updated_at: now,
      synced: false
    };

    // Try to add online first
    if (navigator.onLine) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('accomplishments')
          .insert({
            ...accomplishment,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Cache the successfully synced accomplishment
        await this.cacheAccomplishments([data]);
        return data;
      } catch (error) {
        console.log('Failed to add online, storing offline:', error);
      }
    }

    // Store offline
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_accomplishments'], 'readwrite');
    const store = transaction.objectStore('pending_accomplishments');
    await store.add(newAccomplishment);

    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-accomplishments');
    }

    return newAccomplishment as Accomplishment;
  }

  // Update accomplishment
  async updateAccomplishment(id: string, text: string, createdAt?: string): Promise<void> {
    // Try to update online first
    if (navigator.onLine) {
      try {
        const updateData: any = { text };
        if (createdAt) {
          updateData.created_at = createdAt;
          updateData.updated_at = new Date().toISOString();
        }
        
        const { error } = await supabase
          .from('accomplishments')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        // Update cached version
        await this.updateCachedAccomplishment(id, text, createdAt);
        return;
      } catch (error) {
        console.log('Failed to update online, storing offline:', error);
      }
    }

    // Store update for later sync
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_updates'], 'readwrite');
    const store = transaction.objectStore('pending_updates');
    await store.put({ id, text, synced: false });

    // Update cached version optimistically
    await this.updateCachedAccomplishment(id, text, createdAt);

    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-accomplishments');
    }
  }

  // Delete accomplishment
  async deleteAccomplishment(id: string): Promise<void> {
    // Try to delete online first
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('accomplishments')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Remove from cache
        await this.removeCachedAccomplishment(id);
        return;
      } catch (error) {
        console.log('Failed to delete online, storing offline:', error);
      }
    }

    // Store delete for later sync
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_deletes'], 'readwrite');
    const store = transaction.objectStore('pending_deletes');
    await store.put({ id, synced: false });

    // Remove from cache optimistically
    await this.removeCachedAccomplishment(id);

    // Register for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-accomplishments');
    }
  }

  // Sync pending operations
  async syncPendingOperations(): Promise<void> {
    if (!navigator.onLine || !this.db) return;

    try {
      // Sync pending accomplishments
      await this.syncPendingAccomplishments();
      
      // Sync pending updates
      await this.syncPendingUpdates();
      
      // Sync pending deletes
      await this.syncPendingDeletes();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async syncPendingAccomplishments(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pending_accomplishments'], 'readwrite');
    const store = transaction.objectStore('pending_accomplishments');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pending = request.result;
        
        for (const accomplishment of pending) {
          try {
            const { data, error } = await supabase
              .from('accomplishments')
              .insert({
                text: accomplishment.text,
                category: accomplishment.category,
                user_id: accomplishment.user_id
              })
              .select()
              .single();

            if (error) throw error;

            // Remove from pending and add to cache
            await store.delete(accomplishment.id);
            await this.cacheAccomplishments([data]);
          } catch (error) {
            console.log('Failed to sync accomplishment:', error);
          }
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async syncPendingUpdates(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pending_updates'], 'readwrite');
    const store = transaction.objectStore('pending_updates');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pending = request.result;
        
        for (const update of pending) {
          try {
            const { error } = await supabase
              .from('accomplishments')
              .update({ text: update.text })
              .eq('id', update.id);

            if (error) throw error;

            // Remove from pending
            await store.delete(update.id);
          } catch (error) {
            console.log('Failed to sync update:', error);
          }
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async syncPendingDeletes(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['pending_deletes'], 'readwrite');
    const store = transaction.objectStore('pending_deletes');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pending = request.result;
        
        for (const deleteOp of pending) {
          try {
            const { error } = await supabase
              .from('accomplishments')
              .delete()
              .eq('id', deleteOp.id);

            if (error) throw error;

            // Remove from pending
            await store.delete(deleteOp.id);
          } catch (error) {
            console.log('Failed to sync delete:', error);
          }
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async updateCachedAccomplishment(id: string, text: string, createdAt?: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['accomplishments'], 'readwrite');
    const store = transaction.objectStore('accomplishments');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const accomplishment = request.result;
        if (accomplishment) {
          accomplishment.text = text;
          if (createdAt) {
            accomplishment.created_at = createdAt;
          }
          accomplishment.updated_at = new Date().toISOString();
          await store.put(accomplishment);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async removeCachedAccomplishment(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['accomplishments'], 'readwrite');
    const store = transaction.objectStore('accomplishments');
    await store.delete(id);
  }

  // Check if app is in offline mode
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Get sync status
  async getSyncStatus(): Promise<{ pendingCount: number }> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_accomplishments', 'pending_updates', 'pending_deletes'], 'readonly');
    
    const [pendingAccomplishments, pendingUpdates, pendingDeletes] = await Promise.all([
      this.getStoreCount(transaction.objectStore('pending_accomplishments')),
      this.getStoreCount(transaction.objectStore('pending_updates')),
      this.getStoreCount(transaction.objectStore('pending_deletes'))
    ]);

    return {
      pendingCount: pendingAccomplishments + pendingUpdates + pendingDeletes
    };
  }

  private getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineManager = new OfflineManager();