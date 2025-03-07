import { NextRequest, NextResponse } from "next/server";

// Langues supportées
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

  // Vérifier si le chemin commence par une langue supportée
  const pathnameHasValidLanguage = languages.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Si l'URL ne contient pas la langue, rediriger vers la langue par défaut
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

  return NextResponse.next();
}

// Étendre le matcher pour prendre en compte toutes les routes
// tout en excluant les fichiers statiques
export const config = {
  matcher: [
    // Inclure les routes API socket pour la gestion WebSocket
    "/api/socket",
    // Inclure toutes les autres routes sauf les fichiers statiques
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
