import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ReactNode } from 'react'
import { Search } from '@/app/crm/search'
import { EntityConfig } from '@/libs/types/app-config.types'

const mocks = vi.hoisted(() => ({
  useAppConfig: vi.fn(),
  useCrmRepository: vi.fn(),
  useFilterState: vi.fn(),
  useEntityMetadata: vi.fn(),
  useSearchQuery: vi.fn(),
}))

vi.mock('@/hooks/use-app-config', () => ({
  useAppConfig: mocks.useAppConfig,
}))

vi.mock('@/hooks/use-crm-repository', () => ({
  useCrmRepository: mocks.useCrmRepository,
}))

vi.mock('@/app/crm/use-filter-state', () => ({
  useFilterState: mocks.useFilterState,
}))

vi.mock('@/app/crm/use-entity-metadata', () => ({
  useEntityMetadata: mocks.useEntityMetadata,
}))

vi.mock('@/app/crm/use-search-query', () => ({
  useSearchQuery: mocks.useSearchQuery,
}))

vi.mock('@/app/crm/filter-grid', () => ({
  FilterGrid: () => <div data-testid="filter-grid" />,
}))

vi.mock('@/app/crm/result-grid', () => ({
  ResultGrid: () => <div data-testid="result-grid" />,
}))

vi.mock('@/app/view-error-boundary', () => ({
  ViewErrorBoundary: ({ children }: { children: ReactNode }) => children,
}))

const entityConfig: EntityConfig = {
  LogicalName: 'account',
  FilterOptions: [],
  ResultView: {
    Columns: [],
  },
}

const createDefaultUseEntityMetadataResult = () => ({
  entitiesMetadata: [],
  searchTableColumns: [],
  tableColumnDisplayNames: {},
  metadataErrorMessage: undefined,
  isMetadataLoading: false,
})

beforeEach(() => {
  mocks.useAppConfig.mockReturnValue({
    appConfig: {
      SearchSchema: {
        Entities: [entityConfig],
        Localization: {},
      },
    },
    isLoading: false,
    errorMessage: undefined,
  })

  mocks.useCrmRepository.mockReturnValue({})

  mocks.useFilterState.mockReturnValue({
    currentEntityConfig: entityConfig,
    isResultViewVisible: false,
    appliedFilters: [],
    selectEntityByIndex: vi.fn(),
    openResultView: vi.fn(),
    closeResultView: vi.fn(),
  })

  mocks.useEntityMetadata.mockReturnValue(createDefaultUseEntityMetadataResult())

  mocks.useSearchQuery.mockReturnValue({
    results: [],
    isResultsLoading: false,
    resultsError: undefined,
    executeSearch: vi.fn(),
    resetResults: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
})

describe('Search', () => {
  it('shows skeleton while metadata is loading', () => {
    mocks.useEntityMetadata.mockReturnValue({
      ...createDefaultUseEntityMetadataResult(),
      isMetadataLoading: true,
    })

    render(<Search />)

    expect(screen.getByLabelText('Loading entity metadata')).toBeInTheDocument()
    expect(screen.queryByTestId('filter-grid')).not.toBeInTheDocument()
  })

  it('renders filter grid when metadata loading is complete', () => {
    render(<Search />)

    expect(screen.getByTestId('filter-grid')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading entity metadata')).not.toBeInTheDocument()
  })
})
