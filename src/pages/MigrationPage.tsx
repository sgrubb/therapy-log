import { useState, useEffect } from "react";
import { ipc, IpcError } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import log from "@/lib/logger";

type Step =
  | { type: "loading" }
  | {
      type: "ready";
      currentVersion: number;
      requiredVersion: number;
      createdByApp: boolean;
    }
  | { type: "busy" }
  | { type: "done" }
  | { type: "error"; message: string };

export default function MigrationPage() {
  const [step, setStep] = useState<Step>({ type: "loading" });

  useEffect(() => {
    ipc
      .migrationGetInfo()
      .then((info) => setStep({ type: "ready", ...info }))
      .catch((err) => {
        log.error("migration:get-info failed:", err);
        setStep({
          type: "error",
          message: err instanceof IpcError ? err.message : "Failed to load migration info.",
        });
      });
  }, []);

  async function handleMigrate() {
    setStep({ type: "busy" });
    try {
      await ipc.migrationApply();
      await ipc.migrationComplete();
      setStep({ type: "done" });
    } catch (err) {
      log.error("Migration failed:", err);
      setStep({
        type: "error",
        message: err instanceof IpcError ? err.message : "Migration failed.",
      });
    }
  }

  if (step.type === "loading" || step.type === "busy") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {step.type === "loading" ? "Loading…" : "Applying migration…"}
        </p>
      </div>
    );
  }

  if (step.type === "done") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Migration complete. Opening app…</p>
      </div>
    );
  }

  if (step.type === "error") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Migration Failed</h1>
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive text-left"
          >
            {step.message}
          </div>
          <Button variant="outline" onClick={() => ipc.migrationQuit()}>
            Quit
          </Button>
        </div>
      </div>
    );
  }

  // ready
  const { currentVersion, requiredVersion, createdByApp } = step;
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Database Update Required</h1>
          <p className="text-sm text-muted-foreground">
            Your database is at schema version {currentVersion} but this version of Therapy Log
            requires version {requiredVersion}.
          </p>
          {!createdByApp && (
            <p className="text-sm text-amber-600">
              This database was not created by this app. Updating it may make it incompatible with
              other software.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleMigrate}>Update Database</Button>
          <Button variant="outline" onClick={() => ipc.migrationQuit()}>
            Quit
          </Button>
        </div>
      </div>
    </div>
  );
}
