import { redirect } from "next/navigation";
import { readPortalSession } from "@/features/auth/session";
import { AppShell } from "@/components/app-shell";
export default async function DashboardLayout({children}:{children:React.ReactNode}){if(!await readPortalSession())redirect('/login');return <AppShell>{children}</AppShell>}
