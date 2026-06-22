// DATA is loaded from data/ley.js (window.LAWLY_DATA)
// QUIZ data from data/quiz.js (window.LAWLY_QUIZ)
const DATA = window.LAWLY_DATA;
const QUIZ = window.LAWLY_QUIZ;

const STORAGE_KEY   = 'lawly_progress';
const BADGE_KEY     = 'lawly_badges';

let state = {
  query:'', done:{}, badges:{},
  openTitles:{}, openCaps:{}, openCard:null, view:{},
  quiz: null  // { titleId, step, score, answered }
};

function loadProgress(){
  try{ const r=localStorage.getItem(STORAGE_KEY); if(r) state.done=JSON.parse(r); }catch(e){ state.done={}; }
  try{ const r=localStorage.getItem(BADGE_KEY);   if(r) state.badges=JSON.parse(r); }catch(e){ state.badges={}; }
}
function saveProgress(){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state.done)); }catch(e){} }
function saveBadges(){   try{ localStorage.setItem(BADGE_KEY,   JSON.stringify(state.badges)); }catch(e){} }

function art(n){ return DATA.articles[String(n)]; }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

// ─── RENDER ─────────────────────────────────────────────────────────────────
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
    const hasBadge = !!state.badges[t.id];
    const qdata = QUIZ[t.id];

    html += `<div class="title-block">
      <div class="title-head ${tOpen?'open':''}" data-title="${t.id}">
        <span class="title-badge">${t.label}</span>
        <div class="title-info">
          <div class="nm">${escapeHtml(t.name)}</div>
          <div class="meta">${allArts.length} artículos · ${doneCount} vistos${hasBadge?' · '+qdata.badge+' Badge obtenido':''}</div>
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
      html += `</div></div>`;
    });

    if(qdata){
      html += `<div class="quiz-cta ${hasBadge?'earned':''}" data-quiz="${t.id}">
        <div class="qi">${hasBadge ? qdata.badge : '⚡'}</div>
        <div class="qt">
          <div class="qh">Quiz relámpago · ${t.label}</div>
          <div class="qs">${hasBadge ? 'Badge obtenido — ¡vuelve a intentarlo!' : '3 preguntas para afianzar lo aprendido'}</div>
        </div>
        <span class="qbadge">${hasBadge ? qdata.badge+' Obtenido' : qdata.badge+' Badge'}</span>
      </div>`;
    }

    html += `</div></div>`;
  });

  root.innerHTML = html;
  attachTreeEvents();
  attachArtEvents();
  attachQuizEvents();
  updateProgress();
}

// ─── CARD ────────────────────────────────────────────────────────────────────
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

// ─── SEARCH ──────────────────────────────────────────────────────────────────
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

// ─── EVENTS ──────────────────────────────────────────────────────────────────
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
function attachQuizEvents(){
  document.querySelectorAll('[data-quiz]').forEach(el=>{
    el.onclick=(e)=>{ e.stopPropagation(); openQuiz(el.dataset.quiz); };
  });
}

// ─── PROGRESS ────────────────────────────────────────────────────────────────
function updateProgress(){
  const total = Object.keys(DATA.articles).length;
  const c = Object.keys(state.done).length;
  document.getElementById('pcount').textContent = c;
  document.getElementById('ptotal').textContent = total;
  document.getElementById('pbar').style.width = (total>0 ? c/total*100 : 0)+'%';
}

// ─── QUIZ MODAL ───────────────────────────────────────────────────────────────
function openQuiz(titleId){
  state.quiz = { titleId, step:0, score:0, answered:false };
  renderQuizModal();
}

function renderQuizModal(){
  const existing = document.getElementById('quiz-overlay');
  if(existing) existing.remove();

  const q = state.quiz;
  const qdata = QUIZ[q.titleId];
  const qs = qdata.questions;
  const current = qs[q.step];
  const isLast = q.step === qs.length - 1;

  const overlay = document.createElement('div');
  overlay.id = 'quiz-overlay';
  overlay.innerHTML = `
    <div class="qmodal">
      <div class="qmod-head">
        <div class="qmod-meta">
          <span class="qmod-label">Quiz relámpago</span>
          <span class="qmod-title">${escapeHtml(qdata.title)}</span>
        </div>
        <button class="qmod-close" id="quiz-close">✕</button>
      </div>
      <div class="qmod-steps">
        ${qs.map((_,i)=>`<div class="qstep ${i<q.step?'done':''} ${i===q.step?'active':''}"></div>`).join('')}
      </div>
      <div class="qmod-body">
        <div class="qmod-num">Pregunta ${q.step+1} de ${qs.length}</div>
        <div class="qmod-q">${escapeHtml(current.q)}</div>
        <div class="qmod-opts" id="quiz-opts">
          ${current.opts.map((o,i)=>`
            <button class="qopt" data-idx="${i}">${escapeHtml(o)}</button>
          `).join('')}
        </div>
        <div class="qmod-ref" id="quiz-ref" style="display:none"></div>
      </div>
      <div class="qmod-foot" id="quiz-foot" style="display:none">
        <button class="qmod-next" id="quiz-next">${isLast?'Ver resultado':'Siguiente'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('quiz-close').onclick = ()=>{ overlay.remove(); state.quiz=null; };
  overlay.onclick = (e)=>{ if(e.target===overlay){ overlay.remove(); state.quiz=null; } };

  document.querySelectorAll('.qopt').forEach(btn=>{
    btn.onclick = ()=>{
      if(state.quiz.answered) return;
      state.quiz.answered = true;
      const chosen = parseInt(btn.dataset.idx);
      const correct = current.ans;
      const isRight = chosen===correct;
      if(isRight) state.quiz.score++;

      document.querySelectorAll('.qopt').forEach((b,i)=>{
        if(i===correct) b.classList.add('correct');
        else if(i===chosen && !isRight) b.classList.add('wrong');
        b.disabled = true;
      });

      const ref = document.getElementById('quiz-ref');
      ref.innerHTML = `<span class="${isRight?'ref-ok':'ref-fail'}">${isRight?'✓ Correcto':'✗ Incorrecto'}</span> ${escapeHtml(current.ref)}`;
      ref.style.display = 'block';
      document.getElementById('quiz-foot').style.display = 'flex';

      document.getElementById('quiz-next').onclick = ()=>{
        if(isLast){
          showQuizResult(q.titleId, q.score, qs.length);
        } else {
          state.quiz.step++;
          state.quiz.answered = false;
          renderQuizModal();
        }
      };
    };
  });
}

