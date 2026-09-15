"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Clock, ExternalLink, ShieldCheck, X } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface NotificationItem {
  _id: string;
  recipientRole: string;
  actorName: string;
  actorRole: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell({ isVendor = false }: { isVendor?: boolean }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const endpoint = isVendor ? "/vendor/notifications" : "/admin/notifications";

  const fetchNotifications = async () => {
    try {
      const res = await fetchApi<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>(`${endpoint}?limit=25`);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      // Silent error on polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [endpoint]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`${endpoint}/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      await fetchApi(`${endpoint}/mark-all-read`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#EEF2F6] shadow-neu-raised-sm hover:shadow-neu-flat active:shadow-neu-pressed border border-white/80 text-[#1E293B] transition cursor-pointer"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#EEF2F6] rounded-2xl shadow-neu-flat border border-white/80 overflow-hidden z-50 animate-scaleUp text-xs font-sans">
          {/* Header */}
          <div className="p-3.5 border-b border-[#D9E2EC]/80 flex items-center justify-between bg-[#EEF2F6]">
            <div className="flex items-center gap-1.5 font-bold text-[#1E293B]">
              <Bell size={14} className="text-[#2563EB]" />
              <span>{isVendor ? "Carrier Alerts" : "Platform Notifications"}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-[11px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#D9E2EC]/60 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#64748B] text-xs">
                <Bell size={20} className="mx-auto text-slate-300 mb-1" />
                <p className="font-semibold">No notifications yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Real-time updates from staff and carriers will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={`p-3 transition cursor-pointer hover:bg-white/60 flex items-start gap-2.5 ${
                    n.isRead ? "opacity-75" : "bg-white/40 font-medium"
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      n.isRead ? "bg-transparent" : "bg-blue-600"
                    }`}
                  />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-[#1E293B] truncate text-xs">{n.title}</h4>
                      <span className="text-[10px] text-[#94A3B8] shrink-0 font-mono">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-[#94A3B8]">
                      <span className="font-semibold text-slate-700">By: {n.actorName}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-[#D9E2EC]/80 bg-[#EEF2F6] text-center text-[10px] text-[#64748B]">
            Synchronized with MongoDB Atlas audit logs
          </div>
        </div>
      )}
    </div>
  );
}
