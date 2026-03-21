import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ipc, IpcError } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import log from "@/lib/logger";

type Step =
  | { type: "idle" }
  | { type: "busy"; message: string }
  | { type: "created"; dbPath: string }
  | { type: "validated"; dbPath: string }
  | { type: "version-mismatch"; dbPath: string; version: number }
  | { type: "error"; message: string };

export default function SetupPage() {
  const [searchParams] = useSearchParams();
  const recoveryError = searchParams.get("error");
  const [step, setStep] = useState<Step>({ type: "idle" });

  async function handleCreateNew() {
    setStep({ type: "busy", message: "Opening file dialog…" });
    try {
      const filePath = await ipc.setupOpenSaveDialog();
      if (!filePath) {
        setStep({ type: "idle" });
        return;
      }
      setStep({ type: "busy", message: "Creating database…" });
      await ipc.setupCreateDatabase(filePath);
      setStep({ type: "created", dbPath: filePath });
    } catch (err) {
      log.error("Setup create-new failed:", err);
      setStep({
        type: "error",
        message: err instanceof IpcError ? err.message : "Failed to create database.",
      });
    }
  }

  async function handleUseExisting() {
    setStep({ type: "busy", message: "Opening file dialog…" });
    try {
      const filePath = await ipc.setupOpenFileDialog();
      if (!filePath) {
        setStep({ type: "idle" });
        return;
      }
      setStep({ type: "busy", message: "Validating database…" });
      const result = await ipc.setupValidateExistingDatabase(filePath);
      if (!result.valid) {
        setStep({ type: "version-mismatch", dbPath: filePath, version: result.version });
        return;
      }
      setStep({ type: "validated", dbPath: filePath });
    } catch (err) {
      log.error("Setup use-existing failed:", err);
      setStep({
        type: "error",
        message:
          err instanceof IpcError ? err.message : "This database is incompatible or corrupted.",
      });
    }
  }

  async function handleContinue(dbPath: string, createdByApp: boolean) {
    setStep({ type: "busy", message: "Saving configuration…" });
    try {
      await ipc.setupSaveConfig({ dbPath, createdByApp });
      await ipc.setupComplete();
    } catch (err) {
      log.error("Setup complete failed:", err);
      setStep({
        type: "error",
        message: err instanceof IpcError ? err.message : "Failed to save configuration.",
      });
    }
  }

  if (step.type === "busy") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">{step.message}</p>
      </div>
    );
  }

  if (step.type === "created") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Database Created</h1>
          <p className="text-sm text-muted-foreground break-all">{step.dbPath}</p>
          <Button onClick={() => handleContinue(step.dbPath, true)}>Continue</Button>
        </div>
      </div>
    );
  }

  if (step.type === "validated") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Database Ready</h1>
          <p className="text-sm text-muted-foreground break-all">{step.dbPath}</p>
          <Button onClick={() => handleContinue(step.dbPath, false)}>Continue</Button>
        </div>
      </div>
    );
  }

  if (step.type === "version-mismatch") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Database Needs Updating</h1>
          <p className="text-sm text-muted-foreground">
            This database uses schema version {step.version} but this app requires a newer version.
            It cannot be used without an update.
          </p>
          <p className="text-sm text-muted-foreground">
            Automatic migration of user-provided databases is not supported. Please choose a
            different file or create a new database.
          </p>
          <Button variant="outline" onClick={() => setStep({ type: "idle" })}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (step.type === "error") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Something Went Wrong</h1>
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive text-left"
          >
            {step.message}
          </div>
          <Button variant="outline" onClick={() => setStep({ type: "idle" })}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // idle — welcome screen
  return (
    <div className="flex h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Welcome to Therapy Log</h1>
          <p className="text-sm text-muted-foreground">
            To get started, create a new database or connect to an existing one.
          </p>
        </div>
        {recoveryError && (
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {recoveryError}
          </div>
        )}

        <div className="space-y-3">
          <div className="rounded-lg border p-5 space-y-3">
            <div className="space-y-1">
              <h2 className="font-medium">Create New Database</h2>
              <p className="text-sm text-muted-foreground">
                Start fresh. Choose where to save your database file.
              </p>
            </div>
            <Button onClick={handleCreateNew} className="w-full">
              Create New Database
            </Button>
          </div>

          <div className="rounded-lg border p-5 space-y-3">
            <div className="space-y-1">
              <h2 className="font-medium">Use Existing Database</h2>
              <p className="text-sm text-muted-foreground">
                Open a database file you have already created with this app.
              </p>
            </div>
            <Button variant="outline" onClick={handleUseExisting} className="w-full">
              Select Database File
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
