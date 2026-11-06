const TEAM_DATA = [
 {id:'spikers',name:'Parankila Spikers',owner:'Unni',logo:'/assets/spikers.png',players:['Kethan Rai','Prashubh','Raju','Suku','Prajwal']},
 {id:'strikers',name:'Parankila Strikers',owner:'Abhijith P',logo:'/assets/strikers.png',players:['Charan','Dhanush (Captain)','Guru Shetty','Goutham','Guru Valachal']},
 {id:'attackers',name:'Parankila Attackers',owner:'Sami',logo:'/assets/attackers.png',players:['Raki Rai','Prajnith','Jeevan Porikkod','Roshu','Nichu']},
 {id:'tuskers',name:'Parankila Tuskers',owner:'Mohan Porikodu',logo:'/assets/tuskers.png',players:['Sujith Shetty','Ganesh Shetty','Vijaya Rai','Dhanush Bhat','Prasad','Amith']},
 {id:'veer',name:'Veer Parankila',owner:'Somashekhar',logo:'/assets/veer.png',players:['Dharshan','Vachan','Jeevan Shettigar','Karthik Shettigar','Lakshith Porikod']}
];
const PAIRS=[['spikers','tuskers'],['strikers','attackers'],['veer','spikers'],['tuskers','strikers'],['attackers','veer'],['spikers','strikers'],['tuskers','attackers'],['strikers','veer'],['spikers','attackers'],['tuskers','veer']];
const freshState=()=>({teams:TEAM_DATA,matches:PAIRS.map((p,i)=>({id:i+1,home:p[0],away:p[1],status:'upcoming',sets:[],date:'',time:'',venue:'',winner:null})),settings:{setsToWin:2,winPoints:2,lossPoints:0},updatedAt:0});
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const cookie=(req,name)=>{const s=req.headers.get('Cookie')||'';const p=s.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return p?decodeURIComponent(p.slice(name.length+1)):''};
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function validSession(req,env){const raw=cookie(req,'pvl_session');if(!raw||!env.SESSION_SECRET)return false;const [exp,sig]=raw.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;return (await sign(exp,env.SESSION_SECRET))===sig}
async function readState(env){const row=await env.DB.prepare('SELECT payload FROM league_state WHERE id=1').first();if(!row)return freshState();try{return JSON.parse(row.payload)}catch{return freshState()}}
function validState(s){if(!s||!Array.isArray(s.teams)||!Array.isArray(s.matches)||s.matches.length!==10)return false;const ids=new Set(TEAM_DATA.map(t=>t.id));return s.matches.every((m,i)=>m.id===i+1&&ids.has(m.home)&&ids.has(m.away)&&['upcoming','live','completed','postponed'].includes(m.status)&&Array.isArray(m.sets)&&m.sets.length<=5&&m.sets.every(x=>Number.isInteger(x.a)&&Number.isInteger(x.b)&&x.a>=0&&x.b>=0&&x.a<=99&&x.b<=99))&&s.settings&&Number.isFinite(Number(s.settings.winPoints))&&Number.isFinite(Number(s.settings.lossPoints))}
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname.replace(/^\/api/,'');
 try{
  if(path==='/login'&&request.method==='POST'){
   const body=await request.json();if(!env.ADMIN_PIN||body.pin!==env.ADMIN_PIN)return json({error:'Invalid PIN'},401);
   if(!env.SESSION_SECRET)return json({error:'SESSION_SECRET is not configured'},503);
   const exp=String(Date.now()+12*60*60*1000),sig=await sign(exp,env.SESSION_SECRET);
   return json({ok:true},200,{'Set-Cookie':`pvl_session=${exp}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`});
  }
  if(path==='/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':'pvl_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
  if(path==='/session'&&request.method==='GET')return await validSession(request,env)?json({ok:true}):json({error:'Unauthorized'},401);
  if(path==='/state'&&request.method==='GET')return json(await readState(env));
  if(path==='/state'&&request.method==='PUT'){
   if(!await validSession(request,env))return json({error:'Unauthorized'},401);
   const s=await request.json();if(!validState(s))return json({error:'Invalid tournament state'},400);
   s.updatedAt=Date.now();await env.DB.prepare('INSERT INTO league_state(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(JSON.stringify(s),s.updatedAt).run();return json({ok:true,updatedAt:s.updatedAt});
  }
  return json({error:'Not found'},404);
 }catch(e){return json({error:'Server error'},500)}
}
