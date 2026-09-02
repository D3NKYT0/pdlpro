import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function useProgramAction() {
  const client = useQueryClient();
  const action = useAsyncAction();
  async function run(
    operation: () => Promise<unknown>,
    message = "Alteração salva.",
  ) {
    const result = await action.run(async () => {
      try {
        await operation();
        toast.success(message);
      } finally {
        await client.invalidateQueries();
      }
    });
    return result.ok;
  }
  return { busy: action.pending, error: action.error, run };
}
