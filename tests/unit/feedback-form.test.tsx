import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/app/demo/feedback/actions', () => ({ saveFeedbackAction: mocks.save }));
import { FeedbackForm } from '@/app/demo/feedback/FeedbackForm';
const submissionId = '13c9cf98-242f-4a76-aa03-548717583a10';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('feedback form', () => {
  it('keeps answers and identity on a failed save, then thanks after retry', async () => {
    mocks.save.mockImplementationOnce(async (_state, data: FormData) => ({ status: 'error', values: Object.fromEntries(data) }))
      .mockImplementationOnce(async (_state, data: FormData) => ({ status: 'success', values: Object.fromEntries(data) }));
    const { container } = render(<FeedbackForm locale="ru" submissionId={submissionId} entryPoint="confirmation" />);
    fireEvent.change(screen.getByLabelText('Удалось выполнить задачу?'), { target: { value: 'partially' } });
    fireEvent.change(screen.getByLabelText('Насколько это было легко?'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Где возникли трудности?'), { target: { value: 'booking' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    expect(screen.getByLabelText('Удалось выполнить задачу?')).toHaveValue('partially');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Спасибо за отзыв!'));
    expect(mocks.save.mock.calls.map((call) => call[1].get('submissionId'))).toEqual([submissionId, submissionId]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Спасибо за отзыв!' })).toHaveFocus();
  });
  it('explains changed retry conflicts and offers a fresh form', async () => {
    mocks.save.mockImplementationOnce(async (_state, data: FormData) => ({ status: 'conflict', values: Object.fromEntries(data) }));
    const { container } = render(<FeedbackForm locale="ru" submissionId={submissionId} entryPoint="cancellation" />);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Первоначальный ответ уже сохранён');
    expect(screen.getByRole('link', { name: 'Открыть новую форму' })).toHaveAttribute('href', '/demo/feedback?from=cancellation');
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('renders Kazakh labels and no personal-data input', () => {
    const { container } = render(<FeedbackForm locale="kk" submissionId={submissionId} entryPoint="dashboard" />);
    expect(screen.getByLabelText('Тапсырманы орындай алдыңыз ба?')).toBeRequired();
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(container.querySelector('textarea, input[type="text"]')).toBeNull();
  });
});
