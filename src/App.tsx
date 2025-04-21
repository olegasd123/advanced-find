import { useState, useEffect } from "react"

export interface IAppConfig {
  EntityName?: string
}

function App() {

  const [appConfig, setAppConfig] = useState<IAppConfig | null>(null)

  useEffect(() => {
    
    const getAppConfig = async () => {
      const path = import.meta.env.PROD ? `/WebResources/${import.meta.env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/app.config.json` : `assets/app.config.json`
      const response = await fetch(path)
      setAppConfig(await response.json())
    }
    getAppConfig()

  }, [])
  

  return (
    <>
      <div>asd asd asd asd</div>
      <div>{appConfig?.EntityName}</div>
    </>
  )
}

export default App
