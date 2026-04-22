import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import log from "@/lib/logger";
import AppLayout from "@/components/AppLayout";
import ClientsPage from "@/pages/ClientsPage";
import ClientFormPage from "@/pages/ClientFormPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import SessionsPage from "@/pages/SessionsPage";
import SessionFormPage from "@/pages/SessionFormPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import TherapistsPage from "@/pages/TherapistsPage";
import TherapistFormPage from "@/pages/TherapistFormPage";
import TherapistDetailPage from "@/pages/TherapistDetailPage";
import SettingsPage from "@/pages/SettingsPage";
import CalendarPage from "@/pages/CalendarPage";
import SetupPage from "@/pages/SetupPage";
import MigrationPage from "@/pages/MigrationPage";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log.error(`Query failed [${JSON.stringify(query.queryKey)}]:`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      log.error("Mutation failed:", error);
    },
  }),
  defaultOptions: {
    queries: { retry: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/migration" element={<MigrationPage />} />
          <Route element={<AppLayout />}>
            <Route path="/clients">
              <Route index element={<ClientsPage />} />
              <Route path="new" element={<ClientFormPage />} />
              <Route path=":id/edit" element={<ClientFormPage />} />
              <Route path=":id" element={<ClientDetailPage />} />
            </Route>
            <Route path="/sessions">
              <Route index element={<SessionsPage />} />
              <Route path="new" element={<SessionFormPage />} />
              <Route path=":id/edit" element={<SessionFormPage />} />
              <Route path=":id" element={<SessionDetailPage />} />
            </Route>
            <Route path="/therapists">
              <Route index element={<TherapistsPage />} />
              <Route path="new" element={<TherapistFormPage />} />
              <Route path=":id/edit" element={<TherapistFormPage />} />
              <Route path=":id" element={<TherapistDetailPage />} />
            </Route>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
