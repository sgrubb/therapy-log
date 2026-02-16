import { useEffect, useState } from "react";

enum AppStatus {
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

const STATUS_DISPLAY: Record<AppStatus, string> = {
  [AppStatus.Loading]: "Loading\u2026",
  [AppStatus.Ready]: "Connected",
  [AppStatus.Error]: "Could not reach database",
};

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.Loading);
  const [therapistCount, setTherapistCount] = useState(0);

  useEffect(() => {
    async function init() {
      try {
        const therapists = await window.electronAPI.invoke("therapist:list");
        setTherapistCount(therapists.length);
        setStatus(AppStatus.Ready);
      } catch {
        setStatus(AppStatus.Error);
      }
    }
    init();
  }, []);

  const displayText =
    status === AppStatus.Ready
      ? `${STATUS_DISPLAY[status]} \u2014 ${therapistCount} therapist(s) found`
      : STATUS_DISPLAY[status];

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Therapy Log</h1>
      <p>{displayText}</p>
    </main>
  );
}

export default App;
