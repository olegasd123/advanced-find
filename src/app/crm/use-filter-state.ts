import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'

interface UseFilterStateResult {
  currentEntityConfig: EntityConfig | undefined
  isResultViewVisible: boolean
  appliedFilters: AppliedFilterCondition[]
  selectEntityByIndex: (index: number) => void
  openResultView: (conditions: AppliedFilterCondition[]) => void
  closeResultView: () => void
  updateAppliedFilters: (conditions: AppliedFilterCondition[]) => void
}

export const useFilterState = (
  configEntities: EntityConfig[] | undefined
): UseFilterStateResult => {
  const [currentEntityConfig, setCurrentEntityConfig] = React.useState<EntityConfig | undefined>()
  const [isResultViewVisible, setIsResultViewVisible] = React.useState(false)
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilterCondition[]>([])

  React.useEffect(() => {
    if (!configEntities || configEntities.length === 0) {
      setCurrentEntityConfig(undefined)
      setIsResultViewVisible(false)
      setAppliedFilters([])
      return
    }

    if (configEntities.length === 1) {
      setCurrentEntityConfig(configEntities[0])
      setIsResultViewVisible(false)
      setAppliedFilters([])
      return
    }

    setCurrentEntityConfig((previousEntityConfig) => {
      if (!previousEntityConfig) {
        return previousEntityConfig
      }

      const entity = configEntities.find(
        (item) => item.LogicalName === previousEntityConfig.LogicalName
      )
      return entity
    })
  }, [configEntities])

  React.useEffect(() => {
    if (currentEntityConfig) {
      return
    }

    setIsResultViewVisible(false)
    setAppliedFilters([])
  }, [currentEntityConfig])

  const selectEntityByIndex = React.useCallback(
    (index: number): void => {
      const nextEntityConfig =
        Number.isInteger(index) && index >= 0 ? configEntities?.at(index) : undefined
      setCurrentEntityConfig(nextEntityConfig)
      setIsResultViewVisible(false)
      setAppliedFilters([])
    },
    [configEntities]
  )

  const openResultView = React.useCallback((conditions: AppliedFilterCondition[]): void => {
    setAppliedFilters(conditions)
    setIsResultViewVisible(true)
  }, [])

  const closeResultView = React.useCallback((): void => {
    setIsResultViewVisible(false)
  }, [])

  const updateAppliedFilters = React.useCallback((conditions: AppliedFilterCondition[]): void => {
    setAppliedFilters(conditions)
  }, [])

  return {
    currentEntityConfig,
    isResultViewVisible,
    appliedFilters,
    selectEntityByIndex,
    openResultView,
    closeResultView,
    updateAppliedFilters,
  }
}
