import { offlineStorage, SyncQueueItem, isOnline } from './offlineStorage';
import axios, { AxiosResponse } from 'axios';

export interface SyncConfig {
  apiBaseUrl: string;
  authToken?: string;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  failedItems: number;
  syncErrors: string[];
}

export type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'sync_progress';

export interface SyncEvent {
  type: SyncEventType;
  data?: any;
  error?: string;
}

class SyncManager {
  private config: SyncConfig;
  private status: SyncStatus;
  private eventListeners: Map<SyncEventType, Function[]> = new Map();
  private syncInterval: number | null = null;
  private isInitialized = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      apiBaseUrl: '/api',
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      ...config,
    };

    this.status = {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncTime: null,
      pendingItems: 0,
      failedItems: 0,
      syncErrors: [],
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await offlineStorage.initialize();
    
    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));

    // Set up automatic sync when online
    this.setupAutoSync();

    // Register service worker sync events
    this.setupServiceWorkerSync();

    this.isInitialized = true;
    console.log('Sync manager initialized');

    // Initial sync check
    this.updateSyncStatus();
  }

  // Event Management
  addEventListener(type: SyncEventType, callback: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(callback);
  }

  removeEventListener(type: SyncEventType, callback: Function): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: SyncEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  // Main sync method
  async sync(force = false): Promise<void> {
    if (this.status.isSyncing && !force) {
      console.log('Sync already in progress');
      return;
    }

    if (!await isOnline()) {
      console.log('Device is offline, skipping sync');
      return;
    }

    this.status.isSyncing = true;
    this.status.syncErrors = [];
    this.emitEvent({ type: 'sync_start' });

    try {
      await this.performSync();
      
      this.status.lastSyncTime = Date.now();
      await offlineStorage.setSetting('lastSyncTime', this.status.lastSyncTime);
      
      this.emitEvent({ type: 'sync_complete' });
      console.log('Sync completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.status.syncErrors.push(errorMessage);
      this.emitEvent({ type: 'sync_error', error: errorMessage });
      console.error('Sync failed:', error);
    } finally {
      this.status.isSyncing = false;
      await this.updateSyncStatus();
    }
  }

  private async performSync(): Promise<void> {
    const syncQueue = await offlineStorage.getSyncQueue();
    const prioritizedQueue = this.prioritizeQueue(syncQueue);

    // Process queue in batches
    for (let i = 0; i < prioritizedQueue.length; i += this.config.batchSize) {
      const batch = prioritizedQueue.slice(i, i + this.config.batchSize);
      await this.processBatch(batch);
      
      // Emit progress event
      this.emitEvent({
        type: 'sync_progress',
        data: {
          processed: Math.min(i + this.config.batchSize, prioritizedQueue.length),
          total: prioritizedQueue.length,
        },
      });
    }

    // Sync any remaining unsynced items
    await this.syncUnsyncedObservations();
    await this.syncUnsyncedStudents();
  }

  private prioritizeQueue(queue: SyncQueueItem[]): SyncQueueItem[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return queue
      .filter(item => item.retries < this.config.maxRetries)
      .sort((a, b) => {
        // Priority first
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        // Then by timestamp (older first)
        return a.timestamp - b.timestamp;
      });
  }

  private async processBatch(batch: SyncQueueItem[]): Promise<void> {
    const promises = batch.map(item => this.processSyncItem(item));
    await Promise.allSettled(promises);
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    try {
      let endpoint = '';
      let method = 'POST';
      let data = item.data;

      // Determine endpoint and method based on item type and action
      switch (item.type) {
        case 'observation':
          endpoint = '/observations';
          if (item.action === 'update') {
            endpoint = `/observations/${item.data.id}`;
            method = 'PUT';
          } else if (item.action === 'delete') {
            endpoint = `/observations/${item.data.id}`;
            method = 'DELETE';
            data = undefined;
          }
          break;

        case 'student':
          endpoint = '/students';
          if (item.action === 'update') {
            endpoint = `/students/${item.data.id}`;
            method = 'PUT';
          } else if (item.action === 'delete') {
            endpoint = `/students/${item.data.id}`;
            method = 'DELETE';
            data = undefined;
          }
          break;

        case 'report':
          endpoint = '/reports';
          if (item.action === 'update') {
            endpoint = `/reports/${item.data.id}`;
            method = 'PUT';
          }
          break;
      }

      // Make API request
      const response = await this.apiRequest(endpoint, method, data);
      
      if (response.status >= 200 && response.status < 300) {
        // Success - remove from queue and mark as synced
        await offlineStorage.removeSyncQueueItem(item.id);
        
        if (item.type === 'observation' || item.type === 'student') {
          await offlineStorage.markAsSynced(item.type, item.data.id);
        }
        
        console.log(`Successfully synced ${item.type} ${item.action}`);
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }

    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      
      // Increment retry count
      await offlineStorage.incrementSyncRetries(item.id);
      
      // Remove from queue if max retries reached
      if (item.retries + 1 >= this.config.maxRetries) {
        await offlineStorage.removeSyncQueueItem(item.id);
        this.status.failedItems++;
      }
      
      throw error;
    }
  }

  private async syncUnsyncedObservations(): Promise<void> {
    const unsyncedObservations = await offlineStorage.getUnsyncedObservations();
    
    for (const observation of unsyncedObservations) {
      try {
        const response = await this.apiRequest('/observations', 'POST', observation);
        
        if (response.status >= 200 && response.status < 300) {
          await offlineStorage.markAsSynced('observation', observation.id);
        }
      } catch (error) {
        console.error(`Failed to sync observation ${observation.id}:`, error);
      }
    }
  }

  private async syncUnsyncedStudents(): Promise<void> {
    const unsyncedStudents = await offlineStorage.getUnsyncedObservations();
    // Implementation similar to observations
  }

  private async apiRequest(endpoint: string, method: string, data?: any): Promise<AxiosResponse> {
    const config: any = {
      method,
      url: `${this.config.apiBaseUrl}${endpoint}`,
      timeout: 30000,
    };

    if (this.config.authToken) {
      config.headers = {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      };
    }

    if (data && method !== 'DELETE') {
      config.data = data;
    }

    return await axios(config);
  }

  // Status management
  private async updateSyncStatus(): Promise<void> {
    const [syncQueue, lastSyncTime] = await Promise.all([
      offlineStorage.getSyncQueue(),
      offlineStorage.getSetting('lastSyncTime'),
    ]);

    this.status.pendingItems = syncQueue.length;
    this.status.lastSyncTime = lastSyncTime;
    this.status.isOnline = await isOnline();
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Auto-sync setup
  private setupAutoSync(): void {
    // Sync every 5 minutes when online
    this.syncInterval = window.setInterval(async () => {
      if (await isOnline()) {
        await this.sync();
      }
    }, 5 * 60 * 1000);
  }

  private handleOnlineStatusChange(): void {
    this.status.isOnline = navigator.onLine;
    
    if (this.status.isOnline) {
      console.log('Device came online, triggering sync');
      // Small delay to ensure connection is stable
      setTimeout(() => this.sync(), 1000);
    } else {
      console.log('Device went offline');
    }
  }

  private setupServiceWorkerSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Register for background sync
        registration.sync.register('sync-observations');
        registration.sync.register('sync-students');
      });

      // Listen for sync messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data;
        
        if (type === 'SYNC_SUCCESS') {
          console.log(`Background sync successful for ${data}`);
          this.updateSyncStatus();
        } else if (type === 'SYNC_ERROR') {
          console.error(`Background sync failed for ${data}`);
          this.status.syncErrors.push(`Background sync failed for ${data}`);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.removeEventListener('offline', this.handleOnlineStatusChange.bind(this));

    this.eventListeners.clear();
    this.isInitialized = false;
  }

  // Manual sync triggers
  async syncObservations(): Promise<void> {
    await this.syncUnsyncedObservations();
  }

  async syncStudents(): Promise<void> {
    await this.syncUnsyncedStudents();
  }

  // Conflict resolution
  async resolveConflicts(): Promise<void> {
    // This would implement conflict resolution logic
    // For now, server wins in conflicts
    console.log('Conflict resolution not yet implemented');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Utility functions
export async function initializeSync(config?: Partial<SyncConfig>): Promise<void> {
  if (config) {
    Object.assign(syncManager['config'], config);
  }
  await syncManager.initialize();
}

export function useSyncStatus(): SyncStatus {
  return syncManager.getStatus();
}

// React hook for sync status (if using React)
export function useSync() {
  const [status, setStatus] = React.useState(syncManager.getStatus());

  React.useEffect(() => {
    const updateStatus = () => setStatus(syncManager.getStatus());

    syncManager.addEventListener('sync_start', updateStatus);
    syncManager.addEventListener('sync_complete', updateStatus);
    syncManager.addEventListener('sync_error', updateStatus);
    syncManager.addEventListener('sync_progress', updateStatus);

    return () => {
      syncManager.removeEventListener('sync_start', updateStatus);
      syncManager.removeEventListener('sync_complete', updateStatus);
      syncManager.removeEventListener('sync_error', updateStatus);
      syncManager.removeEventListener('sync_progress', updateStatus);
    };
  }, []);

  return {
    status,
    sync: syncManager.sync.bind(syncManager),
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
  };
}

// Type guard for React import
declare const React: any;