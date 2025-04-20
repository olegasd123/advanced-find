import { useState, useEffect } from "react"

export interface IAppConfig {
  EntityName?: string
}

function App() {

  const [appConfig, setAppConfig] = useState<IAppConfig | null>(null)

  useEffect(() => {

    const getAppConfig = async () => {
      const response = await fetch('/WebResources/mso_/advanced-find/app.config.json')
      setAppConfig(await response.json())
    }
    getAppConfig()

  }, [])
  

  return (
    <>
      <div>asd asd asd asd </div>
      <div>{appConfig?.EntityName}</div>
    </>
  )
}

export default App
