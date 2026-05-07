import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Loader2 } from "lucide-react";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [restartWarning, setRestartWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const { data: dbPath } = useSuspenseQuery({
    queryKey: queryKeys.settings.dbPath,
    queryFn: () => ipc.getDbPath(),
  });

  async function handleChangePath() {
    setError(null);
    setChanging(true);
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
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-lg space-y-6">
        <h2 className="text-xl font-semibold">Settings</h2>

        <section className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Database
          </h3>
          <div className="grid grid-cols-[1fr_auto] items-center gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Database Location</p>
              <p className="font-mono text-sm text-muted-foreground">{dbPath ?? "Not configured"}</p>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleChangePath}
              disabled={changing}
            >
              {changing
                ? <><Loader2 className="size-4 animate-spin" /> Changing…</>
                : <><FolderOpen className="size-4" /> Change Location</>}
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
    </div>
  );
}
