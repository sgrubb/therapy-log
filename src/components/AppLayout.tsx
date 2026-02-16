import { NavLink, Outlet } from "react-router-dom";
import TherapistSelector from "@/components/TherapistSelector";

const NAV_ITEMS = [
  { to: "/clients", label: "Clients" },
  { to: "/sessions", label: "Sessions" },
  { to: "/therapists", label: "Therapists" },
] as const;

export default function AppLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-muted/40">
        <div className="p-4">
          <h1 className="text-lg font-bold">Therapy Log</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-end border-b px-6 py-3">
          <TherapistSelector />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
