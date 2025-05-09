import { Layout } from "./app/layout"
import { Providers } from "./providers"

export const App = () => {
  return (
    <Providers>
      <Layout />
    </Providers>
  )
}