import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(skills) })));
  });

  it('renders the exchange board and loaded skill', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Trade what you know/i })).toBeInTheDocument();
    expect(await screen.findByText('HTML foundations')).toBeInTheDocument();
  });

  it('exposes accessible theme and back-to-top controls', async () => {
    render(<App />);
    await screen.findByText('HTML foundations');
    expect(screen.getByRole('button', { name: /Switch to dark mode|Switch to light mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });
});
