import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { net, type NetState, type WorldPacket } from "@/lib/net-shared";

export const playerId =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Handlers = {
  onState: (s: NetState) => void;
  onRoster: (roster: { id: string; name: string }[]) => void;
};

export function useGameChannel(roomCode: string, name: string, handlers: Handlers) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    const channel = supabase.channel(`game:${roomCode}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const s = payload as NetState;
        if (s.id !== playerId) h.current.onState(s);
      })
      .on("broadcast", { event: "world" }, ({ payload }) => {
        if (!net.isCoordinator) net.world = payload as WorldPacket;
      })
      .on("presence", { event: "sync" }, () => {
        const roster = Object.entries(channel.presenceState<{ name: string }>()).map(
          ([id, metas]) => ({ id, name: metas[0]?.name ?? "player" }),
        );
        h.current.onRoster(roster);
      })
      .subscribe((status) => {
        console.log("[net] channel:", status);
        if (status === "SUBSCRIBED") channel.track({ name });
      });

    channelRef.current = channel;
    net.channel = channel;

    return () => {
      channelRef.current = null;
      net.channel = null;
      net.remotes.clear();
      net.world = null;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  return channelRef;
}
