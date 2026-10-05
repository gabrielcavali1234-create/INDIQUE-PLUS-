/* Rendique · aplicativo com banco de dados (Supabase) */
'use strict';

/* ---------- configuração ---------- */
const CFG = window.RENDIQUE_CONFIG || {};
const sb = (CFG.supabaseUrl && CFG.supabaseKey && window.supabase)
  ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
const SITE = location.origin + location.pathname.replace(/index\.html$/, '');

const ST = ['Enviada','Em validação','Contato realizado','Oportunidade qualificada','Captação em andamento','Em negociação','Venda concluída','Recompensa liberada','Encerrada'];
const MOTIVOS = ['Proprietário desistiu da venda','Não foi possível falar com o proprietário','Dados incorretos','Imóvel já anunciado com outra imobiliária','Outro motivo'];
const FUNCOES = ['Porteiro','Zelador','Síndico','Funcionário do condomínio','Outro parceiro'];
const REW = {processamento:['proc','Em processamento'],disponivel:['disp','Disponível'],resgate:['resg','Resgate solicitado'],pago:['pago','Pago'],cancelada:['pago','Cancelada']};

const params = new URLSearchParams(location.search);
const S = {
  device: loadLS('rendique-device'),
  screen: 'loading', tab: 'home', admTab: 'geral', filter: 'todas', admFilter: 'all',
  session: null, perfil: null, det: null, lastId: null,
  email: '', loginStep: 0, convite: params.get('c') || loadLS('rendique-convite') || '',
  pub: (params.get('q') || params.get('k')) ? { q: params.get('q'), k: params.get('k'), info: null, done: null } : null,
  D: { inds: [], rewards: [], condos: [], perfis: [], ocorr: [], notifs: [], audit: [], hist: {}, convidados: null, valor: 20 },
  bell: false, channel: null
};
if (params.get('c')) saveLS('rendique-convite', params.get('c'));

/* ---------- utilidades ---------- */
function loadLS(k){ try { return localStorage.getItem(k) || null; } catch(e){ return null; } }
function saveLS(k,v){ try { v==null ? localStorage.removeItem(k) : localStorage.setItem(k,v); } catch(e){} }
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
const fdt = t => { const d = new Date(t); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' às ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const fd = t => new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
const ago = t => { const m = Math.round((Date.now()-new Date(t))/60000); if (m<1) return 'agora'; if (m<60) return `há ${m} min`; const h=Math.round(m/60); if (h<24) return `há ${h} h`; const d=Math.round(h/24); return d<30?`há ${d} dia${d>1?'s':''}`:fd(t); };
const dig = s => String(s||'').replace(/\D/g,'');
const fph = p => { p = dig(p); return p.length===11?`(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}`:p.length===10?`(${p.slice(0,2)}) ${p.slice(2,6)}-${p.slice(6)}`:p; };
const sc = i => `--sc:var(--s${i})`;
const pill = i => `<span class="pill" style="${sc(i)}">${ST[i]}</span>`;
const condo = id => S.D.condos.find(c => c.id === id);
const condoNome = id => condo(id)?.nome || 'Outro endereço';
const perfil = id => S.D.perfis.find(p => p.id === id);
const papel = () => S.perfil?.papel;
const DAY = 864e5;
const msg = e => (e && (e.message || e.error_description)) ? String(e.message || e.error_description).replace(/^.*?:\s(?=[A-ZÉ])/, '') : 'Algo deu errado. Tente de novo.';

const I = {
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  wallet:'<path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><path d="M17 14h.01"/>',
  more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  users:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4.2a4 4 0 0 1 0 7.6M22 21a7 7 0 0 0-4.5-6.5"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  alert:'<path d="M12 8v5M12 16.5h.01"/><circle cx="12" cy="12" r="9"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  doc:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  out:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  phone2:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  monitor:'<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>'
};
const ic = (n,s=20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const logo = (n,dark) => `<svg class="logo" width="${n}" height="${n}" viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="5" width="40" height="54" rx="5" fill="${dark?'#FFFFFF':'var(--brand)'}"/>${[[19,13],[19,28],[35,28]].map(([x,y])=>`<rect x="${x}" y="${y}" width="10" height="10" rx="2" fill="${dark?'var(--brand-2)':'var(--bg)'}"/>`).join('')}<rect x="35" y="13" width="10" height="10" rx="2" fill="var(--lit)"/><rect x="27" y="44" width="10" height="15" rx="2" fill="${dark?'var(--brand-2)':'var(--bg)'}"/></svg>`;
let tt; function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true, 3200); }
function busy(on){ document.body.classList.toggle('busy', !!on); }

/* ---------- dados ---------- */
async function q(p){ const { data, error } = await p; if (error) throw error; return data; }
async function rpc(fn, args){ return q(sb.rpc(fn, args)); }

async function loadPerfil(){
  const uid = S.session?.user?.id; if (!uid) { S.perfil = null; return; }
  const rows = await q(sb.from('perfis').select('*').eq('id', uid).limit(1));
  S.perfil = rows[0] || null;
}
async function loadData(){
  const p = papel();
  const jobs = [
    q(sb.from('condominios').select('*').order('nome')).then(r => S.D.condos = r),
    q(sb.from('configuracoes').select('valor_recompensa').eq('id',1)).then(r => S.D.valor = r[0]?.valor_recompensa ?? 20),
    q(sb.from('notificacoes').select('*').order('criado_em',{ascending:false}).limit(60)).then(r => S.D.notifs = r),
    q(sb.from('indicacoes').select('*').order('criado_em',{ascending:false}).limit(1000)).then(r => S.D.inds = r)
  ];
  if (p === 'indicador' || p === 'admin') jobs.push(q(sb.from('recompensas').select('*').order('criado_em',{ascending:false})).then(r => S.D.rewards = r));
  if (p === 'admin' || p === 'corretor') jobs.push(q(sb.from('perfis').select('*').order('criado_em',{ascending:false})).then(r => S.D.perfis = r));
  if (p === 'admin') {
    jobs.push(q(sb.from('ocorrencias').select('*').order('criado_em',{ascending:false}).limit(200)).then(r => S.D.ocorr = r));
    jobs.push(q(sb.from('auditoria').select('*').order('criado_em',{ascending:false}).limit(150)).then(r => S.D.audit = r));
  }
  await Promise.all(jobs);
}
async function loadHist(id){
  S.D.hist[id] = await q(sb.from('historico').select('*').eq('indicacao_id', id).order('criado_em'));
}
function subscribe(){
  if (S.channel || !S.perfil) return;
  S.channel = sb.channel('notif-' + S.perfil.id)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'notificacoes', filter:`destinatario_id=eq.${S.perfil.id}` }, async payload => {
      const n = payload.new;
      S.D.notifs.unshift(n);
      toast(`${n.titulo}${n.corpo ? ' · ' + n.corpo : ''}`);
      browserAlert(n);
      try { await loadData(); } catch(e) {}
      render();
    }).subscribe();
}
function unsubscribe(){ if (S.channel) { sb.removeChannel(S.channel); S.channel = null; } }
function browserAlert(n){
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible')
      new Notification('Rendique · ' + n.titulo, { body: n.corpo || '', tag: 'rendique-' + n.id });
  } catch(e) {}
}

/* ---------- inicialização ---------- */
async function boot(){
  if (S.pub) { S.screen = 'publico'; render(); if (sb) { try { S.pub.info = await rpc('info_qr', { p_codigo: S.pub.q || null, p_condominio: S.pub.k || null }); } catch(e) {} } render(); return; }
  if (!sb) { S.screen = 'setup'; render(); return; }
  const { data } = await sb.auth.getSession();
  await onSession(data.session);
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'SIGNED_IN' && (!S.session || S.session.user.id !== session?.user?.id)) onSession(session);
    if (ev === 'SIGNED_OUT') onSession(null);
    if (ev === 'TOKEN_REFRESHED') S.session = session;
  });
}
async function onSession(session){
  S.session = session; S.bell = false;
  if (!session) { unsubscribe(); S.perfil = null; S.screen = 'login'; S.loginStep = 0; render(); return; }
  S.screen = 'loading'; render();
  try {
    await loadPerfil();
    if (!S.perfil) { S.D.condos = await q(sb.from('condominios').select('id,nome').order('nome')); S.screen = 'cadastro'; render(); return; }
    if (!S.perfil.ativo) { S.screen = 'inativo'; render(); return; }
    await loadData();
    S.screen = 'app'; S.tab = 'home'; subscribe();
    if (location.hash || location.search) history.replaceState(null, '', location.pathname);
  } catch(e) { S.screen = 'erro'; S.erro = msg(e); }
  render();
}

