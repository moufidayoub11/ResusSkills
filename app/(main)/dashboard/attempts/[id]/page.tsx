import {DetailPage} from '@/components/professor/pages';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <DetailPage resource="attempts" id={(await params).id} search={await searchParams}/>;}
