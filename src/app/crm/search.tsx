import * as React from 'react'
import { useCrmRepository } from '../../hooks/use-crm-repository'
import { useAppConfiguration } from '../../hooks/use-app-config'
import { EntityMetadata } from '../../libs/repositories/crm-repository'
import { EntityConfig } from '../../libs/config/app-config'
import { Select } from '../../../vendor/catalyst-ui-kit/typescript/select'
import { FilterGrid } from './filter-grid'
import { ResultGrid } from './result-grid'
import { createLogger } from '../../libs/utils/logger'

const logger = createLogger('Search')

export const Search = () => {
  const [entitiesMetadata, setEntitiesMetadata] = React.useState<EntityMetadata[] | undefined>([])
  const [currentEntityConfig, setCurrentEntityConfig] = React.useState<EntityConfig | undefined>()

  const appConfiguration = useAppConfiguration()
  const crmRepository = useCrmRepository()

  const configEntities = appConfiguration?.SearchScheme?.Entities

  React.useEffect(() => {
    if ((configEntities?.length ?? 0) === 1) {
      setCurrentEntityConfig(configEntities?.at(0))
    }
  }, [configEntities])

  React.useEffect(() => {
    if (!crmRepository || !configEntities) {
      setEntitiesMetadata([])
      return
    }

    const getData = async () => {
      const result = await crmRepository.getEntitiesMetadata(
        configEntities.map((i) => i.LogicalName)
      )
      setEntitiesMetadata(result)
    }

    getData().catch((error) => {
      logger.error(`Failed to load entities metadata: ${error}`)
    })
  }, [configEntities, crmRepository])

  const handleCurrentEntityConfigChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setCurrentEntityConfig(configEntities?.at(parseInt(event.target.value)))
  }

  return (
    <div>
      {(configEntities?.length ?? 0) > 1 && (
        <Select defaultValue="" onChange={handleCurrentEntityConfigChanged}>
          <option value="" disabled>
            Select an entity
          </option>
          {configEntities?.map((entityInfo, index) => (
            <option key={index} value={index}>
              {
                entitiesMetadata?.find(
                  (entityMetadata) => entityInfo.LogicalName === entityMetadata.LogicalName
                )?.DisplayCollectionName.UserLocalizedLabel.Label
              }
            </option>
          ))}
        </Select>
      )}


      {currentEntityConfig && (
        <>
          // TODO: hide FilterGrid on the `Search` button click, then show `FilterGrid` with applied filters and `ResultGrid` with search results
          <FilterGrid
            key={currentEntityConfig?.LogicalName ?? 'no-entity'}
            entityConfig={currentEntityConfig}
          />

          <ResultGrid />
        </>
      )}
    </div>
  )
}