/* ---------- telas fora do app ---------- */
function vSetup(){
  return `<div class="narrow cards" style="gap:16px;margin-top:24px">
   <div class="brand big">${logo(56)}<span class="bn">Rendique</span></div>
   <div class="card"><h2>Falta conectar o banco de dados</h2>
    <p class="note">Abra o arquivo <span class="mono">config.js</span> e preencha o endereço do projeto Supabase e a chave pública. O passo a passo está no README do repositório.</p>
    <a class="btn" href="demo.html" style="text-decoration:none">Ver a demonstração com dados de exemplo</a></div></div>`;
}
function vLoading(){ return `<div class="narrow" style="margin-top:80px;align-items:center;text-align:center">${logo(56)}<p class="muted">Carregando…</p></div>`; }
function vErro(){ return `<div class="narrow cards" style="margin-top:40px"><div class="card"><h2>Não foi possível carregar</h2><p class="note">${esc(S.erro)}</p><div class="btns"><button class="btn" data-a="retry">${ic('refresh',18)}Tentar de novo</button><button class="btn ghost" data-a="logout">Sair</button></div></div></div>`; }
function vInativo(){ return `<div class="narrow cards" style="margin-top:40px"><div class="card"><h2>Acesso suspenso</h2><p class="note">Seu acesso ao Rendique está suspenso. Fale com a equipe responsável.</p><button class="btn ghost" data-a="logout">Sair</button></div></div>`; }

function vLogin(){
  return `<div class="narrow cards" style="gap:18px;margin-top:20px">
   <div class="brand big">${logo(56)}<span class="bn">Rendique</span></div>
   <p class="muted" style="margin-top:-8px">Você conhece a oportunidade. Nós cuidamos do resto.</p>
   <form data-f="login" class="card" novalidate>
    ${S.loginStep ? `
     <h1 style="font-size:24px">Digite o código</h1>
     <p class="note">Enviamos um código para <b>${esc(S.email)}</b>. Ele chega em alguns segundos; confira também a caixa de spam.</p>
     <label class="f">Código de acesso<input class="in mono" id="l-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" style="letter-spacing:.35em;font-size:22px;text-align:center"></label>
     <p class="note">Se o e-mail trouxer um link em vez de código, é só tocar no link.</p>
     <button class="btn big" type="submit">Entrar</button>
     <div class="btns" style="justify-content:space-between"><button type="button" class="link" data-a="resend">Enviar outro código</button><button type="button" class="link" data-a="otherEmail">Usar outro e-mail</button></div>` : `
     <h1 style="font-size:24px">Entrar ou criar conta</h1>
     <label class="f">Seu e-mail<input class="in" id="l-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com" value="${esc(S.email)}"></label>
     <button class="btn big" type="submit">${ic('mail',20)}Receber código de acesso</button>
     <p class="note">Sem senha: a cada acesso enviamos um código para o seu e-mail.</p>`}
    <div id="l-err" class="err" hidden></div>
   </form>
   <p class="principle">${ic('shield')}<span>Você indica a oportunidade. Um profissional imobiliário habilitado cuida de todo o processo.</span></p>
  </div>`;
}
function vCadastro(){
  const ch = (name, opts, def) => `<div class="chips" role="radiogroup">${opts.map(o=>`<label><input type="radio" name="${name}" value="${o}" ${o===def?'checked':''}><span>${o}</span></label>`).join('')}</div>`;
  return `<div class="narrow cards" style="gap:16px;margin-top:12px">
   <div><p class="eyebrow">Primeiro acesso</p><h1 style="font-size:28px">Complete seu cadastro</h1><p class="muted">${esc(S.session?.user?.email||'')}</p></div>
   <form data-f="cadastro" class="card" novalidate>
    <label class="f">Nome completo<input class="in" id="c-nome" name="nome" autocomplete="name"></label>
    <label class="f">Celular (WhatsApp)<input class="in" id="c-tel" name="telefone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <div class="f"><span class="qlabel">Você trabalha como</span>${ch('funcao', FUNCOES, 'Porteiro')}</div>
    <label class="f">Condomínio onde trabalha<select class="in" id="c-condo" name="condominio">${S.D.condos.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('')}<option value="outro" ${S.D.condos.length?'':'selected'}>Meu condomínio não está na lista</option></select></label>
    <label class="f" id="c-outro-wrap" ${S.D.condos.length?'hidden':''}>Nome e endereço do condomínio<input class="in" id="c-outro" name="condominio_texto" placeholder="Ex.: Ed. Solar, Rua das Flores, 120"></label>
    <label class="f">Código de convite <small>(opcional)</small><input class="in mono" id="c-conv" name="convite" value="${esc(S.convite)}" placeholder="Ex.: JOA-8F72"></label>
    <label class="check"><input type="checkbox" id="c-termos" name="termos"><span>Li e aceito os termos do programa e a política de privacidade. Sei que apenas indico oportunidades e que não faço intermediação imobiliária.</span></label>
    <div id="c-err" class="err" hidden></div>
    <button class="btn big gold" type="submit">Concluir cadastro</button>
   </form>
   <button class="link" data-a="logout">Sair e usar outro e-mail</button></div>`;
}
function vPublico(){
  const P = S.pub, info = P.info;
  if (P.done) return `<div class="narrow"><div class="card result"><div class="badge${P.done.dup?' warn':''}">${ic(P.done.dup?'alert':'check',36)}</div>
    <h1>${P.done.dup ? 'Já temos o seu contato.' : 'Recebemos seu contato!'}</h1>
    <p class="muted">${P.done.dup ? 'Um profissional vai falar com você em breve.' : 'Um profissional imobiliário habilitado vai falar com você pelo WhatsApp.'}</p>
    ${P.done.id ? `<span class="idtag">${P.done.id}</span>` : ''}</div></div>`;
  return `<div class="narrow cards" style="gap:16px">
   <div class="pub-hero"><span class="eyebrow" style="color:inherit;opacity:.8">Rendique${info?.condominio ? ' · ' + esc(info.condominio) : ''}</span><h1>Conhece alguém que quer vender um imóvel?</h1>
    <p>Deixe o contato do proprietário. Um profissional imobiliário habilitado vai falar com ele, sem compromisso.</p></div>
   <form data-f="publico" class="card" novalidate>
    <label class="f">Nome do proprietário<input class="in" id="p-owner" name="owner"></label>
    <label class="f">WhatsApp<input class="in" id="p-phone" name="phone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <label class="f">Unidade<input class="in" id="p-unit" name="unit" placeholder="Ex.: Apto 54 · Bloco A"></label>
    <label class="check"><input type="checkbox" id="p-consent" name="consent"><span>Sou o proprietário (ou tenho autorização dele) e autorizo que um profissional imobiliário entre em contato sobre a venda do imóvel.</span></label>
    <div id="p-err" class="err" hidden></div>
    <button class="btn big gold" type="submit">Quero ser contatado</button>
    ${info?.nome ? `<p class="note">Indicação registrada por ${esc(info.nome)} (${esc(info.codigo)}).</p>` : ''}
   </form></div>`;
}
function vDevice(){
  const small = window.matchMedia('(max-width: 760px)').matches;
  const card = (k,i,t,d,rec) => `<button class="devcard" data-a="device" data-v="${k}"><span class="di">${ic(i,30)}</span><span class="dt">${t}${rec?'<em>Recomendado para esta tela</em>':''}</span><span class="dd">${d}</span></button>`;
  return `<div class="choose-in">
   <div class="brand big">${logo(64)}<span class="bn">Rendique</span></div>
   <p class="muted">Você conhece a oportunidade. Nós cuidamos do resto.</p>
   <h1>Como você quer usar o Rendique?</h1>
   <div class="devgrid">${card('mob','phone2','No celular','Telas enxutas, botões grandes e menu embaixo. Ideal para usar na portaria, com uma mão.',small)}${card('desk','monitor','No computador','Mais informação por tela, menu lateral e painéis lado a lado. Ideal para escritório e administração.',!small)}</div>
   <p class="note">Você pode trocar quando quiser pelos ícones de celular e computador no topo.</p></div>`;
}

