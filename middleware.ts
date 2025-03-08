import { NextRequest, NextResponse } from "next/server";

// Langues supportées dans un format simple
const languages = ["fr", "en"];
const defaultLanguage = "fr";

export function middleware(request: NextRequest) {
  // Gestion spéciale pour les requêtes WebSocket
  if (request.headers.get("upgrade") === "websocket") {
    return NextResponse.next();
  }

  // Extraire le chemin de l'URL
  const pathname = request.nextUrl.pathname;

  // Ignorer les requêtes pour les fichiers statiques, les API et les websockets
  if (
    pathname.includes("/api/") ||
    pathname.includes("/_next/") ||
    pathname.includes("/locales/") ||
    pathname.includes("/images/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Détecter si l'URL contient déjà une langue supportée
  // Mais vérifie uniquement le premier segment du chemin
  const pathnameHasValidLanguage = languages.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Si l'URL ne commence pas par une langue supportée, rediriger vers la langue par défaut
  if (!pathnameHasValidLanguage) {
    // Construire la nouvelle URL avec le locale par défaut
    const newUrl = new URL(
      `/${defaultLanguage}${pathname === "/" ? "" : pathname}${
        request.nextUrl.search
      }`,
      request.url
    );

    return NextResponse.redirect(newUrl);
  }

  // Vérifier si l'URL contient une structure incorrecte comme /fr/fr-FR/
  // Extraction du premier segment de chemin (après le premier /)
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length >= 2) {
    const firstSegment = segments[0];
    const secondSegment = segments[1];

    // Vérifier si le deuxième segment contient aussi une langue (comme fr-FR)
    const hasIncorrectFormat = languages.some(
      (lang) => firstSegment === lang && secondSegment.startsWith(lang + "-")
    );

    if (hasIncorrectFormat) {
      // Reconstruire l'URL correctement, en supprimant le segment problématique
      const correctPathname = `/${segments[0]}/${segments.slice(2).join("/")}`;
      const newUrl = new URL(
        correctPathname + request.nextUrl.search,
        request.url
      );

      return NextResponse.redirect(newUrl);
    }
  }

  return NextResponse.next();
}

// Étendre le matcher pour prendre en compte toutes les routes
export const config = {
  matcher: [
    // Inclure les routes API socket pour la gestion WebSocket
    "/api/socket",
    // Inclure toutes les autres routes sauf les fichiers statiques
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
