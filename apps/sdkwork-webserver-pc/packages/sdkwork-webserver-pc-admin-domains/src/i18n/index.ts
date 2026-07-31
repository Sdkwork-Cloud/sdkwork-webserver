import type { WebserverLocale } from "@sdkwork/webserver-pc-commons";

import { domainManagementEnUs } from "./en-US/infrastructure/domains/domain-management";
import { domainManagementZhCn } from "./zh-CN/infrastructure/domains/domain-management";

export type DomainMessages = {
  readonly [Key in keyof typeof domainManagementEnUs]: string;
};

const domainCatalogs: Record<WebserverLocale, DomainMessages> = {
  "en-US": domainManagementEnUs,
  "zh-CN": domainManagementZhCn,
};

export function domainMessages(locale: WebserverLocale): DomainMessages {
  return domainCatalogs[locale];
}
