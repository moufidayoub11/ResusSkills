import { AnalyticsPage } from '@/components/professor/pages';
import type {AnalyticsView} from '@/lib/professor/types';
export default async function Page({params,searchParams}:{params:Promise<{view:AnalyticsView}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <AnalyticsPage view={(await params).view} search={await searchParams}/>;}
