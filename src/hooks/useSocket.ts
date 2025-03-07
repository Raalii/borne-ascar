import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type ClientType = "customer" | "kitchen";

// Définir l'URL du serveur socket
const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:4000";

export const useSocket = (clientType: ClientType) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Créer une nouvelle connexion Socket.io
    const socketInstance = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    // Gérer les événements de connexion
    socketInstance.on("connect", () => {
      console.log("Socket connected to server");
      setIsConnected(true);
      setError(null);

      // S'enregistrer avec le type de client
      socketInstance.emit("register", { clientType });
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setIsConnected(false);
      setError(`Failed to connect to server: ${err.message}`);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    // Stocker l'instance socket dans l'état
    setSocket(socketInstance);

    // Nettoyer à la déconnexion
    return () => {
      socketInstance.disconnect();
    };
  }, [clientType]);

  return { socket, isConnected, error };
};
