import { describe, expect, it } from 'vitest'
import { EntityConfig, RelationPathStepConfig } from '@/libs/types/app-config.types'
import {
  buildAppConfigMetadataValidationPlan,
  buildAppConfigValidationUserMessage,
} from '@/libs/utils/app-config-validator'

const createEntityConfig = (overrides?: Partial<EntityConfig>): EntityConfig => ({
  EntityName: 'account',
  FilterCategories: [{ Id: 'main', DisplayName: 'Main' }],
  RelationPaths: [
    {
      Id: 'contact-path',
      Steps: [
        {
          EntityName: 'contact',
          FromAttribute: 'primarycontactid',
          ToAttribute: 'contactid',
        },
      ],
    },
  ],
  FilterOptions: [],
  ResultView: { Columns: [] },
  ...overrides,
})

describe('app-config-validator', () => {
  it('collects required attributes from relation paths, filters, and columns', () => {
    const config = createEntityConfig({
      FilterOptions: [
        {
          AttributeName: 'name',
        },
        {
          PathId: 'contact-path',
          AttributeName: 'fullname',
        },
      ],
      ResultView: {
        Columns: [
          {
            AttributeNames: ['accountnumber'],
          },
        ],
      },
    })

    const result = buildAppConfigMetadataValidationPlan([config])

    expect(result.issues).toEqual([])
    expect(result.configuredEntityNames).toEqual(['account'])
    expect(result.requiredAttributesByEntity.get('account')).toEqual([
      'accountnumber',
      'name',
      'primarycontactid',
    ])
    expect(result.requiredAttributesByEntity.get('contact')).toEqual(['contactid', 'fullname'])
  })

  it('reports invalid references in entity config', () => {
    const invalidConfig = createEntityConfig({
      FilterCategories: [{ Id: 'main', DisplayName: 'Main' }],
      RelationPaths: [
        {
          Id: 'dup',
          Steps: [
            {
              EntityName: 'contact',
              FromAttribute: 'primarycontactid',
              ToAttribute: 'contactid',
            },
          ],
        },
        {
          Id: 'dup',
          Steps: [
            {
              EntityName: '',
              FromAttribute: 'x',
              ToAttribute: 'y',
            } as RelationPathStepConfig,
          ],
        },
      ],
      FilterOptions: [
        {
          Id: 'customer',
          CategoryId: 'missing-category',
          PathId: 'missing-path',
          AttributeName: 'name',
        },
      ],
      DefaultFilterGroups: [
        {
          FilterOptionIndexes: [99],
          FilterOptionIds: ['missing-filter-id'],
        },
      ],
      ResultView: {
        Columns: [
          { Id: 'name', AttributeNames: ['name'] },
          { Id: 'name', AttributeNames: [] },
        ],
        DefaultSort: [{ ColumnId: 'missing-column' }],
      },
    })

    const result = buildAppConfigMetadataValidationPlan([invalidConfig])

    expect(result.issues).toContain('Entity "account" RelationPaths[1] has duplicate Id "dup".')
    expect(result.issues).toContain(
      'Entity "account" RelationPaths[1] has invalid step values (EntityName, FromAttribute, ToAttribute are required).'
    )
    expect(result.issues).toContain(
      'Entity "account" FilterOptions[0] uses unknown CategoryId "missing-category".'
    )
    expect(result.issues).toContain(
      'Entity "account" FilterOptions[0] uses unknown PathId "missing-path".'
    )
    expect(result.issues).toContain(
      'Entity "account" DefaultFilterGroups[0] uses out-of-range FilterOptionIndexes value "99".'
    )
    expect(result.issues).toContain(
      'Entity "account" DefaultFilterGroups[0] references unknown FilterOptionId "missing-filter-id".'
    )
    expect(result.issues).toContain(
      'Entity "account" ResultView.Columns[1] has duplicate Id "name".'
    )
    expect(result.issues).toContain(
      'Entity "account" ResultView.Columns[1] has no attributes (use AttributeNames or AttributeName).'
    )
    expect(result.issues).toContain(
      'Entity "account" ResultView.DefaultSort[0] references unknown ColumnId "missing-column".'
    )
  })

  it('allows duplicate preset entity names', () => {
    const account = createEntityConfig({ EntityName: 'account' })
    const duplicate = createEntityConfig({ EntityName: ' Account ' })

    const result = buildAppConfigMetadataValidationPlan([account, duplicate])

    expect(result.issues).toEqual([])
    expect(result.configuredEntityNames).toEqual(['account'])
  })

  it('builds a compact user message from issues', () => {
    const message = buildAppConfigValidationUserMessage([
      'Issue one.',
      'Issue two.',
      'Issue three.',
      'Issue four.',
    ])

    expect(message).toBe(
      'App configuration has invalid values. Issue one. Issue two. Issue three. 1 more issue(s) found.'
    )
  })
})
