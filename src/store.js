// Scoring rules and derived stats. All numbers come from real rows in the database.
export const PTS={captain:3,join:2,ref:1,attend:3,ship:5};
export const CFG={minRanked:5,gold:60,silver:35}; // squads need minRanked members to be ranked on War Day
export function build(a){
 const rc={};a.members.forEach(m=>{if(m.referred_by)rc[m.referred_by]=(rc[m.referred_by]||0)+1});
 const members=a.members.map(m=>({...m,refs:rc[m.id]||0,pts:PTS.join+(m.is_captain?PTS.captain:0)+(m.attended?PTS.attend:0)+(m.shipped?PTS.ship:0)+(rc[m.id]||0)*PTS.ref}));
 const clans=a.colleges.map(c=>{
  const ms=members.filter(m=>m.college_id===c.id).sort((x,y)=>y.refs-x.refs||y.pts-x.pts||(x.created_at<y.created_at?-1:1));
  const reg=ms.length,pts=ms.reduce((s,m)=>s+m.pts,0);
  return {...c,ms,reg,pts,att:ms.filter(m=>m.attended).length,ship:ms.filter(m=>m.shipped).length,avg:reg?pts/reg:0,
   league:reg>=CFG.gold?"Gold":reg>=CFG.silver?"Silver":"Bronze",ranked:reg>=CFG.minRanked,captain:ms.find(m=>m.is_captain)};
 });
 return {members,clans};
}
export const order=(clans,war)=>[...clans].sort((a,b)=>war?(b.ranked-a.ranked)||b.avg-a.avg||b.reg-a.reg:b.reg-a.reg||b.avg-a.avg);
