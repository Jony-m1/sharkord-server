import type { TNotificationClickListener, TNotifier } from './types';

const listeners = new Set<TNotificationClickListener>();

const isSupported = () => 'Notification' in window;

export const webNotifier: TNotifier = {
  requestPermission: async () => {
    if (!isSupported()) {
      return false;
    }

    const permission = await Notification.requestPermission();

    return permission === 'granted';
  },
  show: ({ title, body, icon, image, target }) => {
    if (!isSupported() || Notification.permission !== 'granted') {
      return;
    }

    // image is a preview some platforms show; it is not in the dom typings yet
    const notification = new Notification(title, {
      body,
      icon,
      image
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();

      if (!target) {
        return;
      }

      for (const listener of listeners) {
        listener(target);
      }
    };
  },
  onClick: (listener) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }
};
