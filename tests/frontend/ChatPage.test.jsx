import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ChatPage from '../../src/ChatPage.jsx';

jest.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { email: 'me@test.com', uid: 'uid123' } }),
}));


jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        data: () => ({
          senderId: 'uid123',
          recieverId: 'uid999',
          message: 'Salut!',
          timestamp: { seconds: 12345 },
        }),
      },
    ],
  }),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ email: 'friend@test.com' }) }),
  doc: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

test('Try convos and show message', async () => {
  render(<ChatPage />);
  expect(screen.getByText(/Loading conversations.../i)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText(/Salut!/)).toBeInTheDocument();
  });
  screen.getByText(/friend@test.com/).click();
  expect(screen.getByText(/Chat with friend@test.com/)).toBeInTheDocument();
});
