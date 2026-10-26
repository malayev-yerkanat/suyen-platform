import { randomUUID } from 'node:crypto';
import { FeedbackForm } from '@/app/demo/feedback/FeedbackForm';
import { requireDemoUser } from '@/lib/auth';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { feedbackEntryPoint } from '@/lib/validation/feedback';

type Props = { searchParams: Promise<{ from?: string | string[] }> };
export default async function FeedbackPage({ searchParams }: Props) {
  await requireDemoUser('/demo/feedback');
  const [locale, query] = await Promise.all([getLocale(), searchParams]);
  return (
    <main className="demo-content profile-page">
      <div className="profile-intro">
        <p className="eyebrow">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'feedback.title')}</h1>
        <p>{translate(locale, 'feedback.subtitle')}</p>
      </div>
      <FeedbackForm locale={locale} submissionId={randomUUID()} entryPoint={feedbackEntryPoint(query.from)} />
    </main>
  );
}
