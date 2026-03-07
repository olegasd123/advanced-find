import { describe, expect, it } from 'vitest'
import { EntityConfig, TableColumnConfig } from '@/libs/types/app-config.types'
import {
  getSearchSelectColumns,
  getTargetTableColumn,
  resolveSearchTableColumns,
} from '@/libs/utils/crm/crm-search-columns'

const createEntityConfig = (columns: TableColumnConfig[]): EntityConfig => ({
  LogicalName: 'account',
  FilterOptions: [],
  RelationPaths: [
    {
      Id: 'Main Path',
      Steps: [
        {
          EntityName: 'contact',
          FromAttribute: 'primarycontactid',
          ToAttribute: 'contactid',
        },
      ],
    },
  ],
  ResultView: {
    Columns: columns,
  },
})

describe('crm-search-columns', () => {
  it('resolves trimmed and legacy attributes and skips empty columns', () => {
    const entityConfig = createEntityConfig([
      { AttributeNames: [' name ', ''] },
      { AttributeName: ' legacy_single ' } as TableColumnConfig,
      { Attributes: [' legacy_a ', '   '] } as TableColumnConfig,
      { AttributeNames: [] },
    ])

    const columns = resolveSearchTableColumns(entityConfig)

    expect(columns).toHaveLength(3)
    expect(columns.map((column) => column.columnKey)).toEqual(['col_0', 'col_1', 'col_2'])
    expect(columns.map((column) => column.attributes[0]?.attributeName)).toEqual([
      'name',
      'legacy_single',
      'legacy_a',
    ])
    expect(columns.every((column) => column.isRootColumn)).toBe(true)
  })

  it('resolves PathId and sanitizes value keys for non-root columns', () => {
    const entityConfig = createEntityConfig([
      { PathId: ' main path ', AttributeNames: ['full name', 'phone-number'] },
      {
        PathId: 'main path',
        Path: [
          { EntityName: 'systemuser', FromAttribute: 'createdby', ToAttribute: 'systemuserid' },
        ],
        AttributeNames: ['fullname'],
      },
    ])

    const columns = resolveSearchTableColumns(entityConfig)

    expect(columns).toHaveLength(2)

    expect(columns[0].entityName).toBe('contact')
    expect(columns[0].isRootColumn).toBe(false)
    expect(columns[0].attributes.map((item) => item.valueKey)).toEqual([
      'col_0_full_name_0',
      'col_0_phone_number_1',
    ])

    expect(columns[1].entityName).toBe('systemuser')
    expect(columns[1].attributes.map((item) => item.valueKey)).toEqual(['col_1_fullname_0'])
  })

  it('deduplicates selected attributes and resolves target entity name', () => {
    const entityConfig = createEntityConfig([
      { AttributeNames: ['name', 'name'] },
      { AttributeNames: ['accountnumber'] },
      { PathId: 'main path', AttributeNames: ['fullname'] },
    ])

    const selectedColumns = getSearchSelectColumns(entityConfig)
    const target = getTargetTableColumn(entityConfig, entityConfig.ResultView.Columns[2])

    expect(selectedColumns).toEqual(['name', 'accountnumber', 'fullname'])
    expect(target).toEqual({ EntityName: 'contact' })
  })
})
