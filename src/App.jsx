import {useState,useEffect,useRef,useMemo} from "react";
import {rpc,ready} from "./api.js";
import {PTS,CFG,build,order} from "./store.js";

const COL=["#C6F432","#FF6FB5","#FFD60A","#7DE2FF","#FF3B30","#B9A7FF"];
const hue=s=>COL[[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%COL.length];
const ini=n=>n.split(/\s+/).map(w=>w[0]).join("").slice(0,3).toUpperCase();
const ME="arena-me";

function Num({v,d=0}){const[x,setX]=useState(0);
 useEffect(()=>{let f,t0;const run=t=>{t0??=t;const p=Math.min(1,(t-t0)/700);setX(v*(1-Math.pow(1-p,3)));if(p<1)f=requestAnimationFrame(run)};f=requestAnimationFrame(run);return()=>cancelAnimationFrame(f)},[v]);
 return x.toFixed(d)}
const Logo=({c,s=48})=>c.logo_url?<img className="logo" style={{width:s,height:s}} src={c.logo_url} alt=""/>:<span className="logo" style={{width:s,height:s,background:hue(c.id),fontSize:s/2.8}}>{ini(c.name)}</span>;
const F=({l,...p})=><label className="f"><span>{l}</span><input {...p}/></label>;

export default function App(){
 const[arena,setArena]=useState(null),[fail,setFail]=useState(""),[meId,setMeId]=useState(()=>localStorage.getItem(ME)),[view,setView]=useState({n:"home"}),
  [wipe,setWipe]=useState(false),[toast,setToast]=useState(""),[boom,setBoom]=useState([]);
 const first=useRef(true);
 const[showRules,setShowRules]=useState(false);
 const refresh=async()=>{try{setArena(await rpc("get_arena"));setFail("")}catch(e){setFail(e.message)}};
 useEffect(()=>{if(!ready)return;refresh();const t=setInterval(refresh,8000);return()=>clearInterval(t)},[]);
 const D=useMemo(()=>arena&&build(arena),[arena]);
 useEffect(()=>{if(!D||!first.current)return;first.current=false;
  const r=new URLSearchParams(location.search).get("ref"),u=r&&D.members.find(m=>m.id===r),mine=D.members.find(m=>m.id===meId);
  if(mine)setView({n:"dash"});else if(u)setView({n:"join",clan:u.college_id,ref:u.id})},[D]);
 const say=m=>{setToast(m);setTimeout(()=>setToast(""),3400)};
 const go=v=>{setWipe(true);setTimeout(()=>{setView(v);window.scrollTo(0,0)},320);setTimeout(()=>setWipe(false),760)};
 const login=async id=>{localStorage.setItem(ME,id);setMeId(id);await refresh();
  setBoom(Array.from({length:46},(_,i)=>({l:Math.random()*100,d:Math.random()*.7,c:COL[i%6],x:(Math.random()-.5)*200})));setTimeout(()=>setBoom([]),2800);go({n:"dash"})};
 if(!ready)return <main><div className="card"><h2>Connect your database</h2><p>Add your Supabase URL and key to a <code>.env</code> file, then restart. The README has the 5 minute guide.</p></div></main>;
 if(!arena)return <main><div className="card"><h2>{fail?"Could not reach the arena":"Loading the arena"}</h2><p>{fail||"Fetching live squads."}</p></div></main>;
 const me=D.members.find(m=>m.id===meId),myClan=me&&D.clans.find(c=>c.id===me.college_id),war=arena.phase==="war";
 const P={D,arena,me,myClan,war,go,say,refresh,login,view};
 const V={home:Home,create:Create,join:Join,signin:Signin,dash:Dash,squad:Squad,board:Board,admin:Admin}[view.n];
 return <>
  <nav><button className="brand" onClick={()=>go({n:me?"dash":"home"})}>NxtWave Arena<small>Build. Compete. Ship.</small></button>
   <div><button className="link" onClick={()=>go({n:"home"})}>Arena</button><button className="link" onClick={()=>setShowRules(true)}>How it works</button><button className="link" onClick={()=>go({n:"board"})}>Leaderboard</button>
   
    {me&&<button className="link" onClick={()=>go({n:"dash"})}>My squad</button>}
    {location.search.includes("admin")&&<button className="link" onClick={()=>go({n:"admin"})}>Admin</button>}
    <span className={"pill "+(war?"on":"")}>{war?"War Day is live":"Recruit phase"}</span></div></nav>
  <main key={view.n}><V {...P}/></main>
  {wipe&&<div className="wipe"><b>Arena</b></div>}{toast&&<div className="toast">{toast}</div>}
  {showRules&&<Rules close={()=>setShowRules(false)}/>}
  {boom.map((b,i)=><i key={i} className="conf" style={{left:b.l+"%",background:b.c,animationDelay:b.d+"s","--x":b.x+"px"}}/>)}</>;
}

function pack(items,W,H){const out=[];
 for(const it of items){let a=0,d=0,x=W/2,y=H/2;
  for(let t=0;t<3000;t++){x=W/2+d*Math.cos(a)*1.35;y=H/2+d*Math.sin(a);
   if(x-it.r>8&&x+it.r<W-8&&y-it.r>8&&y+it.r<H-8&&out.every(p=>Math.hypot(p.x-x,p.y-y)>=p.r+it.r+12))break;a+=.45;d+=1.2}
  out.push({...it,x,y})}
 return out}

function Bubbles({D,war,q,go}){
 const W=900,H=540,[hv,setHv]=useState(null),ord=order(D.clans,war);
 const items=useMemo(()=>pack([...D.clans.map(c=>({c,r:Math.min(125,46+13*Math.sqrt(c.reg))})).sort((a,b)=>b.r-a.r),{c:null,r:46}],W,H),[D]);
 const h=items.find(i=>i.c&&i.c.id===hv),below=h&&h.y-h.r<170;
 return <div className="arena"><svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="College bubbles">
  {items.map(({c,r,x,y},i)=>{const dim=q&&c&&!(c.name+c.city).toLowerCase().includes(q.toLowerCase());
   return <g key={c?c.id:"add"} className="bub" tabIndex={0} role="button" aria-label={c?`${c.name}, ${c.reg} builders`:"Start your college's squad"}
    style={{transform:`translate(${x}px,${y}px)`,opacity:dim?.2:1}}
    onMouseEnter={()=>c&&setHv(c.id)} onMouseLeave={()=>setHv(null)} onFocus={()=>c&&setHv(c.id)} onBlur={()=>setHv(null)}
    onClick={()=>go(c?{n:"squad",id:c.id}:{n:"create",name:q})} onKeyDown={e=>e.key==="Enter"&&go(c?{n:"squad",id:c.id}:{n:"create",name:q})}>
    <g className="bob" style={{animationDelay:`${-i*.9}s`}}><g className="pop">
     <circle className="sh" cx="5" cy="7" style={{r}}/>
     <circle className={c?"bc":"bc add"} style={{r,fill:c?hue(c.id):"#FFFBEF"}}/>
     {c?<><text y={-r*.04} fontSize={Math.max(18,r*.5)}>{ini(c.name)}</text><text y={r*.34} fontSize={Math.max(13,r*.22)}>{c.reg} in</text></>
      :<><text y="2" fontSize="34">+</text><text y="24" fontSize="12">my college</text></>}
    </g></g></g>})}
 </svg>
 {h&&<div className="tip" style={{left:`${Math.min(84,Math.max(16,h.x/W*100))}%`,top:`${(below?h.y+h.r:h.y-h.r)/H*100}%`,transform:below?"translate(-50%,12px)":"translate(-50%,calc(-100% - 12px))"}}>
  <b>{h.c.name}</b><small>{h.c.city||"India"}, {h.c.league} league, rank #{ord.findIndex(o=>o.id===h.c.id)+1} of {ord.length}</small>
  <div className="tg"><span>{h.c.reg}<i>joined</i></span><span>{h.c.att}<i>showed up</i></span><span>{h.c.ship}<i>shipped</i></span><span>{h.c.avg.toFixed(1)}<i>avg pts</i></span></div>
  <small>{h.c.captain?`Captain: ${h.c.captain.name}`:"No Captain yet. Be the first."}</small></div>}
 </div>}

function Home({D,war,go}){
 const[q,setQ]=useState("");
 return <section className="home">
  <h1>NxtWave Arena</h1><h2 className="tag">Build. Compete. Ship.</h2>
  <p className="lede">Build your first AI project in 60 minutes. Your college is a bubble in the arena, and every builder makes it bigger. Join your squad, bring friends, show up, and ship. The squad that shows up and ships wins.</p>
  <div className="rules"><span>Join +{PTS.join}</span><span>Invite a friend +{PTS.ref}</span><span>Show up +{PTS.attend}</span><span>Ship your project +{PTS.ship}</span></div>
  <input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Find your college bubble"/>
  <Bubbles {...{D,war,q,go}}/>
  <p className="hint">Bigger bubble, more builders. Hover a bubble to peek inside. Click it to enter the squad.</p>
  <button className="ghost" onClick={()=>go({n:"signin"})}>Already joined? Sign in</button>
 </section>}

function Create({D,go,login,view}){
 const[f,setF]=useState({name:view.name||"",city:"",logo:"",who:"",phone:""}),[err,setErr]=useState(""),[busy,setBusy]=useState(false),set=k=>e=>setF({...f,[k]:e.target.value});
 const sub=async e=>{e.preventDefault();setErr("");setBusy(true);
  try{login(await rpc("create_college",{p_name:f.name,p_city:f.city,p_logo:f.logo,p_who:f.who,p_phone:f.phone}))}catch(x){setErr(x.message);setBusy(false)}};
 return <form className="card" onSubmit={sub}><h2>Start your college's squad</h2><p>You become the Captain. If your college is already in the arena, join that squad so points count together.</p>
  <F l="College name" value={f.name} onChange={set("name")} required/><F l="City" value={f.city} onChange={set("city")}/>
  <F l="Logo link (optional, we use initials if empty)" value={f.logo} onChange={set("logo")} placeholder="https://"/>
  <F l="Your name" value={f.who} onChange={set("who")} required/><F l="Phone, 10 digits (one account per phone)" value={f.phone} onChange={set("phone")} inputMode="numeric" required/>
  {err&&<p className="err">{err}</p>}<button disabled={busy}>{busy?"Creating":"Create squad"}</button></form>}

function Join({D,go,login,view}){
 const c=D.clans.find(x=>x.id===view.clan),[f,setF]=useState({who:"",phone:""}),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
 if(!c)return <div className="card"><p>Squad not found.</p><button onClick={()=>go({n:"home"})}>Back to the arena</button></div>;
 const sub=async e=>{e.preventDefault();setErr("");setBusy(true);
  try{login(await rpc("join_arena",{p_name:f.who,p_phone:f.phone,p_college:c.id,p_ref:view.ref||null}))}catch(x){setErr(x.message);setBusy(false)}};
 return <form className="card" onSubmit={sub}><Logo c={c} s={72}/><h2>Join {c.name}</h2>
  <p>{c.reg?`${c.reg} builders are in.`:"Nobody is in yet. You would be the Captain."} {view.ref?"A friend invited you, so they earn a point.":""}</p>
  <F l="Your name" value={f.who} onChange={e=>setF({...f,who:e.target.value})} required/><F l="Phone, 10 digits" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} inputMode="numeric" required/>
  {err&&<p className="err">{err}</p>}<button disabled={busy}>{busy?"Joining":"Join squad"}</button></form>}