/* ---------- topo, sininho e navegação ---------- */
function vTop(){
  const w = S.device === 'desk' ? 'wide' : '';
  const unread = S.D.notifs.filter(n => !n.lida).length;
  const inApp = S.screen === 'app';
  const rot = { admin:'Gestor', corretor:'Corretor', indicador:'Indicador' }[papel()] || '';
  return `<header class="top"><div class="top-in ${w}">
   <div class="brand">${logo(30)}<span class="bn">Rendique</span></div>
   <div class="tools">
    <div class="devsw" role="group" aria-label="Formato da tela">
     <button class="${S.device==='mob'?'on':''}" data-a="device" data-v="mob" aria-pressed="${S.device==='mob'}" aria-label="Versão celular" title="Versão celular">${ic('phone2',18)}</button>
     <button class="${S.device==='desk'?'on':''}" data-a="device" data-v="desk" aria-pressed="${S.device==='desk'}" aria-label="Versão computador" title="Versão computador">${ic('monitor',18)}</button></div>
    ${inApp ? `<button class="bellbtn" data-a="bell" aria-label="Notificações${unread?`: ${unread} novas`:''}" aria-expanded="${S.bell}">${ic('bell',20)}${unread?`<span class="badge">${unread>99?'99+':unread}</span>`:''}</button>
     <span class="who-chip" title="${esc(S.perfil.nome)}"><b>${esc(S.perfil.nome.split(' ')[0])}</b><small>${rot}</small></span>` : ''}
   </div></div></header>`;
}
function vBell(){
  if (!S.bell) return '';
  const L = S.D.notifs;
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  return `<div class="bellpanel" role="dialog" aria-label="Notificações">
   <div class="sec-h"><h2>Notificações</h2><button class="link" data-a="readAll">Marcar todas como lidas</button></div>
   ${perm === 'default' ? `<button class="btn sm ghost" data-a="askNotif">${ic('bell',16)}Avisar também com alerta do navegador</button>` : ''}
   <div class="nlist">${L.map(n => `<button class="nitem ${n.lida?'':'new'}" data-a="openNotif" data-v="${n.id}">
     <span class="ndot"></span><span class="nt"><b>${esc(n.titulo)}</b>${n.corpo?`<span>${esc(n.corpo)}</span>`:''}<small>${ago(n.criado_em)}</small></span></button>`).join('') || '<p class="muted" style="padding:12px 4px">Nenhuma notificação ainda.</p>'}</div>
  </div>`;
}
function vNav(){
  if (S.screen !== 'app' || papel() !== 'indicador') return '';
  const grp = {home:'home',nova:'nova',ok:'nova',dup:'nova',lista:'lista',det:'lista',carteira:'carteira'}[S.tab] || 'mais';
  const b = (k,l,n,c='') => `<button class="${grp===k?'on':''} ${c}" data-a="go" data-v="${k}" ${grp===k?'aria-current="page"':''}>${ic(n,22)}${l}</button>`;
  return `<nav class="bottom" aria-label="Navegação"><div class="nav-in">${b('home','Início','home')}${b('lista','Indicações','list')}${b('nova','Indicar','plus','mid')}${b('carteira','Carteira','wallet')}${b('mais','Mais','more')}</div></nav>`;
}
const ph = (t, back='home') => `<div class="ph"><button class="back" data-a="go" data-v="${back}" aria-label="Voltar">${ic('back')}</button><h1>${t}</h1></div>`;

/* ---------- indicador ---------- */
const lastT = i => i.atualizado_em || i.criado_em;
const cardInd = i => `<button class="icard" data-a="det" data-v="${i.id}"><span class="id mono">${i.id}</span>${pill(i.status)}
  <span class="who">${esc(i.proprietario_nome)}</span><span class="id">${fd(lastT(i))}</span><span class="where">${esc(i.unidade)} · ${esc(condoNome(i.condominio_id))}</span></button>`;
function wallet(){
  const r = S.D.rewards.filter(x => x.indicador_id === S.perfil.id && x.estado !== 'cancelada');
  const sum = e => r.filter(x => e.includes(x.estado)).reduce((a,b) => a + Number(b.valor), 0);
  return { disp: sum(['disponivel']), proc: sum(['processamento','resgate']), pago: sum(['pago']), list: r };
}
function vHome(){
  const u = S.perfil, mine = S.D.inds.filter(i => i.indicador_id === u.id), w = wallet();
  const n = { tot: mine.length, at: mine.filter(i => i.status<=2).length, q: mine.filter(i => i.status>=3 && i.status<=5).length, v: mine.filter(i => i.status===6 || i.status===7).length };
  const recent = [...mine].sort((a,b) => new Date(lastT(b)) - new Date(lastT(a))).slice(0,3);
  const tile = (v,l,s) => `<div class="tile"><div class="v">${v}</div><div class="l"><span class="dot" style="background:var(--s${s})"></span>${l}</div></div>`;
  return `<div class="hgrid"><div class="col"><section class="hello"><p class="eyebrow">${esc(u.funcao)} · ${esc(condo(u.condominio_id)?.nome || u.condominio_texto || 'Condomínio')}</p><h1>Olá, ${esc(u.nome.split(' ')[0])}!</h1>
   <p class="sub">Você conhece. Você indica. A gente cuida do resto.</p></section>
   <button class="cta" data-a="go" data-v="nova">${ic('plus',24)}<span>Nova indicação</span><small>Leva menos de 2 minutos</small></button>
   <div class="stats">${tile(n.tot,'Suas indicações',0)}${tile(n.at,'Em atendimento',1)}${tile(n.q,'Oportunidades qualificadas',3)}${tile(n.v,'Vendas concluídas',6)}</div>
   <button class="reward" data-a="go" data-v="carteira"><div><div class="l">Recompensas acumuladas</div><div class="v">${money(w.disp+w.proc+w.pago)}</div></div>
    <div style="text-align:right"><div class="l">Disponível</div><b class="num">${money(w.disp)}</b></div></button>
   <div class="quick">
    <button class="qbtn" data-a="go" data-v="lista">${ic('list')}Minhas indicações</button>
    <button class="qbtn" data-a="go" data-v="carteira">${ic('wallet')}Minha carteira</button>
    <button class="qbtn" data-a="go" data-v="convite">${ic('users')}Convidar profissional</button>
    <button class="qbtn" data-a="go" data-v="qr">${ic('qr')}Meu QR Code</button></div></div>
   <div class="col"><section class="cards"><div class="sec-h"><h2>Últimas atualizações</h2><button class="link" data-a="go" data-v="lista">Ver todas</button></div>
    ${recent.map(cardInd).join('') || `<div class="card"><p class="note">Você ainda não fez nenhuma indicação. Quando souber de alguém que quer vender, toque em <b>Nova indicação</b>.</p></div>`}</section>
   <p class="principle">${ic('shield')}<span>Você indica a oportunidade. Um profissional imobiliário habilitado cuida de todo o processo.</span></p></div></div>`;
}
function vNova(){
  const u = S.perfil;
  const ch = (name,opts,def,cls='') => `<div class="chips ${cls}" role="radiogroup">${opts.map(o=>`<label><input type="radio" name="${name}" value="${o}" ${o===def?'checked':''}><span>${o}</span></label>`).join('')}</div>`;
  const temCondo = !!u.condominio_id;
  return `${ph('Nova indicação')}
  <p class="muted" style="margin-top:-6px">Preencha o que você souber. Nossa equipe confirma o resto com o proprietário.</p>
  <form data-f="nova" novalidate class="cards" style="gap:14px"><div class="fgrid">
   <div class="card"><h2>Proprietário</h2>
    <label class="f">Nome<input class="in" id="f-owner" name="owner" autocomplete="off" placeholder="Ex.: Maria da Silva"></label>
    <label class="f">Telefone<input class="in" id="f-phone" name="phone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <label class="check" style="background:none;padding:0"><input type="checkbox" id="f-samewa" name="samewa" checked> O WhatsApp é o mesmo número</label>
    <label class="f" id="wa-wrap" hidden>WhatsApp<input class="in" id="f-wa" name="wa" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <div class="f"><span class="qlabel">Melhor horário para contato</span>${ch('horario',['Manhã','Tarde','Noite','Qualquer horário'],'Qualquer horário')}</div>
    <div class="f"><span class="qlabel">O proprietário autorizou passar o contato dele?</span>${ch('autorizou',['Sim','Não'],'','yn')}</div>
   </div>
   <div class="card"><h2>Imóvel</h2>
    <label class="f">Condomínio<select class="in" id="f-condo" name="condo">${S.D.condos.map(c=>`<option value="${c.id}" ${c.id===u.condominio_id?'selected':''}>${esc(c.nome)}</option>`).join('')}<option value="outro" ${temCondo?'':'selected'}>Outro endereço</option></select></label>
    <div id="addr" class="cards" style="gap:14px" ${temCondo?'hidden':''}>
     <label class="f">Endereço<input class="in" id="f-end" name="end" placeholder="Rua, avenida…"></label>
     <div class="row2"><label class="f">Número<input class="in" id="f-numero" name="numero" inputmode="numeric"></label><label class="f">Bairro<input class="in" id="f-bairro" name="bairro"></label></div>
     <label class="f">Cidade<input class="in" id="f-cidade" name="cidade" value="São Paulo"></label></div>
    <label class="f">Unidade / complemento<input class="in" id="f-unit" name="unit" placeholder="Ex.: Apto 82 · Bloco B"></label>
    <div class="f"><span class="qlabel">Tipo de imóvel</span>${ch('tipo',['Apartamento','Casa','Cobertura','Sala comercial','Outro'],'Apartamento')}</div>
    <div class="f"><span class="qlabel">Dormitórios (aproximado)</span>${ch('dorms',['1','2','3','4+'],'2')}</div>
   </div>
   <div class="card"><h2>Oportunidade</h2>
    <div class="f"><span class="qlabel">O proprietário já disse que quer vender?</span>${ch('interesse',['Sim','Ainda não confirmou'],'Sim')}</div>
    <div class="f"><span class="qlabel">Quando ele comentou?</span>${ch('quando',['Esta semana','Este mês','Há mais tempo'],'Esta semana')}</div>
    <div class="f"><span class="qlabel">Como você ficou sabendo?</span>${ch('como',['Ele me contou','Pediu indicação','Vi anúncio ou placa','Outro'],'Ele me contou')}</div>
    <label class="f">Observações <small>(opcional)</small><textarea class="in" id="f-obs" name="obs" placeholder="Algo que ajude o corretor no primeiro contato"></textarea></label>
   </div></div><div class="narrow" style="margin-inline:0">
   <label class="check"><input type="checkbox" id="f-consent" name="consent"><span>Confirmo que o proprietário autorizou o compartilhamento de seus dados para que um profissional imobiliário entre em contato sobre seu interesse em vender o imóvel.</span></label>
   <div id="f-err" class="err" hidden></div>
   <button class="btn big gold" type="submit">Enviar indicação</button>
   <p class="note" style="text-align:center">Você não precisa avaliar, negociar nem falar de preço. Isso fica com o profissional habilitado.</p>
  </div></form>`;
}
function vOk(){ return `<div class="card result"><div class="badge">${ic('check',36)}</div><h1>Indicação recebida!</h1>
   <p class="muted">Nossa equipe irá analisar a oportunidade e você poderá acompanhar tudo por aqui.</p><span class="idtag">${esc(S.lastId)}</span>
   <div class="btns" style="justify-content:center"><button class="btn" data-a="det" data-v="${esc(S.lastId)}">Acompanhar indicação</button><button class="btn ghost" data-a="go" data-v="home">Voltar ao início</button></div></div>`; }
