import { useLanguageStore } from '../store/languageStore';
import { translate } from '../hooks/useTranslation';

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatLastSeen(iso: string, now: number = Date.now()): string {
  const diffSec = Math.floor((now - new Date(iso).getTime()) / 1000);
  const lang = useLanguageStore.getState().language;

  if (diffSec < 60) {
    return translate(lang, 'chat.lastSeenJustNow');
  }

  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) {
    if (lang === 'ru') {
      const pl = pluralRu(minutes, 'минуту', 'минуты', 'минут');
      return translate(lang, 'chat.lastSeenMinutes', { count: minutes, plural: pl });
    } else {
      const pl = minutes === 1 ? 'minute' : 'minutes';
      return translate(lang, 'chat.lastSeenMinutes', { count: minutes, plural: pl });
    }
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (lang === 'ru') {
      const pl = pluralRu(hours, 'час', 'часа', 'часов');
      return translate(lang, 'chat.lastSeenHours', { count: hours, plural: pl });
    } else {
      const pl = hours === 1 ? 'hour' : 'hours';
      return translate(lang, 'chat.lastSeenHours', { count: hours, plural: pl });
    }
  }

  const days = Math.floor(hours / 24);
  if (lang === 'ru') {
    const pl = pluralRu(days, 'день', 'дня', 'дней');
    return translate(lang, 'chat.lastSeenDays', { count: days, plural: pl });
  } else {
    const pl = days === 1 ? 'day' : 'days';
    return translate(lang, 'chat.lastSeenDays', { count: days, plural: pl });
  }
}
