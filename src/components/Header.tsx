import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export const Header = ({ showBack = false, title }: HeaderProps) => {
  if (!showBack && !title) {
    // Minimal header - floating nav handles navigation
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-4 animate-fade-in-up">
      <div className="container mx-auto flex items-center gap-4">
        {showBack && (
          <Link
            to="/"
            aria-label="Vissza a kezdőlapra"
            className="group premium-glass premium-glass-hover p-3 rounded-full inline-flex items-center justify-center transition-all duration-350 hover:scale-105 active:scale-90 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 transition-transform duration-350 group-hover:-translate-x-0.5" />
          </Link>
        )}
        {title && (
          <div className="premium-glass px-4 py-2 rounded-full shadow-lg">
            <h1 className="text-lg font-bold text-gradient">{title}</h1>
          </div>
        )}
      </div>
    </header>
  );
};
