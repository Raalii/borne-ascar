import { Category, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Supprimer les données existantes
  await prisma.orderItem.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  console.log("Base de données nettoyée. Ajout des produits initiaux...");

  // Ajouter les boissons
  const drinks = [
    {
      name: "Coca-Cola",
      price: 1.5,
      category: Category.DRINK, // Utiliser l'enum, pas une chaîne
      description: "Coca bien frais chaccalé.",
      stock: 90,
      translations: {
        fr: { name: "Coca-Cola", description: "Coca bien frais chaccalé." },
        en: { name: "Coca-Cola", description: "Ice cold refreshing Coke." },
      },
    },
    {
      name: "Oasis",
      price: 1.5,
      category: Category.DRINK, // Utiliser l'enum, pas une chaîne
      description: "De l'eau, du fruit, du fun.",
      stock: 72,
      translations: {
        fr: { name: "Oasis", description: "De l'eau, du fruit, du fun." },
        en: { name: "Oasis", description: "Water, fruit, fun." },
      },
    },
    // Vous pouvez ajouter les autres boissons ici
  ];

  // Ajouter les desserts
  const desserts = [
    {
      name: "Kinder",
      price: 2.0,
      category: Category.DESSERT, // Utiliser l'enum, pas une chaîne
      description: "Le chocolat préféré des enfants.",
      stock: 90,
      translations: {
        fr: { name: "Kinder", description: "Le chocolat préféré des enfants." },
        en: { name: "Kinder", description: "Children's favorite chocolate." },
      },
    },
    // Vous pouvez ajouter les autres desserts ici
  ];

  // Insérer tous les produits
  for (const product of [...drinks, ...desserts]) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log("Produits ajoutés avec succès!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
