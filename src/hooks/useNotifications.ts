import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/apiClient";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  event_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const data = await apiClient.getNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter((n: Notification) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
