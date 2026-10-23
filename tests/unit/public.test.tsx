import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicHero } from '@/components/PublicHero';
import { PublicProcess } from '@/components/PublicProcess';

describe('public page content', () => {
  it('describes a planned service and labels the internal demo in Russian', () => {
    const html = renderToStaticMarkup(<PublicHero locale="ru" />);

    expect(html).toContain('будущая цифровая платформа');
    expect(html).toContain('href="/demo/login"');
    expect(html).toContain('Доступ для команды');
  });

  it('shows the full three-step journey in Kazakh', () => {
    const html = renderToStaticMarkup(<PublicProcess locale="kk" />);

    expect(html).toContain('Сұраныстан кездесуге дейін');
    expect(html).toContain('Сұранысты сипаттаңыз');
    expect(html).toContain('Маман табыңыз');
    expect(html).toContain('Кездесуді жоспарлаңыз');
    expect((html.match(/<li\b/g) ?? []).length).toBe(3);
  });
});
