"use client";

import { useSocket } from "@/src/hooks/useSocket";
import LanguageSwitcher from "@/src/i18n/LanguageSwitcher";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Types pour les commandes
type OrderItem = {
  id?: string;
  nom: string;
  prix: number;
  quantite?: number;
  quantity?: number;
};

type Order = {
  id: string;
  number: string;
  customerName: string;
  nom?: string;
  instructions?: string;
  paiement?: string;
  paymentMethod?: string;
  panier?: OrderItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[];
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  isPaid: boolean;
  total?: string;
  totalAmount?: number;
  createdAt: string;
  updatedAt?: string;
};

export default function KitchenPage() {
  // Initialiser i18n
  const { t } = useTranslation(["common", "kitchen"]);

  // État pour les commandes
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("NEW");
  const [clientsCount, setClientsCount] = useState({
    customers: 0,
    kitchen: 0,
  });

  // Connexion Socket.io
  const { socket, isConnected, error } = useSocket("kitchen");

  // Charger les commandes existantes au démarrage
  useEffect(() => {
    async function loadOrders() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/api/orders`
        );
        if (!response.ok) throw new Error(t("kitchen:errors.load_failed"));

        const data = await response.json();

        // Mapper les commandes pour notre interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedOrders: Order[] = data.orders.map((order: any) => ({
          id: order.id,
          number: order.number,
          customerName: order.customerName,
          nom: order.customerName,
          instructions: order.instructions || "",
          paymentMethod: order.paymentMethod,
          status: order.status,
          isPaid: order.isPaid,
          total: order.totalAmount.toFixed(2),
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          panier: order.items.map((item: any) => ({
            id: item.id,
            nom: item.productSnapshot?.nom || "Produit",
            prix: item.unitPrice,
            quantite: item.quantity,
            quantity: item.quantity,
          })),
          items: order.items,
        }));

        setOrders(mappedOrders);
      } catch (error) {
        console.error(t("kitchen:errors.load_error"), error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [t]);

  // Écouter les événements du serveur
  useEffect(() => {
    if (!socket) return;

    // Nouvelle commande reçue
    socket.on("new_order_received", (data) => {
      console.log(t("kitchen:log.new_order"), data);
      const newOrder: Order = normalizeOrderData(data);

      // Jouer un son de notification (optionnel)
      try {
        const audio = new Audio("/notification.mp3");
        audio
          .play()
          .catch((err) => console.log(t("kitchen:errors.audio_error"), err));
      } catch (error) {
        console.log(t("kitchen:errors.audio_not_supported"), error);
      }

      // Ajouter la commande à l'état
      setOrders((prev) => [newOrder, ...prev]);
    });

    // Mise à jour d'une commande
    socket.on("order_updated", (data) => {
      console.log(t("kitchen:log.order_updated"), data);
      const updatedOrder = normalizeOrderData(data);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    });

    // Mise à jour individuelle d'une commande
    socket.on("order_status_changed", (data) => {
      console.log(t("kitchen:log.status_changed"), data);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === data.orderId
            ? {
                ...order,
                status: data.status || order.status,
                isPaid: data.isPaid !== undefined ? data.isPaid : order.isPaid,
                updatedAt: data.updatedAt,
              }
            : order
        )
      );
    });

    // Nombre de clients connectés
    socket.on("clients_count", (data) => {
      console.log(t("kitchen:log.clients_count"), data);
      setClientsCount(data);
    });

    return () => {
      socket.off("new_order_received");
      socket.off("order_updated");
      socket.off("order_status_changed");
      socket.off("clients_count");
    };
  }, [socket, t]);

  // Normaliser les données de commande (pour gérer les différents formats)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeOrderData = (data: any): Order => {
    // Extraire instructions
    const instructions = data.instructions || "";

    return {
      id: data.id,
      number: data.number,
      customerName: data.customerName || data.nom,
      nom: data.customerName || data.nom,
      instructions: instructions,
      status: data.status,
      isPaid: data.isPaid,
      total: data.totalAmount?.toFixed(2) || data.total,
      totalAmount: data.totalAmount || parseFloat(data.total),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      panier: Array.isArray(data.items)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.items.map((item: any) => ({
            id: item.id,
            nom:
              item.productSnapshot?.nom ||
              item.nom ||
              t("kitchen:product_default"),
            prix: item.unitPrice || item.prix,
            quantite: item.quantity || item.quantite || 1,
            quantity: item.quantity || item.quantite || 1,
          }))
        : data.panier || [],
    };
  };

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = (orderId: string, newStatus: string) => {
    if (!isConnected || !socket) {
      alert(t("common:connection_status.connect_error"));
      return;
    }

    socket.emit("update_order_status", {
      orderId,
      status: newStatus,
    });
  };

  // Marquer une commande comme payée/non payée
  const toggleOrderPayment = (orderId: string, currentPaidStatus: boolean) => {
    if (!isConnected || !socket) {
      alert(t("common:connection_status.connect_error"));
      return;
    }

    socket.emit("update_order_status", {
      orderId,
      isPaid: !currentPaidStatus,
    });
  };

  // Formatter la date pour l'affichage
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtrer les commandes selon l'onglet actif
  const filteredOrders = orders.filter((order) =>
    activeTab === "ALL" ? true : order.status === activeTab
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t("kitchen:page_title")}</h1>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span>
                {isConnected
                  ? t("common:connection_status.connected")
                  : t("common:connection_status.disconnected")}
              </span>
            </div>

            {isConnected && (
              <span className="text-sm">
                {t("kitchen:connection_info", {
                  customers: clientsCount.customers,
                  kitchen: clientsCount.kitchen,
                })}
              </span>
            )}

            <LanguageSwitcher />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Onglets de filtrage */}
        <div className="mb-6 border-b">
          <nav className="flex space-x-4">
            {["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED", "ALL"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-1 ${
                    activeTab === tab
                      ? "border-b-2 border-blue-500 font-bold text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "NEW" && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                      {orders.filter((o) => o.status === "NEW").length}
                    </span>
                  )}
                  {tab === "ALL"
                    ? t("kitchen:tabs.all")
                    : t(`common:order_status.${tab}`)}
                </button>
              )
            )}
          </nav>
        </div>

        {/* Liste des commandes */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3">{t("kitchen:loading")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full text-center py-10 bg-white rounded-lg shadow">
                <p className="text-gray-500">
                  {t("kitchen:no_orders", {
                    status:
                      activeTab !== "ALL"
                        ? t("kitchen:no_orders_status", {
                            status: t(`common:order_status.${activeTab}`),
                          })
                        : "",
                  })}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold">
                        {t("kitchen:order_number", { number: order.number })}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          order.status === "NEW"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "PREPARING"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "READY"
                            ? "bg-green-100 text-green-800"
                            : order.status === "COMPLETED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {t(`common:order_status.${order.status}`)}
                      </span>

                      <span
                        className={`cursor-pointer px-2 py-1 text-xs rounded-full ${
                          order.isPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                        onClick={() =>
                          toggleOrderPayment(order.id, order.isPaid)
                        }
                      >
                        {t(
                          `common:payment_status.${
                            order.isPaid ? "paid" : "unpaid"
                          }`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="font-medium">
                      {t("kitchen:client_label")}{" "}
                      {order.customerName || order.nom}
                    </p>

                    {order.instructions && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        <p className="font-medium text-yellow-800">
                          {t("kitchen:instructions_label")}
                        </p>
                        <p className="text-gray-700">{order.instructions}</p>
                      </div>
                    )}

                    <div className="mt-4">
                      <h4 className="font-medium">
                        {t("kitchen:items_label")}
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {(order.panier || []).map((item, index) => (
                          <li
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {item.quantite || item.quantity || 1}x {item.nom}
                            </span>
                            <span>
                              {(
                                item.prix *
                                (item.quantite || item.quantity || 1)
                              ).toFixed(2)}{" "}
                              €
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                        <span>{t("common:total")}:</span>
                        <span>
                          {order.total || order.totalAmount?.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t">
                    {order.status === "NEW" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "PREPARING")}
                        className="w-full py-2 bg-yellow-500 text-white rounded font-medium"
                      >
                        {t("kitchen:buttons.start_preparing")}
                      </button>
                    )}

                    {order.status === "PREPARING" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "READY")}
                        className="w-full py-2 bg-green-500 text-white rounded font-medium"
                      >
                        {t("kitchen:buttons.mark_ready")}
                      </button>
                    )}

                    {order.status === "READY" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "COMPLETED")}
                        className="w-full py-2 bg-purple-500 text-white rounded font-medium"
                      >
                        {t("kitchen:buttons.complete")}
                      </button>
                    )}

                    {(order.status === "NEW" ||
                      order.status === "PREPARING" ||
                      order.status === "READY") && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                        className="w-full mt-2 py-2 bg-red-500 text-white rounded font-medium"
                      >
                        {t("kitchen:buttons.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
