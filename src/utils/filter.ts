import { FilterOptionConfig } from "../config/app"
import { AttributeMetadata } from "../api/crm-repository"

export const fillOutMissedDisplayNames = async (
  filterOption? : FilterOptionConfig[],
  getAttributeMetadata?: (entityLogicalName: string, groupedMissedDisplayNames: any) => Promise<AttributeMetadata[]> | undefined
) => {
  const missedDisplayNames = filterOption?.map(i => {
    if (i.EntityLogicalName && i.AttributeLogicalName && !i.AttributeDisplayName) {
      return { EntityLogicalName: i.EntityLogicalName, AttributeLogicalName: i.AttributeLogicalName }
    }
  }).filter(i => typeof i !== 'undefined')

  if (missedDisplayNames?.length ?? 0 > 0) {
    const groupedMissedDisplayNames = missedDisplayNames?.reduce((p, c) => {
      p[c.EntityLogicalName] = p[c.EntityLogicalName] || []
      p[c.EntityLogicalName].push(c.AttributeLogicalName)
      return p
    }, Object.create(null))

    for (const entityLogicalName of Object.keys(groupedMissedDisplayNames)) {
      const attributesMetadata = await getAttributeMetadata?.(entityLogicalName, groupedMissedDisplayNames[entityLogicalName])

      for (const attributeLogicalName of groupedMissedDisplayNames[entityLogicalName]) {
        const option = filterOption?.find(i =>
          i.EntityLogicalName === entityLogicalName &&
          i.AttributeLogicalName === attributeLogicalName &&
          !i.AttributeDisplayName)
          option!.AttributeDisplayName = attributesMetadata?.find(i => i.LogicalName === attributeLogicalName)?.DisplayName.UserLocalizedLabel?.Label
      }
    }
  }
}