function showQuizResult(titleId, score, total){
  const qdata = QUIZ[titleId];
  const passed = score >= 2;
  if(passed){ state.badges[titleId]=true; saveBadges(); }

  const overlay = document.getElementById('quiz-overlay');
  overlay.innerHTML = `
    <div class="qmodal qresult">
      <div class="qres-badge">${passed ? qdata.badge : '💡'}</div>
      <div class="qres-score">${score}/${total}</div>
      <div class="qres-msg">${passed
        ? `<b>¡Badge obtenido!</b><br>Dominás el ${escapeHtml(qdata.title)}.`
        : `Casi. Necesitás al menos 2 correctas para el badge.<br>¡Repasá y volvé a intentarlo!`
      }</div>
      <div class="qres-btns">
        <button class="qmod-next" id="qres-retry">Reintentar</button>
        <button class="qmod-close2" id="qres-close">Cerrar</button>
      </div>
    </div>`;

  document.getElementById('qres-retry').onclick = ()=>{ openQuiz(titleId); };
  document.getElementById('qres-close').onclick = ()=>{ overlay.remove(); state.quiz=null; render(); };
  overlay.onclick = (e)=>{ if(e.target===overlay){ overlay.remove(); state.quiz=null; render(); } };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input',e=>{ state.query=e.target.value; if(state.query.trim())state.openCard=null; render(); });

(function(){ loadProgress(); state.openTitles['t1']=true; render(); })();
