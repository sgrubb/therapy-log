import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import AppLayout from "@/components/AppLayout";
import ClientsPage from "@/pages/ClientsPage";
import SessionsPage from "@/pages/SessionsPage";
import TherapistsPage from "@/pages/TherapistsPage";

export default function App() {
  return (
    <TherapistProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/therapists" element={<TherapistsPage />} />
            <Route path="*" element={<Navigate to="/clients" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </TherapistProvider>
  );
}
