'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { notifications } from '@/lib/api';
import { Notification } from '@/lib/notifications';

export function NotificationList() {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await notifications.list();
      setNotificationsList(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notifications.update(notification.id, { is_read: true });
        setNotificationsList(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  if (notificationsList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Нет уведомлений</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Уведомления ({notificationsList.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationsList.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <Checkbox
              checked={notification.is_read}
              onCheckedChange={() => markAsRead(notification)}
              disabled={notification.is_read}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notification.message}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <span>{new Date(notification.created_at).toLocaleString('ru-RU')}</span>
                <span>•</span>
                <span>{notification.sent_via.toUpperCase()}</span>
                {!notification.sent_at && (
                  <>
                    <span>•</span>
                    <span className="text-orange-600">Ожидает отправки</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <Button 
          variant="outline" 
          onClick={loadNotifications}
          className="w-full"
        >
          Обновить список
        </Button>
      </CardContent>
    </Card>
  );
}
