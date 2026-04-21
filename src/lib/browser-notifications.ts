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
}: {
  title: string;
  body: string;
  url?: string;
}) => {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return null;

  if (canUseServiceWorkerNotifications()) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { url },
        tag: url || title,
      }))
      .catch(() => {
        const fallback = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: url || title,
        });

        if (url) {
          fallback.onclick = () => {
            window.focus();
            window.location.href = url;
          };
        }
      });

    return true;
  }

  const notification = new Notification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: url || title,
  });

  if (url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }

  return notification;
};