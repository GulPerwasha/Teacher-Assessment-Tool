import { openDB, DBSchema, IDBPDatabase } from 'idb';
import CryptoJS from 'crypto-js';

export interface StoredObservation {
  id: string;
  studentId: string;
  teacherId: string;
  timestamp: number;
  observation: string;
  audioFile?: ArrayBuffer;
  transcription?: string;
  tags: string[];
  scores: Record<string, number>;
  sentiment?: any;
  synced: boolean;
  lastModified: number;
}

export interface StoredStudent {
  id: string;
  name: string;
  grade: string;
  classId: string;
  profileData?: any;
  lastModified: number;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'observation' | 'student' | 'report';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
  priority: 'high' | 'medium' | 'low';
}

interface TeacherAppDB extends DBSchema {
  observations: {
    key: string;
    value: StoredObservation;
    indexes: { 
      'by-student': string; 
      'by-timestamp': number;
      'by-synced': boolean;
    };
  };
  students: {
    key: string;
    value: StoredStudent;
    indexes: { 
      'by-class': string;
      'by-synced': boolean;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 
      'by-priority': string;
      'by-timestamp': number;
    };
  };
  appSettings: {
    key: string;
    value: {
      key: string;
      value: any;
      timestamp: number;
    };
  };
  audioFiles: {
    key: string;
    value: {
      id: string;
      data: ArrayBuffer;
      mimeType: string;
      size: number;
      timestamp: number;
    };
  };
}

class OfflineStorageManager {
  private db: IDBPDatabase<TeacherAppDB> | null = null;
  private encryptionKey: string;
  private isInitialized = false;

  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<TeacherAppDB>('TeacherAppDB', 2, {
        upgrade(db, oldVersion, newVersion) {
          // Observations store
          if (!db.objectStoreNames.contains('observations')) {
            const observationStore = db.createObjectStore('observations', { keyPath: 'id' });
            observationStore.createIndex('by-student', 'studentId');
            observationStore.createIndex('by-timestamp', 'timestamp');
            observationStore.createIndex('by-synced', 'synced');
          }

          // Students store
          if (!db.objectStoreNames.contains('students')) {
            const studentStore = db.createObjectStore('students', { keyPath: 'id' });
            studentStore.createIndex('by-class', 'classId');
            studentStore.createIndex('by-synced', 'synced');
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('by-priority', 'priority');
            syncStore.createIndex('by-timestamp', 'timestamp');
          }

          // App settings store
          if (!db.objectStoreNames.contains('appSettings')) {
            db.createObjectStore('appSettings', { keyPath: 'key' });
          }

          // Audio files store
          if (!db.objectStoreNames.contains('audioFiles')) {
            db.createObjectStore('audioFiles', { keyPath: 'id' });
          }
        },
      });

