import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FilterItemValue } from '@/app/crm/filter-item-value'
import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { CrmData } from '@/libs/types/entity.types'

const CrmRepositoryContext = React.createContext<CrmData | null>(null)

vi.mock('@/hooks/use-crm-repository', () => ({
  useCrmRepository: () => React.useContext(CrmRepositoryContext),
}))

const createCrmRepositoryMock = (): CrmData => ({
  getEntitiesMetadata: vi.fn(async () => [
    {
      LogicalName: 'systemuser',
      EntitySetName: 'systemusers',
      DisplayName: { UserLocalizedLabel: { Label: 'System User' } },
      DisplayCollectionName: { UserLocalizedLabel: { Label: 'System Users' } },
    },
  ]),
  getAttributesMetadata: vi.fn(async () => []),
  getLookupAttributeMetadata: vi.fn(async () => ({ Targets: ['systemuser'] })),
  getPicklistAttributeMetadata: vi.fn(async () => ({ OptionSet: { Options: [] } })),
  getEntities: vi.fn(async (_entityName, _attributes, options) => {
    const filter = String(options?.filter ?? '').toLowerCase()

    if (filter.includes('las')) {
      return [{ systemuserid: 'las-id', fullname: 'LAS Candidate' }]
    }

    if (filter.includes('007')) {
      return [{ systemuserid: '007-id', fullname: 'Agent 007' }]
    }

    return []
  }),
})

const createOnDemandLookupFilterOption = (): FilterOptionConfig => ({
  DisplayName: 'Owner',
  AttributeName: 'ownerid',
  AttributeType: 'Lookup',
  EntityName: 'account',
  Default: { Condition: 'eq', IsShown: true },
  Selection: { Multiple: true, SearchDelay: 1, MinCharacters: 3 },
  Lookup: { AttributeNames: ['fullname'] },
})

describe('FilterItemValue', () => {
  it('keeps selected values when on-demand search results are replaced by a new query', async () => {
    const crmRepository = createCrmRepositoryMock()
    const onConditionValuesChanged = vi.fn()

    const { container } = render(
      <CrmRepositoryContext.Provider value={crmRepository}>
        <FilterItemValue
          filterOption={createOnDemandLookupFilterOption()}
          selectedFilterCondition="eq"
          onConditionValuesChanged={onConditionValuesChanged}
        />
      </CrmRepositoryContext.Provider>
    )

    await waitFor(() => {
      const input = container.querySelector<HTMLInputElement>('input[placeholder="Search values"]')
      expect(input).toBeTruthy()
    })

    const searchInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="Search values"]'
    )
    expect(searchInput).toBeTruthy()

    fireEvent.change(searchInput!, { target: { value: 'las' } })

    await waitFor(() => {
      expect(screen.getByText('LAS Candidate')).toBeInTheDocument()
    })
    fireEvent.keyDown(searchInput!, { key: 'Enter' })

    await waitFor(() => {
      const removeSelectedButton = container.querySelector(
        'button[aria-label="Remove LAS Candidate"]'
      )
      expect(removeSelectedButton).toBeTruthy()
    })

    fireEvent.change(searchInput!, { target: { value: '007' } })

    await waitFor(() => {
      expect(screen.getByText('Agent 007')).toBeInTheDocument()
    })

    await waitFor(() => {
      const removeSelectedButton = container.querySelector(
        'button[aria-label="Remove LAS Candidate"]'
      )
      expect(removeSelectedButton).toBeTruthy()
    })

    await waitFor(() => {
      const lastCall = onConditionValuesChanged.mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual(['las-id'])
    })
  })
})
