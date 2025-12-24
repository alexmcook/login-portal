import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail } from '../src/services/email'
import { config } from '../src/config'

describe('email service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  });

  it('returns true and logs when EMAIL_ENABLED is false', async () => {
    (config as any).EMAIL_ENABLED = false
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const res = await sendEmail('to@example.com', 'subj', 'body')

    expect(res).toBe(true)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Email sending is disabled'))

    logSpy.mockRestore()
  });

  it('throws when EMAIL_ENABLED is true but EMAIL_SOURCE is not set', async () => {
    (config as any).EMAIL_ENABLED = true
    delete (config as any).EMAIL_SOURCE

    await expect(sendEmail('a@b.com', 's', 'b')).rejects.toThrow('EMAIL_SOURCE environment variable is not set')
  });
});
