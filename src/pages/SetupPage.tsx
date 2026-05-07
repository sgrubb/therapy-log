import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw, Database, FolderOpen, Loader2, UserPlus } from "lucide-react";
import { ipc, IpcError } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import log from "@/lib/logger";
import type { SetupTherapist } from "@shared/types/setup";

type Step =
  | { type: "idle" }
  | { type: "picking-new" }
  | { type: "picking-existing" }
  | { type: "busy"; message: string }
  | { type: "created"; dbPath: string }
  | { type: "select-therapist"; dbPath: string; therapists: SetupTherapist[] }
  | { type: "create-therapist"; dbPath: string; therapists: SetupTherapist[] }
  | { type: "version-mismatch"; dbPath: string; version: number }
  | { type: "error"; message: string };

export default function SetupPage() {
  const [searchParams] = useSearchParams();
  const recoveryError = searchParams.get("error");
  const [step, setStep] = useState<Step>({ type: "idle" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string }>({});

  function resetNameForm() {
    setFirstName("");
    setLastName("");
    setFieldErrors({});
  }

  async function handleCreateNew() {
    setStep({ type: "picking-new" });
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
    setStep({ type: "picking-existing" });
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
      setStep({ type: "busy", message: "Loading therapists…" });
      const therapists = await ipc.setupListTherapists(filePath);
      setStep({ type: "select-therapist", dbPath: filePath, therapists });
    } catch (err) {
      log.error("Setup use-existing failed:", err);
      setStep({
        type: "error",
        message: "This database is incompatible or corrupted.",
      });
    }
  }

  async function handleContinue(
    dbPath: string,
    createdByApp: boolean,
    initialSelectedTherapistId?: number,
  ) {
    setStep({ type: "busy", message: "Saving configuration…" });
    try {
      await ipc.setupSaveConfig({ dbPath, createdByApp, initialSelectedTherapistId });
      await ipc.setupComplete();
    } catch (err) {
      log.error("Setup complete failed:", err);
      setStep({
        type: "error",
        message: err instanceof IpcError ? err.message : "Failed to save configuration.",
      });
    }
  }

  async function handleCreateTherapist(dbPath: string, isAdmin: boolean) {
    const errors: { firstName?: string; lastName?: string } = {};
    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    }
    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setStep({ type: "busy", message: "Creating your account…" });
    try {
      const { id } = await ipc.setupCreateTherapist({
        dbPath,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        startDate: new Date(),
        isAdmin,
      });
      await handleContinue(dbPath, isAdmin, id);
    } catch (err) {
      log.error("Setup create-therapist failed:", err);
      setStep({
        type: "error",
        message: err instanceof IpcError ? err.message : "Failed to create therapist.",
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
        <div className="max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Create Your Account</h1>
            <p className="text-sm text-muted-foreground">
              You'll be set up as an admin therapist so you can manage the system.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" error={fieldErrors.firstName}>
                <Input
                  aria-label="First name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.firstName}
                />
              </Field>
              <Field label="Last Name *" error={fieldErrors.lastName}>
                <Input
                  aria-label="Last name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.lastName}
                />
              </Field>
            </div>
          </div>
          <Button onClick={() => handleCreateTherapist(step.dbPath, true)}>
            <ArrowRight className="size-4" />
            Create Account &amp; Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step.type === "select-therapist") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Who are you?</h1>
            <p className="text-sm text-muted-foreground">
              Select your name to continue, or create a new account.
            </p>
          </div>
          <div className="space-y-2">
            {step.therapists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No therapists found in this database.</p>
            ) : (
              step.therapists.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleContinue(step.dbPath, false, t.id)}
                  className={
                    "w-full text-left rounded-lg border px-4 py-3 text-sm font-medium " +
                    "hover:bg-accent hover:text-accent-foreground transition-colors"
                  }
                >
                  {t.first_name} {t.last_name}
                </button>
              ))
            )}
          </div>
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetNameForm();
                setStep({ type: "create-therapist", dbPath: step.dbPath, therapists: step.therapists });
              }}
            >
              <UserPlus className="size-4" />
              I'm not in this list
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step.type === "create-therapist") {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Create Your Account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your name to create an account. An admin can grant you additional permissions
              later.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" error={fieldErrors.firstName}>
                <Input
                  aria-label="First name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.firstName}
                />
              </Field>
              <Field label="Last Name *" error={fieldErrors.lastName}>
                <Input
                  aria-label="Last name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.lastName}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                resetNameForm();
                setStep({
                  type: "select-therapist",
                  dbPath: step.dbPath,
                  therapists: step.therapists,
                });
              }}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={() => handleCreateTherapist(step.dbPath, false)}>
              <ArrowRight className="size-4" />
              Create Account &amp; Continue
            </Button>
          </div>
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
            <ArrowLeft className="size-4" />
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
            <RotateCcw className="size-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // idle — welcome screen (also rendered while picking a file)
  const pickingNew = step.type === "picking-new";
  const pickingExisting = step.type === "picking-existing";
  const pickingAny = pickingNew || pickingExisting;

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
            <Button onClick={handleCreateNew} className="w-full" disabled={pickingAny}>
              {pickingNew
                ? <><Loader2 className="size-4 animate-spin" /> Opening…</>
                : <><Database className="size-4" /> Create New Database</>}
            </Button>
          </div>

          <div className="rounded-lg border p-5 space-y-3">
            <div className="space-y-1">
              <h2 className="font-medium">Use Existing Database</h2>
              <p className="text-sm text-muted-foreground">
                Open a database file you have already created with this app.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleUseExisting}
              className="w-full"
              disabled={pickingAny}
            >
              {pickingExisting
                ? <><Loader2 className="size-4 animate-spin" /> Opening…</>
                : <><FolderOpen className="size-4" /> Select Database File</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
