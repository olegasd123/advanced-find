import * as React from "react"
import { useCrmRepository } from "../../hooks/use-crm-repository"
import { useAppConfiguration } from "../../hooks/use-app-config"
import { EntityMetadata } from "../../libs/repositories/crm-repository"
import { EntityConfig } from "../../libs/config/app-config"
import { Select } from "../../components/controls/catalyst/select"
import { Filter } from "./filter"
import { createLogger } from "../../libs/utils/logger"

const logger = createLogger('Search');

export const Search = () => {
  const [ entitiesMetadata, setEntitiesMetadata ] = React.useState<EntityMetadata[] | undefined>([])
  const [ currentEntityConfig, setCurrentEntityConfig ] = React.useState<EntityConfig | undefined>()

  const appConfiguration = useAppConfiguration()
  const crmRepository = useCrmRepository()

  const configEntities = appConfiguration?.SearchScheme?.Entities

  React.useEffect(() => {
    if ((configEntities?.length ?? 0) === 1) {
      setCurrentEntityConfig(configEntities?.at(0))
    }
  }, [ appConfiguration ])

  React.useEffect(() => {
    const getData = async () => {
      const result = await crmRepository?.getEntitiesMetadata(appConfiguration?.SearchScheme?.Entities.map(i => i.LogicalName))
      setEntitiesMetadata(result)
    }
    getData().catch(error => {
      logger.error(`Failed to load entities metadata: ${error}`)
    })
  }, [ appConfiguration ])

  const handleCurrentEntityConfigChanged = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setCurrentEntityConfig(configEntities?.at(parseInt(event.target.value)))
  }

  return (
    <div>
      {(configEntities?.length ?? 0) > 1 && (
        <Select defaultValue="" onChange={handleCurrentEntityConfigChanged}>
          <option value="" disabled>Select entity</option>
          {configEntities?.map((entityInfo, index) => (
            <option key={index} value={index}>{entitiesMetadata?.find(entityMetadata =>
              entityInfo.LogicalName === entityMetadata.LogicalName)?.DisplayCollectionName.UserLocalizedLabel.Label}</option>
          ))}
        </Select>
      )}

      <Filter entityConfig={currentEntityConfig} />
      
    </div>
  )
}