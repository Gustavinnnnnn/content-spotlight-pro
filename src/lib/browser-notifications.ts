export const browserNotificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

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