function Signin({login}){
 const[p,setP]=useState(""),[err,setErr]=useState("");
 return <form className="card" onSubmit={async e=>{e.preventDefault();try{login(await rpc("login_arena",{p_phone:p}))}catch(x){setErr(x.message)}}}>
  <h2>Welcome back</h2><F l="Phone you joined with" value={p} onChange={e=>setP(e.target.value)} inputMode="numeric"/>{err&&<p className="err">{err}</p>}<button>Sign in</button></form>}

function Dash({D,arena,me,myClan,war,go,say,refresh}){
 const[code,setCode]=useState(""),[url,setUrl]=useState("");
 if(!me)return <div className="card"><p>You have not joined a squad yet.</p><button onClick={()=>go({n:"home"})}>Find my college</button></div>;
 const ord=order(D.clans,war),pos=ord.findIndex(c=>c.id===myClan.id)+1,up=ord[pos-2];
 const need=up?(war?Math.max(1,Math.ceil((up.avg-myClan.avg)*myClan.reg)+1):up.reg-myClan.reg+1):0;
 const link=`${location.origin}${location.pathname}?ref=${me.id}`,wa=t=>`https://wa.me/?text=${encodeURIComponent(t)}`;
 const doIt=async(fn,ok)=>{try{await fn();await refresh();say(ok)}catch(e){say(e.message)}};
 return <section className="dash">
  <div className="hero"><Logo c={myClan} s={84}/><div><h2>{me.name}, {me.is_captain?"Captain of ":"builder in "}{myClan.name}</h2>
   <p>Rank #{pos} of {ord.length}. {up?(war?`About ${need} more points to pass ${up.name}.`:`${need} more sign-ups to pass ${up.name}.`):"You lead the arena. Keep the gap."}</p></div>
   <div className="score"><b><Num v={me.pts}/></b><small>your points</small></div></div>
  <div className="grid">
   <div className="card"><h3>Invite friends</h3><p>Each friend who joins through your link gives you +{PTS.ref}.</p><code>{link}</code>
    <button onClick={()=>{navigator.clipboard?.writeText(link);say("Link copied")}}>Copy link</button>
    <a className="btn ghost" href={wa(`${myClan.name} is racing in NxtWave Arena. Join the squad and build your first AI project in 60 minutes: ${link}`)} target="_blank" rel="noreferrer">Share on WhatsApp</a></div>
   <div className="card"><h3>Your quests</h3><p className="q done">Joined the squad (+{PTS.join})</p>
    <div className={"q "+(me.attended?"done":"")}>Show up on War Day (+{PTS.attend})
     {!me.attended&&<form onSubmit={e=>{e.preventDefault();doIt(()=>rpc("check_in",{p_member:me.id,p_code:code}),"Checked in. +3")}}>
      <input disabled={!war} value={code} onChange={e=>setCode(e.target.value)} placeholder={war?"Workshop code":"Opens on War Day"}/><button disabled={!war}>Check in</button></form>}</div>
    <div className={"q "+(me.shipped?"done":"")}>Ship your project (+{PTS.ship})
     {!me.shipped&&<form onSubmit={e=>{e.preventDefault();doIt(()=>rpc("ship_project",{p_member:me.id,p_url:url}),"Project shipped. +5")}}>
      <input disabled={!war} value={url} onChange={e=>setUrl(e.target.value)} placeholder={war?"https://your-project.vercel.app":"Opens on War Day"}/><button disabled={!war}>Submit link</button></form>}</div></div></div>
  <div className="card"><h3>Your squad</h3><p>{myClan.reg} builders, {myClan.att} showed up, {myClan.ship} shipped. Captain: {myClan.captain?.name}.</p><button onClick={()=>go({n:"squad",id:myClan.id})}>Open squad page</button></div>
 </section>}

