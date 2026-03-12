import * as React from 'react'
import { FilterOptionConfig } from '@/libs/types/app-config.types'
import { useCrmRepository } from '@/hooks/use-crm-repository'
import { createErrorReporter } from '@/libs/utils/error-reporter'
import { buildLookupSearchFilter } from '@/libs/utils/crm/odata-lookup-search'
import { ConditionValue } from '@/libs/types/filter.types'
import {
  ConditionValueOption,
  formatLookupDisplayValue,
  isNoValueCondition,
  normalizeEntityItems,
  sanitizeSelectableValues,
} from './item-value.helpers'

const errorReporter = createErrorReporter('ItemValue')

interface LookupMetadata {
  entityCollectionName: string
  idAttributeName: string
  lookupAttributeNames: string[]
  allAttributeNames: string[]
}

export const useSelectableOptions = (
  filterOption: FilterOptionConfig | undefined,
  values: ConditionValue[] | undefined,
  setConditionValues: React.Dispatch<React.SetStateAction<ConditionValue[]>>
) => {
  const [selectableOptions, setSelectableOptions] = React.useState<ConditionValueOption[]>([])
  const [isSelectableOptionsLoading, setIsSelectableOptionsLoading] = React.useState(false)
  const [selectableOptionsErrorMessage, setSelectableOptionsErrorMessage] = React.useState<
    string | undefined
  >()

  const crmRepository = useCrmRepository()
  const selectableOptionsRequestId = React.useRef(0)
  const valuesRef = React.useRef<ConditionValue[] | undefined>(values)
  const lookupMetadataRef = React.useRef<LookupMetadata | null>(null)
  const selectedOptionsCacheRef = React.useRef<Map<string, ConditionValueOption>>(new Map())

  React.useEffect(() => {
    valuesRef.current = values
  }, [values])

  const loadSelectableOptions = React.useCallback(
    async (
      targetFilterOption: FilterOptionConfig | undefined,
      condition: string | null | undefined,
      defaultValues: ConditionValue[]
    ): Promise<void> => {
      const requestId = ++selectableOptionsRequestId.current

      if (
        (targetFilterOption?.AttributeType !== 'Picklist' &&
          targetFilterOption?.AttributeType !== 'Lookup') ||
        !targetFilterOption?.EntityName ||
        !targetFilterOption?.AttributeName
      ) {
        setSelectableOptions([])
        setIsSelectableOptionsLoading(false)
        setSelectableOptionsErrorMessage(undefined)
        return
      }

      setIsSelectableOptionsLoading(true)
      setSelectableOptionsErrorMessage(undefined)
      try {
        let options: ConditionValueOption[] = []

        if (targetFilterOption.AttributeType === 'Picklist') {
          const metadata = await crmRepository?.getPicklistAttributeMetadata(
            targetFilterOption.EntityName,
            targetFilterOption.AttributeName
          )
          options =
            metadata?.OptionSet?.Options?.map((option) => {
              const value = option.Value
              const displayName = option.Label.UserLocalizedLabel?.Label ?? value.toString()
              return { value, displayName }
            }) ?? []
        }

        if (
          targetFilterOption.AttributeType === 'Lookup' &&
          targetFilterOption.Selection?.SearchDelay !== undefined &&
          targetFilterOption.Selection.SearchDelay > 0
        ) {
          if (requestId !== selectableOptionsRequestId.current) {
            return
          }
          setSelectableOptions([])
          setIsSelectableOptionsLoading(false)
          setSelectableOptionsErrorMessage(undefined)
          return
        }

        if (targetFilterOption.AttributeType === 'Lookup') {
          const lookupMetadata = await crmRepository?.getLookupAttributeMetadata(
            targetFilterOption.EntityName,
            targetFilterOption.AttributeName
          )
          const targetEntityLogicalName = lookupMetadata?.Targets?.at(0)

          if (targetEntityLogicalName) {
            const entitiesMetadata = await crmRepository?.getEntitiesMetadata([
              targetEntityLogicalName,
            ])
            const entityMetadata = entitiesMetadata?.at(0)
            const entityCollectionName =
              entityMetadata?.EntitySetName ?? entityMetadata?.LogicalCollectionName

            if (entityCollectionName) {
              const idAttributeName = `${targetEntityLogicalName}id`
              const lookupAttributeNames = targetFilterOption.Lookup?.AttributeNames ?? []
              const attributeNames = [...new Set([idAttributeName, ...lookupAttributeNames])]
              const entitiesResponse = await crmRepository?.getEntities(
                entityCollectionName,
                attributeNames
              )
              const entities = normalizeEntityItems(entitiesResponse)
              options = entities
                .map((item): ConditionValueOption | null => {
                  const rawId = item[idAttributeName]
                  if (rawId === undefined || rawId === null) {
                    return null
                  }
                  const value = String(rawId)
                  const displayName = formatLookupDisplayValue(
                    item,
                    lookupAttributeNames,
                    targetFilterOption.Lookup?.AttributeFormat,
                    value
                  )
                  return { value, displayName }
                })
                .filter((option): option is ConditionValueOption => option !== null)
            }
          }
        }

        if (requestId !== selectableOptionsRequestId.current) {
          return
        }

        setSelectableOptions(options)

        const targetSelection = targetFilterOption?.Selection
        const targetMaxItems =
          targetSelection?.MaxItems && targetSelection.MaxItems > 0
            ? targetSelection.MaxItems
            : undefined
        const isTargetMultiSelection = Boolean(targetSelection?.Multiple)
        const sanitizedDefaultValues = sanitizeSelectableValues(
          defaultValues,
          options,
          targetMaxItems
        )

        if (isNoValueCondition(condition)) {
          setConditionValues([])
          return
        }

        if (isTargetMultiSelection) {
          setConditionValues(sanitizedDefaultValues)
          return
        }

        setConditionValues(sanitizedDefaultValues.slice(0, 1))
      } catch (error) {
        if (requestId !== selectableOptionsRequestId.current) {
          return
        }
        const userMessage = errorReporter.reportAsyncError({
          location: 'load selectable values',
          error,
          userMessage: 'Failed to load selectable values.',
          context: {
            entityName: targetFilterOption.EntityName,
            attributeName: targetFilterOption.AttributeName,
          },
        })
        setSelectableOptionsErrorMessage(userMessage)
        setSelectableOptions([])
      } finally {
        if (requestId === selectableOptionsRequestId.current) {
          setIsSelectableOptionsLoading(false)
        }
      }
    },
    [crmRepository, setConditionValues]
  )

  React.useEffect(() => {
    if (!filterOption) {
      setConditionValues([])
      setSelectableOptions([])
      setIsSelectableOptionsLoading(false)
      setSelectableOptionsErrorMessage(undefined)
      return
    }

    const defaultValues = valuesRef.current ?? filterOption.Default?.Values ?? []
    setConditionValues(defaultValues)
    void loadSelectableOptions(filterOption, filterOption.Default?.Condition, defaultValues)
  }, [filterOption, loadSelectableOptions, setConditionValues])

  const handleLookupSearch = React.useCallback(
    async (query: string): Promise<void> => {
      if (!filterOption || filterOption.AttributeType !== 'Lookup') {
        return
      }

      const requestId = ++selectableOptionsRequestId.current
      setIsSelectableOptionsLoading(true)
      setSelectableOptionsErrorMessage(undefined)

      try {
        let meta = lookupMetadataRef.current
        if (!meta) {
          const lookupMd = await crmRepository?.getLookupAttributeMetadata(
            filterOption.EntityName!,
            filterOption.AttributeName!
          )
          const targetEntity = lookupMd?.Targets?.at(0)
          if (!targetEntity) {
            throw new Error('No lookup target entity')
          }

          const entitiesMd = await crmRepository?.getEntitiesMetadata([targetEntity])
          const entityMd = entitiesMd?.at(0)
          const collectionName = entityMd?.EntitySetName ?? entityMd?.LogicalCollectionName
          if (!collectionName) {
            throw new Error('No entity collection name')
          }

          const idAttr = `${targetEntity}id`
          const lookupAttrs = filterOption.Lookup?.AttributeNames ?? []

          meta = {
            entityCollectionName: collectionName,
            idAttributeName: idAttr,
            lookupAttributeNames: lookupAttrs,
            allAttributeNames: [...new Set([idAttr, ...lookupAttrs])],
          }
          lookupMetadataRef.current = meta
        }

        const odataFilter = buildLookupSearchFilter(meta.lookupAttributeNames, query)
        const response = await crmRepository?.getEntities(
          meta.entityCollectionName,
          meta.allAttributeNames,
          odataFilter ? { filter: odataFilter } : undefined
        )

        if (requestId !== selectableOptionsRequestId.current) {
          return
        }

        const entities = normalizeEntityItems(response)
        const options = entities
          .map((item): ConditionValueOption | null => {
            const rawId = item[meta!.idAttributeName]
            if (rawId === undefined || rawId === null) {
              return null
            }
            const value = String(rawId)
            const displayName = formatLookupDisplayValue(
              item,
              meta!.lookupAttributeNames,
              filterOption.Lookup?.AttributeFormat,
              value
            )
            return { value, displayName }
          })
          .filter((option): option is ConditionValueOption => option !== null)

        setSelectableOptions(options)
      } catch (error) {
        if (requestId !== selectableOptionsRequestId.current) {
          return
        }
        const userMessage = errorReporter.reportAsyncError({
          location: 'lookup on-demand search',
          error,
          userMessage: 'Failed to search values.',
          context: {
            entityName: filterOption.EntityName,
            attributeName: filterOption.AttributeName,
            query,
          },
        })
        setSelectableOptionsErrorMessage(userMessage)
        setSelectableOptions([])
      } finally {
        if (requestId === selectableOptionsRequestId.current) {
          setIsSelectableOptionsLoading(false)
        }
      }
    },
    [crmRepository, filterOption]
  )

  return {
    selectableOptions,
    isSelectableOptionsLoading,
    selectableOptionsErrorMessage,
    selectedOptionsCacheRef,
    handleLookupSearch,
  }
}
