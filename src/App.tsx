import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dashboard } from './components/Dashboard'
import { LiveTicksProvider } from './context/LiveTicksContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      retryDelay: 400,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveTicksProvider>
        <Dashboard />
      </LiveTicksProvider>
    </QueryClientProvider>
  )
}
