import { describe, expect, it } from 'vitest'
import { buildCrmFetchXml, buildCrmFilterFetchXml } from '../crm-search-fetch-xml'
import { createRootSearchColumn } from '../crm-search-columns'
import { AppliedFilterCondition } from '../../../types/filter.types'
import { SearchTableColumn } from '../../../types/search.types'

describe('crm-search-fetch-xml', () => {
  it('builds root filter XML with grouped OR and escaped values', () => {
    const columns = [createRootSearchColumn('name', 0)]
    const conditions: AppliedFilterCondition[] = [
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: [`O'Reilly & Co`],
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: ['A'],
        groupId: 10,
        groupOperator: 'or',
      },
      {
        filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
        condition: 'eq',
        values: ['B'],
        groupId: 10,
        groupOperator: 'or',
      },
    ]

    const xml = buildCrmFetchXml('account', columns, conditions)

    expect(xml).toBe(
      '<fetch version="1.0" mapping="logical" distinct="false"><entity name="account"><attribute name="name" /><filter type="and"><condition attribute="name" operator="eq" value="O&apos;Reilly &amp; Co" /><filter type="or"><condition attribute="name" operator="eq" value="A" /><condition attribute="name" operator="eq" value="B" /></filter></filter></entity></fetch>'
    )
  })

  it('builds link-entity XML for non-root columns and path-based conditions', () => {
    const path = [{ EntityName: 'contact', FromAttribute: 'primarycontactid', ToAttribute: 'contactid' }]
    const columns: SearchTableColumn[] = [
      {
        sourceColumn: {
          Path: path,
          AttributeNames: ['fullname'],
        },
        columnKey: 'col_0',
        chain: path,
        attributes: [{ attributeName: 'fullname', valueKey: 'col_0_fullname_0' }],
        entityName: 'contact',
        isRootColumn: false,
      },
    ]

    const conditions: AppliedFilterCondition[] = [
      {
        filterOption: {
          EntityName: 'contact',
          AttributeName: 'fullname',
          AttributeType: 'string',
          Path: path,
        },
        condition: 'like',
        values: ['ann'],
      },
    ]

    const xml = buildCrmFetchXml('account', columns, conditions)

    expect(xml).toContain(
      '<link-entity name="contact" from="contactid" to="primarycontactid" link-type="inner">'
    )
    expect(xml).toContain('<attribute name="fullname" alias="col_0_fullname_0" />')
    expect(xml).toContain(
      '<filter type="and"><condition attribute="fullname" operator="like" value="%ann%" /></filter>'
    )
  })

  it('buildCrmFilterFetchXml includes requested root attributes', () => {
    const xml = buildCrmFilterFetchXml(
      'account',
      [
        {
          filterOption: { EntityName: 'account', AttributeName: 'name', AttributeType: 'string' },
          condition: 'eq',
          values: ['Acme'],
        },
      ],
      ['accountid']
    )

    expect(xml).toContain('<attribute name="accountid" />')
    expect(xml).toContain('<condition attribute="name" operator="eq" value="Acme" />')
  })
})
