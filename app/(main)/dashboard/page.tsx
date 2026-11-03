import { OverviewPage } from '@/components/professor/pages';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <OverviewPage search={await searchParams}/>;}
