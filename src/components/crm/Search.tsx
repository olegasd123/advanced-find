import { useContext, useState, useEffect, ChangeEvent } from "react"
import { AppConfigurationContext, CrmRepositoryContext } from "../../providers"
import { EntityMetadata } from "../../data/crm-repository"
import { EntityConfig } from "../../data/configuration"
import { Select } from "../controls/catalyst/select"
import Filter from "./Filter"

export default function SearchView() {
  const [ entitiesMetadata, setEntitiesMetadata ] = useState<EntityMetadata[] | undefined>([])
  const [ currentEntityConfig, setCurrentEntityConfig ] = useState<EntityConfig | undefined>()

  const appConfig = useContext(AppConfigurationContext)
  const crm = useContext(CrmRepositoryContext)

  const configEntities = appConfig?.SearchScheme?.Entities

  useEffect(() => {
    if ((configEntities?.length ?? 0) === 1) {
      setCurrentEntityConfig(configEntities?.at(0))
    }
  }, [ appConfig ])

  useEffect(() => {
    const getData = async () => {
      const entities = await crm?.getEntitiesMetadata(appConfig?.SearchScheme?.Entities.map(i => i.LogicalName))
      setEntitiesMetadata(entities)
    }
    getData().catch(error => {
      console.error(error)
    })
  }, [ appConfig ])

  function handleCurrentEntityConfigChanged(event: ChangeEvent<HTMLSelectElement>): void {
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