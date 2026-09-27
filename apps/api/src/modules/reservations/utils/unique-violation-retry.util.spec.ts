import { withUniViolentRetry } from './unique-violation-retry.util';

describe('withUniViolentRetry', () => {
  it('retries the whole attempt on a reference-number collision and succeeds', async () => {
    const attempt = jest
      .fn()
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce('ok');

    await expect(withUniViolentRetry(attempt)).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting retries on persistent collisions', async () => {
    const attempt = jest.fn().mockRejectedValue({ code: '23505' });

    await expect(withUniViolentRetry(attempt)).rejects.toMatchObject({
      code: '23505',
    });
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('does not retry any other error', async () => {
    const attempt = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(withUniViolentRetry(attempt)).rejects.toThrow('boom');
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
