import { describe, expect, it } from 'vitest';

import { APP_NAME } from '../../lib/config';

describe('application configuration', () => {
  it('names the platform Süyen', () => {
    expect(APP_NAME).toBe('Süyen');
  });
});
