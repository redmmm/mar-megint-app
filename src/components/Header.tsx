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
    <header className="fixed top-0 left-0 right-0 z-40 p-4">
      <div className="container mx-auto flex items-center gap-4">
        {showBack && (
          <Link
            to="/"
            aria-label="Vissza a kezdőlapra"
            className="premium-glass premium-glass-hover p-3 rounded-full inline-flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        {title && (
          <div className="premium-glass px-4 py-2 rounded-full">
            <h1 className="text-lg font-bold text-gradient">{title}</h1>
          </div>
        )}
      </div>
    </header>
  );
};
