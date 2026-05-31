/** Russian plural form selector: plural(1,'минуту','минуты','минут') → 'минуту'. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Human-readable "last seen" label in Russian.
 * Pass a `now` from {@link useNow} so the label re-computes as time passes.
 */
export function formatLastSeen(iso: string, now: number = Date.now()): string {
  const diffSec = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'только что';

  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;

  const days = Math.floor(hours / 24);
  return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}
