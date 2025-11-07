import { Layout } from "./app/layout"
import { CrmRepositoryProvider } from "./hooks/use-crm-repository"
import { AppConfigurationProvider } from "./hooks/use-app-config"

export const App = () => {
  return (
    <AppConfigurationProvider>
      <CrmRepositoryProvider>
          <Layout />
      </CrmRepositoryProvider>
    </AppConfigurationProvider>
  )
}