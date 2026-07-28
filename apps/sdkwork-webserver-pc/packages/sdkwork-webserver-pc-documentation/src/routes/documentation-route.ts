export interface WebserverDocumentationRouteContribution {
  auth: "public";
  capability: "documentation";
  domain: "infrastructure";
  id: "app.infrastructure.documentation.index";
  path: "/docs/*";
  presentation: { pc: "page" };
  screen: "index";
  surface: "app";
  titleKey: "infrastructure.documentation.index.title";
}

export const webserverDocumentationRoute = {
  auth: "public",
  capability: "documentation",
  domain: "infrastructure",
  id: "app.infrastructure.documentation.index",
  path: "/docs/*",
  presentation: { pc: "page" },
  screen: "index",
  surface: "app",
  titleKey: "infrastructure.documentation.index.title",
} as const satisfies WebserverDocumentationRouteContribution;
