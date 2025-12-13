import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthContext } from './context/AuthContext';

test('renders learn react link', () => {
  render(
    <AuthContext.Provider value={{ isAuthenticated: false, login: () => { }, logout: () => { } }}>
      <App />
    </AuthContext.Provider>
  );
  // ... existing expectations or update them
});
