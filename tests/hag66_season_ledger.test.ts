import { describe, it, expect } from 'vitest';
import { loadSettledSeasonHistory } from '../client/src/services/settledSeasonHistory';
import { deriveSeasonStoryViewModel } from '../client/src/services/seasonStoryService';
import { previewWeeklyWrapUpForPool, executeWeeklyWrapUpForPool, getApprovedHomeSpreadForWrapUp } from '../src/services/wrapUpEngine';
import { getJackWeek8HomeSpread } from '../client/src/services/liveScoreService';
const wins = [8,7,7,6,6,6,6,5,5,4];
const shots = [0,1,1,1,1,1,2,2,2,2.5];
const summary = { poolId: 'pool', season: 2026, seasonType: 2, weekNumber: 8,
 standings: wins.map((score,i)=>({userId: `u${i}`,score,shots:shots[i],rank:i+1,isSafeHaven:i===0,isDeadPlace:i===9})) };
function db(records:any[], error:any = null) {
 const q:any = { select:()=>q, eq:()=>q, order:async()=>({data:records,error}) };
 return {from:()=>q};
}
describe('HAG-66 settled Profile history',()=>{
 it('loads all ten Week 8 records into the real Season Story model, including half shots',async()=>{
  const rows = await loadSettledSeasonHistory(db([{pool_id:'pool',week_number:8,completed_at:'2026-11-01',summary}]), async()=>({preview:{totalGames:9,poolId:'pool',season:2026,seasonType:2,weekNumber:8}}), 'pool',2026,2);
  wins.forEach((w,i)=>{
   const story=deriveSeasonStoryViewModel({poolId:'pool',viewerUserId:`u${i}`,rawRecords:rows});
   expect(story.totalCorrectPicks).toBe(w);
   expect(story.totalGradedGames! - story.totalCorrectPicks!).toBe(9-w);
   expect(rows[i].weeklyShotsIncurred).toBe(shots[i]);
   expect(story.weeklyNodes.map(n=>n.week)).toEqual([8]);
  });
 });
 it('does not treat FINAL or incomplete/wrong-scope claims as settled',async()=>{
  const rows=await loadSettledSeasonHistory(db([{pool_id:'pool',week_number:8,summary}, {pool_id:'pool',week_number:8,completed_at:'date',summary:{...summary,season:2025}}]),async()=>{throw Error('must not fetch')},'pool',2026,2);
  expect(rows).toEqual([]);
 });
 it('propagates read errors instead of inventing zero totals',async()=>{
  await expect(loadSettledSeasonHistory(db([], {message:'offline'}),async()=>null,'pool',2026,2)).rejects.toThrow('offline');
 });
});

import { fetchSettlementJson } from '../client/src/services/settledSeasonHistory';
it('decodes real fetch Responses and exposes authorization failures', async () => {
  expect(await fetchSettlementJson(async()=>new Response(JSON.stringify({preview:{totalGames:9}})), '/preview')).toEqual({preview:{totalGames:9}});
  await expect(fetchSettlementJson(async()=>new Response(JSON.stringify({error:'Forbidden'}),{status:403}), '/preview')).rejects.toThrow('Forbidden');
});

it('rejects mismatched historical previews and duplicate settlement rows', async () => {
 const record={pool_id:'pool',week_number:8,completed_at:'date',summary};
 await expect(loadSettledSeasonHistory(db([record]),async()=>({preview:{poolId:'other',season:2026,seasonType:2,weekNumber:8,totalGames:9}}),'pool',2026,2)).rejects.toThrow('verified');
 await expect(loadSettledSeasonHistory(db([record,record]),async()=>({preview:{poolId:'pool',season:2026,seasonType:2,weekNumber:8,totalGames:9}}),'pool',2026,2)).rejects.toThrow('duplicate');
});


it('shows the backend preview details with its error message', async () => {
 await expect(fetchSettlementJson(async()=>new Response(JSON.stringify({
  error:'Failed to generate wrap-up preview', details:'Invalid time value',
 }),{status:500}), '/preview')).rejects.toThrow('Failed to generate wrap-up preview: Invalid time value');
});

