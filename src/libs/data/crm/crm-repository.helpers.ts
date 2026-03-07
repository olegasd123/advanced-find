import { createLogger } from '@/libs/utils/logger'
import { AttributeMetadata } from '@/libs/types/entity.types'

const logger = createLogger('crm-repository.helpers')

export const findAttributes = (
  entityLogicalName: string,
  source: AttributeMetadata[],
  attributesLogicalNames: string[]
): AttributeMetadata[] => {
  const attributes: AttributeMetadata[] = []
  for (const attributeLogicalName of attributesLogicalNames) {
    const attribute = source.find((i) => i.LogicalName === attributeLogicalName)
    if (attribute) {
      attributes.push(attribute)
    } else {
      logger.error(
        `Couldn't find the attribute by name '${attributeLogicalName}' at the entity '${entityLogicalName}'`
      )
    }
  }
  return attributes
}
