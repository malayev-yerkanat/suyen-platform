import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/locale';

const titles = {
  ru: {
    dashboard: 'Обзор', profile: 'Профиль ребёнка', specialists: 'Специалисты',
    specialist: 'Профиль специалиста', bookings: 'Мои записи', booking: 'Детали записи',
    review: 'Проверка записи', feedback: 'Обратная связь', login: 'Вход в демо',
  },
  kk: {
    dashboard: 'Шолу', profile: 'Бала профилі', specialists: 'Мамандар',
    specialist: 'Маман профилі', bookings: 'Менің жазылымдарым', booking: 'Жазылым туралы',
    review: 'Жазылымды тексеру', feedback: 'Кері байланыс', login: 'Демоға кіру',
  },
} as const;

export async function demoMetadata(route: keyof typeof titles.ru): Promise<Metadata> {
  const locale = await getLocale();
  return { title: `${titles[locale][route]} · Süyen` };
}
