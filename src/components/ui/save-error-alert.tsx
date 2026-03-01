export function SaveErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
    >
      {message}
    </div>
  );
}
