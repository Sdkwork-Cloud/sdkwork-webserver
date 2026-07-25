import { SdkworkAuthPage, type SdkworkAuthController, type SdkworkAuthHeaderSlotProps } from "@sdkwork/auth-pc-react";
import { ServerCog } from "lucide-react";
export function WebserverAuthRoutes({ controller }: { controller: SdkworkAuthController }) { return <SdkworkAuthPage appearance={{ slots: { Header } }} basePath="/auth" controller={controller} homePath="/console" />; }
function Header({ description, title }: SdkworkAuthHeaderSlotProps) { return <header className="auth-header"><div className="auth-brand"><span><ServerCog size={18} /></span><strong>SDKWork Web Server</strong></div><h1>{title}</h1><p>{description}</p></header>; }

