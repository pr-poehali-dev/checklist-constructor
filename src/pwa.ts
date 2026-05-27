// PWA: регистрация Service Worker + offline queue

const QUEUE_KEY = 'cf_offline_queue';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[SW] registered:', reg.scope);

        // Слушаем сообщение о синхронизации
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_QUEUE') {
            flushOfflineQueue();
          }
        });
      }).catch((err) => {
        console.warn('[SW] registration failed:', err);
      });
    });

    // При восстановлении сети — пробуем отправить кэш
    window.addEventListener('online', () => {
      flushOfflineQueue();
    });
  }
}

export interface OfflineQueueItem {
  id: string;
  assignment_id: number;
  responses: object[];
  timestamp: number;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  };
  // Заменяем если уже есть для этого assignment
  const filtered = queue.filter((q) => q.assignment_id !== item.assignment_id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...filtered, newItem]));
  return newItem;
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter((q) => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const token = localStorage.getItem('cf_token');
  if (!token) return;

  // Импортируем динамически чтобы избежать циклических зависимостей
  const { apiSubmitAssignment } = await import('./api');

  for (const item of queue) {
    try {
      const result = await apiSubmitAssignment(item.assignment_id, item.responses as import('./api').ItemResponse[]);
      if (!('errors' in result)) {
        removeFromOfflineQueue(item.id);
        console.log('[SW] synced assignment', item.assignment_id);
      }
    } catch (e) {
      console.warn('[SW] sync failed for', item.assignment_id, e);
    }
  }

  // Уведомляем UI
  window.dispatchEvent(new CustomEvent('cf:queue-synced'));
}

export function isOnline() {
  return navigator.onLine;
}