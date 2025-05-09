import * as React from "react"
import { AppConfig } from "./config/app"
import CrmData, { CrmRepository } from "./api/crm-repository"
import CrmDesignData from "./api/crm-design"

const AppConfigurationContext = React.createContext<AppConfig | null>(null)
const CrmRepositoryContext = React.createContext<CrmRepository | null>(null)

export const useAppConfiguration = () => React.useContext(AppConfigurationContext)
export const useCrmRepository = () => React.useContext(CrmRepositoryContext)

export type ProvidersProps = {
  children: React.ReactNode
}

export const Providers = ({
  children
}: ProvidersProps) => {
  const [appConfig, setAppConfig] = React.useState<AppConfig | null>(null)

  const crmRepository: CrmRepository = import.meta.env.PROD ? new CrmData() : new CrmDesignData()

  React.useEffect(() => {
    const getAppConfig = async () => {
      const path = import.meta.env.PROD ? `/WebResources/${import.meta.env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/app.config.json` : `assets/app.config.json`
      const response = await fetch(path)
      setAppConfig(await response.json())
    }
    getAppConfig()
  }, [])

  return (
    <CrmRepositoryContext value={crmRepository}>
      <AppConfigurationContext value={appConfig}>
        {children}
      </AppConfigurationContext>
    </CrmRepositoryContext>
  )
}