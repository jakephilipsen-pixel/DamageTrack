import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We import validateEnv via dynamic import to be able to reset modules per test
describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('exits when required vars are missing', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Re-import fresh module
    vi.resetModules();
    const { validateEnv } = await import('../utils/validateEnv');

    expect(() => validateEnv()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('passes when all required vars are set', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';

    vi.resetModules();
    const { validateEnv } = await import('../utils/validateEnv');

    expect(() => validateEnv()).not.toThrow();
  });

  it('warns but does not exit when optional vars are missing', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh_secret';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });

    vi.resetModules();
    const { validateEnv } = await import('../utils/validateEnv');

    expect(() => validateEnv()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
