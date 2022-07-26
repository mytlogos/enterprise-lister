export function notify(args: { title: string; content: string }) {
  if (window.Notification && Notification.permission === "granted") {
    // eslint-disable-next-line no-new
    new Notification(args.title, {
      body: args.content,
    });
  } else {
    console.info("[Notifying]: Notification API is not available:", args);
  }
}

export function shouldRequestPermission() {
  return !!window.Notification && Notification.permission !== "granted";
}

export function notificationEnabled() {
  return window.Notification && Notification.permission === "granted";
}

export async function requestPermission() {
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
}
