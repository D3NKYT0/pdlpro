import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useProgramAction() {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<unknown>(null);
  async function run(
    action: () => Promise<unknown>,
    message = "Alteração salva.",
  ) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      toast.success(message);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      await client.invalidateQueries();
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
