import { describe, expect, it } from 'vitest';

import {
  filterSpecialists,
  directoryEmptyState,
  parseDirectoryFilters,
  type DirectorySpecialist,
} from '@/lib/filters';

const specialists: DirectorySpecialist[] = [
  {
    id: 'speech', displayName: 'Айша', role: 'Логопед', roleKk: 'Логопед',
    supportArea: 'speech_language', languages: ['ru', 'kk'],
    description: 'Пример', descriptionKk: 'Мысал',
    slots: [{ id: 'slot', startsAt: '2026-10-15T10:00:00Z', endsAt: '2026-10-15T11:00:00Z' }],
  },
  {
    id: 'education', displayName: 'Дана', role: 'Педагог', roleKk: 'Педагог',
    supportArea: 'developmental_education', languages: ['kk'],
    description: 'Пример', descriptionKk: 'Мысал', slots: [],
  },
];

describe('directory filters', () => {
  it('requires area, language, and available time together', () => {
    expect(filterSpecialists(specialists, {
      area: 'speech_language', language: 'kk', availableOnly: true,
    }).map((specialist) => specialist.id)).toEqual(['speech']);
    expect(filterSpecialists(specialists, {
      area: 'developmental_education', language: 'ru', availableOnly: true,
    })).toEqual([]);
  });

  it('keeps a specialist with no slots in the unfiltered directory', () => {
    expect(filterSpecialists(specialists, { availableOnly: false })).toHaveLength(2);
    expect(filterSpecialists(specialists, { availableOnly: true })).toHaveLength(1);
  });

  it('ignores invalid URL params rather than applying hidden filters', () => {
    expect(parseDirectoryFilters({ area: 'invalid', language: 'en', available: 'true' }))
      .toEqual({ availableOnly: false });
    expect(parseDirectoryFilters({ area: 'speech_language', language: 'kk', available: '1' }))
      .toEqual({ area: 'speech_language', language: 'kk', availableOnly: true });
  });

  it('separates no slots from no specialist matches', () => {
    expect(directoryEmptyState(specialists, {
      area: 'developmental_education', availableOnly: true,
    })).toBe('no-slots');
    expect(directoryEmptyState(specialists, {
      area: 'neuropsychology', availableOnly: true,
    })).toBe('no-matches');
    expect(directoryEmptyState(specialists, { availableOnly: false })).toBeNull();
  });
});
