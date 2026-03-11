import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx;
}

// Shortcut hook that returns just the theme colors/values (most common usage)
export function useColors() {
  const { colors } = useContext(ThemeContext);
  return colors;
}
