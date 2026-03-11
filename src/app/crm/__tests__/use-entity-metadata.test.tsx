import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityMetadata } from '@/app/crm/use-entity-metadata'
import { EntityConfig } from '@/libs/types/app-config.types'
import { CrmData } from '@/libs/types/entity.types'

const createEntityConfig = (): EntityConfig => ({
  EntityName: 'invoice',
  FilterCategories: [{ Id: 'misc', DisplayName: 'Misc' }],
  RelationPaths: [
    {
      Id: 'invoice-to-product',
      Steps: [
        {
          EntityName: 'invoicedetail',
          FromAttribute: 'invoiceid',
          ToAttribute: 'invoiceid',
        },
        {
          EntityName: 'product',
          FromAttribute: 'productid',
          ToAttribute: 'productid',
        },
      ],
    },
  ],
  FilterOptions: [
    {
      CategoryId: 'misc',
      PathId: 'invoice-to-product',
      AttributeName: 'name11',
      DisplayName: 'Product name',
    },
  ],
  ResultView: {
    Columns: [{ AttributeNames: ['invoicenumber'] }],
  },
})

const createEntityMetadata = (logicalName: string) => ({
  LogicalName: logicalName,
  EntitySetName: `${logicalName}s`,
  PrimaryIdAttribute: `${logicalName}id`,
  LogicalCollectionName: `${logicalName}s`,
  DisplayName: { UserLocalizedLabel: { Label: logicalName } },
  DisplayCollectionName: { UserLocalizedLabel: { Label: logicalName } },
})

const createAttributeMetadata = (logicalName: string) => ({
  LogicalName: logicalName,
  AttributeType: 'String',
  DisplayName: { UserLocalizedLabel: { Label: logicalName } },
})

const createCrmRepositoryMock = (): CrmData => ({
  getEntitiesMetadata: vi.fn(async () => [createEntityMetadata('invoice')]),
  getAttributesMetadata: vi.fn(
    async (entityLogicalName: string, attributeLogicalNames: string[]) => {
      if (entityLogicalName === 'product') {
        return attributeLogicalNames
          .filter((attributeLogicalName: string) => attributeLogicalName !== 'name11')
          .map((attributeLogicalName: string) => createAttributeMetadata(attributeLogicalName))
      }

      return attributeLogicalNames.map((attributeLogicalName: string) =>
        createAttributeMetadata(attributeLogicalName)
      )
    }
  ),
  getLookupAttributeMetadata: vi.fn(async () => ({ Targets: [] })),
  getPicklistAttributeMetadata: vi.fn(async () => ({ OptionSet: { Options: [] } })),
  getEntities: vi.fn(async () => ({ value: [] })),
})

describe('useEntityMetadata', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('shows config validation error for a bad related-entity attribute', async () => {
    const crmRepository = createCrmRepositoryMock()
    const entityConfig = createEntityConfig()

    const { result } = renderHook(() =>
      useEntityMetadata({
        crmRepository,
        configPresets: [entityConfig],
        currentPresetConfig: undefined,
      })
    )

    await waitFor(() => {
      expect(result.current.isMetadataLoading).toBe(false)
    })

    expect(result.current.metadataErrorMessage).toContain('App configuration has invalid values.')
    expect(result.current.metadataErrorMessage).toContain('name11')
    expect(crmRepository.getAttributesMetadata).toHaveBeenCalledWith(
      'product',
      expect.arrayContaining(['name11'])
    )
  })
})
