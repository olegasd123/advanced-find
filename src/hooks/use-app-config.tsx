import * as React from 'react'
import { AppConfig } from '../libs/config/app-config'

const AppConfigurationContext = React.createContext<AppConfig | null>(null)

export const useAppConfiguration = () => React.useContext(AppConfigurationContext)

export const AppConfigurationProvider = ({ children }: { children: React.ReactNode }) => {
  const [appConfig, setAppConfig] = React.useState<AppConfig | null>(null)

  React.useEffect(() => {
    const getAppConfig = async () => {
      const path =
        import.meta.env.MODE === 'crm' || import.meta.env.MODE === 'crm-dev'
          ? `/WebResources/${import.meta.env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/app-config.json`
          : `assets/app-config.json`
      const response = await fetch(path)
      setAppConfig(await response.json())
    }
    getAppConfig()
  }, [])

  return <AppConfigurationContext value={appConfig}>{children}</AppConfigurationContext>
}