function Squad({D,war,me,go,view}){
 const c=D.clans.find(x=>x.id===view.id);
 if(!c)return <div className="card"><p>Squad not found.</p><button onClick={()=>go({n:"home"})}>Back to the arena</button></div>;
 const ord=order(D.clans,war),pos=ord.findIndex(o=>o.id===c.id)+1;
 return <section className="squad">
  <div className="hero"><Logo c={c} s={92}/><div><h2>{c.name}</h2><p>{c.city||"India"}, {c.league} league, rank #{pos} of {ord.length}</p>
   <p>Captain: <b>{c.captain?c.captain.name:"nobody yet"}</b></p></div>
   {!me&&<button onClick={()=>go({n:"join",clan:c.id})}>{c.reg?"Join this squad":"Become the Captain"}</button>}</div>
  <div className="stats"><span><b><Num v={c.reg}/></b>joined</span><span><b><Num v={c.att}/></b>showed up</span><span><b><Num v={c.ship}/></b>shipped</span><span><b><Num v={c.avg} d={2}/></b>points per member</span></div>
  <h3 className="ph">Top recruiters in {c.name}</h3>
  {!c.ms.length&&<div className="empty">Nobody has joined yet. The first builder becomes Captain.</div>}
  <ul className="mem">{c.ms.map((m,i)=><li key={m.id} className={me&&me.id===m.id?"me":""}><span className="rk">{i+1}</span>
   <b>{m.name}{m.is_captain&&<em className="cap">Captain</em>}{me&&me.id===m.id&&<em className="cap you">You</em>}</b>
   <span>{m.refs} invited</span><span>{m.pts} pts</span><span>{m.shipped?"Shipped":m.attended?"Checked in":"Waiting"}</span></li>)}</ul>
 </section>}

