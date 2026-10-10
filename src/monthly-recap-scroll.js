// Scroll only the recap body: never move the dashboard or its pinned banner.
export function scrollRecapSection(container, id, behavior = 'smooth') {
  const section = container?.querySelector(`[id="rekap-${id}"]`);
  if (!section) return false;
  const top = container.scrollTop + section.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop;
  container.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}
