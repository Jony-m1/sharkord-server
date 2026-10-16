const pad = (value: number) => String(value).padStart(2, '0');

// a running call: "45s", then "2m 05s" from the first minute and "1h 02m 05s" from the first hour
export const formatCallDuration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes) return `${minutes}m ${pad(seconds)}s`;

  return `${seconds}s`;
};

// a lifetime total, to the minute: "12m", "4h 12m", "3d 4h 12m"
export const formatTotalDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
};
