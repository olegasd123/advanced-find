import { vi, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { ResultGrid } from '@/app/crm/result-grid'
import { SearchTableColumn } from '@/libs/types/search.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { TableColumnConfig } from '@/libs/types/app-config.types'

const createColumn = (
  attributeName: string,
  displayName?: string,
  overrides?: Partial<SearchTableColumn>
): SearchTableColumn => {
  const sourceColumn: TableColumnConfig = {
    AttributeNames: [attributeName],
    DisplayName: displayName,
  }

  return {
    sourceColumn,
    columnKey: attributeName,
    chain: [],
    attributes: [{ attributeName, valueKey: attributeName }],
    entityName: 'account',
    displayName,
    isRootColumn: true,
    ...overrides,
  }
}

const defaultColumns: SearchTableColumn[] = [
  createColumn('name', 'Name'),
  createColumn('city', 'City'),
  createColumn('revenue', 'Revenue'),
]

const defaultRows: Record<string, unknown>[] = [
  { name: 'Acme Corp', city: 'New York', revenue: '1000000' },
  { name: 'Beta Inc', city: 'London', revenue: '500000' },
  { name: 'Gamma LLC', city: 'Tokyo', revenue: '750000' },
]

const defaultAppliedFilters: AppliedFilterCondition[] = []

const renderResultGrid = (overrides?: Partial<Parameters<typeof ResultGrid>[0]>) => {
  return render(
    <ResultGrid
      results={defaultRows}
      tableColumns={defaultColumns}
      appliedFilters={defaultAppliedFilters}
      {...overrides}
    />
  )
}

// ExpandableCellText renders each value twice (hidden measurement span + visible span),
// so we scope queries to the table body and use getAllByText.
const getTableBody = (container: HTMLElement) => {
  const tbody = container.querySelector('tbody')
  if (!tbody) throw new Error('Table body not found')
  return tbody
}

// Helper to get visible cell text for a table row.
// ExpandableCellText renders text twice, so toHaveTextContent returns it doubled.
// We extract the visible text from the non-aria-hidden span instead.
const getVisibleCellTexts = (row: HTMLElement): string[] => {
  const cells = within(row).getAllByRole('cell')
  return cells.map((cell) => {
    const visibleSpans = cell.querySelectorAll('span:not([aria-hidden])')
    const lastSpan = visibleSpans[visibleSpans.length - 1]
    return lastSpan?.textContent?.trim() ?? ''
  })
}

// Headless UI buttons may render duplicate accessible elements in jsdom.
// Use native querySelector to find actual buttons reliably.
const findButtonByAriaLabel = (container: HTMLElement, label: string): HTMLButtonElement => {
  const button = container.querySelector(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`Button with aria-label="${label}" not found`)
  return button as HTMLButtonElement
}

describe('ResultGrid', () => {
  describe('rendering', () => {
    it('renders column headers', () => {
      const { container } = renderResultGrid()

      const thead = container.querySelector('thead')!
      expect(within(thead).getByText('Name')).toBeInTheDocument()
      expect(within(thead).getByText('City')).toBeInTheDocument()
      expect(within(thead).getByText('Revenue')).toBeInTheDocument()
    })

    it('renders row data in table cells', () => {
      const { container } = renderResultGrid()

      const tbody = getTableBody(container)
      expect(within(tbody).getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).getAllByText('New York').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).getAllByText('London').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).getAllByText('Tokyo').length).toBeGreaterThanOrEqual(1)
    })

    it('shows "No results found" when results array is empty', () => {
      renderResultGrid({ results: [] })

      expect(screen.getByText('No results found')).toBeInTheDocument()
    })

    it('shows error message when provided', () => {
      renderResultGrid({ errorMessage: 'Something went wrong' })

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('shows loading skeleton rows when isLoading is true', () => {
      const { container } = renderResultGrid({ isLoading: true })

      const skeletonDivs = container.querySelectorAll('.animate-pulse')
      expect(skeletonDivs.length).toBeGreaterThan(0)
    })

    it('does not show data rows when loading', () => {
      const { container } = renderResultGrid({ isLoading: true })

      const tbody = getTableBody(container)
      expect(within(tbody).queryByText('Acme Corp')).not.toBeInTheDocument()
    })
  })

  describe('table search filtering', () => {
    it('filters rows by search text in visible columns', () => {
      const { container } = renderResultGrid()

      const searchInput = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search in results"]'
      )!
      fireEvent.change(searchInput, { target: { value: 'Acme' } })

      const tbody = getTableBody(container)
      expect(within(tbody).getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).queryAllByText('Beta Inc')).toHaveLength(0)
      expect(within(tbody).queryAllByText('Gamma LLC')).toHaveLength(0)
    })

    it('shows "No matching results." when search matches nothing', () => {
      const { container } = renderResultGrid()

      const searchInput = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search in results"]'
      )!
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText('No matching results.')).toBeInTheDocument()
    })

    it('is case insensitive', () => {
      const { container } = renderResultGrid()

      const searchInput = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search in results"]'
      )!
      fireEvent.change(searchInput, { target: { value: 'acme' } })

      const tbody = getTableBody(container)
      expect(within(tbody).getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).queryAllByText('Beta Inc')).toHaveLength(0)
    })
  })

  describe('sorting', () => {
    it('sorts ascending on first column header click', () => {
      const { container } = renderResultGrid()

      const sortButton = container.querySelector<HTMLButtonElement>(
        'thead button[title*="Sort by Name"]'
      )!
      fireEvent.click(sortButton)

      const rows = getTableBody(container).querySelectorAll('tr')
      const firstRowTexts = getVisibleCellTexts(rows[0] as HTMLElement)
      const lastRowTexts = getVisibleCellTexts(rows[2] as HTMLElement)

      expect(firstRowTexts[0]).toBe('Acme Corp')
      expect(lastRowTexts[0]).toBe('Gamma LLC')
    })

    it('toggles sort direction on second click', () => {
      const { container } = renderResultGrid()

      const sortButton = container.querySelector<HTMLButtonElement>(
        'thead button[title*="Sort by Name"]'
      )!
      fireEvent.click(sortButton)
      fireEvent.click(sortButton)

      const rows = getTableBody(container).querySelectorAll('tr')
      const firstRowTexts = getVisibleCellTexts(rows[0] as HTMLElement)

      expect(firstRowTexts[0]).toBe('Gamma LLC')
    })
  })

  describe('pagination', () => {
    const paginationConfig = {
      List: [2, 5],
      SummaryTemplate: '{0}-{1} of {2}',
    }

    const manyRows = Array.from({ length: 5 }, (_, index) => ({
      name: `Company ${index + 1}`,
      city: `City ${index + 1}`,
      revenue: String((index + 1) * 100),
    }))

    it('paginates results when pagination config is provided', () => {
      const { container } = renderResultGrid({
        results: manyRows,
        pagination: paginationConfig,
      })

      const tbody = getTableBody(container)
      expect(within(tbody).getAllByText('Company 1').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).getAllByText('Company 2').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).queryAllByText('Company 3')).toHaveLength(0)
    })

    it('shows pagination summary', () => {
      renderResultGrid({
        results: manyRows,
        pagination: paginationConfig,
      })

      expect(screen.getAllByText('1-2 of 5').length).toBeGreaterThanOrEqual(1)
    })

    it('navigates to next page', () => {
      const { container } = renderResultGrid({
        results: manyRows,
        pagination: paginationConfig,
      })

      const nextButton = findButtonByAriaLabel(container, 'Next page')
      fireEvent.click(nextButton)

      const tbody = getTableBody(container)
      expect(within(tbody).getAllByText('Company 3').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).getAllByText('Company 4').length).toBeGreaterThanOrEqual(1)
      expect(within(tbody).queryAllByText('Company 1')).toHaveLength(0)
    })

    it('does not render pagination controls when config is absent', () => {
      const { container } = renderResultGrid()

      const nextButton = container.querySelector('button[aria-label="Next page"]')
      const prevButton = container.querySelector('button[aria-label="Previous page"]')

      expect(nextButton).toBeNull()
      expect(prevButton).toBeNull()
    })
  })

  describe('applied filters', () => {
    it('shows applied filter descriptions in toolbar', () => {
      const appliedFilters: AppliedFilterCondition[] = [
        {
          filterOption: {
            DisplayName: 'Company Name',
            AttributeName: 'name',
            AttributeType: 'string',
          },
          condition: 'eq',
          values: ['Acme'],
        },
      ]

      renderResultGrid({
        appliedFilters,
        showAppliedFilters: true,
      })

      expect(screen.getByText('=')).toBeInTheDocument()
      const chip = screen.getByText('Acme')
      expect(chip).toBeInTheDocument()
      expect(chip).toHaveAttribute('title', 'Company Name = Acme')
    })

    it('shows "none" when no meaningful filters applied', () => {
      renderResultGrid({
        appliedFilters: [],
        showAppliedFilters: true,
      })

      expect(screen.getByText('none')).toBeInTheDocument()
    })

    it('calls onRemoveFilterValue when chip delete button is clicked', () => {
      const onRemoveFilterValue = vi.fn()
      const appliedFilters: AppliedFilterCondition[] = [
        {
          filterOption: {
            DisplayName: 'Company Name',
            AttributeName: 'name',
            AttributeType: 'string',
          },
          condition: 'eq',
          values: ['Acme'],
        },
      ]

      const { container } = renderResultGrid({
        appliedFilters,
        showAppliedFilters: true,
        onRemoveFilterValue,
      })

      const removeButton = container.querySelector(
        'button[aria-label="Remove Company Name = Acme"]'
      )
      expect(removeButton).not.toBeNull()
      fireEvent.click(removeButton!)

      expect(onRemoveFilterValue).toHaveBeenCalledWith(0, 0)
    })

    it('hides chip delete button when filter has CannotBeRemoved flag', () => {
      const onRemoveFilterValue = vi.fn()
      const appliedFilters: AppliedFilterCondition[] = [
        {
          filterOption: {
            DisplayName: 'Company Name',
            AttributeName: 'name',
            AttributeType: 'string',
            Default: { CannotBeRemoved: true },
          },
          condition: 'eq',
          values: ['Acme'],
        },
      ]

      const { container } = renderResultGrid({
        appliedFilters,
        showAppliedFilters: true,
        onRemoveFilterValue,
      })

      const removeButton = container.querySelector(
        'button[aria-label="Remove Company Name = Acme"]'
      )
      expect(removeButton).toBeNull()
      expect(onRemoveFilterValue).not.toHaveBeenCalled()
    })

    it('hides chip delete button when filter has IsDisabled flag', () => {
      const onRemoveFilterValue = vi.fn()
      const appliedFilters: AppliedFilterCondition[] = [
        {
          filterOption: {
            DisplayName: 'Company Name',
            AttributeName: 'name',
            AttributeType: 'string',
            Default: { IsDisabled: true },
          },
          condition: 'eq',
          values: ['Acme'],
        },
      ]

      const { container } = renderResultGrid({
        appliedFilters,
        showAppliedFilters: true,
        onRemoveFilterValue,
      })

      const removeButton = container.querySelector(
        'button[aria-label="Remove Company Name = Acme"]'
      )
      expect(removeButton).toBeNull()
      expect(onRemoveFilterValue).not.toHaveBeenCalled()
    })
  })

  describe('back button', () => {
    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn()
      const { container } = renderResultGrid({ onBack })

      const backButton = findButtonByAriaLabel(container, 'Back')
      fireEvent.click(backButton)

      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('empty cell display', () => {
    it('shows dash for missing cell values', () => {
      const rows = [{ name: 'Test', city: undefined, revenue: '' }]
      const { container } = renderResultGrid({ results: rows })

      const tbody = getTableBody(container)
      const dashes = within(tbody).getAllByText('-')
      expect(dashes.length).toBeGreaterThanOrEqual(1)
    })
  })
})
