import { useQuery } from '@tanstack/react-query'
import { fetchMarketOverview } from '../services/financialApi'

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: fetchMarketOverview,
    staleTime: 45_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 400,
  })
}
