  window.renderBoard = async (mode) => {
    const labels = { overall: "Score", fastest: "Fastest Finish", money: "Most Money", jump: "Biggest Jump", combo: "Best Combo" };
    if (!Object.prototype.hasOwnProperty.call(labels,mode)) mode="overall";
    state.boardMode=mode;
    const requestMode=mode;
    document.querySelectorAll("#scoreboardOverlay .bm-tab").forEach(tab=>tab.setAttribute("aria-pressed",String(tab.dataset.bmMode===mode)));
    const target=document.getElementById("boardContent");
    const formatValue = value => {
      const n=Number(value);
      if(!Number.isFinite(n)) return "—";
      if(mode==="fastest")return n.toFixed(1)+"s";
      if(mode==="money")return "$"+Math.round(n).toLocaleString();
      if(mode==="jump")return Math.round(n).toLocaleString()+" ft";
      return Math.round(n).toLocaleString();
    };
    let rows=[];
    if (validPassportLaunch(passportLaunch)) {
      target.textContent="Loading scores…";
      try {
        const resp=await fetch(SUPABASE_URL+"/rest/v1/rpc/onehome_burger_money_leaderboard",{
          method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
          headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},
          body:JSON.stringify({p_category:mode,p_limit:10})
        });
        if(!resp.ok) throw Error("Could not load scoreboard");
        rows=await resp.json();
        if(!Array.isArray(rows))throw Error("Could not load scoreboard");
      }catch(error){
        console.error(error);
        if(state.boardMode===requestMode)target.textContent="Could not load scoreboard.";
        return;
      }
      if(state.boardMode!==requestMode)return;
    } else {
      rows=(readBoards()[mode]||[]).slice(0,10).map((row,i)=>({
        rank:i+1,display_name:String(row?.name||"Player"),passport_username:"",score:row?.value
      }));
    }
    const fmtName=row=>escapeHtml(String(row.display_name||row.passport_username||"Player").slice(0,64));
    const fmtHandle=row=>row.passport_username?'<div class="bm-handle">@'+escapeHtml(String(row.passport_username).slice(0,64))+'</div>':'';
    let html='<h3 class="bm-board-subhead">'+labels[mode]+'</h3>';
    if(!rows.length)html+='<div class="bm-empty">No scores yet.</div>';
    else {
      html+='<div class="bm-podium">'+rows.slice(0,3).map((row,i)=>
        '<div class="bm-podium-card" data-place="'+(i+1)+'"><div class="bm-place">#'+(i+1)+'</div><div class="bm-person">'+fmtName(row)+'</div>'+fmtHandle(row)+'<div class="bm-value">'+formatValue(row.score)+'</div></div>'
      ).join('')+'</div>';
      if(rows.length>3)html+='<div class="bm-run-list">'+rows.slice(3,10).map((row,i)=>
        '<div class="bm-run"><div class="bm-run-rank">#'+(i+4)+'</div><div class="bm-run-name">'+fmtName(row)+(row.passport_username?'<span class="bm-run-handle">@'+escapeHtml(String(row.passport_username).slice(0,64))+'</span>':'')+'</div><div class="bm-run-value">'+formatValue(row.score)+'</div></div>'
      ).join('')+'</div>';
    }
    target.innerHTML=html;
  };