it('uses the status fallback when only details are returned', async () => {
 await expect(fetchSettlementJson(async()=>new Response(JSON.stringify({details:'Read failed'}),{status:500}), '/preview')).rejects.toThrow('Settlement request failed (500).: Read failed');
});

it('ignores empty and non-string backend details', async () => {
 for (const details of ['', '  ', null, {message:'unexpected'}]) {
  await expect(fetchSettlementJson(async()=>new Response(JSON.stringify({error:'Forbidden',details}),{status:403}), '/preview')).rejects.toThrow(/^Forbidden$/);
 }
});

it('does not hydrate nullable password hashes when loading preview members', async () => {
 const liveError = 'Invalid `prisma.pool.findUnique()` invocation: Error converting field "passwordHash" of expected non-nullable type "String", found incompatible value of "null".';
 const mockDb: any = { pool: { findUnique: async (args: any) => {
  if (args.include?.memberships?.include?.user === true) throw new Error(liveError);
  return null;
 } } };
 await expect(previewWeeklyWrapUpForPool('pool', 8, {prismaClient:mockDb})).rejects.toThrow('Pool with ID pool not found.');
});

it('does not hydrate nullable password hashes when loading settlement recipients', async () => {
 const liveError = 'Invalid `prisma.pool.findUnique()` invocation: Error converting field "passwordHash" of expected non-nullable type "String", found incompatible value of "null".';
 const tx: any = {
  $queryRaw: async () => [{to_regclass:'weekly_wrapups'}],
  $queryRawUnsafe: async (sql: string) => {
   if (sql.includes('FROM public.pools WHERE')) return [{status:'ACTIVE'}];
   if (sql.includes('information_schema.columns')) return [{column_name:'season'}];
   if (sql.includes('INSERT INTO public.weekly_wrapups')) return [{pool_id:'pool'}];
   return [];
  },
  pool: {findUnique: async (args: any) => {
   const user = args.include?.memberships?.include?.user;
   if (!user?.select || Object.keys(user.select).some(key => !['id','notificationPreference'].includes(key))) throw new Error(liveError);
   return null;
  }},
 };
 const mockDb: any = {$transaction: async (callback: any) => callback(tx)};
 await expect(executeWeeklyWrapUpForPool('pool',8,{prismaClient:mockDb})).rejects.toThrow('Pool with ID pool not found.');
});

it('acquires the settlement advisory lock without deserializing PostgreSQL void', async () => {
 const voidError = "Failed to deserialize column of type 'void'.";
 const calls: string[] = [];
 const tx: any = {
  $executeRawUnsafe: async (sql: string) => {
   calls.push(sql);
   return 1;
  },
  $queryRawUnsafe: async (sql: string) => {
   if (sql.includes('pg_advisory_xact_lock')) throw new Error(voidError);
   if (sql.includes('FROM public.pools WHERE')) return [{id:'pool',status:'ACTIVE'}];
   return [];
  },
 };
 const mockDb: any = {$transaction: async (callback: any) => callback(tx)};
 const result = await executeWeeklyWrapUpForPool('pool',8,{prismaClient:mockDb});
 expect(result).toMatchObject({applied:false,reason:'CLAIM_STORE_UNAVAILABLE'});
 expect(calls).toHaveLength(1);
 expect(calls[0]).toContain('pg_advisory_xact_lock');
});

