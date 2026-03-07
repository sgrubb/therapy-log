export function ConflictAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-800"
    >
      <strong className="block font-medium">Conflict Detected</strong>
      {message}
    </div>
  );
}
