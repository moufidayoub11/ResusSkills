import { Space_Grotesk } from 'next/font/google';
import { redirect } from 'next/navigation';
import { professorContext } from '@/lib/professor/context';
import { ProfessorError } from '@/lib/professor/service';
import { ProfessorShell } from '@/components/professor/shell';
import '@/tokens.css';
import '@/components/professor/workspace.css';
const heading=Space_Grotesk({subsets:['latin'],variable:'--professor-heading'});
export default async function ProfessorLayout({children}:{children:React.ReactNode}){
  let actor;try{actor=(await professorContext()).actor;}catch(error){if(error instanceof ProfessorError)redirect(error.code==='UNAUTHENTICATED'?'/login?callbackUrl=/dashboard':'/quiz');throw error;}
  return <ProfessorShell actor={actor} fontClass={heading.variable}>{children}</ProfessorShell>;
}
