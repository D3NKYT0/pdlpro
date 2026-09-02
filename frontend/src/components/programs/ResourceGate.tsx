import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { programsApi } from "../../services/domain/programs.service";
import { Empty, ErrorNotice, Loading } from "./ProgramUI";

export function ResourceGate({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const query = useQuery({
    queryKey: ["resources"],
    queryFn: programsApi.resources,
    staleTime: 15000,
    refetchInterval: 30000,
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  if (query.data?.some((r) => r.code === code && !r.enabled))
    return (
      <section className="card program-section">
        <h1>Recurso temporariamente desativado</h1>
        <Empty>
          A equipe pausou este módulo. Seus dados e seu progresso continuam
          preservados.
        </Empty>
      </section>
    );
  return <>{children}</>;
}
