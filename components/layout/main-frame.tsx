'use client';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import { Navbar } from './navbar';
export function MainFrame({session,children}:{session:Session;children:React.ReactNode}){
  const pathname=usePathname();if(pathname==='/dashboard'||pathname.startsWith('/dashboard/'))return children;
  return <div className="min-h-screen flex flex-col"><Navbar session={session}/><main className="flex-1"><div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</div></main></div>;
}
