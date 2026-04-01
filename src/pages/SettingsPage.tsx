import { useEffect, useState } from "react";
import { ipc, IpcError } from "@/lib/ipc";
import { Spinner } from "@/components/ui/spinner";
import log from "@/lib/logger";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restartWarning, setRestartWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const path = await ipc.getDbPath();
        setDbPath(path);
      } catch (err) {
        log.error("Failed to load database path:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleChangePath() {
    setError(null);
    try {
      const chosen = await ipc.openFileDialog();
      if (chosen === null) {
        return;
      }
      await ipc.setDbPath(chosen);
      setDbPath(chosen);
      setRestartWarning(true);
    } catch (err) {
      log.error("Failed to update database path:", err);
      setError(err instanceof IpcError ? err.message : "An unexpected error occurred.");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Spinner /></div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Database</h3>
        <p className="text-sm text-muted-foreground">
          Current location:{" "}
          <span className="font-mono">{dbPath ?? "Not configured"}</span>
        </p>
        <Button variant="outline" onClick={handleChangePath}>
          Change Database Location
        </Button>
      </section>

      {restartWarning && (
        <div
          role="alert"
          className="rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
        >
          Database path updated. Restart the app to use the new database.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
