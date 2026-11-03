'use client';
import {Button,Notice} from '@/components/professor/ui';
export default function ErrorPage({reset}:{reset:()=>void}){return <><Notice error>Impossible de charger cette vue. Votre session peut avoir expiré, ou le service est temporairement indisponible.</Notice><div className="p-actions"><Button onClick={reset}>Réessayer</Button><a href="/login?callbackUrl=%2Fdashboard">Se reconnecter</a></div></>;}
