import { ArrowLeftIcon } from '@heroicons/react/16/solid'
import { Button } from '../../../vendor/catalyst-ui-kit/typescript/button'
import {
  Table,
  TableBody,
  TableColumn,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../vendor/catalyst-ui-kit/typescript/table'
import { AppliedFilterCondition, SearchTableColumn } from '../../libs/utils/crm-search'
import { getTargetFilterOption } from '../../libs/utils/filter'

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

const hasConditionValue = (condition: AppliedFilterCondition): boolean => {
  if (noValueConditions.has(condition.condition ?? '')) {
    return true
  }

  return condition.values.some((value) => {
    if (typeof value === 'number') {
      return true
    }

    return value.trim().length > 0
  })
}

const formatConditionValue = (condition: AppliedFilterCondition): string => {
  const conditionName = condition.condition ?? ''
  if (noValueConditions.has(conditionName)) {
    return conditionName
  }
  return condition.values.map((value) => String(value)).join(', ')
}

const getColumnHeader = (
  column: SearchTableColumn,
  tableColumnDisplayNames?: Record<string, string>
): string => {
  return (
    column.displayName ??
    tableColumnDisplayNames?.[column.columnKey] ??
    column.attributes.map((attribute) => attribute.attributeName).join(' | ')
  )
}

const getColumnCellValue = (column: SearchTableColumn, row: Record<string, unknown>): string => {
  const values = column.attributes.map((attribute) => {
    const value = row[attribute.valueKey]
    if (value === undefined || value === null || value === '') {
      return ''
    }

    return String(value)
  })

  if (values.every((value) => value.length === 0)) {
    return '-'
  }

  if (column.attributesFormat && column.attributesFormat.trim().length > 0) {
    const formattedValue = column.attributesFormat.replace(/\{(\d+)\}/g, (_, indexValue: string) => {
      const index = Number(indexValue)
      return values[index] ?? ''
    })
    return formattedValue.trim().length === 0 ? '-' : formattedValue
  }

  const joinedValue = values.filter((value) => value.length > 0).join(' ')
  return joinedValue.trim().length === 0 ? '-' : joinedValue
}

export const ResultGrid = ({
  results,
  tableColumns,
  tableColumnDisplayNames,
  isLoading,
  errorMessage,
  appliedFilters,
  onBack,
}: {
  results: Record<string, unknown>[]
  tableColumns: SearchTableColumn[]
  tableColumnDisplayNames?: Record<string, string>
  isLoading?: boolean
  errorMessage?: string
  appliedFilters: AppliedFilterCondition[]
  onBack?: () => void
}) => {
  const columns = tableColumns
  const columnSpan = Math.max(columns.length, 1)
  const appliedFilterDescriptions = appliedFilters
    .filter(
      (condition) =>
        Boolean(
          getTargetFilterOption(condition.filterOption)?.AttributeName && condition.condition
        ) && hasConditionValue(condition)
    )
    .map((condition) => {
      const targetFilterOption = getTargetFilterOption(condition.filterOption)
      const attributeName = targetFilterOption?.DisplayName ?? targetFilterOption?.AttributeName
      return `${attributeName} ${condition.condition} ${formatConditionValue(condition)}`
    })

  return (
    <>
      <div className="flex flex-row gap-4 py-4 border-b border-b-gray-300">
        <div className="w-36 grow-2">
          <Button outline onClick={onBack} aria-label="Back" title="Back">
            <ArrowLeftIcon />
            <span className="font-normal">Back</span>
          </Button>
        </div>
        <div className="w-36 grow-3"></div>
        <div className="w-24 grow-2"></div>
        <div className="w-64 grow-8"></div>
      </div>

      <div className="pt-4">
        <Table striped dense>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeader key={column.columnKey}>
                  {getColumnHeader(column, tableColumnDisplayNames)}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <TableColumn key={`${column.columnKey}-${index}`}>
                      <div className="h-4 w-full rounded bg-zinc-200 animate-pulse" />
                    </TableColumn>
                  ))}
                </TableRow>
              ))}

            {!isLoading && errorMessage && (
              <TableRow>
                <TableColumn colSpan={columnSpan}>{errorMessage}</TableColumn>
              </TableRow>
            )}

            {!isLoading && !errorMessage && results.length === 0 && (
              <TableRow>
                <TableColumn colSpan={columnSpan}>No results found.</TableColumn>
              </TableRow>
            )}

            {!isLoading &&
              !errorMessage &&
              results.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => {
                    return (
                      <TableColumn key={`${column.columnKey}-${index}`}>
                        {getColumnCellValue(column, row)}
                      </TableColumn>
                    )
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="pt-3 text-sm text-zinc-600">
        {appliedFilterDescriptions.length > 0
          ? `Applied filters: ${appliedFilterDescriptions.join('; ')}`
          : 'Applied filters: none'}
      </div>
    </>
  )
}
