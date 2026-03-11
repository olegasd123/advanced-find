import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { FilterGrid } from '@/app/crm/filter-grid'
import { AppConfig, EntityConfig, FilterOptionConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { CrmData } from '@/libs/types/entity.types'

// --- Test helpers ---

const createFilterOption = (overrides: Partial<FilterOptionConfig> = {}): FilterOptionConfig => ({
  DisplayName: 'Test Attribute',
  AttributeName: 'testattr',
  AttributeType: 'String',
  EntityName: 'account',
  Default: { IsShown: true },
  ...overrides,
})

const createEntityConfig = (
  filterOptions: FilterOptionConfig[],
  overrides: Partial<EntityConfig> = {}
): EntityConfig => ({
  EntityName: 'account',
  FilterOptions: filterOptions,
  ResultView: { Columns: [] },
  ...overrides,
})

const createCrmRepositoryMock = (): CrmData => ({
  getEntitiesMetadata: vi.fn(async () => []),
  getAttributesMetadata: vi.fn(async (_entity: string, attributes: string[]) =>
    attributes.map((attr) => ({
      LogicalName: attr,
      DisplayName: { UserLocalizedLabel: { Label: attr } },
      AttributeType: 'String',
    }))
  ),
  getLookupAttributeMetadata: vi.fn(async () => ({ Targets: [] })),
  getPicklistAttributeMetadata: vi.fn(async () => ({
    OptionSet: { Options: [] },
  })),
  getEntities: vi.fn(async () => ({ value: [] })),
})

const createAppConfig = (overrides?: Partial<AppConfig>): AppConfig => ({
  CrmSearchSchema: {
    Presets: [],
    Localization: {
      FilterConditionLabels: {
        eq: 'equals',
        ne: 'not equals',
        null: 'is empty',
        'not-null': 'is not empty',
        like: 'contains',
        'not-like': 'does not contain',
        in: 'in',
        'not-in': 'not in',
        'begins-with': 'begins with',
        'not-begin-with': 'does not begin with',
        'ends-with': 'ends with',
        'not-end-with': 'does not end with',
      },
    },
  },
  ...overrides,
})

// Minimal context providers for testing
const AppConfigContext = React.createContext<{
  appConfig: AppConfig | null
  isLoading: boolean
  errorMessage?: string
}>({ appConfig: null, isLoading: false })

const CrmRepositoryContext = React.createContext<CrmData | null>(null)

// Patch the module contexts to use our test providers
vi.mock('@/hooks/use-app-config', () => ({
  useAppConfig: () => React.useContext(AppConfigContext),
}))

vi.mock('@/hooks/use-crm-repository', () => ({
  useCrmRepository: () => React.useContext(CrmRepositoryContext),
}))

const renderFilterGrid = (
  entityConfig: EntityConfig,
  options?: {
    onSearch?: (conditions: AppliedFilterCondition[]) => void
    crmRepository?: CrmData
    appConfig?: AppConfig
  }
) => {
  const crm = options?.crmRepository ?? createCrmRepositoryMock()
  const appConfig = options?.appConfig ?? createAppConfig()

  return render(
    <AppConfigContext.Provider value={{ appConfig, isLoading: false }}>
      <CrmRepositoryContext.Provider value={crm}>
        <FilterGrid entityConfig={entityConfig} onSearch={options?.onSearch} />
      </CrmRepositoryContext.Provider>
    </AppConfigContext.Provider>
  )
}

// Headless UI may render duplicate accessible elements in jsdom.
// Use native querySelector to find actual elements reliably.
const findButtonByAriaLabel = (container: HTMLElement, label: string): HTMLButtonElement => {
  const button = container.querySelector(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`Button with aria-label="${label}" not found`)
  return button as HTMLButtonElement
}

const findAllButtonsByAriaLabel = (container: HTMLElement, label: string): HTMLButtonElement[] => {
  return Array.from(container.querySelectorAll(`button[aria-label="${label}"]`))
}

// Combobox inputs: Headless UI may render duplicate inputs in jsdom.
// Find combobox inputs by their display value.
const findComboboxInputByValue = (
  container: HTMLElement,
  value: string
): HTMLInputElement | null => {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')
  for (const input of inputs) {
    if (input.value === value) return input
  }
  return null
}

// --- Tests ---

describe('FilterGrid', () => {
  describe('rendering', () => {
    it('renders header labels (Attribute, Condition, Value)', async () => {
      const entityConfig = createEntityConfig([])
      const { container } = renderFilterGrid(entityConfig)

      expect(container.querySelector('span')).toBeTruthy()
      expect(container.textContent).toContain('Attribute')
      expect(container.textContent).toContain('Condition')
      expect(container.textContent).toContain('Value')
    })

    it('renders default visible filter options', async () => {
      const filterOptions = [
        createFilterOption({ DisplayName: 'Account Name', AttributeName: 'name' }),
        createFilterOption({
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: false },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
      })

      expect(findComboboxInputByValue(container, 'City')).toBeNull()
    })

    it('renders multiple default visible filter options', async () => {
      const filterOptions = [
        createFilterOption({ DisplayName: 'Account Name', AttributeName: 'name' }),
        createFilterOption({ DisplayName: 'Status', AttributeName: 'statecode' }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
        expect(findComboboxInputByValue(container, 'Status')).toBeTruthy()
      })
    })
  })

  describe('add condition', () => {
    it('adds a new empty filter row when "Add a condition" is clicked', async () => {
      const entityConfig = createEntityConfig([
        createFilterOption({ DisplayName: 'Account Name', AttributeName: 'name' }),
      ])
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
      })

      const addButton = findButtonByAriaLabel(container, 'Add a condition')
      fireEvent.click(addButton)

      const deleteButtons = findAllButtonsByAriaLabel(container, 'Delete condition')
      expect(deleteButtons.length).toBe(2)
    })
  })

  describe('delete condition', () => {
    it('removes a filter row when delete button is clicked', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Account Name',
          AttributeName: 'name',
          Default: { IsShown: true, CannotBeRemoved: false },
        }),
        createFilterOption({
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: true, CannotBeRemoved: false },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
        expect(findComboboxInputByValue(container, 'City')).toBeTruthy()
      })

      const deleteButtons = findAllButtonsByAriaLabel(container, 'Delete condition')
      fireEvent.click(deleteButtons[1])

      expect(findComboboxInputByValue(container, 'City')).toBeNull()
      expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
    })

    it('disables delete button when condition has CannotBeRemoved flag', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Required Field',
          AttributeName: 'required',
          Default: { IsShown: true, CannotBeRemoved: true },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Required Field')).toBeTruthy()
      })

      const deleteButton = findButtonByAriaLabel(container, 'Delete condition')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('search', () => {
    it('calls onSearch with filter conditions when Search is clicked', async () => {
      const onSearch = vi.fn()
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Account Name',
          AttributeName: 'name',
          Default: { IsShown: true, Condition: 'eq', Values: ['Acme'] },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig, { onSearch })

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
      })

      const searchButton = findButtonByAriaLabel(container, 'Search')
      fireEvent.click(searchButton)

      expect(onSearch).toHaveBeenCalledTimes(1)
      const conditions = onSearch.mock.calls[0][0] as AppliedFilterCondition[]
      expect(conditions.length).toBeGreaterThanOrEqual(1)
      expect(conditions[0].filterOption?.AttributeName).toBe('name')
    })

    it('excludes filter rows without a selected attribute', async () => {
      const onSearch = vi.fn()
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Account Name',
          AttributeName: 'name',
          Default: { IsShown: true, Condition: 'eq', Values: ['test'] },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig, { onSearch })

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
      })

      // Add an empty condition row
      const addButton = findButtonByAriaLabel(container, 'Add a condition')
      fireEvent.click(addButton)

      const searchButton = findButtonByAriaLabel(container, 'Search')
      fireEvent.click(searchButton)

      expect(onSearch).toHaveBeenCalledTimes(1)
      const conditions = onSearch.mock.calls[0][0] as AppliedFilterCondition[]
      // The empty row should not produce a condition with a filterOption
      const conditionsWithAttribute = conditions.filter((c) => c.filterOption?.AttributeName)
      expect(conditionsWithAttribute.length).toBe(1)
    })
  })

  describe('reset filters', () => {
    it('restores default filters after reset', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Account Name',
          AttributeName: 'name',
          Default: { IsShown: true, CannotBeRemoved: false },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Account Name')).toBeTruthy()
      })

      // Add an extra condition
      const addButton = findButtonByAriaLabel(container, 'Add a condition')
      fireEvent.click(addButton)
      expect(findAllButtonsByAriaLabel(container, 'Delete condition').length).toBe(2)

      // Click reset
      const resetButton = findButtonByAriaLabel(container, 'Reset filters')
      fireEvent.click(resetButton)

      // Confirm the reset dialog (rendered in a portal outside container)
      await waitFor(() => {
        const dialogButtons =
          document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
        expect(dialogButtons.length).toBeGreaterThan(0)
      })

      const dialogButtons =
        document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
      const resetConfirmButton = Array.from(dialogButtons).find((button) =>
        button.textContent?.includes('Reset')
      )
      expect(resetConfirmButton).toBeTruthy()
      fireEvent.click(resetConfirmButton!)

      // Should be back to 1 filter
      await waitFor(() => {
        expect(findAllButtonsByAriaLabel(container, 'Delete condition').length).toBe(1)
      })
    })
  })

  describe('filter groups', () => {
    it('renders group header with AND/OR selector', async () => {
      const filterOptions = [
        createFilterOption({
          Id: 'opt_0',
          DisplayName: 'Name',
          AttributeName: 'name',
          Default: { IsShown: true },
        }),
        createFilterOption({
          Id: 'opt_1',
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: true },
        }),
        createFilterOption({
          Id: 'opt_2',
          DisplayName: 'Country',
          AttributeName: 'country',
          Default: { IsShown: true },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions, {
        DefaultFilterGroups: [
          {
            FilterOptionIds: ['opt_1', 'opt_2'],
            Operator: 'or',
            IsOperatorEditable: true,
            IsRemovable: true,
          },
        ],
      })
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Name')).toBeTruthy()
        expect(findComboboxInputByValue(container, 'City')).toBeTruthy()
        expect(findComboboxInputByValue(container, 'Country')).toBeTruthy()
      })

      expect(container.textContent).toContain('Group')
      const ungroupButton = findButtonByAriaLabel(container, 'Ungroup')
      expect(ungroupButton).toBeTruthy()
    })

    it('removes group when ungroup button is clicked', async () => {
      const filterOptions = [
        createFilterOption({
          Id: 'opt_0',
          DisplayName: 'Name',
          AttributeName: 'name',
          Default: { IsShown: true },
        }),
        createFilterOption({
          Id: 'opt_1',
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: true },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions, {
        DefaultFilterGroups: [
          {
            FilterOptionIds: ['opt_0', 'opt_1'],
            Operator: 'and',
            IsOperatorEditable: true,
            IsRemovable: true,
          },
        ],
      })
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(container.textContent).toContain('Group')
      })

      const ungroupButton = findButtonByAriaLabel(container, 'Ungroup')
      fireEvent.click(ungroupButton)

      expect(container.textContent).not.toContain('Group')
    })

    it('emits group info in search conditions', async () => {
      const onSearch = vi.fn()
      const filterOptions = [
        createFilterOption({
          Id: 'opt_0',
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: true, Condition: 'eq', Values: ['NY'] },
        }),
        createFilterOption({
          Id: 'opt_1',
          DisplayName: 'State',
          AttributeName: 'state',
          Default: { IsShown: true, Condition: 'eq', Values: ['CA'] },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions, {
        DefaultFilterGroups: [
          {
            FilterOptionIds: ['opt_0', 'opt_1'],
            Operator: 'or',
            IsOperatorEditable: true,
            IsRemovable: true,
          },
        ],
      })
      const { container } = renderFilterGrid(entityConfig, { onSearch })

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'City')).toBeTruthy()
      })

      const searchButton = findButtonByAriaLabel(container, 'Search')
      fireEvent.click(searchButton)

      expect(onSearch).toHaveBeenCalledTimes(1)
      const conditions = onSearch.mock.calls[0][0] as AppliedFilterCondition[]
      const groupedConditions = conditions.filter((c) => c.groupId !== undefined)
      expect(groupedConditions.length).toBe(2)
      expect(groupedConditions[0].groupOperator).toBe('or')
      expect(groupedConditions[1].groupOperator).toBe('or')
    })

    it('disables ungroup button when group is not removable', async () => {
      const filterOptions = [
        createFilterOption({
          Id: 'opt_0',
          DisplayName: 'Name',
          AttributeName: 'name',
          Default: { IsShown: true },
        }),
        createFilterOption({
          Id: 'opt_1',
          DisplayName: 'City',
          AttributeName: 'city',
          Default: { IsShown: true },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions, {
        DefaultFilterGroups: [
          {
            FilterOptionIds: ['opt_0', 'opt_1'],
            Operator: 'and',
            IsOperatorEditable: false,
            IsRemovable: false,
          },
        ],
      })
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(container.textContent).toContain('Group')
      })

      const ungroupButton = findButtonByAriaLabel(container, 'Ungroup')
      expect(ungroupButton).toBeDisabled()
    })
  })

  describe('disabled filters', () => {
    it('renders disabled filter option with IsDisabled flag', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Locked Field',
          AttributeName: 'locked',
          Default: { IsShown: true, IsDisabled: true, Condition: 'eq', Values: ['fixed'] },
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Locked Field')).toBeTruthy()
      })

      const attributeInput = findComboboxInputByValue(container, 'Locked Field')!
      expect(attributeInput).toBeDisabled()
    })
  })

  describe('drag handle', () => {
    it('renders drag handles for groupable conditions', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Name',
          AttributeName: 'name',
          Default: { IsShown: true },
          Groupable: true,
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Name')).toBeTruthy()
      })

      const dragHandle = container.querySelector<HTMLElement>('[aria-label="Drag condition"]')!
      expect(dragHandle).toBeTruthy()
      expect(dragHandle.getAttribute('aria-disabled')).toBe('false')
    })

    it('disables drag handle for non-groupable conditions', async () => {
      const filterOptions = [
        createFilterOption({
          DisplayName: 'Fixed',
          AttributeName: 'fixed',
          Default: { IsShown: true },
          Groupable: false,
        }),
      ]
      const entityConfig = createEntityConfig(filterOptions)
      const { container } = renderFilterGrid(entityConfig)

      await waitFor(() => {
        expect(findComboboxInputByValue(container, 'Fixed')).toBeTruthy()
      })

      const dragHandle = container.querySelector<HTMLElement>('[aria-label="Drag condition"]')!
      expect(dragHandle.getAttribute('aria-disabled')).toBe('true')
    })
  })
})
