"use client";

import { useAgentNotification } from "@/hooks/useAgentNotification";

export default function AgentNotificationProvider({ children }: { children: React.ReactNode }) {
  useAgentNotification();
  return <>{children}</>;
}
