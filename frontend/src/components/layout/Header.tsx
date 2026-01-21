'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Github } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    // Redirection alternative via Next.js router
    router.push('/login');
  };

  return (
    <header className="border-b border-verqo-gray-light bg-verqo-white/95 backdrop-blur supports-[backdrop-filter]:bg-verqo-white/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            type="button"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            onClick={() => router.push('/dashboard')}
            aria-label="Aller au tableau de bord"
          >
            <Logo size="md" />
          </button>
          <div className="hidden md:block">
            <span className="text-sm text-verqo-gray-medium font-medium">
              Automatisation de tests
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          )}
          {user?.role === 'ADMIN' && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')}>
              Admin
            </Button>
          )}
          
          {user && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {user.githubAvatarUrl ? (
                  <Image
                    src={user.githubAvatarUrl} 
                    width={32}
                    height={32}
                    alt="Avatar" 
                    className="h-8 w-8 rounded-full border-2 border-verqo-gray-light"
                    priority unoptimized
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-verqo-gray-light flex items-center justify-center">
                    <User className="h-4 w-4 text-verqo-gray-medium" />
                  </div>
                )}
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-verqo-navy-dark">
                    {user.firstName || user.email}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={user.role === 'ADMIN' ? 'secondary' : user.role === 'DEV' ? 'default' : 'outline'}
                      size="xs"
                    >
                      {user.role === 'ADMIN' ? 'Admin' : user.role === 'DEV' ? 'Dev' : 'Client'}
                    </Badge>
                    {user.githubUsername && (
                      <Badge variant="outline" size="xs" className="flex items-center space-x-1">
                        <Github className="h-3 w-3" />
                        <span>@{user.githubUsername}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
