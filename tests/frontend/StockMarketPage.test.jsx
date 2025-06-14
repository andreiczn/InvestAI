import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StockMarketPage from '../../src/StockMarketPage.jsx';
import axios from 'axios';
import * as newsService from '../../src/newsService';

jest.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { email: 'user@test.com', uid: 'uid123' } }),
}));
jest.mock('axios');


jest.spyOn(newsService, 'getStockNews').mockResolvedValue([]);
jest.spyOn(newsService, 'analyzeNewsSentiment').mockResolvedValue({ average_sentiment: 0, individual_scores: [] });
jest.spyOn(newsService, 'getRiskScore').mockResolvedValue({ risk_score: 0, verdict: 'Low Risk' });

test('shows Loading message, then the risk score', async () => {
  axios.get.mockResolvedValueOnce({
    data: {
      'Time Series (Daily)': {
        '2021-01-01': {
          '1. open': '100',
          '2. high': '110',
          '3. low':  '90',
          '4. close':'105',
        },
      },
    },
  });

  render(<StockMarketPage />);

  expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/AI Risk Verdict/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Low Risk/)).toBeInTheDocument();
  });
});
