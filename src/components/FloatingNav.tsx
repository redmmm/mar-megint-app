import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, CloudSun, Settings, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

const FloatingNav = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/news', icon: Newspaper, label: 'Hírek' },
    { to: '/weather', icon: CloudSun, label: 'Időjárás' },
    { to: '/skate-map', icon: Map, label: 'Skate Map' },
  ];

  return (
    <nav className="floating-nav bottom-6">
      <div className="flex items-center gap-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || 
            (to !== '/' && location.pathname.startsWith(to));
          
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300',
                'hover:bg-accent/50',
                isActive && 'bg-accent text-foreground'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 transition-colors',
                isActive
                  ? (to === '/weather' ? 'text-blue-500' : (to === '/skate-map' ? 'text-emerald-400' : (Icon === Home ? 'text-white' : 'text-primary')))
                  : 'text-muted-foreground'
              )} />
              <span className={cn(
                'text-sm font-medium hidden sm:inline',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default FloatingNav;
