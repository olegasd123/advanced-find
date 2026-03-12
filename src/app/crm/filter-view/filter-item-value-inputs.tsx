import { Combobox, ComboboxLabel, ComboboxOption } from '@/components/catalyst/combobox'
import { SearchCombobox } from '@/components/controls/search-combobox'
import { Listbox, ListboxLabel, ListboxOption } from '@/components/catalyst/listbox'
import { Input } from '@/components/catalyst/input'
import { ConditionValueOption } from './filter-item-value.helpers'

export const OnDemandSearchValue = ({
  options,
  isLoading,
  searchDelay,
  minCharacters,
  isMultiSelection,
  selectedValues,
  selectedSingleValue,
  isDisabled,
  onSearch,
  onMultiChange,
  onSingleChange,
}: {
  options: ConditionValueOption[]
  isLoading: boolean
  searchDelay: number
  minCharacters?: number
  isMultiSelection: boolean
  selectedValues: ConditionValueOption[]
  selectedSingleValue: ConditionValueOption | null
  isDisabled?: boolean
  onSearch: (query: string) => Promise<void>
  onMultiChange: (values: ConditionValueOption[]) => void
  onSingleChange: (value: ConditionValueOption | null) => void
}) => {
  if (isMultiSelection) {
    return (
      <div>
        <SearchCombobox
          multiple
          options={options}
          isLoading={isLoading}
          searchDelay={searchDelay}
          minCharacters={minCharacters}
          placeholder="Search values"
          displayValue={(option) => option.displayName}
          value={selectedValues}
          disabled={isDisabled}
          onSearch={onSearch}
          onChange={onMultiChange}
        >
          {(option) => (
            <ComboboxOption value={option}>
              <ComboboxLabel>{option.displayName}</ComboboxLabel>
            </ComboboxOption>
          )}
        </SearchCombobox>
      </div>
    )
  }

  return (
    <SearchCombobox
      options={options}
      isLoading={isLoading}
      searchDelay={searchDelay}
      minCharacters={minCharacters}
      placeholder="Search value"
      displayValue={(option) => option?.displayName}
      value={selectedSingleValue}
      disabled={isDisabled}
      onSearch={onSearch}
      onChange={onSingleChange}
    >
      {(option) => (
        <ComboboxOption value={option}>
          <ComboboxLabel>{option.displayName}</ComboboxLabel>
        </ComboboxOption>
      )}
    </SearchCombobox>
  )
}

export const SelectableValue = ({
  options,
  isLoading,
  errorMessage,
  isMultiSelection,
  isLookupAttribute,
  isPicklistAttribute,
  condition,
  selectedValues,
  selectedSingleValue,
  selectedConditionValue,
  isDisabled,
  onMultiChange,
  onSingleChange,
  onSelectionChange,
  onInputChange,
}: {
  options: ConditionValueOption[]
  isLoading: boolean
  errorMessage?: string
  isMultiSelection: boolean
  isLookupAttribute: boolean
  isPicklistAttribute: boolean
  condition: string | null
  selectedValues: ConditionValueOption[]
  selectedSingleValue: ConditionValueOption | null
  selectedConditionValue: string | number
  isDisabled?: boolean
  onMultiChange: (values: ConditionValueOption[]) => void
  onSingleChange: (value: ConditionValueOption | null) => void
  onSelectionChange: (value: ConditionValueOption['value'] | null) => void
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) => {
  if (isLoading) {
    return <Input disabled type="text" value="Loading values..." onChange={onInputChange} />
  }

  if (errorMessage) {
    return <Input disabled type="text" value={errorMessage} onChange={onInputChange} />
  }

  if (options.length === 0) {
    return null
  }

  if (isMultiSelection) {
    return (
      <div>
        <Combobox
          multiple
          options={options}
          placeholder="Select values"
          displayValue={(option) => option.displayName}
          displayInputValue={(values) => values.map((option) => option.displayName).join(', ')}
          value={selectedValues}
          disabled={isDisabled}
          onChange={onMultiChange}
        >
          {(option) => (
            <ComboboxOption value={option}>
              <ComboboxLabel>{option.displayName}</ComboboxLabel>
            </ComboboxOption>
          )}
        </Combobox>
      </div>
    )
  }

  if (isLookupAttribute) {
    return (
      <Combobox
        options={options}
        placeholder="Select value"
        displayValue={(option) => option?.displayName}
        value={selectedSingleValue}
        disabled={isDisabled}
        onChange={onSingleChange}
      >
        {(option) => (
          <ComboboxOption value={option}>
            <ComboboxLabel>{option.displayName}</ComboboxLabel>
          </ComboboxOption>
        )}
      </Combobox>
    )
  }

  if (isPicklistAttribute && (condition === 'in' || condition === 'not-in')) {
    return (
      <Input
        type="text"
        placeholder="Use comma separated values"
        value={selectedConditionValue.toString()}
        disabled={isDisabled}
        onChange={onInputChange}
      />
    )
  }

  return (
    <Listbox
      placeholder="Select value"
      value={selectedConditionValue === '' ? null : selectedConditionValue}
      disabled={isDisabled}
      onChange={onSelectionChange}
    >
      {options.map((option) => (
        <ListboxOption key={option.value} value={option.value}>
          <ListboxLabel>{option.displayName}</ListboxLabel>
        </ListboxOption>
      ))}
    </Listbox>
  )
}

export const ScalarValue = ({
  attributeType,
  condition,
  value,
  isDisabled,
  onInputChange,
  onSelectionChange,
}: {
  attributeType?: string
  condition: string | null
  value: string | number
  isDisabled?: boolean
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSelectionChange: (value: ConditionValueOption['value'] | null) => void
}) => {
  if (attributeType === 'Boolean') {
    return (
      <Listbox
        value={value === '' ? null : value}
        disabled={isDisabled}
        onChange={onSelectionChange}
      >
        <ListboxOption value="true">
          <ListboxLabel>True</ListboxLabel>
        </ListboxOption>
        <ListboxOption value="false">
          <ListboxLabel>False</ListboxLabel>
        </ListboxOption>
      </Listbox>
    )
  }

  if (attributeType === 'DateTime') {
    return (
      <Input type="date" disabled={isDisabled} value={value.toString()} onChange={onInputChange} />
    )
  }

  const isNumberType =
    attributeType === 'Number' ||
    attributeType === 'Integer' ||
    attributeType === 'BigInt' ||
    attributeType === 'Decimal' ||
    attributeType === 'Double' ||
    attributeType === 'Money'

  if (isNumberType && condition !== 'in' && condition !== 'not-in') {
    return (
      <Input
        type="number"
        value={value.toString()}
        disabled={isDisabled}
        onChange={onInputChange}
      />
    )
  }

  return (
    <Input
      type="text"
      placeholder={
        condition === 'in' || condition === 'not-in' ? 'Use comma separated values' : 'Value'
      }
      value={value.toString()}
      disabled={isDisabled}
      onChange={onInputChange}
    />
  )
}
