import React, { createContext, useState, useEffect } from "react"
import { AppConfig } from "./data/configuration"
import CrmData, { CrmRepository } from "./data/crm-repository"
import CrmDesignData from "./data/crm-design"

export const AppConfigurationContext = createContext<AppConfig | null>(null)
export const CrmRepositoryContext = createContext<CrmRepository | null>(null)

export default function Providers({ children } : { children: React.ReactNode }) {
  const [ appConfig, setAppConfig ] = useState<AppConfig | null>(null)

  const crmRepository: CrmRepository = import.meta.env.PROD ? new CrmData() : new CrmDesignData()

  useEffect(() => {
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
          { children }
      </AppConfigurationContext>
    </CrmRepositoryContext>
  )
}