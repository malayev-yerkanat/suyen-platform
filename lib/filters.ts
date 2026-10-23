import type { Locale } from '@/lib/i18n/catalog';

export const SUPPORT_AREAS = [
  'speech_language',
  'developmental_education',
  'neuropsychology',
  'adaptive_physical_activity',
] as const;

export type SupportArea = (typeof SUPPORT_AREAS)[number];

export type DirectorySlot = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export type DirectorySpecialist = {
  id: string;
  displayName: string;
  role: string;
  roleKk: string;
  supportArea: SupportArea;
  languages: Locale[];
  description: string;
  descriptionKk: string;
  slots: DirectorySlot[];
};

export type DirectoryFilters = {
  area?: SupportArea;
  language?: Locale;
  availableOnly: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** A malformed or repeated URL value never silently narrows the directory. */
export function parseDirectoryFilters(params: SearchParams): DirectoryFilters {
  const area = typeof params.area === 'string' &&
    SUPPORT_AREAS.includes(params.area as SupportArea)
    ? params.area as SupportArea : undefined;
  const language = params.language === 'ru' || params.language === 'kk'
    ? params.language : undefined;

  return {
    ...(area ? { area } : {}),
    ...(language ? { language } : {}),
    availableOnly: params.available === '1',
  };
}

export function filterSpecialists(
  specialists: readonly DirectorySpecialist[],
  filters: DirectoryFilters,
): DirectorySpecialist[] {
  return specialists.filter((specialist) =>
    (!filters.area || specialist.supportArea === filters.area)
    && (!filters.language || specialist.languages.includes(filters.language))
    && (!filters.availableOnly || specialist.slots.length > 0));
}

export function directoryEmptyState(
  specialists: readonly DirectorySpecialist[],
  filters: DirectoryFilters,
): 'no-slots' | 'no-matches' | null {
  if (filterSpecialists(specialists, filters).length > 0) return null;
  if (filters.availableOnly && filterSpecialists(specialists, {
    ...filters, availableOnly: false,
  }).length > 0) return 'no-slots';
  return 'no-matches';
}