function vDup(){ return `<div class="card result"><div class="badge warn">${ic('alert',36)}</div><h1>Esta oportunidade já foi registrada anteriormente.</h1>
   <p class="muted">Enviamos o caso para análise da equipe. Você não precisa fazer mais nada.</p><button class="btn ghost" data-a="go" data-v="home">Voltar ao início</button></div>`; }
function vLista(){
  const f = { todas:()=>true, andamento:i=>i.status<6, concluidas:i=>i.status===6||i.status===7, encerradas:i=>i.status===8 };
  const L = S.D.inds.filter(i => i.indicador_id === S.perfil.id).filter(f[S.filter]).sort((a,b) => new Date(lastT(b)) - new Date(lastT(a)));
  const fb = (k,l) => `<button class="chipbtn ${S.filter===k?'on':''}" data-a="filter" data-v="${k}">${l}</button>`;
  return `${ph('Minhas indicações')}<div class="filters">${fb('todas','Todas')}${fb('andamento','Em andamento')}${fb('concluidas','Concluídas')}${fb('encerradas','Encerradas')}</div>
   <div class="cards list">${L.map(cardInd).join('') || '<p class="muted">Nenhuma indicação aqui ainda.</p>'}</div>`;
}
function timeline(i){
  const H = S.D.hist[i.id];
  if (!H) return '<p class="muted">Carregando linha do tempo…</p>';
  const path = i.status === 8 ? [...new Set(H.map(h => h.status))] : [0,1,2,3,4,5,6,7];
  return `<ol class="tl">${path.map(s => { const h = H.find(x => x.status === s); const cls = h ? (s === i.status ? 'done cur' : 'done') : 'todo';
    return `<li class="${cls}" style="${sc(s)}"><span class="n">${h?ic('check',14):''}</span><div><div class="t">${ST[s]}</div><div class="d">${h?fdt(h.criado_em):'Próxima etapa'}</div></div></li>`; }).join('')}</ol>`;
}
function vDet(){
  const i = S.D.inds.find(x => x.id === S.det); if (!i) return vLista();
  const r = S.D.rewards.find(x => x.indicacao_id === i.id && x.estado !== 'cancelada');
  return `${ph(`<span class="mono" style="font-size:18px">${i.id}</span>`,'lista')}
   <div class="split"><div class="col"><div class="card"><div class="sec-h"><h2>${esc(i.proprietario_nome)}</h2>${pill(i.status)}</div>
    <dl class="kv"><dt>Imóvel</dt><dd>${esc(i.tipo||'—')} · ${esc(i.dormitorios||'—')} dorm.</dd><dt>Unidade</dt><dd>${esc(i.unidade)}</dd><dt>Local</dt><dd>${esc(condoNome(i.condominio_id))}</dd><dt>Enviada</dt><dd>${fdt(i.criado_em)}</dd>${i.motivo_encerramento?`<dt>Motivo</dt><dd>${esc(i.motivo_encerramento)}</dd>`:''}</dl></div>
   ${r ? `<div class="reward" style="cursor:default"><div><div class="l">Recompensa por indicação qualificada</div><div class="v">${money(r.valor)}</div></div><span class="tag ${REW[r.estado][0]}">${REW[r.estado][1]}</span></div>` :
     i.status < 3 ? `<p class="principle">${ic('wallet')}<span>Quando a oportunidade for qualificada pela equipe, você recebe ${money(S.D.valor)} na carteira, conforme as regras do programa.</span></p>` : ''}
   <p class="principle">${ic('shield')}<span>O atendimento, a avaliação e a negociação são feitos por um profissional imobiliário habilitado.</span></p></div>
   <div class="col"><div class="card"><h2>Linha do tempo</h2>${timeline(i)}</div></div></div>`;
}
function vCarteira(){
  const w = wallet();
  return `${ph('Minha carteira')}
   <div class="split"><div class="col"><div class="wallet"><span class="l">Saldo disponível</span><span class="v">${money(w.disp)}</span><span class="l">Programa de Incentivos Rendique</span></div>
   <div class="wsplit"><div class="tile"><div class="l">Em processamento</div><div class="v" style="font-size:22px">${money(w.proc)}</div></div><div class="tile"><div class="l">Já pagos</div><div class="v" style="font-size:22px">${money(w.pago)}</div></div></div>
   <button class="btn big" data-a="resgatar" ${w.disp?'':'disabled'}>Solicitar resgate via Pix</button>
   <div class="card"><h3>Como funciona</h3><p class="note">Você recebe ${money(S.D.valor)} por indicação qualificada, sujeita às regras do programa. A recompensa fica em processamento até a validação da equipe e depois aparece como disponível para resgate. O valor não depende do preço do imóvel nem do resultado da negociação.</p></div></div>
   <div class="col"><div class="card"><h2>Histórico de recompensas</h2><div class="hist">${[...w.list].map(r => { const i = S.D.inds.find(x => x.id === r.indicacao_id);
     return `<div><div><div class="mono" style="font-size:13px">${r.indicacao_id}</div><div class="note">${esc(i?.proprietario_nome||'')} · ${fd(r.criado_em)}</div></div><div style="text-align:right"><div class="a">${money(r.valor)}</div><span class="tag ${REW[r.estado][0]}">${REW[r.estado][1]}</span></div></div>`; }).join('') || '<p class="muted">Sem recompensas ainda.</p>'}</div></div></div></div>`;
}
function vMais(){
  const u = S.perfil, it = (v,i,t,d,a='go') => `<button class="qbtn" style="width:100%" data-a="${a}" data-v="${v}">${ic(i)}<span style="flex:1"><span style="display:block">${t}</span><span class="note" style="font-weight:400">${d}</span></span></button>`;
  return `<section class="hello"><p class="eyebrow">Código ${esc(u.codigo)}</p><h1 style="font-size:28px">${esc(u.nome)}</h1><p class="sub">${esc(u.funcao)} · ${esc(condo(u.condominio_id)?.nome || u.condominio_texto || '')}</p></section>
   <div class="cards">${it('qr','qr','Meu QR Code','Para o proprietário se cadastrar direto')}${it('convite','users','Convidar profissional','Traga colegas de outros condomínios')}${it('privacidade','shield','Privacidade e dados','LGPD, correção e exclusão')}${it('termos','doc','Termos do programa','Regras de participação')}${it('','out','Sair','Encerrar sessão neste aparelho','logout')}</div>`;
}
function vQR(){ const u = S.perfil, url = `${SITE}?q=${u.codigo}`;
  return `${ph('Meu QR Code','mais')}
   <div class="card" style="text-align:center;align-items:center"><p class="eyebrow">Conhece alguém que quer vender um imóvel?</p>
    <div class="qrbox" data-qr="${esc(url)}"></div><span class="code">${esc(u.codigo)}</span>
    <p class="note">Imprima e deixe na portaria. Quem escanear cai numa página simples, preenche os próprios dados e a indicação fica registrada no seu nome.</p>
    <div class="copyrow" style="width:100%"><span>${esc(url)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(url)}">${ic('copy',16)}Copiar</button></div>
    <a class="btn" style="width:100%;text-decoration:none" href="${esc(url)}" target="_blank" rel="noopener">Ver a página que o proprietário vê</a></div>`; }
