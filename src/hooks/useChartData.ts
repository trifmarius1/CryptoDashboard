import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchCandles, fetchQuote } from '../services/financialApi'
import type { Timeframe } from '../types'

export function useChartData(assetId: string, timeframe: Timeframe) {
  return useQuery({
    queryKey: ['candles', assetId, timeframe],
    queryFn: () => fetchCandles(assetId, timeframe),
    // Charts feel instant when revisiting / flipping timeframes
    staleTime: 90_000,
    gcTime: 1000 * 60 * 30,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 400,
    placeholderData: keepPreviousData,
  })
}

export function useAssetQuote(assetId: string) {
  return useQuery({
    queryKey: ['quote', assetId],
    queryFn: () => fetchQuote(assetId),
    staleTime: 45_000,
    gcTime: 1000 * 60 * 20,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 400,
  })
}
