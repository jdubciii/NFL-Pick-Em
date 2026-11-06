import { describe, it, expect } from 'vitest';
import { loadSettledSeasonHistory } from '../client/src/services/settledSeasonHistory';
import { deriveSeasonStoryViewModel } from '../client/src/services/seasonStoryService';
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