function vConvite(){ const u = S.perfil, url = `${SITE}?c=${u.codigo}`, conv = S.D.convidados;
  const txt = encodeURIComponent(`Oi! Estou no Rendique, um programa para profissionais de condomínio indicarem quem quer vender imóvel. Cadastre-se com meu código ${u.codigo}: ${url}`);
  return `${ph('Convide um profissional','mais')}
   <div class="card" style="text-align:center;align-items:center"><p class="muted">Porteiros, zeladores, síndicos e funcionários de condomínio podem participar.</p>
    <span class="eyebrow">Seu código</span><span class="code">${esc(u.codigo)}</span>
    <div class="copyrow" style="width:100%"><span>${esc(url)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(url)}">${ic('copy',16)}Copiar</button></div>
    <a class="btn" style="width:100%;text-decoration:none" href="https://wa.me/?text=${txt}" target="_blank" rel="noopener">Enviar convite pelo WhatsApp</a></div>
   <div class="card"><h2>Profissionais que você convidou</h2><div class="hist">${conv === null ? '<p class="muted">Carregando…</p>' : conv.map(c => `<div><div><b>${esc(c.nome)}</b><div class="note">${esc(c.funcao)} · ${esc(c.condominio||'')}</div></div><div class="note" style="text-align:right">desde ${fd(c.criado_em)}<br>${c.indicacoes} indicações</div></div>`).join('') || '<p class="muted">Ninguém ainda.</p>'}</div></div>
   <p class="principle">${ic('users')}<span>A rede tem um único nível: você convida, o profissional convidado faz as próprias indicações. Incentivos por convite serão anunciados após validação jurídica.</span></p>`; }
function vPriv(){ return `${ph('Privacidade e dados','mais')}
   <div class="card"><h2>Seus dados</h2><p class="note">Usamos seus dados para identificar suas indicações e pagar recompensas. Os dados do proprietário só são compartilhados com o profissional imobiliário responsável, mediante a autorização registrada no envio, com data e hora.</p>
    <div class="btns"><button class="btn ghost" data-a="lgpd" data-v="correção">Solicitar correção</button><button class="btn danger" data-a="lgpd" data-v="exclusão">Solicitar exclusão</button></div></div>
   <div class="card"><h3>Política de privacidade (resumo)</h3><p class="note">Base legal: consentimento (art. 7º, I, LGPD). Retenção pelo prazo necessário ao programa e às obrigações legais. Você pode pedir acesso, correção, portabilidade ou exclusão a qualquer momento.</p></div>`; }
function vTermos(){ return `${ph('Termos do programa','mais')}
   <div class="card"><ol class="note" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px">
    <li>O indicador apenas informa uma oportunidade, com autorização do proprietário. Não realiza intermediação imobiliária.</li>
    <li>Avaliação, captação, negociação e formalização são feitas exclusivamente por profissionais imobiliários habilitados.</li>
    <li>O indicador não pode definir preço, apresentar propostas nem prometer condições comerciais.</li>
    <li>A recompensa é um valor fixo por indicação qualificada (${money(S.D.valor)}), sem vínculo com o valor da venda.</li>
    <li>Indicações duplicadas ou sem autorização não geram recompensa e podem ser auditadas.</li>
    <li>A rede de convites tem um único nível.</li></ol>
    <p class="note"><b>Versão preliminar.</b> Regras sujeitas à análise jurídica e às normas do CRECI antes da operação comercial.</p></div>`; }

/* ---------- corretor ---------- */
function vPro(){
  const L = S.D.inds.filter(i => i.status >= 1 && i.status <= 5).sort((a,b) => a.status - b.status || new Date(lastT(a)) - new Date(lastT(b)));
  return `<section class="hello"><p class="eyebrow">Profissional imobiliário</p><h1 style="font-size:28px">${esc(S.perfil.nome)}</h1>
   <p class="sub">${L.length} oportunidade${L.length===1?'':'s'} em atendimento. Atualize o status a cada etapa: o indicador acompanha em tempo real.</p></section>
   <div class="cards list">${L.map(i => { const nx = i.status + 1; return `<div class="card" style="gap:10px">
    <div class="sec-h"><span class="mono note">${i.id}</span>${pill(i.status)}</div><h2>${esc(i.proprietario_nome)}</h2>
    <dl class="kv"><dt>Contato</dt><dd class="mono">${fph(i.telefone)}</dd><dt>Horário</dt><dd>${esc(i.horario||'—')}</dd><dt>Imóvel</dt><dd>${esc(i.tipo||'—')} · ${esc(i.dormitorios||'—')} dorm. · ${esc(i.unidade)}</dd><dt>Local</dt><dd>${esc(i.endereco || condoNome(i.condominio_id))}</dd><dt>Indicado por</dt><dd>${esc(perfil(i.indicador_id)?.nome || i.origem)}</dd>${i.observacoes?`<dt>Obs.</dt><dd>${esc(i.observacoes)}</dd>`:''}</dl>
    <div class="btns">${nx <= 6 ? `<button class="btn sm" data-a="adv" data-v="${i.id}" data-s="${nx}">Avançar: ${ST[nx]}</button>` : ''}<button class="btn sm danger" data-a="close" data-v="${i.id}">Encerrar</button></div></div>`; }).join('') || '<p class="muted">Nenhuma oportunidade em atendimento agora.</p>'}</div>
   <p class="note">Indicações com status “Enviada” aguardam validação do gestor antes de chegar aqui.</p>`;
}

