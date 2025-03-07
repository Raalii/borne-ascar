"use client";

import { useSocket } from "@/src/hooks/useSocket";
import LanguageSwitcher from "@/src/i18n/LanguageSwitcher";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Types pour les produits et le panier
type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  isAvailable: boolean;
  description?: string;
  translations?: {
    fr?: { name: string; description: string };
    en?: { name: string; description: string };
  };
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function ClientPage() {
  // Initialiser i18n
  const { t, i18n } = useTranslation(["common", "client"]);
  const currentLanguage = i18n.language || "fr";

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

  // Fonction pour obtenir le nom traduit d'un produit
  const getTranslatedProductName = (product: Product): string => {
    if (
      product.translations &&
      product.translations[currentLanguage as "fr" | "en"]?.name
    ) {
      return product.translations[currentLanguage as "fr" | "en"]!.name;
    }
    return product.name;
  };

  // Fonction pour obtenir la description traduite d'un produit
  const getTranslatedProductDescription = (product: Product): string => {
    if (
      product.translations &&
      product.translations[currentLanguage as "fr" | "en"]?.description
    ) {
      return product.translations[currentLanguage as "fr" | "en"]!.description;
    }
    return product.description || "";
  };

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

      const translatedName = getTranslatedProductName(product);

      if (existingItem) {
        // Augmenter la quantité si l'article existe déjà
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Ajouter un nouvel article avec le nom traduit
        return [...prevCart, { ...product, name: translatedName, quantity: 1 }];
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
    <div className="min-h-screen bg-black text-green-400 py-8 relative overflow-hidden">
      {/* Overlay de grille cyberpunk */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      {/* Effet de néon lumineux */}
      <div className="absolute top-1/4 -left-20 w-40 h-40 rounded-full bg-purple-500 filter blur-3xl opacity-10"></div>
      <div className="absolute bottom-1/4 -right-20 w-40 h-40 rounded-full bg-green-500 filter blur-3xl opacity-10"></div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 font-mono tracking-widest">
            {t("client:page_title")}
            <span className="animate-pulse ml-2">_</span>
          </h1>
          <LanguageSwitcher />
        </div>

        {!isConnected && !isLoading && (
          // <div className="border border-red-600 bg-red-900/30 text-red-400 px-4 py-3 rounded-md mb-6 backdrop-blur-sm">
          //   <p>{t("common:connection_status.connect_error")}</p>
          //   {error && <p className="mt-1 text-sm">{error}</p>}
          // </div>
          <></>
        )}

        {orderSubmitted ? (
          <div className="border border-green-500/50 bg-black/80 backdrop-blur-sm rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.3)] p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-400">
              {t("client:order_submitted.title")}
            </h2>
            <p className="text-lg mb-2 text-green-300">
              {t("client:order_submitted.order_number")}{" "}
              <span className="font-bold text-green-400">{orderNumber}</span>
            </p>
            <p className="mb-6">
              {t("client:order_submitted.thank_you")} {customerName}.
            </p>

            <div className="mb-6 p-4 border border-green-500/30 rounded bg-black/50 backdrop-blur-sm">
              <h3 className="font-bold mb-2 text-green-300">
                {t("client:order_submitted.status_title")}
              </h3>
              <div className="flex items-center justify-center space-x-4">
                <span
                  className={`px-3 py-1 rounded-full ${
                    orderStatus === "READY" || orderStatus === "COMPLETED"
                      ? "bg-green-900/70 text-green-300 border border-green-500"
                      : orderStatus === "CANCELLED"
                      ? "bg-red-900/70 text-red-300 border border-red-500"
                      : "bg-blue-900/70 text-blue-300 border border-blue-500"
                  }`}
                >
                  {t(`common:order_status.${orderStatus}`)}
                </span>

                <span
                  className={`px-3 py-1 rounded-full ${
                    isPaid
                      ? "bg-green-900/70 text-green-300 border border-green-500"
                      : "bg-yellow-900/70 text-yellow-300 border border-yellow-500"
                  }`}
                >
                  {t(`common:payment_status.${isPaid ? "paid" : "unpaid"}`)}
                </span>
              </div>
            </div>

            <button
              onClick={newOrder}
              className="px-6 py-3 bg-green-900/50 border border-green-500 text-green-400 font-bold rounded-lg hover:bg-green-800/50 hover:shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all"
            >
              {t("common:button.new_order")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Liste de produits */}
            <div className="md:col-span-2">
              <div className="border border-green-500/30 bg-black/80 backdrop-blur-sm rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.15)] p-6">
                <h2 className="text-xl font-bold mb-4 text-green-400 font-mono">
                  {t("client:products_title")}
                </h2>

                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  </div>
                ) : (
                  <>
                    {["DRINK", "FOOD", "DESSERT", "SNACK"].map((category) => {
                      const categoryProducts = getProductsByCategory(category);
                      if (categoryProducts.length === 0) return null;

                      return (
                        <div key={category} className="mb-8">
                          <h3 className="text-lg font-mono font-semibold mb-3 border-b border-green-500/30 pb-2 text-green-400">
                            {t(`common:categories.${category}`)}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`group border border-green-500/30 rounded-lg p-4 ${
                                  product.stock > 0
                                    ? "hover:border-green-400 hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] cursor-pointer transition-all"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                                onClick={() =>
                                  product.stock > 0 && addToCart(product)
                                }
                              >
                                <div className="h-24 bg-gray-900 rounded-md mb-3 flex items-center justify-center border border-green-500/20 overflow-hidden">
                                  <span className="text-green-500 font-mono">
                                    {t(`common:categories.${product.category}`)}
                                  </span>
                                </div>
                                <h3 className="font-bold text-green-400">
                                  {getTranslatedProductName(product)}
                                </h3>
                                {getTranslatedProductDescription(product) && (
                                  <p className="text-sm text-green-300/80 mt-1">
                                    {getTranslatedProductDescription(product)}
                                  </p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-green-400">
                                    {product.price.toFixed(2)} €
                                  </span>
                                  <div className="flex items-center">
                                    <span className="text-xs text-green-500/80 mr-2">
                                      {t("client:product.stock")}{" "}
                                      {product.stock}
                                    </span>
                                    <button
                                      className={`px-2 py-1 ${
                                        product.stock > 0
                                          ? "bg-green-900 text-green-400 border border-green-500 group-hover:bg-green-800"
                                          : "bg-gray-800 text-gray-300 border border-gray-700"
                                      } rounded-full text-xs transition-colors`}
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
              <div className="border border-green-500/30 bg-black/80 backdrop-blur-sm rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.15)] p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-4 text-green-400 font-mono">
                  {t("client:cart_title")}
                </h2>

                {cart.length === 0 ? (
                  <p className="text-gray-500 mb-4">{t("common:cart_empty")}</p>
                ) : (
                  <div className="mb-4">
                    <ul className="divide-y divide-green-500/30">
                      {cart.map((item) => (
                        <li key={item.id} className="py-2 flex justify-between">
                          <div>
                            <span className="font-medium text-green-400">
                              {item.name}
                            </span>
                            <span className="text-sm text-green-500/80 ml-2">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2 text-green-400">
                              {(item.price * item.quantity).toFixed(2)} €
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.id);
                              }}
                              className="text-red-400 hover:text-red-300"
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

                    <div className="mt-4 pt-4 border-t border-green-500/30">
                      <div className="flex justify-between font-bold">
                        <span className="text-green-400">
                          {t("common:total")}:
                        </span>
                        <span className="text-green-400">
                          {getTotal().toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={submitOrder} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium mb-1 text-green-400"
                    >
                      {t("client:form.name_label")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-green-500/50 rounded text-green-400 focus:border-green-400 focus:ring-1 focus:ring-green-500 focus:outline-none"
                      placeholder={t("client:form.name_placeholder")}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-green-400">
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
                            className="mr-1 text-green-500 border-green-500 focus:ring-green-500"
                          />
                          <span className="text-green-400">
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
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                        : "bg-green-900/50 text-green-400 hover:bg-green-800/50 hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] border border-green-500 transition-all"
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
