import { UserProvider } from "@/components/UserProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}
