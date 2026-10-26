import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DirectoryFilters } from '@/app/demo/specialists/DirectoryFilters';

afterEach(cleanup);

it('clears unfinished selections even when already on the unfiltered URL', () => {
  render(<DirectoryFilters locale="ru" filters={{ availableOnly: false }} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Направление' }), { target: { value: 'neuropsychology' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('link', { name: 'Сбросить фильтры' }));
  expect(screen.getByRole('combobox', { name: 'Направление' })).toHaveValue('');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

it('synchronizes every control after applied filters are cleared or restored by navigation', () => {
  const applied = { area: 'neuropsychology', language: 'kk', availableOnly: true } as const;
  const { rerender } = render(<DirectoryFilters locale="ru" filters={applied} />);
  rerender(<DirectoryFilters locale="ru" filters={{ availableOnly: false }} />);
  expect(screen.getByRole('combobox', { name: 'Направление' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Язык сессии' })).toHaveValue('');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  rerender(<DirectoryFilters locale="ru" filters={applied} />);
  expect(screen.getByRole('combobox', { name: 'Направление' })).toHaveValue('neuropsychology');
  expect(screen.getByRole('combobox', { name: 'Язык сессии' })).toHaveValue('kk');
  expect(screen.getByRole('checkbox')).toBeChecked();
});

it('preserves unfinished filter selections when only the interface language changes', () => {
  const { rerender } = render(<DirectoryFilters locale="ru" filters={{ availableOnly: false }} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Направление' }), { target: { value: 'neuropsychology' } });
  rerender(<DirectoryFilters locale="kk" filters={{ availableOnly: false }} />);
  expect(screen.getByRole('combobox', { name: 'Бағыт' })).toHaveValue('neuropsychology');
});
