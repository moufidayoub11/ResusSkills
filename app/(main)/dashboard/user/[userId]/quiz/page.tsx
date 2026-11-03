import { redirect } from 'next/navigation';
import { professorContext } from '@/lib/professor/context';
export default async function Page({params}:{params:Promise<{userId:string}>}){await professorContext();redirect(`/dashboard/accounts/${(await params).userId}`);}
