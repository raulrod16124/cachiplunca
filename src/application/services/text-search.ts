const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS_PATTERN, '').trim().toLocaleLowerCase();
}

export function matchesSearchText(value: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length === 0) {
    return false;
  }

  return normalizeSearchText(value).includes(normalizedQuery);
}
