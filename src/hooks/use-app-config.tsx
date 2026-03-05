import * as React from 'react'
import { AppConfig } from '../libs/config/app-config'

interface AppConfigurationState {
  appConfig: AppConfig | null
  isLoading: boolean
  errorMessage?: string
}

const AppConfigurationContext = React.createContext<AppConfigurationState>({
  appConfig: null,
  isLoading: true,
})

export const useAppConfiguration = () => React.useContext(AppConfigurationContext)

export const AppConfigurationProvider = ({ children }: { children: React.ReactNode }) => {
  const [appConfig, setAppConfig] = React.useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string>()

  React.useEffect(() => {
    let isCancelled = false

    const getAppConfig = async () => {
      const path =
        import.meta.env.MODE === 'crm' || import.meta.env.MODE === 'crm-dev'
          ? `./app-config.json`
          : `assets/app-config.json`
      setIsLoading(true)
      setErrorMessage(undefined)

      try {
        const response = await fetch(path)
        if (!response.ok) {
          throw new Error(`Config request failed with status ${response.status}`)
        }

        const config = (await response.json()) as AppConfig
        if (isCancelled) {
          return
        }

        setAppConfig(config)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setAppConfig(null)
        setErrorMessage('Failed to load app configuration.')
        console.error('AppConfigurationProvider', error)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    getAppConfig()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <AppConfigurationContext value={{ appConfig, isLoading, errorMessage }}>
      {children}
    </AppConfigurationContext>
  )
}
