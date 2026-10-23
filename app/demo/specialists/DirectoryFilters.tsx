import Link from 'next/link';

import { SUPPORT_AREAS, type DirectoryFilters } from '@/lib/filters';
import { translate, type Locale } from '@/lib/i18n/catalog';

type Props = { locale: Locale; filters: DirectoryFilters };

export function DirectoryFilters({ locale, filters }: Props) {
  return (
    <form className="directory-filters" action="/demo/specialists" method="get">
      <label>
        <span>{translate(locale, 'directory.filter.area')}</span>
        <select name="area" defaultValue={filters.area ?? ''}>
          <option value="">{translate(locale, 'common.all')}</option>
          {SUPPORT_AREAS.map((area) => (
            <option key={area} value={area}>{translate(locale, `support.${area}`)}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{translate(locale, 'directory.filter.language')}</span>
        <select name="language" defaultValue={filters.language ?? ''}>
          <option value="">{translate(locale, 'common.all')}</option>
          <option value="ru">{translate(locale, 'common.russian')}</option>
          <option value="kk">{translate(locale, 'common.kazakh')}</option>
        </select>
      </label>
      <label className="directory-availability">
        <input type="checkbox" name="available" value="1" defaultChecked={filters.availableOnly} />
        <span>{translate(locale, 'directory.filter.available')}</span>
      </label>
      <div className="directory-filter-actions">
        <button className="button button-primary" type="submit">
          {translate(locale, 'directory.filter.apply')}
        </button>
        <Link href="/demo/specialists" className="button">
          {translate(locale, 'directory.filter.clear')}
        </Link>
      </div>
    </form>
  );
}
