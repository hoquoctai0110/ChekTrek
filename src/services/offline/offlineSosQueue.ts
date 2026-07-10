import AsyncStorage from '@react-native-async-storage/async-storage';

import { SosPayload, sosApi } from '@services/api/sos.api';

export type QueuedSos = {
  id: string;
  payload: SosPayload;
  smsMessage: string;
  recipientPhone?: string;
  queuedAt: string;
};

const OFFLINE_SOS_QUEUE_KEY = '@chektrek/offline-sos-queue';

const readQueue = async (): Promise<QueuedSos[]> => {
  const rawQueue = await AsyncStorage.getItem(OFFLINE_SOS_QUEUE_KEY);
  if (!rawQueue) return [];

  try {
    const queue = JSON.parse(rawQueue) as QueuedSos[];
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: QueuedSos[]): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_SOS_QUEUE_KEY, JSON.stringify(queue));
};

export const offlineSosQueue = {
  enqueue: async (entry: Omit<QueuedSos, 'id' | 'queuedAt'>): Promise<QueuedSos> => {
    const queue = await readQueue();
    const queuedSos: QueuedSos = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      queuedAt: new Date().toISOString(),
    };
    await writeQueue([...queue, queuedSos]);
    console.log('[SOS] queued');
    return queuedSos;
  },

  list: readQueue,

  syncPendingSos: async (): Promise<QueuedSos[]> => {
    const queue = await readQueue();
    if (queue.length === 0) return [];

    const remainingQueue: QueuedSos[] = [];

    for (const queuedSos of queue) {
      try {
        console.log('[SOS] sync retry');
        await sosApi.sendSos(queuedSos.payload);
        console.log('[SOS] sync success');
      } catch {
        remainingQueue.push(queuedSos);
      }
    }

    await writeQueue(remainingQueue);
    return remainingQueue;
  },
};
