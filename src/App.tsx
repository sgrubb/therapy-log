import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import AppLayout from "@/components/AppLayout";
import ClientsPage from "@/pages/ClientsPage";
import ClientFormPage from "@/pages/ClientFormPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import SessionsPage from "@/pages/SessionsPage";
import TherapistsPage from "@/pages/TherapistsPage";

export default function App() {
  return (
    <TherapistProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/clients">
              <Route index element={<ClientsPage />} />
              <Route path="new" element={<ClientFormPage />} />
              <Route path=":id/edit" element={<ClientFormPage />} />
              <Route path=":id" element={<ClientDetailPage />} />
            </Route>
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/therapists" element={<TherapistsPage />} />
            <Route path="*" element={<Navigate to="/clients" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </TherapistProvider>
  );
}
