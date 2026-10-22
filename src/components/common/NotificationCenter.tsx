'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { CommunityNotification } from '@/types';
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  ShieldCheck, 
  MessageSquare, 
  Info, 
  X,
  ExternalLink,
  Clock
} from 'lucide-react';
import TimeAgo from '@/components/common/TimeAgo';

export default function NotificationCenter() {
  const { 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    setActiveTab,
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    currentUser,
    t
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'alerts'>('all');

  // Filter notifications relevant to current user or broadcast
  const userNotifications = notifications.filter(
    (n) => n.recipientId === currentUser.id || n.recipientId === 'all'
  );

  const filteredNotifications = userNotifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'alerts') return n.type === 'verified_incident_alert' || n.priority === 'critical';
    return true;
  });

  const handleNotificationClick = (notif: CommunityNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
      setIsNotificationCenterOpen(false);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical' || type === 'verified_incident_alert') {
      return (
        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'message_request' || type === 'message_reply') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'verification_status_update') {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
        <Info className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
        className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
        title="Community Notification Center"
        aria-label="Notification Center"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      {isNotificationCenterOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsNotificationCenterOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-800" />
                <span className="font-extrabold text-xs text-slate-900">
                  Notification Center
                </span>
                {unreadNotificationCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {unreadNotificationCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark All Read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-2 bg-white border-b border-slate-100 text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  activeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({userNotifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  activeFilter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Unread ({unreadNotificationCount})
              </button>
              <button
                onClick={() => setActiveFilter('alerts')}
                className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  activeFilter === 'alerts' ? 'bg-rose-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🚨 Alerts
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">No notifications in this category.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isCritical = notif.priority === 'critical' || notif.type === 'verified_incident_alert';
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                        !notif.isRead 
                          ? isCritical ? 'bg-rose-50/80 hover:bg-rose-100/70' : 'bg-emerald-50/50 hover:bg-emerald-50' 
                          : 'hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {getNotificationIcon(notif.type, notif.priority)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold truncate ${
                            isCritical ? 'text-rose-950 font-black' : 'text-slate-900'
                          }`}>
                            {notif.title}
                          </span>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-1">
                          {notif.content}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <TimeAgo date={notif.createdAt} addSuffix={true} />
                          </span>

                          {notif.targetTab && (
                            <span className="font-semibold text-emerald-800 flex items-center gap-0.5">
                              <span>View</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
