'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    // Redirection alternative via Next.js router
    router.push('/login');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            className="flex items-center space-x-2"
            onClick={() => router.push('/dashboard')}
            aria-label="Aller au tableau de bord"
          >
            <Image src="/verqo_logo.png" alt="Verqo" width={32} height={32} priority unoptimized />
            <span className="font-bold text-xl">Verqo</span>
          </button>
          <span className="text-sm text-muted-foreground">
            Automatisation de tests
          </span>
        </div>

        <div className="flex items-center space-x-4">
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
            <div className="flex items-center space-x-2 text-sm">
              {user.githubAvatarUrl ? (
                <Image
                  src={user.githubAvatarUrl} 
                  width={24}
                  height={24}
                  alt="Avatar" 
                  className="h-6 w-6 rounded-full"
                  priority unoptimized
                />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span>{user.firstName || user.email}</span>
              <span className="text-muted-foreground">
                ({user.role === 'ADMIN' ? 'Admin' : user.role === 'DEV' ? 'Développeur' : 'Client'})
              </span>
              {user.githubUsername && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  @{user.githubUsername}
                </span>
              )}
            </div>
          )}
          
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
}
