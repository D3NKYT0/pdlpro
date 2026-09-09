import { useQuery } from '@tanstack/react-query'

import { indexItemCatalog, searchCatalog } from '../lib/item-icons'
import {
  catalogApi,
  ITEM_CATALOG_KEY,
  type L2CatalogItem,
} from '../services/domain/catalog.service'

export type { L2CatalogItem }

/** Shared item catalog query; HTTP lives in catalogApi, indexing in lib/. */
export function useItemCatalog() {
  const query = useQuery({
    queryKey: ITEM_CATALOG_KEY,
    queryFn: catalogApi.list,
    select: indexItemCatalog,
    staleTime: 60_000,
    retry: false,
  })
  const getById = (id: string | number | null | undefined) => {
    const key = String(id ?? '')
      .trim()
      .replace(/^l2:/i, '')
    return query.data?.byId.get(key) ?? null
  }
  return {
    ...query,
    getById,
    search: (value: string, limit = 20) => searchCatalog(query.data, value, limit),
  }
}
