export interface WebserverPortalRouteContribution {
  auth: "public";
  capability: "portal";
  domain: "infrastructure";
  id: "app.infrastructure.portal.index";
  path: "/";
  presentation: { pc: "page" };
  screen: "index";
  surface: "app";
  titleKey: "infrastructure.portal.index.title";
}

export const webserverPortalRoute = {
  auth: "public",
  capability: "portal",
  domain: "infrastructure",
  id: "app.infrastructure.portal.index",
  path: "/",
  presentation: { pc: "page" },
  screen: "index",
  surface: "app",
  titleKey: "infrastructure.portal.index.title",
} as const satisfies WebserverPortalRouteContribution;
