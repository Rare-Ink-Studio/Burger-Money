  const SUPABASE_URL="https://fshvettlltcujmwvikfq.supabase.co";
  const SUPABASE_ANON_KEY="sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB";
  const GAME_RESULT_URL=SUPABASE_URL+"/functions/v1/onehome-game-result";
  const GAME_KEY="burger_money";
  const GAME_ORIGIN="https://rare-ink-studio.github.io";
  const HOME_ORIGINS=new Set(["https://doodlabs.app","https://one-home-test.netlify.app"]);
  const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let passportLaunch=null,passportInfo=null,lastSubmittedScore=-1;
  function validPassportLaunch(data){
    const expires=Date.parse(String(data?.expires_at||""));
    return data?.game_key===GAME_KEY&&data?.target_origin===GAME_ORIGIN&&
      uuidPattern.test(String(data?.session_id||""))&&/^[0-9a-f]{64}$/.test(String(data?.capability||""))&&
      Number.isFinite(expires)&&expires>Date.now()&&expires<=Date.now()+91*60000;
  }
  function postReady(origin){
    if(window.parent===window||!HOME_ORIGINS.has(origin))return;
    window.parent.postMessage({type:"OH_GAME_READY",version:1,game_key:GAME_KEY},origin);
  }
  window.addEventListener("message",event=>{
    if(event.source!==window.parent||!HOME_ORIGINS.has(event.origin))return;
    const data=event.data;
    if(data?.type==="OH_GAME_PING"&&data.game_key===GAME_KEY){postReady(event.origin);return;}
    if(data?.type!=="OH_GAME_LAUNCH"||!validPassportLaunch(data))return;
    passportLaunch=Object.freeze({game_key:GAME_KEY,target_origin:GAME_ORIGIN,session_id:String(data.session_id),capability:String(data.capability),expires_at:String(data.expires_at)});
    passportInfo=Object.freeze({username:String(data.passport?.username||"").slice(0,64),display_name:String(data.passport?.display_name||"").slice(0,64)});
    if(state.running&&state.score>lastSubmittedScore)void submitPassportResult(false);
    if(document.getElementById("scoreboardOverlay").style.display==="flex")void renderBoard(state.boardMode||"overall");
  });
  try{postReady(new URL(document.referrer).origin);}catch(_e){}
  async function submitPassportResult(completed){
    if(!validPassportLaunch(passportLaunch)||!Number.isSafeInteger(state.score)||state.score<=0||state.score>1000000||state.score===lastSubmittedScore)return false;
    const currentScore=state.score;
    const detail={
      money:Math.max(0,Math.min(1000000,Math.round(state.money))),
      time_ms:Math.max(0,Math.min(86400000,Math.round(state.elapsed*1000))),
      jump_ft:Math.max(0,Math.min(1000000,Math.round(state.biggestJump))),
      combo:Math.max(0,Math.min(1000000,Math.round(state.bestCombo))),
      level:Math.min(4,Math.max(1,state.levelIndex+1)),completed:!!completed
    };
    const payload={game_key:GAME_KEY,session_id:passportLaunch.session_id,capability:passportLaunch.capability,
      event_id:"burger_money:"+crypto.randomUUID(),subgame:GAME_KEY,mode:"arcade",score:currentScore,detail};
    try{
      const response=await fetch(GAME_RESULT_URL,{method:"POST",mode:"cors",credentials:"omit",cache:"no-store",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.accepted)throw Error(data.error||"Score rejected");
      lastSubmittedScore=Math.max(lastSubmittedScore,currentScore);
      showToast("Score saved.",1200);
      if(document.getElementById("scoreboardOverlay").style.display==="flex")void renderBoard(state.boardMode||"overall");
      return true;
    }catch(error){console.error("Burger Money score save",error);showToast("Score not saved.",1800);return false;}
  }
