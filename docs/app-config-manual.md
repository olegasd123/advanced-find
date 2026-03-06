# App Config Manual

The application is configured through a single JSON file located at `assets/app-config.json`. This file defines which CRM entities can be searched, how filters are presented to users, and how results are displayed.

## Table of Contents

- [File Location and Loading](#file-location-and-loading)
- [Top-Level Structure](#top-level-structure)
- [Entity Configuration](#entity-configuration)
- [Relation Paths](#relation-paths)
- [Filter Categories](#filter-categories)
- [Filter Options](#filter-options)
  - [Default Filter Behavior](#default-filter-behavior)
  - [Lookup Configuration](#lookup-configuration)
  - [Selection Configuration](#selection-configuration)
- [Default Filter Groups](#default-filter-groups)
- [Result View](#result-view)
  - [Columns](#columns)
  - [Pagination](#pagination)
  - [Default Sort](#default-sort)
- [Localization](#localization)
- [Complete Example](#complete-example)

---

## File Location and Loading

| Build Mode                        | Config File Path                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Development (`npm run dev`)       | `assets/app-config.json`                                                          |
| CRM deployment (`crm`, `crm-dev`) | Copied to `dist/advanced-find/app-config.json` and fetched at `./app-config.json` |

The config is loaded at runtime via `fetch()` and provided to the entire app through a React context (`AppConfigProvider`). All components access it via the `useAppConfig()` hook.

---

## Top-Level Structure

```json
{
  "SearchSchema": {
    "Entities": [],
    "Localization": {}
  }
}
```

| Property                    | Type   | Required | Description                                                                                    |
| --------------------------- | ------ | -------- | ---------------------------------------------------------------------------------------------- |
| `SearchSchema`              | object | No       | Root container for all search-related configuration.                                           |
| `SearchSchema.Entities`     | array  | Yes      | List of CRM entity configurations. Each entry defines filters and result views for one entity. |
| `SearchSchema.Localization` | object | Yes      | Localization settings (e.g., filter condition labels).                                         |

---

## Entity Configuration

Each entry in the `Entities` array represents one searchable CRM entity.

```json
{
  "LogicalName": "invoice",
  "FilterUniqueOptionsOnly": true,
  "FilterCategories": [],
  "RelationPaths": [],
  "FilterOptions": [],
  "DefaultFilterGroups": [],
  "ResultView": {}
}
```

| Property                  | Type    | Required | Default | Description                                                                |
| ------------------------- | ------- | -------- | ------- | -------------------------------------------------------------------------- |
| `LogicalName`             | string  | **Yes**  | -       | The CRM entity logical name (e.g., `"invoice"`, `"account"`).              |
| `FilterUniqueOptionsOnly` | boolean | No       | `false` | When `true`, each filter option can only be added to the filter grid once. |
| `FilterCategories`        | array   | No       | `[]`    | Categories for organizing filter options in the UI dropdown.               |
| `RelationPaths`           | array   | No       | `[]`    | Reusable relation path definitions for accessing related entities.         |
| `FilterOptions`           | array   | **Yes**  | -       | Available filter options users can add to the search.                      |
| `DefaultFilterGroups`     | array   | No       | `[]`    | Pre-configured filter groups shown when the search loads.                  |
| `ResultView`              | object  | **Yes**  | -       | Defines result table columns, pagination, and sorting.                     |

---

## Relation Paths

Relation paths define how to traverse from the primary entity to a related entity. They are referenced by `Id` from filter options and result columns via the `PathId` property.

```json
{
  "Id": "invoice-to-product",
  "Steps": [
    {
      "EntityName": "invoicedetail",
      "FromAttribute": "invoiceid",
      "ToAttribute": "invoiceid"
    },
    {
      "EntityName": "product",
      "FromAttribute": "productid",
      "ToAttribute": "productid"
    }
  ]
}
```

| Property | Type   | Required | Description                                                                                                                                                    |
| -------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Id`     | string | **Yes**  | Unique identifier for this relation path. Referenced by `PathId` in filter options and columns. IDs are case-insensitive (normalized to lowercase at runtime). |
| `Steps`  | array  | **Yes**  | Ordered list of join steps from the primary entity to the target entity.                                                                                       |

### Relation Path Step

Each step defines a single entity-to-entity join.

| Property        | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `EntityName`    | string | **Yes**  | The logical name of the related entity to join to.    |
| `FromAttribute` | string | **Yes**  | The attribute on the source entity used for the join. |
| `ToAttribute`   | string | **Yes**  | The attribute on the target entity used for the join. |

**Multi-step paths:** For traversing through intermediate entities (e.g., invoice -> invoicedetail -> product), add multiple steps in order. Each step joins from the entity reached by the previous step.

**Inline paths:** Filter options and columns can also define paths inline using the `Path` property instead of referencing a shared `PathId`. This is useful for one-off relations that don't need to be reused.

---

## Filter Categories

Categories group filter options in the filter dropdown menu. Each filter option can reference a category by its `Id`.

```json
{
  "Id": "general",
  "DisplayName": "General"
}
```

| Property      | Type   | Required | Description                                                                                         |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `Id`          | string | **Yes**  | Unique identifier for the category. Referenced by `CategoryId` in filter options. Case-insensitive. |
| `DisplayName` | string | **Yes**  | Label shown in the UI.                                                                              |

Filter options without a `CategoryId` appear ungrouped in the dropdown.

---

## Filter Options

Filter options define the available filters that users can add to the search. Each option maps to a CRM entity attribute (either on the primary entity or a related entity).

```json
{
  "Id": "account-name-filter",
  "CategoryId": "general",
  "PathId": "invoice-to-detail",
  "AttributeName": "name",
  "DisplayName": "Account Name",
  "Groupable": true,
  "Default": {},
  "Lookup": {},
  "Selection": {}
}
```

| Property        | Type    | Required | Default                          | Description                                                                                                  |
| --------------- | ------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Id`            | string  | No       | -                                | Unique identifier for this filter option. Required if referenced by `DefaultFilterGroups`. Case-insensitive. |
| `CategoryId`    | string  | No       | -                                | References a `FilterCategories.Id` to group this option in the dropdown.                                     |
| `PathId`        | string  | No       | -                                | References a `RelationPaths.Id` to filter on a related entity's attribute. Mutually exclusive with `Path`.   |
| `Path`          | array   | No       | -                                | Inline relation path steps. Mutually exclusive with `PathId`.                                                |
| `AttributeName` | string  | No       | -                                | The CRM attribute logical name to filter on.                                                                 |
| `DisplayName`   | string  | No       | Auto-generated from CRM metadata | Custom display label. If omitted, the attribute's display name is fetched from CRM metadata.                 |
| `Groupable`     | boolean | No       | `true`                           | When `false`, the filter option cannot be dragged into a filter group.                                       |
| `Default`       | object  | No       | -                                | Default behavior configuration (see below).                                                                  |
| `Lookup`        | object  | No       | -                                | Lookup display configuration for entity-reference attributes (see below).                                    |
| `Selection`     | object  | No       | -                                | Constrains how many values users can select (see below).                                                     |

**Runtime-populated properties** (do not set these in the config):

- `AttributeType` - Automatically populated from CRM metadata.
- `EntityName` - Automatically resolved from the relation path or primary entity.

### Default Filter Behavior

The `Default` object controls how a filter option behaves when initially loaded.

```json
{
  "IsShown": true,
  "Condition": "eq",
  "Values": ["your value 1"],
  "IsAttributeDisabled": true,
  "IsDisabled": false,
  "CannotBeRemoved": true
}
```

| Property              | Type    | Default | Description                                                                                              |
| --------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `IsShown`             | boolean | `false` | When `true`, this filter is automatically added to the filter grid on initial load.                      |
| `Condition`           | string  | `"eq"`  | Default condition operator. See the [Localization](#localization) section for available condition codes. |
| `Values`              | array   | `[]`    | Pre-filled filter values. Array of strings or numbers.                                                   |
| `CannotBeRemoved`     | boolean | `false` | When `true`, the user cannot delete this filter row from the grid.                                       |
| `IsAttributeDisabled` | boolean | `false` | When `true`, the attribute dropdown is disabled (user cannot change which attribute is filtered).        |
| `IsDisabled`          | boolean | `false` | When `true`, the entire filter row is disabled (read-only).                                              |

### Lookup Configuration

For entity-reference (lookup) attributes, the `Lookup` object controls how referenced records are displayed.

```json
{
  "AttributeNames": ["firstname", "lastname"],
  "AttributeFormat": "{0} {1}"
}
```

| Property          | Type   | Default             | Description                                                                                      |
| ----------------- | ------ | ------------------- | ------------------------------------------------------------------------------------------------ |
| `AttributeNames`  | array  | -                   | Attribute logical names from the related entity to display.                                      |
| `AttributeFormat` | string | Concatenated values | Format template using `{0}`, `{1}`, etc. as placeholders for each attribute in `AttributeNames`. |

**Example:** With `AttributeNames: ["firstname", "lastname"]` and `AttributeFormat: "{0} {1}"`, a lookup record with first name "John" and last name "Doe" displays as "John Doe".

### Selection Configuration

Controls how many values a user can select for a filter.

```json
{
  "Multiple": true,
  "MinItems": 1,
  "MaxItems": 5
}
```

| Property   | Type    | Default   | Description                                                               |
| ---------- | ------- | --------- | ------------------------------------------------------------------------- |
| `Multiple` | boolean | `false`   | Enables multi-value selection.                                            |
| `MinItems` | number  | `0`       | Minimum number of values that must be selected (clamped to 0 at runtime). |
| `MaxItems` | number  | unlimited | Maximum number of values that can be selected.                            |

---

## Default Filter Groups

Pre-configured filter groups that appear when the search loads. Groups bundle multiple filter options together with a logical operator.

```json
{
  "FilterOptionIds": ["account-name-filter", "account-category-filter"],
  "Operator": "and",
  "GroupTitle": "Primary Filters",
  "IsOperatorEditable": false,
  "IsRemovable": false
}
```

| Property              | Type    | Default | Description                                                                                                         |
| --------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `FilterOptionIds`     | array   | -       | List of `FilterOptionConfig.Id` values to include in this group. Mutually exclusive with `FilterOptionIndexes`.     |
| `FilterOptionIndexes` | array   | -       | Alternative to `FilterOptionIds`: references filter options by their zero-based index in the `FilterOptions` array. |
| `Operator`            | string  | `"and"` | Logical operator: `"and"` or `"or"`.                                                                                |
| `GroupTitle`          | string  | -       | Display title for the group.                                                                                        |
| `IsOperatorEditable`  | boolean | `true`  | When `false`, the user cannot change the group's logical operator.                                                  |
| `IsRemovable`         | boolean | `true`  | When `false`, the user cannot remove the group from the filter grid.                                                |

**Note:** Filter options referenced by a default group should have `Default.IsShown: true` so they are visible when the group is created. You can use either `FilterOptionIds` or `FilterOptionIndexes` but not both.

---

## Result View

Defines how search results are displayed in the results table.

```json
{
  "Columns": [],
  "ShowAppliedFilters": true,
  "Pagination": {},
  "DefaultSort": []
}
```

| Property             | Type    | Required | Default | Description                                                            |
| -------------------- | ------- | -------- | ------- | ---------------------------------------------------------------------- |
| `Columns`            | array   | **Yes**  | -       | Table column definitions.                                              |
| `ShowAppliedFilters` | boolean | No       | `false` | When `true`, shows the active filters summary above the results table. |
| `Pagination`         | object  | No       | -       | Pagination configuration.                                              |
| `DefaultSort`        | array   | No       | `[]`    | Default sort order applied when results first load.                    |

### Columns

Each column defines what data is displayed in the results table.

```json
{
  "Id": "account-info",
  "PathId": "account-created-by",
  "AttributeNames": ["name", "accountnumber"],
  "AttributeFormat": "{0} ({1})",
  "DisplayName": "Account Info",
  "Width": 220
}
```

| Property          | Type             | Required | Default                          | Description                                                                                            |
| ----------------- | ---------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Id`              | string           | No       | -                                | Unique identifier. Required if referenced by `DefaultSort`. Case-insensitive.                          |
| `PathId`          | string           | No       | -                                | References a `RelationPaths.Id` to display data from a related entity. Mutually exclusive with `Path`. |
| `Path`            | array            | No       | -                                | Inline relation path steps. Mutually exclusive with `PathId`.                                          |
| `AttributeNames`  | array            | No       | -                                | Attribute logical names to display in this column.                                                     |
| `AttributeFormat` | string           | No       | Concatenated values              | Format template using `{0}`, `{1}`, etc. as placeholders.                                              |
| `DisplayName`     | string           | No       | Auto-generated from CRM metadata | Column header label.                                                                                   |
| `Width`           | number or string | No       | Auto                             | Column width in pixels. Can be a number (`220`) or string (`"220"`).                                   |

**Multi-attribute columns:** When `AttributeNames` contains multiple attributes, they are combined using `AttributeFormat`. For example, `["name", "accountnumber"]` with format `"{0} ({1})"` produces "Contoso (ACC-001)".

### Pagination

Controls the pagination behavior of the results table.

```json
{
  "List": [25, 50, 100],
  "AllOptionLabel": "All",
  "SummaryTemplate": "Showing {0} to {1} of {2} results"
}
```

| Property          | Type   | Default | Description                                                                                       |
| ----------------- | ------ | ------- | ------------------------------------------------------------------------------------------------- |
| `List`            | array  | -       | Available page size options. Values are truncated to integers with a minimum of 1.                |
| `AllOptionLabel`  | string | -       | Label for the "show all records" option. If omitted, no "all" option is shown.                    |
| `SummaryTemplate` | string | -       | Template for the pagination summary. `{0}` = start index, `{1}` = end index, `{2}` = total count. |

### Default Sort

Defines the initial sort order of the results table. Multiple entries are applied in order (primary sort, secondary sort, etc.).

```json
{
  "ColumnId": "invoice-name",
  "IsAscending": true
}
```

| Property      | Type    | Default | Description                                                     |
| ------------- | ------- | ------- | --------------------------------------------------------------- |
| `ColumnId`    | string  | -       | References a `Columns.Id` (case-insensitive). This is required. |
| `IsAscending` | boolean | `true`  | Sort direction. `true` for ascending, `false` for descending.   |

---

## Localization

The `Localization` section allows customizing display labels for filter condition operators.

```json
{
  "FilterConditionLabels": {
    "eq": "Equal",
    "ne": "Not equal",
    "in": "In",
    "null": "Does not contain data",
    "not-null": "Contains data",
    "begins-with": "Begins with",
    "not-begin-with": "Does not begin with",
    "ends-with": "Ends with",
    "not-end-with": "Does not end with",
    "gt": "Greater than",
    "ge": "Greater than or equal",
    "lt": "Less than",
    "le": "Less than or equal",
    "today": "Today",
    "tomorrow": "Tomorrow",
    "yesterday": "Yesterday",
    "like": "Contains",
    "not-like": "Does not contain"
  }
}
```

| Property                | Type   | Description                                                                                                  |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `FilterConditionLabels` | object | Maps condition codes to display labels. Keys are condition operator codes, values are human-readable labels. |

These labels appear in the condition dropdown when editing a filter row.

---

## Complete Example

Below is a minimal yet complete configuration for a single entity:

```json
{
  "SearchSchema": {
    "Entities": [
      {
        "LogicalName": "contact",
        "RelationPaths": [
          {
            "Id": "contact-account",
            "Steps": [
              {
                "EntityName": "account",
                "FromAttribute": "parentcustomerid",
                "ToAttribute": "accountid"
              }
            ]
          }
        ],
        "FilterCategories": [
          {
            "Id": "personal",
            "DisplayName": "Personal Info"
          }
        ],
        "FilterOptions": [
          {
            "Id": "contact-fullname",
            "CategoryId": "personal",
            "AttributeName": "fullname",
            "DisplayName": "Full Name",
            "Default": {
              "IsShown": true,
              "Condition": "like"
            }
          },
          {
            "Id": "contact-email",
            "CategoryId": "personal",
            "AttributeName": "emailaddress1",
            "DisplayName": "Email"
          },
          {
            "PathId": "contact-account",
            "AttributeName": "name",
            "DisplayName": "Company Name"
          }
        ],
        "DefaultFilterGroups": [
          {
            "FilterOptionIds": ["contact-fullname"],
            "Operator": "and"
          }
        ],
        "ResultView": {
          "ShowAppliedFilters": true,
          "Columns": [
            {
              "Id": "name-col",
              "AttributeNames": ["fullname"],
              "DisplayName": "Name",
              "Width": 200
            },
            {
              "AttributeNames": ["emailaddress1"],
              "DisplayName": "Email"
            },
            {
              "Id": "company-col",
              "PathId": "contact-account",
              "AttributeNames": ["name"],
              "DisplayName": "Company"
            }
          ],
          "Pagination": {
            "List": [25, 50, 100],
            "AllOptionLabel": "All",
            "SummaryTemplate": "Showing {0} to {1} of {2} results"
          },
          "DefaultSort": [
            {
              "ColumnId": "name-col",
              "IsAscending": true
            }
          ]
        }
      }
    ],
    "Localization": {
      "FilterConditionLabels": {
        "eq": "Equal",
        "ne": "Not equal",
        "like": "Contains",
        "not-like": "Does not contain",
        "null": "Does not contain data",
        "not-null": "Contains data"
      }
    }
  }
}
```
