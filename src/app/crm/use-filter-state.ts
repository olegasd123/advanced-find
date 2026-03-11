import * as React from 'react'
import { EntityConfig } from '@/libs/types/app-config.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'

interface UseFilterStateResult {
  currentPresetConfig: EntityConfig | undefined
  isResultViewVisible: boolean
  appliedFilters: AppliedFilterCondition[]
  selectPresetByIndex: (index: number) => void
  openResultView: (conditions: AppliedFilterCondition[]) => void
  closeResultView: () => void
  updateAppliedFilters: (conditions: AppliedFilterCondition[]) => void
}

export const useFilterState = (configPresets: EntityConfig[] | undefined): UseFilterStateResult => {
  const [currentPresetConfig, setCurrentPresetConfig] = React.useState<EntityConfig | undefined>()
  const [isResultViewVisible, setIsResultViewVisible] = React.useState(false)
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilterCondition[]>([])

  React.useEffect(() => {
    if (!configPresets || configPresets.length === 0) {
      setCurrentPresetConfig(undefined)
      setIsResultViewVisible(false)
      setAppliedFilters([])
      return
    }

    if (configPresets.length === 1) {
      setCurrentPresetConfig(configPresets[0])
      setIsResultViewVisible(false)
      setAppliedFilters([])
      return
    }

    setCurrentPresetConfig((previousPresetConfig) => {
      if (!previousPresetConfig) {
        return previousPresetConfig
      }

      return configPresets.find((item) => item === previousPresetConfig)
    })
  }, [configPresets])

  React.useEffect(() => {
    if (currentPresetConfig) {
      return
    }

    setIsResultViewVisible(false)
    setAppliedFilters([])
  }, [currentPresetConfig])

  const selectPresetByIndex = React.useCallback(
    (index: number): void => {
      const nextPresetConfig =
        Number.isInteger(index) && index >= 0 ? configPresets?.at(index) : undefined
      setCurrentPresetConfig(nextPresetConfig)
      setIsResultViewVisible(false)
      setAppliedFilters([])
    },
    [configPresets]
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
    currentPresetConfig,
    isResultViewVisible,
    appliedFilters,
    selectPresetByIndex,
    openResultView,
    closeResultView,
    updateAppliedFilters,
  }
}
