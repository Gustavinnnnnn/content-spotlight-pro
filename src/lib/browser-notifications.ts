export const browserNotificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

export const canUseServiceWorkerNotifications = () => typeof window !== "undefined" && "serviceWorker" in navigator;

export const browserNotificationPermission = () => {
  if (!browserNotificationsSupported()) return "unsupported" as const;
  return Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (!browserNotificationsSupported()) return "unsupported" as const;
  return await Notification.requestPermission();
};

export const showBrowserNotification = ({
  title,
  body,
  url,
  icon,
  badge,
  image,
}: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  image?: string;
}) => {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return null;

  const options = {
    body,
    icon,
    badge,
    image,
    data: { url },
    tag: url || title,
  };

  if (canUseServiceWorkerNotifications()) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        const fallback = new Notification(title, options);

        if (url) {
          fallback.onclick = () => {
            window.focus();
            window.location.href = url;
          };
        }
      });

    return true;
  }

  const notification = new Notification(title, options);

  if (url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }

  return notification;
};