/* ---------- administrador ---------- */
const kpi = (v,l,s) => `<div class="tile"><div class="v">${v}</div><div class="l">${s!=null?`<span class="dot" style="background:var(--s${s})"></span>`:''}${l}</div></div>`;
function vAdm(){
  const open = S.D.ocorr.filter(o => o.estado === 'aberta').length;
  const novas = S.D.inds.filter(i => i.status === 0).length;
  const tabs = [['geral','Visão geral'],['inds','Indicações',novas],['ocorr','Ocorrências',open],['rec','Recompensas'],['condos','Condomínios'],['users','Usuários'],['prog','Programa'],['aud','Auditoria']];
  const body = { geral:aGeral, inds:aInds, ocorr:aOcorr, rec:aRec, condos:aCondos, users:aUsers, prog:aProg, aud:aAud }[S.admTab]();
  return `<div class="sec-h"><h1 style="font-size:28px">Painel do gestor</h1><button class="btn sm ghost" data-a="reload">${ic('refresh',16)}Atualizar</button></div>
   <div class="atabs">${tabs.map(([k,l,c]) => `<button class="${S.admTab===k?'on':''}" data-a="atab" data-v="${k}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}</div>${body}`;
}
function aGeral(){
  const L = S.D.inds, n = L.length, now = Date.now(), since = d => L.filter(i => new Date(i.criado_em) > now - d*DAY).length;
  const reached = (i,k) => i.status >= k && i.status !== 8;
  const fun = [['Indicações',n,0],['Contatos',L.filter(i=>reached(i,2)).length,2],['Qualificadas',L.filter(i=>reached(i,3)).length,3],['Captações',L.filter(i=>reached(i,4)).length,4],['Negociações',L.filter(i=>reached(i,5)).length,5],['Vendas',L.filter(i=>reached(i,6)).length,6]];
  const R = S.D.rewards.filter(r => r.estado !== 'cancelada'), sum = f => R.filter(f).reduce((a,b) => a + Number(b.valor), 0);
  const inds = S.D.perfis.filter(p => p.papel === 'indicador');
  const ativos = inds.filter(u => L.some(i => i.indicador_id === u.id && new Date(i.criado_em) > now - 30*DAY)).length;
  const top = inds.map(u => ({ u, n: L.filter(i => i.indicador_id === u.id).length, q: L.filter(i => i.indicador_id === u.id && reached(i,3)).length })).sort((a,b) => b.q - a.q || b.n - a.n).slice(0,8);
  const byC = S.D.condos.map(c => ({ c, n: L.filter(i => i.condominio_id === c.id).length })).filter(x => x.n).sort((a,b) => b.n - a.n).slice(0,8);
  const byR = {}; L.forEach(i => { const r = condo(i.condominio_id)?.regiao || 'Sem região'; byR[r] = (byR[r]||0) + 1; });
  return `<h2 style="font-size:17px">Indicadores (profissionais)</h2>
   <div class="kpis">${kpi(inds.length,'Total de indicadores')}${kpi(inds.filter(u => new Date(u.criado_em) > now - 30*DAY).length,'Novos (30 dias)')}${kpi(ativos,'Ativos (30 dias)')}${kpi(S.D.ocorr.filter(o=>o.estado==='aberta').length,'Ocorrências abertas')}</div>
   <h2 style="font-size:17px">Indicações</h2>
   <div class="kpis">${kpi(n,'Total')}${kpi(since(1),'Hoje')}${kpi(since(7),'Semana')}${kpi(since(30),'Mês')}</div>
   <div class="grid2">
    <div class="card"><h2>Funil</h2><div class="funnel">${fun.map(([l,v,s]) => `<div class="frow" style="${sc(s)}"><span>${l}</span><div class="fbar"><i style="width:${n?Math.max(2,v/n*100):0}%"></i></div><b>${v}</b></div>`).join('')}</div>
     <p class="note">Conversão indicação → venda: ${n?Math.round(fun[5][1]/n*100):0}%</p></div>
    <div class="card"><h2>Financeiro do programa</h2><div class="kpis" style="grid-template-columns:1fr 1fr">
     ${kpi(money(sum(()=>true)),'Recompensas geradas')}${kpi(money(sum(r=>['processamento','disponivel','resgate'].includes(r.estado))),'Pendentes')}${kpi(money(sum(r=>r.estado==='pago')),'Pagas')}${kpi(R.length,'Recompensas emitidas')}</div>
     <p class="note">Valor fixo por indicação qualificada. Nenhuma remuneração percentual sobre a operação imobiliária.</p></div>
    <div class="card"><h2>Top indicadores</h2><div class="rank">${top.map((t,k) => `<div><span class="p">${k+1}</span><span><b>${esc(t.u.nome)}</b><span class="note"> · ${esc(t.u.funcao)}</span></span><span class="num note">${t.q} qualif. / ${t.n}</span></div>`).join('') || '<p class="muted">Ainda sem indicadores.</p>'}</div></div>
    <div class="card"><h2>Por condomínio</h2><div class="rank">${byC.map((t,k) => `<div><span class="p">${k+1}</span><span>${esc(t.c.nome)}<span class="note"> · ${esc(t.c.bairro||'')}</span></span><b class="num">${t.n}</b></div>`).join('') || '<p class="muted">Ainda sem indicações.</p>'}</div>
     <h3>Por região</h3><div class="rank">${Object.entries(byR).sort((a,b)=>b[1]-a[1]).map(([r,v],k) => `<div><span class="p">${k+1}</span><span>${esc(r)}</span><b class="num">${v}</b></div>`).join('') || '<p class="muted">—</p>'}</div></div>
   </div>`;
}
function aInds(){
  const fs = S.admFilter, L = S.D.inds.filter(i => fs === 'all' || String(i.status) === fs);
  return `<div class="btns" style="align-items:center"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Status
    <select class="in" id="a-filter" style="min-height:40px;width:auto"><option value="all">Todos</option>${ST.map((s,k)=>`<option value="${k}" ${fs===String(k)?'selected':''}>${s}</option>`).join('')}</select></label>
    <span class="note">${L.length} indicações</span></div>
   <div class="tbl-wrap"><table><thead><tr><th>ID</th><th>Recebida</th><th>Indicador</th><th>Condomínio</th><th>Proprietário</th><th>Origem</th><th>Status</th><th>Ações</th></tr></thead><tbody>
   ${L.map(i => `<tr id="row-${i.id}" class="${S.flash===i.id?'flash':''}"><td class="mono">${i.id}</td><td class="num">${fdt(i.criado_em)}</td><td>${esc(perfil(i.indicador_id)?.nome || '—')}</td><td>${esc(i.endereco || condoNome(i.condominio_id))}</td><td>${esc(i.proprietario_nome)} · ${esc(i.unidade)}<br><span class="note mono">${fph(i.telefone)}</span></td><td class="note">${esc(i.origem)}</td><td>${pill(i.status)}</td>
    <td>${i.status < 7 ? `<div class="btns" style="flex-wrap:nowrap"><button class="btn sm" data-a="adv" data-v="${i.id}" data-s="${i.status+1}">${i.status===0?'Validar':'Avançar'}</button><button class="btn sm danger" data-a="close" data-v="${i.id}">Encerrar</button></div>` : i.status === 6 ? `<button class="btn sm gold" data-a="adv" data-v="${i.id}" data-s="7">Liberar recompensa</button>` : '<span class="note">—</span>'}</td></tr>`).join('') || '<tr><td colspan="8" class="note">Nenhuma indicação ainda.</td></tr>'}
   </tbody></table></div>`;
}
function aOcorr(){
  return `<p class="note">Tentativas bloqueadas por duplicidade (telefone ou imóvel já cadastrado). Nenhuma recompensa é gerada nesses casos.</p>
   <div class="cards">${S.D.ocorr.map(o => { const orig = S.D.inds.find(i => i.id === o.indicacao_original); return `<div class="${o.estado==='aberta'?'alert':'card'}">
    <div class="sec-h"><b>${esc(o.motivo)}</b><span class="note">${fdt(o.criado_em)}</span></div>
    <dl class="kv"><dt>Tentativa de</dt><dd>${esc(perfil(o.tentativa_por)?.nome || 'QR Code')}</dd><dt>Proprietário</dt><dd>${esc(o.proprietario_nome)} · <span class="mono">${fph(o.telefone)}</span></dd><dt>Imóvel</dt><dd>${esc(o.unidade)} · ${esc(condoNome(o.condominio_id))}</dd><dt>Registro original</dt><dd class="mono">${esc(o.indicacao_original||'—')}${orig?` (${esc(perfil(orig.indicador_id)?.nome || orig.origem)})`:''}</dd></dl>
    ${o.estado==='aberta' ? `<div class="btns"><button class="btn sm" data-a="ocorr" data-v="${o.id}" data-e="mantida">Manter registro original</button><button class="btn sm ghost" data-a="ocorr" data-v="${o.id}" data-e="suspeita">Marcar como suspeita</button></div>` : `<span class="note">Resolvida: ${o.estado==='mantida'?'registro original mantido':'marcada como suspeita'}</span>`}</div>`; }).join('') || '<p class="muted">Nenhuma ocorrência.</p>'}</div>`;
}
function aRec(){
  return `<p class="note">Os valores não podem ser editados manualmente. Cada mudança fica registrada na auditoria.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Indicação</th><th>Indicador</th><th>Gerada em</th><th class="r">Valor</th><th>Estado</th><th>Ação</th></tr></thead><tbody>
   ${S.D.rewards.map(r => `<tr><td class="mono">${r.indicacao_id}</td><td>${esc(perfil(r.indicador_id)?.nome || '—')}</td><td class="num">${fdt(r.criado_em)}</td><td class="r num"><b>${money(r.valor)}</b></td><td>${REW[r.estado][1]}</td>
    <td>${r.estado==='processamento' ? `<button class="btn sm" data-a="rew" data-v="${r.indicacao_id}" data-e="disponivel">Liberar</button>` : ['disponivel','resgate'].includes(r.estado) ? `<button class="btn sm gold" data-a="rew" data-v="${r.indicacao_id}" data-e="pago">Registrar pagamento</button>` : '<span class="note">—</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="note">Nenhuma recompensa ainda.</td></tr>'}
   </tbody></table></div>`;
}
function aCondos(){
  return `<div class="grid2"><div class="tbl-wrap"><table><thead><tr><th>Condomínio</th><th>Bairro / cidade</th><th class="r">Indicadores</th><th class="r">Indicações</th><th>QR</th></tr></thead><tbody>
   ${S.D.condos.map(c => `<tr><td><b>${esc(c.nome)}</b><br><span class="note">${esc(c.endereco||'')}</span></td><td>${esc(c.bairro||'')} · ${esc(c.cidade||'')}</td><td class="r num">${S.D.perfis.filter(u=>u.condominio_id===c.id).length}</td><td class="r num">${S.D.inds.filter(i=>i.condominio_id===c.id).length}</td><td><button class="btn sm ghost" data-a="cqr" data-v="${c.id}">${ic('qr',16)}Ver</button></td></tr>`).join('') || '<tr><td colspan="5" class="note">Cadastre o primeiro condomínio ao lado.</td></tr>'}
   </tbody></table></div>
   <form data-f="condo" class="card" novalidate><h2>Cadastrar condomínio</h2>
    <label class="f">Nome<input class="in" id="k-nome" name="nome" placeholder="Ex.: Residencial Solar das Palmeiras"></label>
    <label class="f">Endereço<input class="in" id="k-end" name="end"></label>
    <div class="row2"><label class="f">Bairro<input class="in" id="k-bairro" name="bairro"></label><label class="f">Cidade<input class="in" id="k-cidade" name="cidade" value="São Paulo"></label></div>
    <label class="f">Região<input class="in" id="k-reg" name="reg" placeholder="Ex.: Zona Sul"></label>
    <button class="btn" type="submit">Cadastrar e gerar QR Code</button></form></div>`;
}
function aUsers(){
  const pend = S.D.perfis.filter(p => !p.condominio_id && p.condominio_texto);
  return `${pend.length ? `<div class="alert"><b>${pend.length} cadastro${pend.length>1?'s':''} com condomínio fora da lista</b><p class="note">Cadastre o condomínio na aba Condomínios para organizar os relatórios: ${pend.map(p => `${esc(p.nome)} (${esc(p.condominio_texto)})`).join(', ')}.</p></div>` : ''}
   <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Função</th><th>Condomínio</th><th>Código</th><th>Convidado por</th><th>Desde</th><th>Acesso</th></tr></thead><tbody>
   ${S.D.perfis.map(u => `<tr><td><b>${esc(u.nome)}</b><br><span class="note mono">${fph(u.telefone)}</span></td><td>${esc(u.funcao)}</td><td>${esc(condo(u.condominio_id)?.nome || u.condominio_texto || '—')}</td><td class="mono">${esc(u.codigo)}</td><td>${esc(perfil(u.convidado_por)?.nome || '—')}</td><td class="num">${fd(u.criado_em)}</td>
    <td><select class="in" data-papel="${u.id}" style="min-height:36px;width:auto" ${u.id===S.perfil.id?'disabled':''}>${[['indicador','Indicador'],['corretor','Corretor'],['admin','Gestor']].map(([k,l]) => `<option value="${k}" ${u.papel===k?'selected':''}>${l}</option>`).join('')}</select></td></tr>`).join('')}
   </tbody></table></div>
   <p class="note">Para dar acesso a um corretor ou outro gestor: peça para a pessoa entrar com o e-mail dela e completar o cadastro, depois troque o acesso aqui.</p>`;
}
function aProg(){
  return `<div class="grid2"><form data-f="cfg" class="card" novalidate><h2>Recompensa por indicação qualificada</h2>
    <label class="f">Valor fixo (R$)<input class="in num" id="g-valor" name="valor" type="number" min="0" step="1" value="${Number(S.D.valor)}"></label>
    <p class="note">Vale para novas indicações qualificadas. Recompensas já geradas mantêm o valor original.</p>
    <button class="btn" type="submit">Salvar valor</button></form>
   <div class="card"><h2>Alertas para o gestor</h2>
    <p class="note">Toda nova indicação acende o sininho no topo na hora, com aviso na tela. Para receber também um alerta do navegador quando esta aba estiver em segundo plano, ative abaixo.</p>
    ${('Notification' in window) ? (Notification.permission === 'granted' ? '<p class="note"><b>Alertas do navegador ativados neste aparelho.</b></p>' : `<button class="btn ghost" data-a="askNotif">${ic('bell',18)}Ativar alertas do navegador</button>`) : '<p class="note">Este navegador não suporta alertas.</p>'}
    <p class="note">Aviso por e-mail e WhatsApp: próxima etapa.</p></div></div>`;
}
function aAud(){ return `<div class="tbl-wrap"><table><thead><tr><th>Data e hora</th><th>Quem</th><th>Ação</th></tr></thead><tbody>${S.D.audit.map(l => `<tr><td class="num">${fdt(l.criado_em)}</td><td>${esc(perfil(l.autor_id)?.nome || 'Sistema')}</td><td>${esc(l.acao)}</td></tr>`).join('') || '<tr><td colspan="3" class="note">Sem registros.</td></tr>'}</tbody></table></div>`; }

/* ---------- render ---------- */
function render(){
  const root = document.documentElement, app = $('#app');
  root.dataset.device = S.device || 'mob';
  if (!S.device && S.screen !== 'publico') { $('#top').innerHTML=''; $('#nav').innerHTML=''; $('#bell').innerHTML=''; delete root.dataset.side; app.className='choose'; app.innerHTML = vDevice(); return; }
  $('#top').innerHTML = S.screen === 'publico' ? `<header class="top"><div class="top-in"><div class="brand">${logo(30)}<span class="bn">Rendique</span></div></div></header>` : vTop();
  const desk = S.device === 'desk';
  let html = '', cls = '';
  if (S.screen === 'app') {
    const p = papel();
    if (p === 'admin') { html = vAdm(); cls = desk ? 'wide' : 'adm'; }
    else if (p === 'corretor') { html = vPro(); cls = 'pro'; }
    else {
      html = ({home:vHome,nova:vNova,ok:vOk,dup:vDup,lista:vLista,det:vDet,carteira:vCarteira,mais:vMais,qr:vQR,convite:vConvite,privacidade:vPriv,termos:vTermos}[S.tab] || vHome)();
      if (['ok','dup','mais','qr','convite','privacidade','termos'].includes(S.tab)) html = `<div class="narrow">${html}</div>`;
    }
  } else {
    html = ({setup:vSetup, loading:vLoading, login:vLogin, cadastro:vCadastro, publico:vPublico, erro:vErro, inativo:vInativo}[S.screen] || vLoading)();
    cls = 'pro';
  }
  app.className = cls; app.innerHTML = html;
  const nav = vNav(); $('#nav').innerHTML = nav;
  if (nav) root.dataset.side = ''; else delete root.dataset.side;
  $('#bell').innerHTML = vBell();
  document.querySelectorAll('[data-qr]').forEach(drawQR);
}
function drawQR(el){ el.innerHTML=''; if (window.QRCode) new QRCode(el, { text: el.dataset.qr, width: 180, height: 180, colorDark: '#1D3A5F', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); else el.textContent = el.dataset.qr; }
function go(t){
  S.tab = t; S.bell = false; render(); window.scrollTo(0,0);
  if (t === 'convite' && S.D.convidados === null) rpc('meus_convidados', {}).then(r => { S.D.convidados = r; render(); }).catch(() => { S.D.convidados = []; render(); });
}
function showErr(sel, m){ const e = $(sel); if (!e) return toast(m); e.textContent = m; e.hidden = false; e.scrollIntoView({ block:'center', behavior:'smooth' }); }

/* ---------- ações ---------- */
async function guard(fn){ busy(true); try { await fn(); } catch(e) { toast(msg(e)); } finally { busy(false); } }
async function refresh(){ await loadData(); render(); }

const act = {
  device: d => { S.device = d.v; saveLS('rendique-device', d.v); render(); window.scrollTo(0,0); },
  go: d => go(d.v),
  det: async d => { S.det = d.v; go('det'); if (!S.D.hist[d.v]) { try { await loadHist(d.v); render(); } catch(e) { toast(msg(e)); } } },
  filter: d => { S.filter = d.v; render(); },
  atab: d => { S.admTab = d.v; S.flash = null; render(); },
  retry: () => onSession(S.session),
  reload: () => guard(async () => { await refresh(); toast('Dados atualizados'); }),
  logout: () => guard(async () => { await sb.auth.signOut(); S.D = { inds:[], rewards:[], condos:[], perfis:[], ocorr:[], notifs:[], audit:[], hist:{}, convidados:null, valor:20 }; onSession(null); }),
  otherEmail: () => { S.loginStep = 0; render(); },
  resend: () => guard(async () => { await sendCode(S.email); toast('Novo código enviado'); }),
  bell: () => { S.bell = !S.bell; render(); },
  readAll: () => guard(async () => { await q(sb.from('notificacoes').update({ lida: true }).eq('destinatario_id', S.perfil.id).eq('lida', false)); S.D.notifs.forEach(n => n.lida = true); render(); }),
  openNotif: d => guard(async () => {
    const n = S.D.notifs.find(x => String(x.id) === d.v); if (!n) return;
    if (!n.lida) { await q(sb.from('notificacoes').update({ lida: true }).eq('id', n.id)); n.lida = true; }
    S.bell = false;
    if (papel() === 'admin') { S.admTab = n.tipo === 'duplicidade' ? 'ocorr' : n.tipo === 'cadastro' ? 'users' : n.tipo === 'resgate' ? 'rec' : 'inds'; S.admFilter = 'all'; S.flash = n.indicacao_id; render(); const row = n.indicacao_id && document.getElementById('row-' + n.indicacao_id); if (row) row.scrollIntoView({ block:'center' }); return; }
    if (papel() === 'indicador' && n.indicacao_id) { await act.det({ v: n.indicacao_id }); return; }
    render();
  }),
  askNotif: async () => { try { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Alertas do navegador ativados' : 'Alertas não autorizados neste navegador'); } catch(e) {} render(); },
  adv: d => guard(async () => { await rpc('mudar_status', { p_id: d.v, p_status: Number(d.s), p_motivo: null }); delete S.D.hist[d.v]; await refresh(); toast(`${d.v}: ${ST[Number(d.s)]}`); }),
  close: d => openModal(`<p class="eyebrow">Encerrar ${esc(d.v)}</p><h2>Qual o motivo?</h2>
     <select class="in" id="m-motivo">${MOTIVOS.map(m => `<option>${m}</option>`).join('')}</select>
     <div class="btns" style="justify-content:center"><button class="btn danger" data-a="confirmClose" data-v="${esc(d.v)}">Encerrar indicação</button><button class="btn ghost" data-a="mclose">Cancelar</button></div>`),
  confirmClose: d => guard(async () => { const m = $('#m-motivo')?.value; closeModal(); await rpc('mudar_status', { p_id: d.v, p_status: 8, p_motivo: m }); delete S.D.hist[d.v]; await refresh(); toast(`${d.v} encerrada`); }),
  rew: d => guard(async () => { await rpc('mudar_recompensa', { p_indicacao: d.v, p_estado: d.e }); await refresh(); toast(d.e === 'pago' ? 'Pagamento registrado' : 'Recompensa liberada'); }),
  ocorr: d => guard(async () => { await rpc('resolver_ocorrencia', { p_id: Number(d.v), p_estado: d.e }); await refresh(); }),
  resgatar: () => guard(async () => { const v = await rpc('solicitar_resgate', {}); await refresh(); toast(`Resgate de ${money(v)} solicitado`); }),
  lgpd: d => guard(async () => { await rpc('solicitar_lgpd', { p_tipo: d.v }); toast(`Pedido de ${d.v} registrado. Resposta em até 15 dias.`); }),
  copy: d => { try { navigator.clipboard.writeText(d.v).then(() => toast('Link copiado'), () => toast('Selecione o link e copie manualmente')); } catch(e) { toast('Selecione o link e copie manualmente'); } },
  cqr: d => { const c = condo(d.v), url = `${SITE}?k=${c.id}`;
    openModal(`<p class="eyebrow">QR Code do condomínio</p><h2>${esc(c.nome).toUpperCase()}</h2><div class="qrbox" data-qr="${esc(url)}"></div><p class="note">Indicações feitas por este QR são registradas com origem neste condomínio.</p><div class="copyrow"><span>${esc(url)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(url)}">${ic('copy',16)}Copiar</button></div><button class="btn" data-a="mclose">Fechar</button>`); },
  mclose: (d, el, e) => { if (e.target === el) closeModal(); }
};
function openModal(inner){ $('#modal').innerHTML = `<div class="modal" data-a="mclose"><div class="box" role="dialog">${inner}</div></div>`; $('#modal').querySelectorAll('[data-qr]').forEach(drawQR); }
function closeModal(){ $('#modal').innerHTML = ''; }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-a]');
  if (!a) { if (S.bell && !e.target.closest('.bellpanel')) { S.bell = false; render(); } return; }
  if (a.dataset.a === 'mclose' && a.classList.contains('btn')) { closeModal(); return; }
  act[a.dataset.a]?.(a.dataset, a, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#modal').innerHTML) closeModal(); else if (S.bell) { S.bell = false; render(); } } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-samewa') $('#wa-wrap').hidden = t.checked;
  if (t.id === 'f-condo') $('#addr').hidden = t.value !== 'outro';
  if (t.id === 'c-condo') $('#c-outro-wrap').hidden = t.value !== 'outro';
  if (t.id === 'a-filter') { S.admFilter = t.value; render(); }
  if (t.dataset.papel) guard(async () => { await rpc('definir_papel', { p_usuario: t.dataset.papel, p_papel: t.value }); await refresh(); toast('Acesso atualizado'); });
});
document.addEventListener('input', e => { if (['f-phone','f-wa','p-phone','c-tel'].includes(e.target.id)) { const d = dig(e.target.value).slice(0,11); e.target.value = d.length > 2 ? fph(d) || d : d; } });

