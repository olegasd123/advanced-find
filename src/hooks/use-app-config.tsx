import * as React from 'react'
import { AppConfig } from '../libs/types/app-config.types'
import { createErrorReporter } from '../libs/utils/error-reporter'

interface AppConfigState {
  appConfig: AppConfig | null
  isLoading: boolean
  errorMessage?: string
}

const AppConfigContext = React.createContext<AppConfigState>({
  appConfig: null,
  isLoading: true,
})

const errorReporter = createErrorReporter('AppConfigProvider')

export const useAppConfig = () => React.useContext(AppConfigContext)

export const AppConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [appConfig, setAppConfig] = React.useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string>()

  React.useEffect(() => {
    let isCancelled = false

    const loadAppConfig = async () => {
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
        const userMessage = errorReporter.reportAsyncError({
          location: 'load app configuration',
          error,
          userMessage: 'Failed to load app configuration.',
          context: { path },
        })
        setErrorMessage(userMessage)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadAppConfig()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <AppConfigContext value={{ appConfig, isLoading, errorMessage }}>{children}</AppConfigContext>
  )
}