function Board({D,arena,me,war,go}){
 const key=war?"avg":"reg",rows=order(D.clans,war),max=Math.max(...rows.map(c=>c[key]),1),hall=arena.hall[0];
 return <section><h2>{war?"War Day standings":"Recruit Race standings"}</h2>
  <p className="lede">{war?`Ranked by average points per member. A squad needs ${CFG.minRanked} members to be ranked.`:"Ranked by sign-ups. War Day flips this to attendance and shipped projects."}</p>
  <div className="board" style={{height:rows.length*80}}>{[...rows].sort((a,b)=>a.id<b.id?-1:1).map(c=>{const i=rows.findIndex(r=>r.id===c.id);
   return <div key={c.id} className={"row "+(me&&me.college_id===c.id?"mine":"")} style={{transform:`translateY(${i*80}px)`}} onClick={()=>go({n:"squad",id:c.id})}>
    <span className="rk">{i+1}</span><Logo c={c} s={44}/><div className="nm"><b>{c.name}</b><small>{c.reg} in, {c.att} showed up, {c.ship} shipped{war&&!c.ranked?`, needs ${CFG.minRanked} to rank`:""}</small>
     <i style={{width:`${(c[key]/max)*100}%`,background:hue(c.id)}}/></div><strong><Num v={c[key]} d={war?2:0}/></strong></div>})}</div>
  {hall&&<div className="card hall"><h3>Season {hall.season} Hall of Fame</h3>
   {hall.data.champion&&<p className="champ">Grand Champion: {hall.data.champion.name}, {hall.data.champion.avg} points per member</p>}
   <ul>{hall.data.mostSignups&&<li><b>Most sign-ups</b> {hall.data.mostSignups.name} ({hall.data.mostSignups.reg})</li>}
   {hall.data.topRecruiter&&<li><b>Top recruiter</b> {hall.data.topRecruiter.name}, {hall.data.topRecruiter.college} ({hall.data.topRecruiter.refs} invited)</li>}
   <li><b>Season totals</b> {hall.data.members} joined, {hall.data.attended} showed up, {hall.data.shipped} shipped</li></ul></div>}
 </section>}

