import { describe, expect, it } from 'vitest'
import { EntityConfig, RelationPathStepConfig } from '@/libs/types/app-config.types'
import {
  getNormalizedConfigId,
  getPathTargetEntityName,
  getRelationPathById,
  normalizeRelationPathSteps,
  resolveConfigPath,
} from '@/libs/utils/crm/relation-path'

const createEntityConfig = (): EntityConfig => ({
  EntityName: 'account',
  FilterOptions: [],
  ResultView: {
    Columns: [],
  },
})

describe('relation-path', () => {
  it('normalizes config ids', () => {
    expect(getNormalizedConfigId(undefined)).toBeUndefined()
    expect(getNormalizedConfigId('')).toBeUndefined()
    expect(getNormalizedConfigId('  MAIN Path  ')).toBe('main path')
  })

  it('normalizes relation path steps and skips invalid items', () => {
    const steps = normalizeRelationPathSteps([
      {
        EntityName: ' contact ',
        FromAttribute: ' primarycontactid ',
        ToAttribute: ' contactid ',
      },
      {
        EntityName: '',
        FromAttribute: 'x',
        ToAttribute: 'y',
      } as RelationPathStepConfig,
      undefined as unknown as RelationPathStepConfig,
    ])

    expect(steps).toEqual([
      {
        EntityName: 'contact',
        FromAttribute: 'primarycontactid',
        ToAttribute: 'contactid',
      },
    ])
  })

  it('builds relation-path map by normalized id and keeps first duplicate id', () => {
    const config: EntityConfig = {
      ...createEntityConfig(),
      RelationPaths: [
        {
          Id: ' Main ',
          Steps: [
            {
              EntityName: 'contact',
              FromAttribute: 'primarycontactid',
              ToAttribute: 'contactid',
            },
          ],
        },
        {
          Id: 'main',
          Steps: [
            {
              EntityName: 'systemuser',
              FromAttribute: 'createdby',
              ToAttribute: 'systemuserid',
            },
          ],
        },
        {
          Id: 'empty',
          Steps: [],
        },
      ],
    }

    const byId = getRelationPathById(config)

    expect(Array.from(byId.keys())).toEqual(['main'])
    expect(byId.get('main')).toEqual([
      {
        EntityName: 'contact',
        FromAttribute: 'primarycontactid',
        ToAttribute: 'contactid',
      },
    ])
  })

  it('resolves inline path first, then pathId, otherwise empty array', () => {
    const byId = new Map<string, RelationPathStepConfig[]>([
      [
        'main',
        [
          {
            EntityName: 'contact',
            FromAttribute: 'primarycontactid',
            ToAttribute: 'contactid',
          },
        ],
      ],
    ])

    const inline = resolveConfigPath(byId, 'main', [
      {
        EntityName: 'systemuser',
        FromAttribute: 'createdby',
        ToAttribute: 'systemuserid',
      },
    ])
    const byIdPath = resolveConfigPath(byId, '  MAIN  ', [])
    const missing = resolveConfigPath(byId, 'missing', undefined)

    expect(inline).toEqual([
      {
        EntityName: 'systemuser',
        FromAttribute: 'createdby',
        ToAttribute: 'systemuserid',
      },
    ])
    expect(byIdPath).toEqual([
      {
        EntityName: 'contact',
        FromAttribute: 'primarycontactid',
        ToAttribute: 'contactid',
      },
    ])
    expect(missing).toEqual([])
  })

  it('returns target entity for path or current entity when path is empty', () => {
    expect(getPathTargetEntityName('account', [])).toBe('account')
    expect(
      getPathTargetEntityName('account', [
        {
          EntityName: 'contact',
          FromAttribute: 'primarycontactid',
          ToAttribute: 'contactid',
        },
        {
          EntityName: 'systemuser',
          FromAttribute: 'createdby',
          ToAttribute: 'systemuserid',
        },
      ])
    ).toBe('systemuser')
  })
})
