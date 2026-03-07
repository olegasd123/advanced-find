import { CrmData } from '@/libs/types/entity.types'
import { AppliedFilterCondition } from '@/libs/types/filter.types'
import { SearchBranchPlan, SearchTableColumn } from '@/libs/types/search.types'
import { createLogger } from '@/libs/utils/logger'
import { buildCrmFetchXml, buildCrmFilterFetchXml } from '@/libs/utils/crm/crm-search'
import { searchResultIdsChunkSize } from '@/libs/utils/env'

const logger = createLogger('SearchService')
const defaultResultIdsChunkSize = searchResultIdsChunkSize

interface SearchServiceOptions {
  resultIdsChunkSize?: number
}

interface ExecuteSearchParams {
  entityLogicalName: string
  entitySetName: string
  searchTableColumns: SearchTableColumn[]
  conditions: AppliedFilterCondition[]
  primaryIdAttribute: string
  shouldStop?: () => boolean
}

export class SearchService {
  private readonly resultIdsChunkSize: number

  constructor(
    private readonly crmRepository: CrmData,
    options?: SearchServiceOptions
  ) {
    this.resultIdsChunkSize = options?.resultIdsChunkSize ?? defaultResultIdsChunkSize
  }

  static normalizeResponseItems(response: unknown): Record<string, unknown>[] {
    const items = Array.isArray(response)
      ? response
      : response && typeof response === 'object' && 'value' in response
        ? ((response as { value?: unknown }).value ?? [])
        : []

    return Array.isArray(items) ? (items as Record<string, unknown>[]) : []
  }

  private static removeConditionGroupInfo(
    condition: AppliedFilterCondition
  ): AppliedFilterCondition {
    return {
      ...condition,
      groupId: undefined,
      groupOperator: undefined,
    }
  }

  static buildSearchBranchPlan(conditions: AppliedFilterCondition[]): SearchBranchPlan {
    const groupedConditions = new Map<
      number,
      { operator: AppliedFilterCondition['groupOperator']; conditions: AppliedFilterCondition[] }
    >()
    const baseConditions: AppliedFilterCondition[] = []

    for (const condition of conditions) {
      if (condition.groupId === undefined) {
        baseConditions.push(SearchService.removeConditionGroupInfo(condition))
        continue
      }

      const group = groupedConditions.get(condition.groupId)
      if (!group) {
        groupedConditions.set(condition.groupId, {
          operator: condition.groupOperator,
          conditions: [SearchService.removeConditionGroupInfo(condition)],
        })
        continue
      }

      group.conditions.push(SearchService.removeConditionGroupInfo(condition))
    }

    const orGroups: AppliedFilterCondition[][] = []
    for (const group of groupedConditions.values()) {
      if (group.conditions.length <= 1 || group.operator !== 'or') {
        baseConditions.push(...group.conditions)
        continue
      }

      orGroups.push(group.conditions)
    }

    if (orGroups.length === 0) {
      return { requiresTwoPass: false, branches: [baseConditions] }
    }

    let branches: AppliedFilterCondition[][] = [[]]
    for (const orGroup of orGroups) {
      const nextBranches: AppliedFilterCondition[][] = []
      for (const branch of branches) {
        for (const condition of orGroup) {
          nextBranches.push([...branch, condition])
        }
      }
      branches = nextBranches
    }

    const fullBranches = branches.map((branchConditions) => [
      ...baseConditions,
      ...branchConditions,
    ])
    return { requiresTwoPass: true, branches: fullBranches }
  }

  static splitIntoChunks<T>(items: T[], chunkSize: number): T[][] {
    if (items.length === 0) {
      return []
    }

    if (chunkSize <= 0) {
      return [items]
    }

    const chunks: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize))
    }
    return chunks
  }

  static collectUniqueResultIds(response: unknown, primaryIdAttribute: string): string[] {
    const ids = new Set<string>()
    for (const item of SearchService.normalizeResponseItems(response)) {
      const rawId = item[primaryIdAttribute]
      if (rawId !== undefined && rawId !== null) {
        ids.add(String(rawId))
      }
    }

    return Array.from(ids)
  }

  static dedupeRowsByPrimaryId(
    rows: Record<string, unknown>[],
    primaryIdAttribute: string
  ): Record<string, unknown>[] {
    const uniqueRowsById = new Map<string, Record<string, unknown>>()
    for (const row of rows) {
      const rawId = row[primaryIdAttribute]
      if (rawId === undefined || rawId === null) {
        continue
      }
      uniqueRowsById.set(String(rawId), row)
    }

    return Array.from(uniqueRowsById.values())
  }

  async executeSearch({
    entityLogicalName,
    entitySetName,
    searchTableColumns,
    conditions,
    primaryIdAttribute,
    shouldStop,
  }: ExecuteSearchParams): Promise<Record<string, unknown>[]> {
    const isStopped = shouldStop ?? (() => false)
    if (isStopped()) {
      return []
    }

    const branchPlan = SearchService.buildSearchBranchPlan(conditions)

    logger.info(`Executing search with conditions`, {
      entitySetName,
      tableColumns: searchTableColumns,
      conditions,
      requiresTwoPass: branchPlan.requiresTwoPass,
      branchesCount: branchPlan.branches.length,
      primaryIdAttribute,
    })

    if (!branchPlan.requiresTwoPass) {
      const fetchXml = buildCrmFetchXml(
        entityLogicalName,
        searchTableColumns,
        branchPlan.branches[0] ?? []
      )
      logger.info(`Executing single-pass search with FetchXML`, { fetchXml })
      const response = await this.crmRepository.getEntities(entitySetName, [], { fetchXml })
      if (isStopped()) {
        return []
      }

      return SearchService.normalizeResponseItems(response)
    }

    const resultIds = new Set<string>()

    for (const branchConditions of branchPlan.branches) {
      const branchFetchXml = buildCrmFilterFetchXml(entityLogicalName, branchConditions, [
        primaryIdAttribute,
      ])
      logger.info(`Executing branch search with FetchXML`, { fetchXml: branchFetchXml })
      const branchResponse = await this.crmRepository.getEntities(entitySetName, [], {
        fetchXml: branchFetchXml,
      })
      if (isStopped()) {
        return []
      }

      const branchIds = SearchService.collectUniqueResultIds(branchResponse, primaryIdAttribute)
      for (const id of branchIds) {
        resultIds.add(id)
      }
    }

    if (resultIds.size === 0) {
      return []
    }

    const resultRows: Record<string, unknown>[] = []
    for (const chunkIds of SearchService.splitIntoChunks(
      Array.from(resultIds),
      this.resultIdsChunkSize
    )) {
      const idCondition: AppliedFilterCondition = {
        filterOption: {
          EntityName: entityLogicalName,
          AttributeName: primaryIdAttribute,
        },
        condition: 'in',
        values: chunkIds,
      }
      const finalFetchXml = buildCrmFetchXml(entityLogicalName, searchTableColumns, [idCondition])
      const finalResponse = await this.crmRepository.getEntities(entitySetName, [], {
        fetchXml: finalFetchXml,
      })
      if (isStopped()) {
        return []
      }
      resultRows.push(...SearchService.normalizeResponseItems(finalResponse))
    }

    return SearchService.dedupeRowsByPrimaryId(resultRows, primaryIdAttribute)
  }
}
