// Definitive guard: before showing a notification we ask every open window
// whether it is *right now* visible and viewing this conversation. If so, the
// user already sees the message in-app, so we suppress the notification. This
// is real-time truth and closes any race left by the server-side focus check.
const FOCUS_QUERY_TIMEOUT = 500;

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    return;
  }

  event.waitUntil(handlePush(data));
});

async function handlePush(data) {
  const conversationId = data.data && data.data.conversationId;

  if (conversationId && (await isConversationOnScreen(conversationId))) {
    return; // user is actively looking at this chat — don't notify
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data,
    // Collapse repeated messages from the same chat into one notification.
    tag: conversationId ? 'conv-' + conversationId : undefined,
    renotify: !!conversationId,
  };

  return self.registration.showNotification(data.title, options);
}

// Returns true if any visible window client reports it is viewing the chat.
async function isConversationOnScreen(conversationId) {
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  if (clientList.length === 0) return false;

  const answers = await Promise.all(
    clientList.map(function (client) {
      return askClient(client, conversationId);
    })
  );
  return answers.some(Boolean);
}

function askClient(client, conversationId) {
  return new Promise(function (resolve) {
    const channel = new MessageChannel();
    const timer = setTimeout(function () {
      resolve(false);
    }, FOCUS_QUERY_TIMEOUT);

    channel.port1.onmessage = function (event) {
      clearTimeout(timer);
      resolve(!!(event.data && event.data.viewing));
    };

    try {
      client.postMessage(
        { type: 'FOCUS_QUERY', conversationId: conversationId },
        [channel.port2]
      );
    } catch (e) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
