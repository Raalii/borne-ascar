"use client";

// Composant de changement de langue
import { useSocket } from "@/src/hooks/useSocket";
import LanguageSwitcher from "@/src/i18n/LanguageSwitcher";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // Import pour i18n

// Types pour les produits et le panier
type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  isAvailable: boolean;
  description?: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function ClientPage() {
  // Initialiser i18n
  const { t } = useTranslation(["common", "client"]);

  // État pour les produits, le panier et le formulaire de commande
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // Connexion Socket.io
  const { socket, isConnected, error } = useSocket("customer");

  // Charger les produits au démarrage
  useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/api/products`
        );
        if (!response.ok) throw new Error("Échec du chargement des produits");

        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Écouter les mises à jour de produits
  useEffect(() => {
    if (!socket) return;

    // Écouter les mises à jour de produits (stock, disponibilité)
    socket.on("products_updated", (data) => {
      console.log("Produits mis à jour:", data);

      setProducts((prevProducts) => {
        // Mettre à jour les produits concernés
        const updatedProducts = [...prevProducts];

        data.products.forEach((updatedProduct: Product) => {
          const index = updatedProducts.findIndex(
            (p) => p.id === updatedProduct.id
          );
          if (index !== -1) {
            updatedProducts[index] = updatedProduct;
          }
        });

        return updatedProducts;
      });
    });

    return () => {
      socket.off("products_updated");
    };
  }, [socket]);

  // Écouter les mises à jour de statut des commandes
  useEffect(() => {
    if (!socket) return;

    socket.on("order_confirmation", (data) => {
      console.log("Commande confirmée:", data);
      setOrderNumber(data.orderNumber);
      setOrderStatus("NEW");
    });

    socket.on("order_status_changed", (data) => {
      console.log("Mise à jour de la commande:", data);
      if (data.status) setOrderStatus(data.status);
      if (data.isPaid !== undefined) setIsPaid(data.isPaid);
    });

    return () => {
      socket.off("order_confirmation");
      socket.off("order_status_changed");
    };
  }, [socket]);

  // Filtrer les produits par catégorie
  const getProductsByCategory = (category: string) => {
    return products.filter((p) => p.category === category && p.isAvailable);
  };

  // Ajouter un produit au panier
  const addToCart = (product: Product) => {
    // Vérifier si le produit est disponible et en stock
    if (!product.isAvailable || product.stock <= 0) {
      alert(t("client:product.out_of_stock"));
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      // Vérifier si l'ajout dépasse le stock disponible
      if (existingItem && existingItem.quantity >= product.stock) {
        alert(t("client:product.stock_limit", { stock: product.stock }));
        return prevCart;
      }

      if (existingItem) {
        // Augmenter la quantité si l'article existe déjà
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Ajouter un nouvel article
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Retirer un produit du panier
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Calculer le total du panier
  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // Soumettre la commande
  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !socket) {
      alert(t("common:connection_status.connect_error"));
      return;
    }

    if (cart.length === 0) {
      alert(t("client:form.validation.cart_empty"));
      return;
    }

    if (!customerName.trim()) {
      alert(t("client:form.validation.name_required"));
      return;
    }

    const order = {
      nom: customerName,
      instructions: instructions,
      paiement: paymentMethod,
      panier: cart.map((item) => ({
        id: item.id,
        nom: item.name,
        prix: item.price,
        quantity: item.quantity,
      })),
      total: getTotal().toFixed(2),
      date: new Date().toISOString(),
    };

    console.log("Envoi de la commande:", order);
    socket.emit("new_order", order);
    setOrderSubmitted(true);
  };

  // Réinitialiser pour une nouvelle commande
  const newOrder = () => {
    setCart([]);
    setCustomerName("");
    setInstructions("");
    setOrderSubmitted(false);
    setOrderNumber("");
    setOrderStatus("");
    setIsPaid(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t("client:page_title")}</h1>
          <LanguageSwitcher />
        </div>

        {!isConnected && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{t("common:connection_status.connect_error")}</p>
            {error && <p className="mt-1 text-sm">{error}</p>}
          </div>
        )}

        {orderSubmitted ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("client:order_submitted.title")}
            </h2>
            <p className="text-lg mb-2">
              {t("client:order_submitted.order_number")}{" "}
              <span className="font-bold">{orderNumber}</span>
            </p>
            <p className="mb-6">
              {t("client:order_submitted.thank_you")} {customerName}.
            </p>

            <div className="mb-6 p-4 border rounded bg-gray-50">
              <h3 className="font-bold mb-2">
                {t("client:order_submitted.status_title")}
              </h3>
              <div className="flex items-center justify-center space-x-4">
                <span
                  className={`px-3 py-1 rounded-full ${
                    orderStatus === "READY" || orderStatus === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : orderStatus === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {t(`common:order_status.${orderStatus}`)}
                </span>

                <span
                  className={`px-3 py-1 rounded-full ${
                    isPaid
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {t(`common:payment_status.${isPaid ? "paid" : "unpaid"}`)}
                </span>
              </div>
            </div>

            <button
              onClick={newOrder}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg"
            >
              {t("common:button.new_order")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Liste de produits */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">
                  {t("client:products_title")}
                </h2>

                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {["DRINK", "FOOD", "DESSERT", "SNACK"].map((category) => {
                      const categoryProducts = getProductsByCategory(category);
                      if (categoryProducts.length === 0) return null;

                      return (
                        <div key={category} className="mb-8">
                          <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                            {t(`common:categories.${category}`)}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`border rounded-lg p-4 ${
                                  product.stock > 0
                                    ? "hover:shadow-md cursor-pointer"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                                onClick={() =>
                                  product.stock > 0 && addToCart(product)
                                }
                              >
                                <div className="h-24 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                                  <span className="text-gray-500">
                                    {t(`common:categories.${product.category}`)}
                                  </span>
                                </div>
                                <h3 className="font-bold">{product.name}</h3>
                                {product.description && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {product.description}
                                  </p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                  <span>{product.price.toFixed(2)} €</span>
                                  <div className="flex items-center">
                                    <span className="text-xs text-gray-500 mr-2">
                                      {t("client:product.stock")}{" "}
                                      {product.stock}
                                    </span>
                                    <button
                                      className={`px-2 py-1 ${
                                        product.stock > 0
                                          ? "bg-green-500 text-white"
                                          : "bg-gray-300"
                                      } rounded-full text-xs`}
                                      disabled={product.stock <= 0}
                                    >
                                      + {t("client:product.add")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Panier et formulaire de commande */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-4">
                  {t("client:cart_title")}
                </h2>

                {cart.length === 0 ? (
                  <p className="text-gray-500 mb-4">{t("common:cart_empty")}</p>
                ) : (
                  <div className="mb-4">
                    <ul className="divide-y">
                      {cart.map((item) => (
                        <li key={item.id} className="py-2 flex justify-between">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2">
                              {(item.price * item.quantity).toFixed(2)} €
                            </span>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-bold">
                        <span>{t("common:total")}:</span>
                        <span>{getTotal().toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={submitOrder}>
                  <div className="mb-4">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium mb-1"
                    >
                      {t("client:form.name_label")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      placeholder={t("client:form.name_placeholder")}
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-1">
                      {t("client:form.payment_method_label")}
                    </label>
                    <div className="flex space-x-4">
                      {["CARD", "CASH", "PAYPAL"].map((method) => (
                        <label key={method} className="flex items-center">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={() => setPaymentMethod(method)}
                            className="mr-1"
                          />
                          <span>
                            {t(`client:form.payment_methods.${method}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!isConnected || cart.length === 0}
                    className={`w-full py-3 rounded-lg font-bold ${
                      !isConnected || cart.length === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {!isConnected
                      ? t("client:button_state.disconnected")
                      : cart.length === 0
                      ? t("client:button_state.cart_empty")
                      : t("client:button_state.order")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
