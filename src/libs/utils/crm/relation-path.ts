import { EntityConfig, RelationPathStepConfig } from '@/libs/types/app-config.types'

const normalizeConfigId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim()
  return normalized ? normalized.toLowerCase() : undefined
}

export const getNormalizedConfigId = (value: string | undefined): string | undefined => {
  return normalizeConfigId(value)
}

const normalizeRelationPathStep = (
  step: RelationPathStepConfig | undefined
): RelationPathStepConfig | undefined => {
  if (!step) {
    return undefined
  }

  const entityName = step.EntityName?.trim()
  const fromAttribute = step.FromAttribute?.trim()
  const toAttribute = step.ToAttribute?.trim()

  if (!entityName || !fromAttribute || !toAttribute) {
    return undefined
  }

  return {
    EntityName: entityName,
    FromAttribute: fromAttribute,
    ToAttribute: toAttribute,
  }
}

export const normalizeRelationPathSteps = (
  pathSteps: RelationPathStepConfig[] | undefined
): RelationPathStepConfig[] => {
  if (!pathSteps || pathSteps.length === 0) {
    return []
  }

  return pathSteps
    .map((step) => normalizeRelationPathStep(step))
    .filter((step): step is RelationPathStepConfig => Boolean(step))
}

export const getRelationPathById = (
  entityConfig: EntityConfig
): Map<string, RelationPathStepConfig[]> => {
  const map = new Map<string, RelationPathStepConfig[]>()

  for (const relationPath of entityConfig.RelationPaths ?? []) {
    const normalizedId = normalizeConfigId(relationPath.Id)
    if (!normalizedId || map.has(normalizedId)) {
      continue
    }

    const steps = normalizeRelationPathSteps(relationPath.Steps)
    if (steps.length === 0) {
      continue
    }

    map.set(normalizedId, steps)
  }

  return map
}

export const resolveConfigPath = (
  pathById: Map<string, RelationPathStepConfig[]>,
  pathId: string | undefined,
  path: RelationPathStepConfig[] | undefined
): RelationPathStepConfig[] => {
  const normalizedInlinePath = normalizeRelationPathSteps(path)
  if (normalizedInlinePath.length > 0) {
    return normalizedInlinePath
  }

  const normalizedId = normalizeConfigId(pathId)
  if (!normalizedId) {
    return []
  }

  return pathById.get(normalizedId) ?? []
}

export const getPathTargetEntityName = (
  currentEntityName: string,
  pathSteps: RelationPathStepConfig[]
): string => {
  if (pathSteps.length === 0) {
    return currentEntityName
  }

  return pathSteps[pathSteps.length - 1].EntityName
}
