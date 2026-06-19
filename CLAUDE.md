// DATA is loaded from data/ley.js (window.LAWLY_DATA)
const DATA = window.LAWLY_DATA;
let state = { query:'', done:{}, openTitles:{}, openCaps:{}, openCard:null, view:{} };

// Progreso guardado en el navegador del usuario (localStorage)
const STORAGE_KEY = 'lawly_progress';
function loadProgress(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw) state.done = JSON.parse(raw); }
  catch(e){ state.done = {}; }
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.done)); }catch(e){}
}

function art(n){ return DATA.articles[String(n)]; }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

function render(){
  const root = document.getElementById('scroll');
  if(state.query.trim()){ root.innerHTML = renderSearch(); attachArtEvents(); updateProgress(); return; }

  let html = `<div class="intro">
    <h2>El Decreto 15-2026, paso a paso.</h2>
    <p>Explora la ley por su propia estructura: títulos, capítulos y artículos. Abre cualquier artículo para leerlo "en corto", en lenguaje del día a día, o ver su texto legal completo.</p>
    <div class="hint">↓ Toca un título para desplegar sus capítulos</div>
  </div>`;

  DATA.structure.forEach(t=>{
    const tOpen = state.openTitles[t.id];
    const allArts = t.caps.flatMap(c=>c.arts);
    const doneCount = allArts.filter(n=>state.done[n]).length;
    html += `<div class="title-block">
      <div class="title-head ${tOpen?'open':''}" data-title="${t.id}">
        <span class="title-badge">${t.label}</span>
        <div class="title-info">
          <div class="nm">${escapeHtml(t.name)}</div>
          <div class="meta">${allArts.length} artículos · ${doneCount} vistos</div>
        </div>
        <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="title-body ${tOpen?'open':''}">`;

    t.caps.forEach(c=>{
      const cOpen = state.openCaps[c.id];
      const cDone = c.arts.filter(n=>state.done[n]).length;
      html += `<div class="cap-block">
        <div class="cap-head ${cOpen?'open':''} ${cDone>0?'has-progress':''}" data-cap="${c.id}">
          <span class="cap-dot"></span>
          <span class="cap-name">${escapeHtml(c.name)}</span>
          <span class="cap-count">${cDone}/${c.arts.length}</span>
          <svg class="cap-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="cap-body ${cOpen?'open':''}">`;
      c.arts.forEach(n=>{ html += cardHtml(art(n)); });
      // quiz placeholder per chapter-of-title: we add it at title level instead
      html += `</div></div>`;
    });

    // QUIZ PLACEHOLDER at end of title (format prepared, inactive)
    html += `<div class="quiz-cta">
      <div class="qi">⚡</div>
      <div class="qt">
        <div class="qh">Quiz relámpago de ${t.label}</div>
        <div class="qs">3 preguntas para afianzar lo aprendido · próximamente</div>
      </div>
      <span class="qbadge">🏅 Badge</span>
    </div>`;

    html += `</div></div>`;
  });

  root.innerHTML = html;
  attachTreeEvents();
  attachArtEvents();
  updateProgress();
}

function cardHtml(a){
  const isDone = !!state.done[a.num];
  const isOpen = state.openCard===a.num;
  const view = state.view[a.num] || 'corto';
  let body = '';
  if(isOpen){
    let pane = (view==='corto')
      ? `<div class="view-pane"><div class="corto-text">${escapeHtml(a.corto)}</div></div>`
      : `<div class="view-pane"><div class="legal-head">Artículo ${a.num}. ${escapeHtml(a.title)} — texto literal</div><div class="legal-text">${escapeHtml(a.full)}</div></div>`;
    body = `<div class="card-body2">
      <div class="view-toggle">
        <button class="vt-btn ${view==='corto'?'active':''}" data-view="corto" data-art="${a.num}">En corto</button>
        <button class="vt-btn ${view==='full'?'active':''}" data-view="full" data-art="${a.num}">Ley completa</button>
      </div>
      ${pane}
      <div class="card-foot">
        <button class="done-btn ${isDone?'is-done':''}" data-done="${a.num}">${isDone?'✓ Visto':'Marcar como visto'}</button>
      </div>
    </div>`;
  }
  return `<div class="card ${isOpen?'open':''} ${isDone?'done':''}">
    <div class="card-head" data-head="${a.num}">
      <div class="art-num"><span class="n">${a.num}</span><span class="lbl">ART</span></div>
      <div class="head-body">
        <div class="head-title">${escapeHtml(a.title)}</div>
        <div class="head-hook">${escapeHtml(a.hook)}</div>
      </div>
      <svg class="head-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
    </div>${body}</div>`;
}

function renderSearch(){
  const q = state.query.toLowerCase();
  const list = Object.values(DATA.articles).sort((a,b)=>a.num-b.num).filter(a=>{
    return (a.num+' '+a.title+' '+a.hook+' '+a.corto+' '+a.full).toLowerCase().includes(q);
  });
  if(list.length===0){
    return `<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg><p>Sin resultados para "<b>${escapeHtml(state.query)}</b>"</p></div>`;
  }
  return `<div class="results-label">${list.length} resultado${list.length>1?'s':''}</div>` + list.map(a=>cardHtml(a)).join('');
}

function attachTreeEvents(){
  document.querySelectorAll('[data-title]').forEach(el=>{
    el.onclick=()=>{ const id=el.dataset.title; state.openTitles[id]=!state.openTitles[id]; render(); };
  });
  document.querySelectorAll('[data-cap]').forEach(el=>{
    el.onclick=()=>{ const id=el.dataset.cap; state.openCaps[id]=!state.openCaps[id]; render(); };
  });
}
function attachArtEvents(){
  document.querySelectorAll('[data-head]').forEach(h=>{
    h.onclick=()=>{ const n=parseInt(h.dataset.head); state.openCard=state.openCard===n?null:n; if(state.openCard===n&&!state.view[n])state.view[n]='corto'; render(); };
  });
  document.querySelectorAll('[data-view]').forEach(b=>{
    b.onclick=(e)=>{ e.stopPropagation(); state.view[parseInt(b.dataset.art)]=b.dataset.view; render(); };
  });
  document.querySelectorAll('[data-done]').forEach(b=>{
    b.onclick=(e)=>{ e.stopPropagation(); const n=parseInt(b.dataset.done); if(state.done[n])delete state.done[n]; else state.done[n]=true; saveProgress(); render(); };
  });
}
function updateProgress(){
  const c=Object.keys(state.done).length;
  document.getElementById('pcount').textContent=c;
  document.getElementById('pbar').style.width=(c/44*100)+'%';
}
document.getElementById('search').addEventListener('input',e=>{ state.query=e.target.value; if(state.query.trim())state.openCard=null; render(); });

(function(){ loadProgress(); state.openTitles['t1']=true; render(); })();