async function sendCode(email){
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: SITE } });
  if (error) throw error;
}
const forms = {
  login: fd => guard(async () => {
    if (!S.loginStep) {
      const email = String(fd.get('email')||'').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showErr('#l-err', 'Digite um e-mail válido.');
      try { await sendCode(email); } catch(e) { return showErr('#l-err', /rate|limit|seconds/i.test(e.message) ? 'Muitas tentativas seguidas. Espere um minuto e tente de novo.' : msg(e)); }
      S.email = email; S.loginStep = 1; render(); setTimeout(() => $('#l-code')?.focus(), 50); return;
    }
    const token = dig(fd.get('code'));
    if (token.length < 6) return showErr('#l-err', 'Digite o código que chegou no seu e-mail.');
    const { data, error } = await sb.auth.verifyOtp({ email: S.email, token, type: 'email' });
    if (error) return showErr('#l-err', 'Código inválido ou vencido. Peça um novo código.');
    await onSession(data.session);
  }),
  cadastro: fd => guard(async () => {
    const g = k => String(fd.get(k)||'').trim();
    if (!g('nome')) return showErr('#c-err', 'Informe seu nome completo.');
    if (dig(g('telefone')).length < 10) return showErr('#c-err', 'Informe seu celular com DDD.');
    if (g('condominio') === 'outro' && !g('condominio_texto')) return showErr('#c-err', 'Informe o nome do condomínio onde trabalha.');
    if (!fd.get('termos')) return showErr('#c-err', 'Para continuar, aceite os termos do programa.');
    try {
      await rpc('completar_cadastro', { p_nome: g('nome'), p_telefone: dig(g('telefone')), p_funcao: g('funcao'),
        p_condominio_id: g('condominio') === 'outro' ? null : g('condominio'), p_condominio_texto: g('condominio') === 'outro' ? g('condominio_texto') : null, p_convite: g('convite') || null });
    } catch(e) { return showErr('#c-err', msg(e)); }
    saveLS('rendique-convite', null);
    await onSession(S.session);
    toast(papel() === 'admin' ? 'Bem-vindo! Você é o gestor do Rendique.' : 'Cadastro concluído!');
  }),
  nova: fd => guard(async () => {
    const g = k => String(fd.get(k)||'').trim();
    if (!g('owner')) return showErr('#f-err', 'Informe o nome do proprietário.');
    if (dig(g('phone')).length < 10) return showErr('#f-err', 'Informe um telefone com DDD.');
    if (g('autorizou') !== 'Sim') return showErr('#f-err', g('autorizou') === 'Não' ? 'Peça a autorização do proprietário antes de enviar. Sem ela, não podemos registrar o contato.' : 'Responda se o proprietário autorizou passar o contato.');
    if (!g('unit')) return showErr('#f-err', 'Informe a unidade (ex.: Apto 82 · Bloco B).');
    if (g('condo') === 'outro' && !g('end')) return showErr('#f-err', 'Informe o endereço do imóvel.');
    if (!fd.get('consent')) return showErr('#f-err', 'Marque a confirmação de autorização do proprietário.');
    const outro = g('condo') === 'outro';
    let r;
    try {
      r = await rpc('enviar_indicacao', { p: {
        proprietario_nome: g('owner'), telefone: dig(g('phone')), whatsapp: fd.get('samewa') ? dig(g('phone')) : dig(g('wa')), horario: g('horario'),
        condominio_id: outro ? null : g('condo'), unidade: g('unit'), endereco: outro ? `${g('end')}, ${g('numero')} – ${g('bairro')}, ${g('cidade')}` : null,
        tipo: g('tipo'), dormitorios: g('dorms'), interesse: g('interesse'), quando: g('quando'), como: g('como'), observacoes: g('obs'), consentimento: true } });
    } catch(e) { return showErr('#f-err', msg(e)); }
    if (r.duplicada) return go('dup');
    S.lastId = r.id; await loadData(); go('ok');
  }),
  publico: fd => guard(async () => {
    const g = k => String(fd.get(k)||'').trim();
    if (!g('owner') || dig(g('phone')).length < 10 || !g('unit')) return showErr('#p-err', 'Preencha nome, WhatsApp com DDD e unidade.');
    if (!fd.get('consent')) return showErr('#p-err', 'Marque a autorização de contato para continuar.');
    if (!sb) return showErr('#p-err', 'Sistema indisponível no momento.');
    try {
      const r = await rpc('indicacao_publica', { p_codigo: S.pub.q || null, p_condominio: S.pub.k || null,
        p: { proprietario_nome: g('owner'), telefone: dig(g('phone')), whatsapp: dig(g('phone')), unidade: g('unit'), horario: 'Qualquer horário', consentimento: true } });
      S.pub.done = { dup: r.duplicada, id: r.id }; render();
    } catch(e) { showErr('#p-err', msg(e)); }
  }),
  condo: fd => guard(async () => {
    const g = k => String(fd.get(k)||'').trim();
    if (!g('nome')) return toast('Informe o nome do condomínio');
    const rows = await q(sb.from('condominios').insert({ nome: g('nome'), endereco: g('end'), bairro: g('bairro'), cidade: g('cidade'), regiao: g('reg') || null }).select());
    await refresh(); toast('Condomínio cadastrado'); act.cqr({ v: rows[0].id });
  }),
  cfg: fd => guard(async () => { await rpc('definir_valor_recompensa', { p_valor: Math.max(0, Math.round(Number(fd.get('valor')) || 0)) }); await refresh(); toast('Valor salvo'); })
};
document.addEventListener('submit', e => { e.preventDefault(); forms[e.target.dataset.f]?.(new FormData(e.target), e.target); });

boot();
