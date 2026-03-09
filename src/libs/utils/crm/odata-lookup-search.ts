/**
 * Builds an OData $filter expression that OR-combines `contains()` checks
 * across the given attribute names.
 *
 * Example:
 *   buildLookupSearchFilter(['firstname', 'lastname'], 'John')
 *   => "contains(firstname,'John') or contains(lastname,'John')"
 *
 * Returns undefined if attributeNames is empty or query is blank.
 */
export const buildLookupSearchFilter = (
  attributeNames: string[],
  query: string
): string | undefined => {
  const trimmedQuery = query.trim()
  if (attributeNames.length === 0 || trimmedQuery.length === 0) {
    return undefined
  }

  const escapedQuery = trimmedQuery.replace(/'/g, "''")
  const conditions = attributeNames.map((attr) => `contains(${attr},'${escapedQuery}')`)

  return conditions.join(' or ')
}
