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
import { EntityConfig } from '../../libs/config/app-config'
import { AppliedFilterCondition } from '../../libs/utils/crm-search'

const noValueConditions = new Set(['null', 'not-null', 'today', 'tomorrow', 'yesterday'])

const formatConditionValue = (condition: AppliedFilterCondition): string => {
  const conditionName = condition.condition ?? ''
  if (noValueConditions.has(conditionName)) {
    return conditionName
  }
  return condition.values.map((value) => String(value)).join(', ')
}

export const ResultGrid = ({
  entityConfig,
  results,
  isLoading,
  errorMessage,
  appliedFilters,
  onBack,
}: {
  entityConfig: EntityConfig
  results: Record<string, unknown>[]
  isLoading?: boolean
  errorMessage?: string
  appliedFilters: AppliedFilterCondition[]
  onBack?: () => void
}) => {
  const columns = entityConfig.ResultView.TableColumns
  const appliedFilterDescriptions = appliedFilters
    .filter((condition) => condition.filterOption?.AttributeName && condition.condition)
    .map((condition) => {
      const attributeName =
        condition.filterOption?.DisplayName ?? condition.filterOption?.AttributeName
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
        <div className="w-64 grow-8 text-sm text-zinc-600">
          {appliedFilterDescriptions.length > 0
            ? `Applied filters: ${appliedFilterDescriptions.join('; ')}`
            : 'Applied filters: none'}
        </div>
      </div>

      <div className="pt-4">
        <Table striped>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeader key={column.AttributeName}>
                  {column.DisplayName ?? column.AttributeName}
                </TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {columns.map((column) => (
                    <TableColumn key={`${column.AttributeName}-${index}`}>
                      <div className="h-4 w-full rounded bg-zinc-200 animate-pulse" />
                    </TableColumn>
                  ))}
                </TableRow>
              ))}

            {!isLoading && errorMessage && (
              <TableRow>
                <TableColumn colSpan={columns.length}>{errorMessage}</TableColumn>
              </TableRow>
            )}

            {!isLoading && !errorMessage && results.length === 0 && (
              <TableRow>
                <TableColumn colSpan={columns.length}>No results found.</TableColumn>
              </TableRow>
            )}

            {!isLoading &&
              !errorMessage &&
              results.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => {
                    const value = row[column.AttributeName]
                    return (
                      <TableColumn key={`${column.AttributeName}-${index}`}>
                        {value === undefined || value === null || value === ''
                          ? '-'
                          : String(value)}
                      </TableColumn>
                    )
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
