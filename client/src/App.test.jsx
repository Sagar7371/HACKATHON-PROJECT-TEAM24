import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const skills = [{
  _id: 'skill-1',
  title: 'HTML foundations',
  category: 'Technology',
  level: 'Beginner friendly',
  format: 'Video call',
  description: 'Learn semantic HTML.',
  teacher: { name: 'Ishita Sen', role: 'Frontend developer', avatar: 'IS', rating: 4.9 },
  wants: 'I want to learn JavaScript',
  color: '#dbe8de'
}];

describe('SkillSwap app', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(skills) })));
  });

  function signInDemoUser() {
    localStorage.setItem('skillswap-user', JSON.stringify({ _id: 'user-1', name: 'Demo member', email: 'demo@example.com', teaches: ['HTML'], wants: ['JavaScript'] }));
  }

  it('requires authentication before showing the exchange board', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Log in to SkillSwap/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /the exchange board/i })).not.toBeInTheDocument();
  });

  it('renders the exchange board and loaded skill', async () => {
    signInDemoUser();
    render(<App />);
    expect(screen.getByRole('heading', { name: /Trade what you know/i })).toBeInTheDocument();
    expect((await screen.findAllByText('HTML foundations')).length).toBeGreaterThan(0);
  });

  it('exposes accessible theme and back-to-top controls', async () => {
    signInDemoUser();
    render(<App />);
    await screen.findAllByText('HTML foundations');
    expect(screen.getByRole('button', { name: /Switch to dark mode|Switch to light mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });
});