it('projects a supported scalar when a transaction mock only exposes queryRaw', async () => {
 const lockQueries: string[] = [];
 const tx: any = {
  $queryRawUnsafe: async (sql: string) => {
   if (sql.includes('pg_advisory_xact_lock')) {
    lockQueries.push(sql);
    if (sql.startsWith('SELECT pg_advisory_xact_lock')) throw new Error("Failed to deserialize column of type 'void'.");
    return [{acquired:1}];
   }
   if (sql.includes('FROM public.pools WHERE')) return [{id:'pool',status:'ACTIVE'}];
   return [];
  },
 };
 const mockDb: any = {$transaction: async (callback: any) => callback(tx)};
 const result = await executeWeeklyWrapUpForPool('pool',8,{prismaClient:mockDb});
 expect(result).toMatchObject({applied:false,reason:'CLAIM_STORE_UNAVAILABLE'});
 expect(lockQueries).toHaveLength(1);
 expect(lockQueries[0]).toContain('SELECT 1::int AS acquired FROM pg_advisory_xact_lock');
});

it('matches Ladder scoring when TEN covers the approved Week 8 spread at CIN', async () => {
 const game = {id:'game-cin',externalGameId:'401873031',homeTeamId:'CIN',awayTeamId:'TEN',
  homeScore:43,awayScore:36,status:'FINAL',kickoffTime:new Date('2026-11-01T18:00:00Z')};
 const picks = ['TEN','CIN'].map((team,i)=>({user_id:`member-${i}`,game_id:'401873031',
  selected_team:team,selected_team_id:team,home_team_id:'CIN',away_team_id:'TEN',
  home_score:43,away_score:36,status:'FINAL'}));
 const mockDb:any = {
  pool:{findUnique:async()=>({id:'pool',name:'Pool',adminId:'admin',settings:{season:2026},
   memberships:[0,1].map(i=>({userId:`member-${i}`,user:{id:`member-${i}`,notificationPreference:{emailEnabled:false}}}))})},
  acceptedSlateManifest:{findFirst:async()=>({season:2026,seasonType:2,weekNumber:8,revision:1,
   eventIds:['401873031'],manifestFingerprint:'fixture',observationTime:'2026-11-01T21:00:00Z'})},
  game:{findMany:async()=>[game]},
  weeklySubmission:{findMany:async()=>[]},
  penaltyLedger:{create:async()=>({}),aggregate:async()=>({_sum:{delta:0}})},
  poolMemberStat:{upsert:async()=>({})},
  outboxEvent:{createMany:async()=>({count:0})},
  inboxMessage:{createMany:async()=>({count:0})},
  $transaction:async(callback:any)=>callback(mockDb),
  $queryRaw:async()=>[{to_regclass:'weekly_wrapups'}],
  $queryRawUnsafe:async(sql:string)=>{
   if (sql.includes('FROM public.pools WHERE')) return [{id:'pool',status:'ACTIVE'}];
   if (sql.includes('information_schema.columns')) return [{column_name:'season'}];
   if (sql.includes('INSERT INTO public.weekly_wrapups')) return [{pool_id:'pool'}];
   if (sql.includes('FROM public.picks')) return picks;
   return [];
  },
 };
 const preview = await previewWeeklyWrapUpForPool('pool',8,{season:2026,seasonType:2,
  tiebreakerOffered:false,prismaClient:mockDb});
 expect(preview.projectedStandings.find(m=>m.userId==='member-0')?.score).toBe(1);
 expect(preview.projectedStandings.find(m=>m.userId==='member-1')?.score).toBe(0);
 const settlement = await executeWeeklyWrapUpForPool('pool',8,{season:2026,seasonType:2,
  tiebreakerOffered:false,prismaClient:mockDb});
 expect(settlement.applied).toBe(true);
 expect(settlement.auditSnapshot.standings.find((m:any)=>m.userId==='member-0')?.score).toBe(1);
 expect(settlement.auditSnapshot.standings.find((m:any)=>m.userId==='member-1')?.score).toBe(0);
});

it('keeps settlement spread lines aligned with Ladder', () => {
 for (const [away,home] of [['TEN','CIN'],['IND','JAX'],['ARI','DAL'],['MIN','DET']]) {
  expect(getApprovedHomeSpreadForWrapUp(8,away,home,2026)).toBe(getJackWeek8HomeSpread(8,away,home,2026));
 }
 expect(getApprovedHomeSpreadForWrapUp(9,'TEN','CIN',2026)).toBeNull();
});
