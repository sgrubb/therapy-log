import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  queryKey: readonly unknown[];
}

export function RefreshButton({ queryKey }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  async function handleRefresh() {
    setSpinning(true);
    await queryClient.invalidateQueries({ queryKey });
    setSpinning(false);
  }

  return (
    <Button variant="outline" size="sm" className="ml-8" onClick={handleRefresh} aria-label="Refresh">
      <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
      Refresh
    </Button>
  );
}
