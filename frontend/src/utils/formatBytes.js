// Converts raw bytes into a human-readable size (KB, MB, GB) instead of a
// flat "MB" label regardless of actual size.
// NOTE: PostgreSQL BIGINT columns come back from the API as STRINGS (to avoid
// JS number precision loss), so we explicitly coerce to Number here - without
// this, size formatting can behave unpredictably depending on the driver.
export default function formatBytes(rawBytes) {
  const bytes = Number(rawBytes);
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