function Admin({D,arena,say,refresh}){
 const[pw,setPw]=useState(""),war=arena.phase==="war";
 const run=async(fn,ok)=>{try{await fn();await refresh();say(ok)}catch(e){say(e.message)}};
 const close=()=>{const top=order(D.clans,true).find(c=>c.ranked&&c.reg),big=[...D.clans].sort((a,b)=>b.reg-a.reg)[0],rec=[...D.members].sort((a,b)=>b.refs-a.refs)[0];
  if(!confirm("Close the season? Members are archived and the arena resets."))return;
  run(()=>rpc("admin_close_season",{p_pass:pw,p_hall:{champion:top?{name:top.name,avg:+top.avg.toFixed(2)}:null,mostSignups:big&&big.reg?{name:big.name,reg:big.reg}:null,
   topRecruiter:rec&&rec.refs?{name:rec.name,college:D.clans.find(c=>c.id===rec.college_id)?.name,refs:rec.refs}:null,
   members:D.members.length,attended:D.members.filter(m=>m.attended).length,shipped:D.members.filter(m=>m.shipped).length}}),"Season closed. Hall of Fame updated.")};
 return <div className="card"><h2>Admin</h2><p>Current phase: <b>{war?"War Day":"Recruit"}</b>. Season {arena.season}.</p>
  <F l="Admin passcode" type="password" value={pw} onChange={e=>setPw(e.target.value)}/>
  <button onClick={()=>run(()=>rpc("admin_phase",{p_pass:pw,p_phase:war?"recruit":"war"}),war?"Back to Recruit phase":"War Day is live")}>{war?"Back to Recruit phase":"Start War Day"}</button>
  <button className="ghost" onClick={close}>Close the season</button></div>}

