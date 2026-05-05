"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

// Lấy userId từ JWT token (decode payload)
function getUserId(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? payload.id ?? null;
  } catch { return null; }
}

export function useAgentNotification() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const socket = io(`${BASE}/agent`, { transports: ["websocket"] });
    socketRef.current = socket;

    // Khi agent mua thành công
    socket.on(`buy:${userId}`, (data: { coin: string; amountUsdt: number; avgPrice: number }) => {
      // Browser notification (nếu đã cấp quyền)
      if (Notification.permission === "granted") {
        new Notification(`✅ Dip Buy Agent`, {
          body: `Đã mua $${data.amountUsdt} ${data.coin} @ $${data.avgPrice.toFixed(2)}`,
          icon: "/favicon.ico",
        });
      }

      // Toast trong app
      showToast(`✅ Mua $${data.amountUsdt} ${data.coin} @ $${data.avgPrice.toFixed(2)}`, "success");

      // Badge count trên title
      document.title = `🔔 ${document.title.replace(/^🔔 /, "")}`;
    });

    // Yêu cầu quyền notification
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { socket.disconnect(); };
  }, []);
}

function showToast(message: string, type: "success" | "error") {
  const toast = document.createElement("div");
  const color = type === "success" ? "#22c55e" : "#ef4444";
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: #1e293b; color: white; padding: 14px 20px;
    border-radius: 14px; font-size: 14px; font-weight: 600;
    border-left: 4px solid ${color};
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    display: flex; align-items: center; gap: 10px;
    animation: slideIn 0.3s ease;
    max-width: 360px;
  `;
  toast.innerHTML = message;

  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn { from { transform: translateX(120%); opacity:0 } to { transform: translateX(0); opacity:1 } }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "none";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => { toast.remove(); style.remove(); }, 300);
  }, 5000);
}
