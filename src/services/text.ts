/** Lower-case, accent-free text for forgiving searches ("Coração" matches "coracao"). */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