function Rules({close}){
 useEffect(()=>{const k=e=>e.key==="Escape"&&close();window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k)},[]);
 return <div className="modal" onClick={close}>
  <div className="sheet" role="dialog" aria-modal="true" aria-label="How the Arena works" onClick={e=>e.stopPropagation()}>
   <button className="x" onClick={close}>Close</button>
   <h2>How the Arena works</h2>
   <h3>The goal</h3>
   <p>Your college is a bubble. Every builder who joins makes it bigger. The squad whose members show up and ship real projects wins, not just the squad with the most sign-ups.</p>
   <h3>Two phases</h3>
   <ul>
    <li><b>Recruit phase.</b> Join your squad and invite friends. Squads are ranked by sign-ups.</li>
    <li><b>War Day.</b> This is the live workshop. Check in, build your first AI project, and submit its link. Squads are ranked by average points per member.</li>
   </ul>
   <h3>Points</h3>
   <ul>
    <li>Join a squad: +{PTS.join}</li>
    <li>A friend joins through your invite link: +{PTS.ref} for you</li>
    <li>Start a college squad and become Captain: +{PTS.captain} once</li>
    <li>Show up on War Day: +{PTS.attend}</li>
    <li>Ship your project with a live link: +{PTS.ship}</li>
   </ul>
   <h3>Squads and Captains</h3>
   <p>The first person to join a college becomes its Captain. If your college is not in the arena, start its squad from the dashed bubble. Pick the same college as your classmates so your points count together.</p>
   <h3>How a squad wins</h3>
   <p>Squad score is the average points per member, so small colleges can beat big ones. A squad needs at least {CFG.minRanked} members to be ranked on War Day. Inside a squad, members are ranked by how many friends they invited.</p>
   <h3>Fair play</h3>
   <ul>
    <li>One account per phone number.</li>
    <li>To check in, enter the code shown live in the workshop.</li>
    <li>You must check in before you can ship. Your project link must be a live link that starts with https://</li>
   </ul>
   <h3>After the season</h3>
   <p>When the bootcamp ends, the winners go to the Hall of Fame and the arena resets for the next season.</p>
  </div></div>}