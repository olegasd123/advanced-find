import * as React from 'react'
import CrmRepository from '@/libs/data/crm/crm-repository'
import { CrmData } from '@/libs/types/entity.types'
import MockCrmRepository from '@/libs/data/crm/mock-crm-repository'

const CrmRepositoryContext = React.createContext<CrmData | null>(null)

export const useCrmRepository = () => React.useContext(CrmRepositoryContext)

export const CrmRepositoryProvider = ({ children }: { children: React.ReactNode }) => {
  const crmRepository: CrmData =
    import.meta.env.MODE === 'crm' || import.meta.env.MODE === 'crm-dev'
      ? new CrmRepository()
      : new MockCrmRepository()

  return <CrmRepositoryContext value={crmRepository}>{children}</CrmRepositoryContext>
}
