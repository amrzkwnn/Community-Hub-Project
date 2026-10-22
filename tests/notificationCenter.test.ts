import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Community Notification Centre & Access Control', () => {
  interface NotificationItem {
    id: string;
    recipientId: string;
    senderId?: string;
    type: string;
    title: string;
    content: string;
    priority: 'normal' | 'urgent' | 'critical';
    targetTab?: string;
    targetId?: string;
    isRead: boolean;
    createdAt: string;
  }

  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      recipientId: 'all',
      type: 'verified_incident_alert',
      title: '🚨 BENCANA DISAHKAN: Banjir Kilat di Persiaran Elmina',
      content: 'Takungan air sedalam 0.4m dikesan berhampiran jambatan Elmina Green 1.',
      priority: 'critical',
      targetTab: 'resilience',
      targetId: 'inc-1',
      isRead: false,
      createdAt: '2026-10-16T10:00:00Z',
    },
    {
      id: 'notif-2',
      recipientId: 'user-huda',
      senderId: 'user-vikram',
      type: 'message_request',
      title: 'Permintaan Mesej Peribadi Baharu',
      content: 'Permintaan mesej untuk No. 24, Jalan Elmina Green 3/1.',
      priority: 'normal',
      targetTab: 'messages',
      targetId: 'req-1',
      isRead: false,
      createdAt: '2026-10-16T11:00:00Z',
    },
    {
      id: 'notif-3',
      recipientId: 'user-vikram',
      type: 'official_announcement',
      title: 'Kerja Pembaikan Paip Air Air Selangor',
      content: 'Bekalan air akan dipulihkan secara berperingkat menjelang jam 6 petang.',
      priority: 'urgent',
      targetTab: 'feed',
      targetId: 'post-1',
      isRead: true,
      createdAt: '2026-10-16T09:00:00Z',
    },
  ];

  it('correctly filters notifications for a specific resident and includes broadcast alerts', () => {
    const currentUserId = 'user-huda';
    const accessible = sampleNotifications.filter(
      (n) => n.recipientId === currentUserId || n.recipientId === 'all'
    );

    // user-huda should see notif-1 (broadcast 'all') and notif-2 (recipient 'user-huda'), but NOT notif-3 ('user-vikram')
    assert.strictEqual(accessible.length, 2);
    assert.strictEqual(accessible.some((n) => n.id === 'notif-1'), true);
    assert.strictEqual(accessible.some((n) => n.id === 'notif-2'), true);
    assert.strictEqual(accessible.some((n) => n.id === 'notif-3'), false);
  });

  it('identifies urgent official alerts and distinguishes them from normal notifications', () => {
    const alerts = sampleNotifications.filter(
      (n) => n.type === 'verified_incident_alert' || n.priority === 'critical'
    );

    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].id, 'notif-1');
    assert.strictEqual(alerts[0].priority, 'critical');
    assert.strictEqual(alerts[0].type, 'verified_incident_alert');
  });

  it('calculates unread notification count accurately and updates upon mark-as-read', () => {
    const currentUserId = 'user-huda';
    const userNotifs = sampleNotifications.filter(
      (n) => n.recipientId === currentUserId || n.recipientId === 'all'
    );

    const initialUnread = userNotifs.filter((n) => !n.isRead).length;
    assert.strictEqual(initialUnread, 2);

    // Simulate mark as read for notif-2
    const updated = userNotifs.map((n) => (n.id === 'notif-2' ? { ...n, isRead: true } : n));
    const newUnread = updated.filter((n) => !n.isRead).length;
    assert.strictEqual(newUnread, 1);
  });
});
