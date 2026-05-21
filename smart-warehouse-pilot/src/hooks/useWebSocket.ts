import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { toast } from "sonner";

interface WebSocketMessage {
  type: string;
  data: any;
  warehouse_code?: string;
  criticality?: string;
  timestamp?: number;
  status?: string;
}

interface UseWebSocketProps {
  warehouseCode: string;
  onRobotUpdate?: (data: any) => void;
  onLocationUpdate?: (data: any) => void;
  onStatsUpdate?: (data: any) => void;
  onWarehouseRobotsUpdate?: (data: any) => void;
  onWarehouseLocationUpdate?: (data: any) => void;
  onPredictionsUpdate?: (data: any) => void;
  onCriticalityUpdate?: (data: any) => void;
}

export const useWebSocket = ({
  warehouseCode,
  onRobotUpdate,
  onLocationUpdate,
  onStatsUpdate,
  onWarehouseRobotsUpdate,
  onWarehouseLocationUpdate,
  onPredictionsUpdate,
  onCriticalityUpdate,
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const clientRef = useRef<Client | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  // Keep callbacks in refs to avoid re-connecting on every render
  const callbacksRef = useRef({
    onRobotUpdate,
    onLocationUpdate,
    onStatsUpdate,
    onWarehouseRobotsUpdate,
    onWarehouseLocationUpdate,
    onPredictionsUpdate,
    onCriticalityUpdate,
  });
  callbacksRef.current = {
    onRobotUpdate,
    onLocationUpdate,
    onStatsUpdate,
    onWarehouseRobotsUpdate,
    onWarehouseLocationUpdate,
    onPredictionsUpdate,
    onCriticalityUpdate,
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!warehouseCode) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setConnectionStatus("error");
      return;
    }

    // Clean up previous connection
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    reconnectAttemptsRef.current = 0;

    const createSockJS = () => new SockJS("http://localhost:8080/ws");

    const client = new Client({
      webSocketFactory: createSockJS,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        "X-Warehouse-Code": warehouseCode,
      },
      // Disable debug in production to avoid console spam
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    client.onConnect = (frame) => {
      if (!mountedRef.current) return;
      console.log("WebSocket connected");
      setIsConnected(true);
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;

      if (reconnectAttemptsRef.current > 0) {
        toast.success("Real-time connection restored");
      }

      const subscribe = (
        destination: string,
        handler: (data: WebSocketMessage) => void,
      ) => {
        client.subscribe(destination, (message) => {
          try {
            const data: WebSocketMessage = JSON.parse(message.body);
            handler(data);
          } catch {
            // ignore malformed messages
          }
        });
      };

      // Single dashboard topic — location updates only (robots come via warehouse-specific topic)
      subscribe("/topic/dashboard", (data) => {
        const cb = callbacksRef.current;
        const payload = data.data || {};

        if (data.type === "location_update" && cb.onLocationUpdate) {
          cb.onLocationUpdate(payload);
        } else if (data.type === "robot_update" && cb.onRobotUpdate) {
          // Pass through but let consumer filter by warehouse_code
          cb.onRobotUpdate(payload);
        } else if (data.type === "robot_status" && cb.onRobotUpdate) {
          cb.onRobotUpdate(payload);
        }
      });

      // Warehouse stats
      subscribe(`/topic/dashboard/warehouse/${warehouseCode}`, (data) => {
        const cb = callbacksRef.current;
        if (
          data.type === "warehouse_robots_update" &&
          cb.onWarehouseRobotsUpdate
        ) {
          cb.onWarehouseRobotsUpdate(data.data);
        }
      });

      subscribe(`/topic/dashboard/warehouse/${warehouseCode}/stats`, (data) => {
        const cb = callbacksRef.current;
        if (data.type === "warehouse_stats" && cb.onStatsUpdate) {
          cb.onStatsUpdate(data.data);
        }
      });

      subscribe(
        `/topic/dashboard/warehouse/${warehouseCode}/locations`,
        (data) => {
          const cb = callbacksRef.current;
          if (
            data.type === "warehouse_location_update" &&
            cb.onWarehouseLocationUpdate
          ) {
            cb.onWarehouseLocationUpdate(data.data);
          }
        },
      );

      // Predictions
      subscribe(`/topic/dashboard/predictions/${warehouseCode}`, (data) => {
        const cb = callbacksRef.current;
        if (cb.onPredictionsUpdate) {
          cb.onPredictionsUpdate(data);
        }
      });

      // Criticality
      subscribe(
        `/topic/dashboard/predictions/criticality/${warehouseCode}`,
        (data) => {
          const cb = callbacksRef.current;
          if (cb.onCriticalityUpdate) {
            cb.onCriticalityUpdate(data);
          }
        },
      );
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame.headers?.message);
      setConnectionStatus("error");
    };

    client.onWebSocketError = () => {
      setConnectionStatus("error");
    };

    client.onDisconnect = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [warehouseCode]); // Only reconnect when warehouseCode changes

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      setConnectionStatus("disconnected");
    }
  }, []);

  const reconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setConnectionStatus("connecting");
  }, []);

  const sendMessage = useCallback((destination: string, body: any) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
      return true;
    }
    return false;
  }, []);

  return {
    isConnected,
    connectionStatus,
    disconnect,
    reconnect,
    sendMessage,
  };
};

export default useWebSocket;
