import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [restartWarning, setRestartWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: dbPath } = useSuspenseQuery({
    queryKey: queryKeys.settings.dbPath,
    queryFn: () => ipc.getDbPath(),
  });

  async function handleChangePath() {
    setError(null);
    try {
      const chosen = await ipc.openFileDialog();
      if (chosen === null) {
        return;
      }
      await ipc.setDbPath(chosen);
      queryClient.setQueryData(queryKeys.settings.dbPath, chosen);
      setRestartWarning(true);
    } catch (err) {
      setError(err instanceof IpcError ? err.message : "An unexpected error occurred.");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Database</h3>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Current location:{" "}
            <span className="font-mono">{dbPath ?? "Not configured"}</span>
          </p>
          <Button variant="outline" size="default" onClick={handleChangePath}>
            Change Database Location
          </Button>
        </div>
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
