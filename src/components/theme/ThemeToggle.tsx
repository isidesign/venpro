import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'header' | 'surface';
  className?: string;
}

export default function ThemeToggle({ variant = 'surface', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const baseClass =
    variant === 'header'
      ? 'inline-flex items-center justify-center w-10 h-10 rounded-xl text-white/85 hover:text-white hover:bg-white/10 transition-colors'
      : 'inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#c4c6d1] text-[#002A5C] hover:bg-[#f1f3ff] transition-colors dark-toggle-surface';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className={`${baseClass} ${className}`.trim()}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