      this.isInitialized = true;
      console.log('Offline storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      throw error;
    }
  }

  // Observation Management
  async saveObservation(observation: Omit<StoredObservation, 'synced' | 'lastModified'>): Promise<void> {
    if (!this.db) await this.initialize();

    const storedObservation: StoredObservation = {
      ...observation,
      synced: false,
      lastModified: Date.now(),
    };

    // Encrypt sensitive data
    if (storedObservation.observation) {
      storedObservation.observation = this.encrypt(storedObservation.observation);
    }

    await this.db!.put('observations', storedObservation);
    await this.addToSyncQueue('observation', 'create', storedObservation);
  }

  async getObservation(id: string): Promise<StoredObservation | undefined> {
    if (!this.db) await this.initialize();

    const observation = await this.db!.get('observations', id);
    if (observation && observation.observation) {
      // Decrypt sensitive data
      observation.observation = this.decrypt(observation.observation);
    }
    return observation;
  }

  async getObservationsByStudent(studentId: string): Promise<StoredObservation[]> {
    if (!this.db) await this.initialize();

    const observations = await this.db!.getAllFromIndex('observations', 'by-student', studentId);
    return observations.map(obs => {
      if (obs.observation) {
        obs.observation = this.decrypt(obs.observation);
      }
      return obs;
    });
  }

  async getUnsyncedObservations(): Promise<StoredObservation[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAllFromIndex('observations', 'by-synced', false);
  }

  // Student Management
  async saveStudent(student: Omit<StoredStudent, 'synced' | 'lastModified'>): Promise<void> {
    if (!this.db) await this.initialize();

    const storedStudent: StoredStudent = {
      ...student,
      synced: false,
      lastModified: Date.now(),
    };

    await this.db!.put('students', storedStudent);
    await this.addToSyncQueue('student', 'create', storedStudent);
  }

  async getStudent(id: string): Promise<StoredStudent | undefined> {
    if (!this.db) await this.initialize();
    return await this.db!.get('students', id);
  }

  async getAllStudents(): Promise<StoredStudent[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('students');
  }

  async getStudentsByClass(classId: string): Promise<StoredStudent[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAllFromIndex('students', 'by-class', classId);
  }

  // Audio File Management
  async saveAudioFile(id: string, audioData: ArrayBuffer, mimeType: string): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.put('audioFiles', {
      id,
      data: audioData,
      mimeType,
      size: audioData.byteLength,
      timestamp: Date.now(),
    });
  }

  async getAudioFile(id: string): Promise<ArrayBuffer | undefined> {
    if (!this.db) await this.initialize();
    const file = await this.db!.get('audioFiles', id);
    return file?.data;
  }

  async deleteAudioFile(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('audioFiles', id);
  }

  // Sync Queue Management
  private async addToSyncQueue(
    type: SyncQueueItem['type'], 
    action: SyncQueueItem['action'], 
    data: any,
    priority: SyncQueueItem['priority'] = 'medium'
  ): Promise<void> {
    if (!this.db) await this.initialize();

    const queueItem: SyncQueueItem = {
      id: `${type}_${action}_${Date.now()}_${Math.random()}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
      priority,
    };

    await this.db!.put('syncQueue', queueItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('syncQueue');
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('syncQueue', id);
  }

  async incrementSyncRetries(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    const item = await this.db!.get('syncQueue', id);
    if (item) {
      item.retries += 1;
      await this.db!.put('syncQueue', item);
    }
  }

  // Settings Management
  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.put('appSettings', {
      key,
      value,
      timestamp: Date.now(),
    });
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) await this.initialize();
    const setting = await this.db!.get('appSettings', key);
    return setting?.value;
  }

  // Utility Methods
  async getStorageStats(): Promise<{
    observations: number;
    students: number;
    syncQueue: number;
    audioFiles: number;
    totalSize: number;
  }> {
    if (!this.db) await this.initialize();

    const [observations, students, syncQueue, audioFiles] = await Promise.all([
      this.db!.count('observations'),
      this.db!.count('students'),
      this.db!.count('syncQueue'),
      this.db!.count('audioFiles'),
    ]);

    // Estimate storage size
    const estimate = await navigator.storage?.estimate();
    const totalSize = estimate?.usage || 0;

    return {
      observations,
      students,
      syncQueue,
      audioFiles,
      totalSize,
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize();

    const tx = this.db!.transaction(['observations', 'students', 'syncQueue', 'audioFiles', 'appSettings'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('observations').clear(),
      tx.objectStore('students').clear(),
      tx.objectStore('syncQueue').clear(),
      tx.objectStore('audioFiles').clear(),
      tx.objectStore('appSettings').clear(),
    ]);

    await tx.done;
  }

  async markAsSynced(type: 'observation' | 'student', id: string): Promise<void> {
    if (!this.db) await this.initialize();

    if (type === 'observation') {
      const observation = await this.db!.get('observations', id);
      if (observation) {
        observation.synced = true;
        await this.db!.put('observations', observation);
      }
    } else if (type === 'student') {
      const student = await this.db!.get('students', id);
      if (student) {
        student.synced = true;
        await this.db!.put('students', student);
      }
    }
  }

  // Encryption/Decryption Methods
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return encryptedText; // Return as-is if decryption fails (backwards compatibility)
    }
  }

  private getOrCreateEncryptionKey(): string {
    let key = localStorage.getItem('teacher-app-encryption-key');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(256/8).toString();
      localStorage.setItem('teacher-app-encryption-key', key);
    }
    return key;
  }

  // Export/Import functionality
  async exportData(): Promise<string> {
    if (!this.db) await this.initialize();

    const [observations, students, settings] = await Promise.all([
      this.db!.getAll('observations'),
      this.db!.getAll('students'),
      this.db!.getAll('appSettings'),
    ]);

    // Decrypt observations for export
    const decryptedObservations = observations.map(obs => ({
      ...obs,
      observation: obs.observation ? this.decrypt(obs.observation) : obs.observation,
    }));

    const exportData = {
      observations: decryptedObservations,
      students,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const data = JSON.parse(jsonData);
      
      const tx = this.db!.transaction(['observations', 'students', 'appSettings'], 'readwrite');
      
      // Import observations
      if (data.observations) {
        for (const obs of data.observations) {
          // Encrypt observation before storing
          if (obs.observation) {
            obs.observation = this.encrypt(obs.observation);
          }
          await tx.objectStore('observations').put(obs);
        }
      }

      // Import students
      if (data.students) {
        for (const student of data.students) {
          await tx.objectStore('students').put(student);
        }
      }

      // Import settings
      if (data.settings) {
        for (const setting of data.settings) {
          await tx.objectStore('appSettings').put(setting);
        }
      }

      await tx.done;
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

// Utility functions
export async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  
  try {
    // Try to fetch a small resource to verify connectivity
    const response = await fetch('/api/health', { 
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 5000 
    } as any);
    return response.ok;
  } catch {
    return false;
  }
}

export function addConnectionListener(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}