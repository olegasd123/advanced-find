import { Layout } from '@/app/layout'
import { CrmRepositoryProvider } from '@/hooks/use-crm-repository'
import { AppConfigProvider } from '@/hooks/use-app-config'

export const App = () => {
  return (
    <AppConfigProvider>
      <CrmRepositoryProvider>
        <Layout />
      </CrmRepositoryProvider>
    </AppConfigProvider>
  )
}
