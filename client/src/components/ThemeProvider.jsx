import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function ThemeProvider({ children }) {
  const { theme } = useSettingsStore();

  useEffect(() => {
    // Set the data-theme attribute on the HTML element
    const html = document.documentElement;
    html.setAttribute('data-theme', theme || 'dark');
    
    // Also set the class for Tailwind if needed
    if (theme === 'light') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }, [theme]);

  return children;
}
