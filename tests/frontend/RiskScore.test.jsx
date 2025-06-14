import { getRiskScore } from '../../src/newsService.js';

describe('getRiskScore (newsService)', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ ticker: 'X', risk_score: 55.5, verdict: 'Moderate Risk' }),
      })
    );
  });

  it('apelează corect endpoint-ul și returnează obiectul', async () => {
    const result = await getRiskScore('X', 0.2, 15);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/risk-score/',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: 'X', average_sentiment: 0.2, days: 15 }),
      })
    );

    expect(result).toEqual({ ticker: 'X', risk_score: 55.5, verdict: 'Moderate Risk' });
  });
});
