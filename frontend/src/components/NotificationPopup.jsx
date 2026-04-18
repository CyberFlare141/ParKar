import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { getAuthToken, getAuthUser } from "../auth/session";
import "./notification-popup.css";

const POPUP_STORAGE_PREFIX = "notification_popup_seen";
const POLL_INTERVAL_MS = 20000;
const AUTO_HIDE_MS = 8000;

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

function readSeenIds(storageKey) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((value) => Number(value)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeSeenIds(storageKey, ids) {
  window.sessionStorage.setItem(storageKey, JSON.stringify([...new Set(ids)].slice(-50)));
}

export default function NotificationPopup() {
  const location = useLocation();
  const timeoutIdsRef = useRef(new Map());
  const [items, setItems] = useState([]);
  const authUser = getAuthUser();
  const authToken = getAuthToken();
  const storageKey = useMemo(
    () => `${POPUP_STORAGE_PREFIX}:${authUser?.id || "guest"}`,
    [authUser?.id],
  );

  useEffect(() => {
    const timeoutEntries = timeoutIdsRef.current;

    return () => {
      timeoutEntries.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutEntries.clear();
    };
  }, []);

  useEffect(() => {
    if (!authToken || !authUser?.id) {
      return undefined;
    }

    let cancelled = false;

    const dismissNotification = async (notificationId) => {
      setItems((currentItems) => currentItems.filter((item) => item.id !== notificationId));

      const timeoutId = timeoutIdsRef.current.get(notificationId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutIdsRef.current.delete(notificationId);
      }

      const seenIds = readSeenIds(storageKey);
      if (!seenIds.includes(notificationId)) {
        writeSeenIds(storageKey, [...seenIds, notificationId]);
      }

      try {
        await client.patch(ENDPOINTS.NOTIFICATION_READ(notificationId), null, {
          skipAuthRedirect: true,
        });
      } catch {
        // Leave the popup dismissed locally if the sync request fails.
      }
    };

    const scheduleAutoHide = (notificationId) => {
      if (timeoutIdsRef.current.has(notificationId)) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        dismissNotification(notificationId);
      }, AUTO_HIDE_MS);

      timeoutIdsRef.current.set(notificationId, timeoutId);
    };

    const fetchNotifications = async () => {
      try {
        const response = await client.get(ENDPOINTS.NOTIFICATIONS, {
          params: { limit: 5 },
          skipAuthRedirect: true,
        });
        const seenIds = readSeenIds(storageKey);
        const unreadItems = Array.isArray(response?.data?.data)
          ? response.data.data.filter(
              (item) => item && !item.is_read && !seenIds.includes(Number(item.id)),
            )
          : [];

        if (cancelled || unreadItems.length === 0) {
          return;
        }

        setItems((currentItems) => {
          const existingIds = new Set(currentItems.map((item) => item.id));
          const nextItems = [...currentItems];

          unreadItems.forEach((item) => {
            const normalizedId = Number(item.id);
            if (!existingIds.has(normalizedId)) {
              nextItems.unshift({ ...item, id: normalizedId });
              scheduleAutoHide(normalizedId);
            }
          });

          return nextItems.slice(0, 3);
        });
      } catch {
        // Ignore transient polling failures and keep current popups visible.
      }
    };

    fetchNotifications();

    const intervalId = window.setInterval(fetchNotifications, POLL_INTERVAL_MS);
    const handleSessionChange = () => {
      fetchNotifications();
    };

    window.addEventListener("auth-session-changed", handleSessionChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("auth-session-changed", handleSessionChange);
    };
  }, [authToken, authUser?.id, location.pathname, storageKey]);

  if (!authToken || items.length === 0) {
    return null;
  }

  return (
    <aside className="notif-popup-stack" aria-live="polite" aria-label="Notifications">
      {items.map((item) => (
        <article key={item.id} className="notif-popup-card">
          <div className="notif-popup-head">
            <p className="notif-popup-title">{item.title}</p>
            <button
              type="button"
              className="notif-popup-close"
              onClick={() => {
                const timeoutId = timeoutIdsRef.current.get(item.id);
                if (timeoutId) {
                  window.clearTimeout(timeoutId);
                  timeoutIdsRef.current.delete(item.id);
                }

                const seenIds = readSeenIds(storageKey);
                writeSeenIds(storageKey, [...seenIds, item.id]);
                setItems((currentItems) => currentItems.filter((entry) => entry.id !== item.id));
                client.patch(ENDPOINTS.NOTIFICATION_READ(item.id), null, {
                  skipAuthRedirect: true,
                }).catch(() => {});
              }}
              aria-label={`Dismiss ${item.title}`}
            >
              x
            </button>
          </div>
          <p className="notif-popup-message">{item.message}</p>
          <div className="notif-popup-foot">
            <span>{formatDateTime(item.created_at)}</span>
            <Link
              to="/notifications"
              className="notif-popup-link"
              onClick={() => {
                const seenIds = readSeenIds(storageKey);
                writeSeenIds(storageKey, [...seenIds, item.id]);
                client.patch(ENDPOINTS.NOTIFICATION_READ(item.id), null, {
                  skipAuthRedirect: true,
                }).catch(() => {});
              }}
            >
              View all
            </Link>
          </div>
        </article>
      ))}
    </aside>
  );
}
