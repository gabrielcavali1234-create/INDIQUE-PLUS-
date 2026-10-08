/* Rendique · aplicativo com banco de dados (Supabase) · versão 202610080115 */
'use strict';

/* ---------- configuração ---------- */
const CFG = window.RENDIQUE_CONFIG || {};
const sb = (CFG.supabaseUrl && CFG.supabaseKey && window.supabase)
  ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
const SITE = location.origin + location.pathname.replace(/index\.html$/, '');

const ST = ['Enviada','Em validação','Contato realizado','Oportunidade qualificada','Anúncio ativo','Em negociação','Venda realizada','Recompensa liberada','Encerrada'];
const MOTIVOS = ['Proprietário desistiu da venda','Não foi possível falar com o proprietário','Dados incorretos','Imóvel já anunciado com outra imobiliária','Outro motivo'];
const FUNCOES = ['Porteiro','Zelador','Síndico','Funcionário do condomínio','Outro parceiro'];
const REW = {processamento:['proc','Em processamento'],disponivel:['disp','Disponível'],resgate:['resg','Resgate solicitado'],pago:['pago','Pago'],cancelada:['pago','Cancelada']};

const params = new URLSearchParams(location.search);
const S = {
  novaVar: 'a', nvStep: 0, nd: null,
  device: loadLS('rendique-device'),
  screen: 'loading', tab: 'home', admTab: 'geral', filter: 'todas', admFilter: 'all', admGrupo: 'novas', admView: 'lista', admQ: '', drawer: null,
  session: null, perfil: null, det: null, lastId: null,
  email: '', authMode: /type=recovery/.test(location.hash) ? 'novaSenha' : 'entrar', convite: params.get('c') || loadLS('rendique-convite') || '',
  pub: (params.get('q') || params.get('k')) ? { q: params.get('q'), k: params.get('k'), info: null, done: null } : null,
  D: { inds: [], rewards: [], condos: [], perfis: [], ocorr: [], notifs: [], audit: [], hist: {}, convidados: null, valor: 20 },
  bell: false, channel: null
};
if (params.get('c')) saveLS('rendique-convite', params.get('c'));
if (params.get('g')) saveLS('rendique-convite-acesso', params.get('g'));
S.convAcesso = loadLS('rendique-convite-acesso'); S.convInfo = null;
if ((S.convAcesso || params.get('c')) && S.authMode === 'entrar') S.authMode = 'criar';
const ROTULO = { admin: 'gestor', corretor: 'corretor' };

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
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  columns:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="13" rx="1.5"/>',
  chat:'<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 10.5c.5 1.8 2 3.3 4 4l1.2-1.2 2 .8v1.6c-4.2.5-8.2-3.5-7.7-7.7h1.6l.8 2z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  building:'<path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 7h3M8 11h3M8 15h3"/>',
  pin:'<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'
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
    jobs.push(q(sb.from('convites_acesso').select('*').order('criado_em',{ascending:false}).limit(50)).then(r => S.D.convites = r).catch(() => S.D.convites = []));
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
      const ci = n.indicacao_id && S.D.inds.find(i => i.id === n.indicacao_id)?.condominio_id; if (ci) M.flash = { id: ci, t: Date.now() };
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
  if (S.convAcesso) { try { S.convInfo = await rpc('info_convite', { p_token: S.convAcesso }); } catch(e) { S.convInfo = null; } }
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { S.session = session; S.authMode = 'novaSenha'; S.screen = 'login'; render(); return; }
    if (S.authMode === 'novaSenha') { S.session = session; return; }
    if (ev === 'SIGNED_IN' && (!S.session || S.session.user.id !== session?.user?.id)) onSession(session);
    if (ev === 'SIGNED_OUT') onSession(null);
    if (ev === 'TOKEN_REFRESHED') S.session = session;
  });
  const { data } = await sb.auth.getSession();
  if (S.authMode === 'novaSenha') { S.session = data.session; S.screen = 'login'; render(); return; }
  await onSession(data.session);
}
async function onSession(session){
  S.session = session; S.bell = false;
  if (!session) { unsubscribe(); S.perfil = null; S.screen = 'login'; if (S.authMode === 'novaSenha') S.authMode = 'entrar'; render(); return; }
  S.screen = 'loading'; render();
  try {
    await loadPerfil();
    if (!S.perfil && S.convAcesso && S.convInfo?.valido) { S.screen = 'cadastro'; render(); return; }
    if (S.perfil && S.convAcesso) { saveLS('rendique-convite-acesso', null); S.convAcesso = null; setTimeout(() => toast('Você já tem cadastro. O convite não foi usado.'), 300); }
    if (!S.perfil) {
      S.bancoDesatualizado = false;
      try { S.podeGestor = !!(await rpc('pode_ser_gestor', {})); } catch(e) { S.podeGestor = false; S.bancoDesatualizado = /pode_ser_gestor|function|schema cache|404/i.test(String(e?.message||e?.code||'')) || true; }
      if (!S.podeGestor) S.D.condos = await q(sb.from('condominios').select('id,nome').order('nome'));
      S.screen = 'cadastro'; render(); return;
    }
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
  const m = S.authMode;
  const conv = S.convInfo ? (S.convInfo.valido
    ? `<div class="principle">${ic('users')}<span><b>${esc(S.convInfo.convidado_por || 'O gestor')}</b> convidou você para ser <b>${ROTULO[S.convInfo.papel]}</b> do Rendique. Crie sua conta (ou entre, se já tiver uma) para continuar.</span></div>`
    : `<div class="alert"><b>Convite inválido ou vencido</b><p class="note">Peça um novo link ao gestor.</p></div>`) : '';
  const email = `<label class="f">E-mail<input class="in" id="l-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com" value="${esc(S.email)}"></label>`;
  const senha = (id, label, ac) => `<label class="f">${label}<span class="pw"><input class="in" id="${id}" name="${id}" type="password" autocomplete="${ac}" minlength="6"><button type="button" class="pw-eye" data-a="eye" data-v="${id}" aria-label="Mostrar senha">mostrar</button></span></label>`;
  const codigo = `<label class="f">Código que chegou no e-mail<input class="in mono" id="l-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" style="letter-spacing:.35em;font-size:22px;text-align:center"></label>`;
  const tabs = (m === 'entrar' || m === 'criar') ? `<div class="authtabs" role="tablist"><button type="button" role="tab" aria-selected="${m==='entrar'}" class="${m==='entrar'?'on':''}" data-a="authMode" data-v="entrar">Entrar</button><button type="button" role="tab" aria-selected="${m==='criar'}" class="${m==='criar'?'on':''}" data-a="authMode" data-v="criar">Criar conta</button></div>` : '';
  const voltar = `<button type="button" class="link" data-a="authMode" data-v="entrar">Voltar para o login</button>`;
  const body = {
    entrar: `${email}${senha('l-pass','Senha','current-password')}
      <button class="btn big" type="submit">Entrar</button>
      <button type="button" class="link" data-a="authMode" data-v="esqueci">Esqueci minha senha</button>`,
    criar: `${email}${senha('l-pass','Crie uma senha','new-password')}${senha('l-pass2','Repita a senha','new-password')}
      <p class="note">Use pelo menos 6 caracteres. Misturar letras e números deixa a senha mais segura.</p>
      <button class="btn big gold" type="submit">Criar conta</button>`,
    confirmar: `<h1 style="font-size:24px">Confirme seu e-mail</h1>
      <p class="note">Enviamos um código para <b>${esc(S.email)}</b>. Digite abaixo para ativar sua conta. Confira também a caixa de spam.</p>${codigo}
      <button class="btn big" type="submit">Confirmar e entrar</button>
      <p class="note">Se o e-mail trouxer só um link, toque nele para ativar a conta.</p>
      <div class="btns" style="justify-content:space-between"><button type="button" class="link" data-a="resendSignup">Enviar outro código</button>${voltar}</div>`,
    esqueci: `<h1 style="font-size:24px">Esqueci minha senha</h1>
      <p class="note">Digite seu e-mail. Vamos enviar um código para você criar uma senha nova.</p>${email}
      <button class="btn big" type="submit">Enviar código</button>${voltar}`,
    redefinir: `<h1 style="font-size:24px">Crie uma senha nova</h1>
      <p class="note">Enviamos um código para <b>${esc(S.email)}</b>.</p>${codigo}${senha('l-pass','Senha nova','new-password')}${senha('l-pass2','Repita a senha nova','new-password')}
      <button class="btn big" type="submit">Salvar senha e entrar</button>
      <div class="btns" style="justify-content:space-between"><button type="button" class="link" data-a="resendRecovery">Enviar outro código</button>${voltar}</div>`,
    novaSenha: `<h1 style="font-size:24px">Crie uma senha nova</h1>${senha('l-pass','Senha nova','new-password')}${senha('l-pass2','Repita a senha nova','new-password')}
      <button class="btn big" type="submit">Salvar senha e entrar</button>`
  }[m];
  return `<div class="narrow cards" style="gap:18px;margin-top:20px">
   <div class="brand big">${logo(56)}<span class="bn">Rendique</span></div>
   <p class="muted" style="margin-top:-8px">Você conhece a oportunidade. Nós cuidamos do resto.</p>
   ${conv}
   <form data-f="login" class="card" novalidate>${tabs}${body}<div id="l-err" class="err" hidden></div></form>
   <p class="principle">${ic('shield')}<span>Você indica a oportunidade. Um profissional imobiliário habilitado cuida de todo o processo.</span></p>
  </div>`;
}
function vCadastroGestor(){
  return `<div class="narrow cards" style="gap:16px;margin-top:12px">
   <div><p class="eyebrow">Configuração inicial</p><h1 style="font-size:28px">Bem-vindo, gestor</h1><p class="muted">${esc(S.session?.user?.email||'')}</p></div>
   <div class="principle">${ic('shield')}<span>Você é o primeiro acesso do Rendique e será o <b>gestor da plataforma</b>, com acesso a todas as indicações, usuários, recompensas e relatórios. Os próximos cadastros entram como indicadores.</span></div>
   <form data-f="cadastro" class="card" novalidate>
    <input type="hidden" name="gestor" value="1">
    <label class="f">Seu nome<input class="in" id="c-nome" name="nome" autocomplete="name"></label>
    <label class="f">Celular (WhatsApp)<input class="in" id="c-tel" name="telefone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <div id="c-err" class="err" hidden></div>
    <button class="btn big gold" type="submit">Entrar no painel do gestor</button>
   </form>
   <button class="link" data-a="logout">Sair e usar outro e-mail</button></div>`;
}
function vCadastroConvite(){
  const r = ROTULO[S.convInfo.papel];
  return `<div class="narrow cards" style="gap:16px;margin-top:12px">
   <div><p class="eyebrow">Convite de ${r}</p><h1 style="font-size:28px">Bem-vindo ao Rendique</h1><p class="muted">${esc(S.session?.user?.email||'')}</p></div>
   <div class="principle">${ic('shield')}<span>${esc(S.convInfo.convidado_por || 'O gestor')} convidou você como <b>${r}</b>. ${S.convInfo.papel === 'admin' ? 'Você terá acesso a todas as indicações, usuários, recompensas e relatórios.' : 'Você vai receber as oportunidades validadas e atualizar o andamento de cada uma.'}</span></div>
   <form data-f="cadastro" class="card" novalidate>
    <input type="hidden" name="convite_acesso" value="${esc(S.convAcesso)}">
    <label class="f">Seu nome<input class="in" id="c-nome" name="nome" autocomplete="name"></label>
    <label class="f">Celular (WhatsApp)<input class="in" id="c-tel" name="telefone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <div id="c-err" class="err" hidden></div>
    <button class="btn big gold" type="submit">Entrar como ${r}</button>
   </form>
   <button class="link" data-a="logout">Sair e usar outro e-mail</button></div>`;
}
function vCadastro(){
  if (S.convAcesso && S.convInfo?.valido) return vCadastroConvite();
  if (S.podeGestor) return vCadastroGestor();
  const aviso = S.bancoDesatualizado ? `<div class="alert"><b>Banco de dados desatualizado</b><p class="note">A tela do gestor depende de uma atualização no Supabase que ainda não foi aplicada. Rode o SQL de atualização no SQL Editor e recarregue esta página.</p></div>` : '';
  const ch = (name, opts, def) => `<div class="chips" role="radiogroup">${opts.map(o=>`<label><input type="radio" name="${name}" value="${o}" ${o===def?'checked':''}><span>${o}</span></label>`).join('')}</div>`;
  return `<div class="narrow cards" style="gap:16px;margin-top:12px">
   <div><p class="eyebrow">Primeiro acesso</p><h1 style="font-size:28px">Complete seu cadastro</h1><p class="muted">${esc(S.session?.user?.email||'')}</p></div>
   ${aviso}
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
     <span class="who-chip" title="${esc(S.perfil.nome)}"><b>${esc(S.perfil.nome.split(' ')[0])}</b><small>${rot}</small></span>
     <button class="logoutbtn" data-a="logout" aria-label="Sair" title="Sair">${ic('out',18)}<span>Sair</span></button>` : ''}
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
/* ---------- Nova indicação (indicador) ---------- */
const NV_PASSOS = [['aut','Autorização'],['imovel','Imóvel'],['prop','Proprietário'],['venda','Venda'],['rev','Revisar']];
function nvOnde(){ const u = S.perfil; return u.condominio_id ? 'meu' : (u.condominio_texto ? 'novo' : (S.D.condos.length ? 'lista' : 'novo')); }
function vNova(){
  const u = S.perfil, meu = condo(u.condominio_id), varB = S.novaVar === 'b', passo = S.nvStep || 0;
  const ch = (name, opts, def, cls='') => `<div class="chips ${cls}" role="radiogroup">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<label><input type="radio" name="${name}" value="${esc(v)}" ${v===def?'checked':''}><span>${l}</span></label>`; }).join('')}</div>`;
  const onde = nvOnde();
  const secAut = `<section class="nvsec" data-step="0"><h2>${varB?'<span class="nvn">1</span>':''}Antes de começar</h2>
    <div class="f"><span class="qlabel">O proprietário autorizou você a passar o contato dele?</span>${ch('autorizou',[['Sim','Sim, ele autorizou'],['Não','Ainda não']],'','yn big')}</div>
    <div class="alert" data-when="autorizou=Não"><b>Peça a autorização primeiro.</b><p class="note">Sem autorização do proprietário não podemos registrar o contato dele (LGPD). Pergunte se ele aceita receber a ligação de um corretor e volte aqui.</p></div>
    <p class="note">Você só informa a oportunidade. Quem liga, avalia e negocia é um corretor habilitado.</p></section>`;
  const secImovel = `<section class="nvsec" data-step="1"><h2>${varB?'<span class="nvn">2</span>':''}Onde fica o imóvel</h2>
    <div class="nvonde" role="radiogroup">
     ${meu ? `<label class="nvopt"><input type="radio" name="onde" value="meu" ${onde==='meu'?'checked':''}><span><b>No meu condomínio</b><small>${esc(meu.nome)}${meu.endereco ? ' · ' + esc(meu.endereco) : ''}</small></span></label>` : ''}
     ${S.D.condos.length ? `<label class="nvopt"><input type="radio" name="onde" value="lista" ${onde==='lista'?'checked':''}><span><b>${meu ? 'Em outro condomínio parceiro' : 'Em um condomínio parceiro'}</b><small>Escolha na lista de condomínios cadastrados</small></span></label>` : ''}
     <label class="nvopt"><input type="radio" name="onde" value="novo" ${onde==='novo'?'checked':''}><span><b>Em outro endereço</b><small>Condomínio fora da lista ou casa de rua</small></span></label>
    </div>
    <label class="f" data-when="onde=lista">Condomínio<select class="in" id="f-condo" name="condo"><option value="">Escolha…</option>${S.D.condos.filter(c => c.id !== u.condominio_id).map(c => `<option value="${c.id}">${esc(c.nome)}${c.bairro ? ' · ' + esc(c.bairro) : ''}</option>`).join('')}</select></label>
    <div class="nvaddr" data-when="onde=novo">
     <label class="f">Nome do condomínio <small>(deixe em branco se for casa de rua)</small><input class="in" id="f-cnome" name="cnome" placeholder="Ex.: Residencial Solar das Palmeiras" value="${esc(!u.condominio_id && u.condominio_texto || '')}"></label>
     <div class="row2 nvcep"><label class="f">CEP<input class="in" id="f-cep" name="cep" inputmode="numeric" placeholder="00000-000" autocomplete="postal-code"></label><span class="note" id="f-cep-st">Digite o CEP e preenchemos o endereço.</span></div>
     <label class="f">Rua ou avenida<input class="in" id="f-end" name="end" placeholder="Ex.: Av. dos Autonomistas" autocomplete="address-line1"></label>
     <div class="row3"><label class="f">Número<input class="in" id="f-numero" name="numero" inputmode="numeric"></label><label class="f">Bairro<input class="in" id="f-bairro" name="bairro"></label><label class="f">Cidade<input class="in" id="f-cidade" name="cidade" value="São Paulo"></label></div>
    </div>
    <div class="f"><span class="qlabel">Tipo de imóvel</span>${ch('tipo',['Apartamento','Casa','Cobertura','Sala comercial','Outro'],'Apartamento')}</div>
    <div class="row2"><label class="f"><span data-when="tipo!=Casa">Apartamento / unidade</span><span data-when="tipo=Casa">Número da casa</span><input class="in" id="f-apto" name="apto" placeholder="Ex.: 82"></label><label class="f" data-when="tipo!=Casa">Bloco ou torre <small>(se tiver)</small><input class="in" id="f-bloco" name="bloco" placeholder="Ex.: B"></label></div>
    <div class="f"><span class="qlabel">Dormitórios (aproximado)</span>${ch('dorms',['1','2','3','4+','Não sei'],'2')}</div></section>`;
  const secProp = `<section class="nvsec" data-step="2"><h2>${varB?'<span class="nvn">3</span>':''}Proprietário</h2>
    <label class="f">Nome<input class="in" id="f-owner" name="owner" autocomplete="off" placeholder="Ex.: Maria da Silva"></label>
    <label class="f">Telefone com DDD<input class="in" id="f-phone" name="phone" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <label class="check" style="background:none;padding:0"><input type="checkbox" id="f-samewa" name="samewa" checked> O WhatsApp é o mesmo número</label>
    <label class="f" data-when="samewa=">WhatsApp<input class="in" id="f-wa" name="wa" inputmode="tel" placeholder="(11) 90000-0000"></label>
    <div class="f"><span class="qlabel">Melhor horário para o corretor ligar</span>${ch('horario',['Manhã','Tarde','Noite','Qualquer horário'],'Qualquer horário')}</div></section>`;
  const secVenda = `<section class="nvsec" data-step="3"><h2>${varB?'<span class="nvn">4</span>':''}Sobre a venda</h2>
    <div class="f"><span class="qlabel">O proprietário já disse que quer vender?</span>${ch('interesse',['Sim','Está pensando','Ainda não confirmou'],'Sim')}</div>
    <div class="f"><span class="qlabel">Quando ele comentou?</span>${ch('quando',['Esta semana','Este mês','Há mais tempo'],'Esta semana')}</div>
    <div class="f"><span class="qlabel">Como você ficou sabendo?</span>${ch('como',['Ele me contou','Pediu indicação','Vi anúncio ou placa','Outro'],'Ele me contou')}</div>
    <label class="f">Observações <small>(opcional)</small><textarea class="in" id="f-obs" name="obs" placeholder="Ex.: prefere falar depois das 18h; o imóvel está vazio"></textarea></label></section>`;
  const envio = `<div class="nvenvio"><label class="check"><input type="checkbox" id="f-consent" name="consent"><span>Confirmo que o proprietário autorizou o compartilhamento dos dados dele para que um profissional imobiliário entre em contato sobre a venda do imóvel.</span></label>
    <div id="f-err" class="err" hidden></div>
    <button class="btn big gold" type="submit">Enviar indicação</button>
    <p class="note" style="text-align:center">Você não precisa avaliar, negociar nem falar de preço. Isso fica com o profissional habilitado.</p></div>`;
  const resumo = `<aside class="card nvres"><p class="eyebrow">Resumo da indicação</p><div id="nv-resumo">${nvResumoHTML()}</div>
    <p class="note nvrec">${ic('wallet',16)}<span>Se a oportunidade for qualificada, você recebe <b>${money(S.D.valor)}</b> via Pix.</span></p></aside>`;
  if (varB) return `${ph('Nova indicação')}<p class="muted" style="margin-top:-6px">Preencha o que você souber. O corretor confirma o resto com o proprietário.</p>
    <form data-f="nova" novalidate class="nvB"><div class="nvcol card">${secAut}${secImovel}${secProp}${secVenda}${envio}</div>${resumo}</form>`;
  const prog = `<ol class="nvprog">${NV_PASSOS.map(([k,l],n) => `<li class="${n<passo?'feito':n===passo?'atual':''}"><span>${n<passo?ic('check',14):n+1}</span><em>${l}</em></li>`).join('')}</ol>`;
  return `${ph('Nova indicação')}${prog}
    <form data-f="nova" novalidate class="nvA" data-passo="${passo}"><div class="card nvcard">${secAut}${secImovel}${secProp}${secVenda}
     <section class="nvsec" data-step="4"><h2>Revise antes de enviar</h2><div id="nv-resumo">${nvResumoHTML()}</div><p class="note nvrec">${ic('wallet',16)}<span>Se a oportunidade for qualificada, você recebe <b>${money(S.D.valor)}</b> via Pix.</span></p>${envio}</section>
     <div id="f-err-p" class="err" hidden></div>
     <div class="nvnav">${passo ? `<button type="button" class="btn ghost" data-a="nvPasso" data-v="-1">${ic('back',18)}Voltar</button>` : '<span></span>'}${passo < 4 ? `<button type="button" class="btn" data-a="nvPasso" data-v="1">Continuar</button>` : ''}</div>
    </div></form>`;
}
function nvDados(){
  const f = $('form[data-f=nova]'); if (!f) return S.nd || {};
  const o = {}; new FormData(f).forEach((v, k) => o[k] = String(v)); return o;
}
function nvUnidade(d){
  const a = String(d.apto||'').trim(), b = String(d.bloco||'').trim(); if (!a) return '';
  const pre = d.tipo === 'Casa' ? 'Casa' : d.tipo === 'Sala comercial' ? 'Sala' : d.tipo === 'Cobertura' ? 'Cobertura' : 'Apto';
  const ua = /^\d+[a-z]?$/i.test(a) ? `${pre} ${a}` : a, ub = !b || d.tipo === 'Casa' ? '' : (/^[a-z0-9]{1,3}$/i.test(b) ? `Bloco ${b.toUpperCase()}` : b);
  return [ua, ub].filter(Boolean).join(' · ');
}
function nvLocal(d){
  const onde = d.onde || nvOnde();
  if (onde === 'meu') return condo(S.perfil.condominio_id)?.nome || '';
  if (onde === 'lista') return condo(d.condo)?.nome || '';
  const end = [d.end && (d.end + (d.numero ? ', ' + d.numero : '')), d.bairro, d.cidade].filter(Boolean).join(' – ');
  return [d.cnome, end].filter(Boolean).join(' · ');
}
function nvResumoHTML(){
  const d = S.nd || {}, l = (k, v) => `<dt>${k}</dt><dd>${v ? esc(v) : '<span class="nvfalta">a preencher</span>'}</dd>`;
  return `<dl class="kv">${l('Imóvel', nvLocal(d))}${l('Unidade', nvUnidade(d))}${l('Tipo', d.tipo ? `${d.tipo}${d.dorms && d.dorms !== 'Não sei' ? ' · ' + d.dorms + ' dorm.' : ''}` : '')}${l('Proprietário', d.owner)}${l('Telefone', d.phone ? fph(d.phone) : '')}${l('Horário', d.horario)}${l('Interesse', d.interesse ? `${d.interesse} · ${d.quando || ''}` : '')}</dl>`;
}
function nvSync(){
  const f = $('form[data-f=nova]'); if (!f) return;
  const d = S.nd = nvDados();
  f.querySelectorAll('[data-when]').forEach(el => { const [k, v] = el.dataset.when.split(/!?=/), neg = el.dataset.when.includes('!='), val = k === 'samewa' ? (d.samewa ? 'on' : '') : (d[k] || ''); el.hidden = neg ? val === v : val !== v; });
  const r = $('#nv-resumo'); if (r) r.innerHTML = nvResumoHTML();
  if (f.classList.contains('nvA')) f.querySelectorAll('[data-step]').forEach(s => s.hidden = +s.dataset.step !== (S.nvStep || 0));
}
function nvRestaura(){
  const f = $('form[data-f=nova]'); if (!f || !S.nd) { nvSync(); return; }
  Object.entries(S.nd).forEach(([k, v]) => f.querySelectorAll(`[name="${k}"]`).forEach(el => { if (el.type === 'radio') el.checked = el.value === v; else if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }));
  if (!('samewa' in S.nd)) { const s = f.querySelector('[name=samewa]'); if (s) s.checked = false; }
  nvSync();
}
function nvErro(passo, d){
  if (passo === 0) return d.autorizou === 'Sim' ? '' : d.autorizou === 'Não' ? 'Peça a autorização do proprietário antes de continuar.' : 'Responda se o proprietário autorizou passar o contato.';
  if (passo === 1) {
    const onde = d.onde || nvOnde();
    if (onde === 'lista' && !d.condo) return 'Escolha o condomínio na lista.';
    if (onde === 'novo' && !String(d.end||'').trim()) return 'Informe a rua ou avenida do imóvel.';
    if (onde === 'novo' && !String(d.numero||'').trim()) return 'Informe o número do endereço.';
    if (!String(d.apto||'').trim()) return d.tipo === 'Casa' ? 'Informe o número da casa.' : 'Informe o apartamento ou unidade.';
  }
  if (passo === 2) {
    if (!String(d.owner||'').trim()) return 'Informe o nome do proprietário.';
    if (dig(d.phone).length < 10) return 'Informe um telefone com DDD.';
    if (!d.samewa && d.wa && dig(d.wa).length < 10) return 'Confira o WhatsApp, com DDD.';
  }
  return '';
}
async function nvCep(v){
  const c = dig(v), st = $('#f-cep-st'); if (c.length !== 8) return;
  if (st) st.textContent = 'Buscando endereço…';
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`), j = await r.json();
    if (j.erro) throw 0;
    const set = (id, val) => { const el = $(id); if (el && val) el.value = val; };
    set('#f-end', j.logradouro); set('#f-bairro', j.bairro); set('#f-cidade', j.localidade);
    if (st) st.textContent = `${j.localidade}${j.uf ? ' – ' + j.uf : ''}. Confira e informe o número.`;
    nvSync(); $('#f-numero')?.focus();
  } catch(e) { if (st) st.textContent = 'CEP não encontrado. Preencha o endereço abaixo.'; }
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
   ${cardPix()}
   <div class="card"><h3>Como funciona</h3><p class="note">Você recebe ${money(S.D.valor)} por indicação qualificada, sujeita às regras do programa. A recompensa fica em processamento até a validação da equipe e depois aparece como disponível para resgate. O valor não depende do preço do imóvel nem do resultado da negociação.</p></div></div>
   <div class="col"><div class="card"><h2>Histórico de recompensas</h2><div class="hist">${[...w.list].map(r => { const i = S.D.inds.find(x => x.id === r.indicacao_id);
     return `<div><div><div class="mono" style="font-size:13px">${r.indicacao_id}</div><div class="note">${esc(i?.proprietario_nome||'')} · ${fd(r.criado_em)}</div></div><div style="text-align:right"><div class="a">${money(r.valor)}</div><span class="tag ${REW[r.estado][0]}">${REW[r.estado][1]}</span>${r.estado==='pago'?`<div><button class="link" style="font-size:13px" data-a="verComp" data-v="${r.indicacao_id}">Ver comprovante</button></div>`:''}</div></div>`; }).join('') || '<p class="muted">Sem recompensas ainda.</p>'}</div></div></div></div>`;
}
const PIX_TIPOS = ['CPF','Celular','E-mail','Chave aleatória'];
function cardPix(){
  const u = S.perfil;
  if (u.pix_chave && !S.editPix) return `<div class="card"><div class="sec-h"><h3>Sua chave Pix</h3><button class="link" data-a="editPix">Alterar</button></div>
     <dl class="kv"><dt>${esc(u.pix_tipo)}</dt><dd class="mono">${esc(u.pix_chave)}</dd></dl><p class="note">É para esta chave que a equipe envia suas recompensas.</p></div>`;
  return `<form data-f="pix" class="card" novalidate><h3>${u.pix_chave ? 'Alterar chave Pix' : 'Cadastre sua chave Pix'}</h3>
     <p class="note">Precisamos dela para pagar suas recompensas.</p>
     <div class="chips" role="radiogroup">${PIX_TIPOS.map(t => `<label><input type="radio" name="tipo" value="${t}" ${(u.pix_tipo||'Celular')===t?'checked':''}><span>${t}</span></label>`).join('')}</div>
     <label class="f">Chave Pix<input class="in mono" id="x-chave" name="chave" value="${esc(u.pix_chave||'')}" autocomplete="off"></label>
     <div id="x-err" class="err" hidden></div>
     <div class="btns"><button class="btn" type="submit">Salvar chave Pix</button>${u.pix_chave?'<button type="button" class="btn ghost" data-a="editPix">Cancelar</button>':''}</div></form>`;
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
  const tabs = [['geral','Visão geral'],['inds','Indicações',novas],['ocorr','Ocorrências',open],['rec','Financeiro',S.D.rewards.filter(r=>r.estado==='resgate').length],['condos','Condomínios'],['users','Usuários'],['prog','Programa'],['aud','Auditoria'],['rel','Relatórios']];
  const body = ({ geral:aGeral, inds:aInds, ocorr:aOcorr, rec:aRec, condos:aCondos, users:aUsers, prog:aProg, aud:aAud, rel:aRel }[S.admTab] || aGeral)();
  return `<div class="sec-h"><h1 style="font-size:28px">Painel do gestor</h1><button class="btn sm ghost" data-a="reload">${ic('refresh',16)}Atualizar</button></div>
   <div class="atabs">${tabs.map(([k,l,c]) => `<button class="${S.admTab===k?'on':''}" data-a="atab" data-v="${k}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}</div>${body}`;
}
function aGeral(){
  const L = S.D.inds, n = L.length, now = Date.now(), since = d => L.filter(i => new Date(i.criado_em) > now - d*DAY).length;
  const reached = (i,k) => i.status >= k && i.status !== 8;
  const fun = [['Indicações',n,0],['Contatos',L.filter(i=>reached(i,2)).length,2],['Qualificadas',L.filter(i=>reached(i,3)).length,3],['Anúncios',L.filter(i=>reached(i,4)).length,4],['Negociações',L.filter(i=>reached(i,5)).length,5],['Vendas',L.filter(i=>reached(i,6)).length,6]];
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
/* ---------- Indicações do gestor: lista, quadro e painel lateral ---------- */
const GRUPOS = [
  ['novas','Para validar', i => i.status === 0],
  ['andamento','Em atendimento', i => i.status === 1 || i.status === 2],
  ['qualif','Qualificar', i => i.status === 3],
  ['anuncio','Anúncio ativo', i => i.status === 4],
  ['negoc','Em negociação', i => i.status === 5],
  ['concl','Venda realizada', i => i.status === 6 || i.status === 7],
  ['encerr','Encerradas', i => i.status === 8],
  ['todas','Todas', () => true]
];
const PROX = { 0:'Validar', 1:'Contato feito', 2:'Qualificar', 3:'Publicar anúncio', 4:'Iniciar negociação', 5:'Venda realizada', 6:'Liberar recompensa' };
const waLink = t => `https://wa.me/55${dig(t)}`;
function filtraInds(){
  const q = (S.admQ || '').trim().toLowerCase(), qd = dig(q);
  return S.D.inds.filter(i => !q || [i.id, i.proprietario_nome, i.unidade, condoNome(i.condominio_id), i.endereco, perfil(i.indicador_id)?.nome].some(v => String(v||'').toLowerCase().includes(q)) || (qd.length >= 4 && dig(i.telefone).includes(qd)));
}
function cardAdm(i, compact){
  const nx = PROX[i.status], ind = perfil(i.indicador_id)?.nome;
  return `<article class="lcard ${S.flash===i.id?'flash':''} ${i.status===0?'needs':''}" id="row-${i.id}" data-a="openInd" data-v="${i.id}" tabindex="0">
   <div class="lc-main">
    <div class="lc-top"><span class="mono lc-id">${i.id}</span><span class="lc-ago">${ago(i.criado_em)}</span></div>
    ${compact ? '' : `<div>${pill(i.status)}</div>`}
    <h3>${esc(i.proprietario_nome)}</h3>
    <p class="lc-sub">${esc(i.unidade)} · ${esc(i.endereco || condoNome(i.condominio_id))}</p>
    ${compact ? '' : `<p class="lc-sub">Indicado por <b>${esc(ind || 'QR Code')}</b></p>`}
   </div>
   <div class="lc-act">
    <div class="btns" style="flex-wrap:nowrap;gap:6px">${i.status >= 1 && i.status <= 7 ? `<button class="iconbtn" data-a="back1" data-v="${i.id}" aria-label="Voltar para ${ST[i.status-1]}" title="Voltar para ${ST[i.status-1]}">${ic('undo',18)}</button>` : ''}<a class="iconbtn wa" data-a="noop" href="${waLink(i.telefone)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(i.proprietario_nome)}" title="WhatsApp">${ic('chat',18)}</a></div>
    ${nx ? `<button class="btn sm ${i.status===6?'gold':''}" data-a="adv" data-v="${i.id}" data-s="${i.status+1}">${nx}</button>` : i.status === 8 ? `<button class="btn sm ghost" data-a="reopen" data-v="${i.id}">${ic('undo',16)}Reabrir</button>` : ''}
   </div>
  </article>`;
}
function aInds(){
  const base = filtraInds(), g = GRUPOS.find(x => x[0] === S.admGrupo) || GRUPOS[0];
  const chips = GRUPOS.map(([k,l,f]) => { const n = base.filter(f).length; return `<button class="chipbtn ${g[0]===k?'on':''} ${k==='novas'&&n?'alerta':''}" data-a="admGrupo" data-v="${k}">${l}<span class="cnum">${n}</span></button>`; }).join('');
  const top = `<div class="ind-bar">
    <label class="search">${ic('search',18)}<input class="in" id="a-busca" placeholder="Buscar por nome, telefone, ID, condomínio ou indicador" value="${esc(S.admQ||'')}" autocomplete="off"></label>
   </div>`;
  const L = base.filter(g[2]);
  return `${top}<div class="filters">${chips}</div>
   <div class="lgrid">${L.map(i => cardAdm(i)).join('') || `<div class="card"><p class="note">${S.admQ ? 'Nada encontrado nessa busca.' : 'Nenhuma indicação neste grupo.'}</p></div>`}</div>`;
}
function vDrawer(){
  const i = S.drawer && S.D.inds.find(x => x.id === S.drawer); if (!i) return '';
  const nx = PROX[i.status], ind = perfil(i.indicador_id), r = S.D.rewards.find(x => x.indicacao_id === i.id && x.estado !== 'cancelada');
  return `<div class="dwrap" data-a="drawerBg"><aside class="drawer" role="dialog" aria-label="Indicação ${i.id}">
   <header class="dh"><div><span class="mono lc-id">${i.id}</span><div style="margin-top:6px">${pill(i.status)}</div></div><button class="back" data-a="drawerClose" aria-label="Fechar">${ic('x',20)}</button></header>
   <div class="db">
    <section><p class="eyebrow">Proprietário</p><h2>${esc(i.proprietario_nome)}</h2><p class="mono" style="margin-top:4px">${fph(i.telefone)}</p>
     <div class="btns" style="margin-top:12px"><a class="btn wa" href="${waLink(i.telefone)}" target="_blank" rel="noopener">${ic('chat',18)}WhatsApp</a><button class="btn ghost" data-a="copy" data-v="${fph(i.telefone)}">${ic('copy',18)}Copiar telefone</button></div></section>
    ${i.status === 8 ? `<section class="nextbox"><p class="eyebrow">Indicação encerrada</p>${i.motivo_encerramento ? `<p>${esc(i.motivo_encerramento)}</p>` : ''}<button class="btn big ghost" data-a="reopen" data-v="${i.id}">${ic('undo',18)}Reabrir indicação</button><p class="note" style="text-align:center">Volta para a etapa em que estava antes de ser encerrada.</p></section>` : ''}
    ${nx ? `<section class="nextbox"><p class="eyebrow">Próximo passo</p><button class="btn big ${i.status===6?'gold':''}" data-a="adv" data-v="${i.id}" data-s="${i.status+1}">${nx} →</button><div class="btns" style="justify-content:space-between">${i.status >= 1 ? `<button class="link" style="color:var(--ink)" data-a="back1" data-v="${i.id}">← Voltar para ${ST[i.status-1]}</button>` : '<span></span>'}<button class="link" data-a="close" data-v="${i.id}">Encerrar indicação</button></div></section>` : i.status === 7 ? `<section class="nextbox"><p class="eyebrow">Etapa final</p><button class="link" style="color:var(--ink)" data-a="back1" data-v="${i.id}">← Voltar para ${ST[6]}</button></section>` : ''}
    <section><p class="eyebrow">Imóvel</p><dl class="kv"><dt>Unidade</dt><dd>${esc(i.unidade)}</dd><dt>Local</dt><dd>${esc(i.endereco || condoNome(i.condominio_id))}</dd><dt>Tipo</dt><dd>${esc(i.tipo||'—')} · ${esc(i.dormitorios||'—')} dorm.</dd><dt>Horário</dt><dd>${esc(i.horario||'—')}</dd>${i.observacoes?`<dt>Obs.</dt><dd>${esc(i.observacoes)}</dd>`:''}${i.motivo_encerramento?`<dt>Motivo</dt><dd>${esc(i.motivo_encerramento)}</dd>`:''}</dl></section>
    <section><p class="eyebrow">Indicador</p><dl class="kv"><dt>Nome</dt><dd>${esc(ind?.nome || 'QR Code')}</dd>${ind?`<dt>Função</dt><dd>${esc(ind.funcao)}</dd><dt>Celular</dt><dd class="mono">${fph(ind.telefone)}</dd>`:''}<dt>Origem</dt><dd>${esc(i.origem)}</dd><dt>Recebida</dt><dd>${fdt(i.criado_em)}</dd>${r?`<dt>Recompensa</dt><dd>${money(r.valor)} · ${REW[r.estado][1]}</dd>`:''}</dl></section>
    <section><p class="eyebrow">Linha do tempo</p>${timeline(i)}</section>
   </div></aside></div>`;
}
function aOcorr(){
  return `<p class="note">Tentativas bloqueadas por duplicidade (telefone ou imóvel já cadastrado). Nenhuma recompensa é gerada nesses casos.</p>
   <div class="cards">${S.D.ocorr.map(o => { const orig = S.D.inds.find(i => i.id === o.indicacao_original); return `<div class="${o.estado==='aberta'?'alert':'card'}">
    <div class="sec-h"><b>${esc(o.motivo)}</b><span class="note">${fdt(o.criado_em)}</span></div>
    <dl class="kv"><dt>Tentativa de</dt><dd>${esc(perfil(o.tentativa_por)?.nome || 'QR Code')}</dd><dt>Proprietário</dt><dd>${esc(o.proprietario_nome)} · <span class="mono">${fph(o.telefone)}</span></dd><dt>Imóvel</dt><dd>${esc(o.unidade)} · ${esc(condoNome(o.condominio_id))}</dd><dt>Registro original</dt><dd class="mono">${esc(o.indicacao_original||'—')}${orig?` (${esc(perfil(orig.indicador_id)?.nome || orig.origem)})`:''}</dd></dl>
    ${o.estado==='aberta' ? `<div class="btns"><button class="btn sm" data-a="ocorr" data-v="${o.id}" data-e="mantida">Manter registro original</button><button class="btn sm ghost" data-a="ocorr" data-v="${o.id}" data-e="suspeita">Marcar como suspeita</button></div>` : `<span class="note">Resolvida: ${o.estado==='mantida'?'registro original mantido':'marcada como suspeita'}</span>`}</div>`; }).join('') || '<p class="muted">Nenhuma ocorrência.</p>'}</div>`;
}
/* ---------- Financeiro do gestor ---------- */
const PERIODOS = [['mes','Este mês'],['mespass','Mês passado'],['90d','Últimos 90 dias'],['ano','Este ano'],['tudo','Tudo']];
function janela(k){
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  if (k === 'mes') return [new Date(y, m, 1), null];
  if (k === 'mespass') return [new Date(y, m - 1, 1), new Date(y, m, 1)];
  if (k === '90d') return [new Date(Date.now() - 90 * DAY), null];
  if (k === 'ano') return [new Date(y, 0, 1), null];
  return [null, null];
}
const dataPago = r => r.pago_em ? new Date(r.pago_em + 'T12:00') : new Date(r.atualizado_em || r.criado_em);
const noPeriodo = (d, k) => { const [a, b] = janela(k); return (!a || d >= a) && (!b || d < b); };
const brl0 = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits: 0 });
function finCalc(){
  const R = S.D.rewards, k = S.finPer || 'mes', ativos = R.filter(r => r.estado !== 'cancelada'), sum = L => L.reduce((a,b) => a + Number(b.valor), 0);
  const pagosPer = R.filter(r => r.estado === 'pago' && noPeriodo(dataPago(r), k));
  const geradosPer = ativos.filter(r => noPeriodo(new Date(r.criado_em), k));
  const aPagar = R.filter(r => r.estado === 'disponivel' || r.estado === 'resgate');
  const proc = R.filter(r => r.estado === 'processamento');
  const vendas = S.D.inds.filter(i => i.status === 6 || i.status === 7).length;
  const prazos = R.filter(r => r.estado === 'pago' && r.pago_em).map(r => Math.max(0, (dataPago(r) - new Date(r.criado_em)) / DAY));
  return { k, sum, pagosPer, geradosPer, aPagar, proc, resg: aPagar.filter(r => r.estado === 'resgate'),
    custoVenda: vendas ? sum(ativos) / vendas : null, vendas,
    prazo: prazos.length ? prazos.reduce((a,b) => a + b, 0) / prazos.length : null, totalPago: sum(R.filter(r => r.estado === 'pago')) };
}
function finChart(){
  const n = new Date(), meses = [];
  for (let k = 5; k >= 0; k--) { const d = new Date(n.getFullYear(), n.getMonth() - k, 1); meses.push({ ini: d, fim: new Date(d.getFullYear(), d.getMonth() + 1, 1), rot: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), g: 0, p: 0 }); }
  S.D.rewards.forEach(r => {
    if (r.estado !== 'cancelada') { const d = new Date(r.criado_em), m = meses.find(x => d >= x.ini && d < x.fim); if (m) m.g += Number(r.valor); }
    if (r.estado === 'pago') { const d = dataPago(r), m = meses.find(x => d >= x.ini && d < x.fim); if (m) m.p += Number(r.valor); }
  });
  const max = Math.max(10, ...meses.map(m => Math.max(m.g, m.p)));
  const passo = [10,20,50,100,200,500,1000,2000,5000,10000].find(x => max / x <= 4) || Math.ceil(max / 4);
  const topo = Math.ceil(max / passo) * passo, W = 640, H = 240, L = 56, B = 28, T = 12, plotH = H - B - T, gw = (W - L - 8) / 6, bw = Math.min(28, gw / 3.2);
  const y = v => T + plotH - (v / topo) * plotH;
  let g = '';
  for (let v = 0; v <= topo; v += passo) g += `<line x1="${L}" x2="${W-8}" y1="${y(v)}" y2="${y(v)}" class="fg-grid"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" class="fg-ax">${brl0(v)}</text>`;
  const bar = (x, v, cls, tip) => { const h = Math.max(0, y(0) - y(v)); return v ? `<path d="M${x},${y(0)} v${-(h-4 > 0 ? h-4 : 0)} q0,-4 4,-4 h${bw-8} q4,0 4,4 v${h-4 > 0 ? h-4 : 0} z" class="${cls}"/>` : ''; };
  meses.forEach((m, i) => {
    const cx = L + gw * i + gw / 2;
    g += bar(cx - bw - 1, m.g, 'fg-g') + bar(cx + 1, m.p, 'fg-p');
    g += `<rect x="${L + gw*i}" y="${T}" width="${gw}" height="${plotH}" fill="transparent" class="fg-hit" data-tip="<b>${m.rot}</b><br>Gerado: ${money(m.g)}<br>Pago: ${money(m.p)}"/>`;
    g += `<text x="${cx}" y="${H-8}" text-anchor="middle" class="fg-ax">${m.rot}</text>`;
  });
  return `<figure class="fchart"><div class="sec-h"><h2>Recompensas por mês</h2><div class="flegend"><span><i class="lg-g"></i>Geradas</span><span><i class="lg-p"></i>Pagas</span></div></div>
    <div class="fsvg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recompensas geradas e pagas nos últimos 6 meses">${g}</svg></div>
    <figcaption class="note">Geradas: valor das indicações que chegaram a "Oportunidade qualificada" no mês. Pagas: valor pago no mês.</figcaption></figure>`;
}
function aRec(){
  const F = finCalc(), per = PERIODOS.find(x => x[0] === F.k)[1].toLowerCase();
  const tile = (rot, val, sub, cls='') => `<div class="ftile ${cls}"><span class="l">${rot}</span><span class="v">${val}</span><span class="note">${sub}</span></div>`;
  const fila = [...F.aPagar].sort((a,b) => (b.estado === 'resgate') - (a.estado === 'resgate') || new Date(a.criado_em) - new Date(b.criado_em));
  const porInd = {}; S.D.rewards.forEach(r => { if (r.estado === 'cancelada') return; const o = porInd[r.indicador_id] ||= { rec: 0, apagar: 0, proc: 0, n: 0 }; o.n++; if (r.estado === 'pago') o.rec += Number(r.valor); else if (r.estado === 'processamento') o.proc += Number(r.valor); else o.apagar += Number(r.valor); });
  const ranking = Object.entries(porInd).sort((a,b) => (b[1].rec + b[1].apagar) - (a[1].rec + a[1].apagar)).slice(0, 8);
  const EST = [['todos','Todos'],['processamento','Em processamento'],['disponivel','Disponível'],['resgate','Resgate pedido'],['pago','Pago'],['cancelada','Cancelada']];
  const q = (S.finQ || '').toLowerCase(), est = S.finEst || 'todos';
  const ext = S.D.rewards.filter(r => (est === 'todos' || r.estado === est) && (!q || [r.indicacao_id, perfil(r.indicador_id)?.nome].some(v => String(v||'').toLowerCase().includes(q))));
  return `<div class="filters">${PERIODOS.map(([k,l]) => `<button class="chipbtn ${F.k===k?'on':''}" data-a="finPer" data-v="${k}">${l}</button>`).join('')}</div>
   <div class="ftiles">
    ${tile(`Pago (${per})`, money(F.sum(F.pagosPer)), `${F.pagosPer.length} pagamento${F.pagosPer.length===1?'':'s'}`)}
    ${tile('A pagar agora', money(F.sum(F.aPagar)), F.resg.length ? `<b class="neg">${F.resg.length} pedido${F.resg.length===1?'':'s'} de resgate</b> · ${F.aPagar.length} no total` : `${F.aPagar.length} recompensa${F.aPagar.length===1?'':'s'} liberada${F.aPagar.length===1?'':'s'}`, F.resg.length ? 'warn' : '')}
    ${tile('Aguardando liberação', money(F.sum(F.proc)), `${F.proc.length} em processamento`)}
    ${tile(`Gerado (${per})`, money(F.sum(F.geradosPer)), `${F.geradosPer.length} indicaç${F.geradosPer.length===1?'ão qualificada':'ões qualificadas'}`)}
    ${tile('Custo por venda', F.custoVenda == null ? '—' : money(F.custoVenda), F.vendas ? `recompensas ÷ ${F.vendas} venda${F.vendas===1?'':'s'} concluída${F.vendas===1?'':'s'}` : 'ainda sem vendas concluídas')}
    ${tile('Prazo médio de pagamento', F.prazo == null ? '—' : `${Math.round(F.prazo)} dia${Math.round(F.prazo)===1?'':'s'}`, 'da qualificação até o Pix')}
   </div>
   <div class="grid2 fin2">
    ${finChart()}
    <div class="card"><div class="sec-h"><h2>Fila de pagamento</h2><span class="note">${money(F.sum(F.aPagar))}</span></div>
     <div class="hist">${fila.slice(0, 6).map(r => { const u = perfil(r.indicador_id); return `<div><div style="min-width:0"><b>${esc(u?.nome || '—')}</b>${r.estado==='resgate'?' <span class="tag resg">Resgate pedido</span>':''}<div class="note"><span class="mono">${r.indicacao_id}</span> · ${u?.pix_chave ? 'Pix cadastrado' : '<span class="neg">sem chave Pix</span>'} · ${ago(r.atualizado_em || r.criado_em)}</div></div><div class="btns" style="flex-wrap:nowrap;align-items:center"><b class="num">${money(r.valor)}</b><button class="btn sm gold" data-a="pagarPix" data-v="${r.indicacao_id}">Pagar</button></div></div>`; }).join('') || '<p class="muted">Nada a pagar agora.</p>'}</div>${fila.length > 6 ? `<button class="link" data-a="finEst" data-v="disponivel">Ver todas as ${fila.length} no extrato ↓</button>` : ''}</div>
   </div>
   <div class="card"><h2>Por indicador</h2><div class="tbl-wrap" style="border:0"><table><thead><tr><th>Indicador</th><th class="r">Recompensas</th><th class="r">Recebido</th><th class="r">A pagar</th><th class="r">Em processamento</th><th>Chave Pix</th></tr></thead><tbody>
    ${ranking.map(([id,o]) => { const u = perfil(id); return `<tr><td><b>${esc(u?.nome || '—')}</b><br><span class="note">${esc(u?.funcao || '')}</span></td><td class="r num">${o.n}</td><td class="r num"><b>${money(o.rec)}</b></td><td class="r num">${money(o.apagar)}</td><td class="r num">${money(o.proc)}</td><td>${u?.pix_chave ? `<span class="mono">${esc(u.pix_tipo)}</span>` : '<span class="neg">Não cadastrada</span>'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="note">Sem recompensas ainda.</td></tr>'}
   </tbody></table></div></div>
   <div class="card"><div class="sec-h"><h2>Extrato</h2><button class="btn sm ghost" data-a="exportFin">${ic('doc',16)}Exportar planilha (CSV)</button></div>
    <div class="ind-bar"><label class="search">${ic('search',18)}<input class="in" id="f-busca" placeholder="Buscar por indicador ou ID" value="${esc(S.finQ||'')}" autocomplete="off"></label></div>
    <div class="filters">${EST.map(([k,l]) => `<button class="chipbtn ${est===k?'on':''}" data-a="finEst" data-v="${k}">${l}<span class="cnum">${k==='todos'?S.D.rewards.length:S.D.rewards.filter(r=>r.estado===k).length}</span></button>`).join('')}</div>
    <div class="tbl-wrap"><table><thead><tr><th>Indicação</th><th>Indicador</th><th>Gerada em</th><th class="r">Valor</th><th>Estado</th><th>Pago em</th><th>Ação</th></tr></thead><tbody>
    ${ext.slice(0, S.finLim || 15).map(r => `<tr><td class="mono">${r.indicacao_id}</td><td>${esc(perfil(r.indicador_id)?.nome || '—')}</td><td class="num">${fd(r.criado_em)}</td><td class="r num"><b>${money(r.valor)}</b></td><td>${REW[r.estado][1]}</td><td class="num">${r.estado==='pago' ? dataPago(r).toLocaleDateString('pt-BR') : '—'}</td>
     <td><div class="btns" style="flex-wrap:nowrap">${r.estado==='processamento' ? `<button class="btn sm" data-a="rew" data-v="${r.indicacao_id}" data-e="disponivel">Liberar</button>` : ['disponivel','resgate'].includes(r.estado) ? `<button class="btn sm gold" data-a="pagarPix" data-v="${r.indicacao_id}">Pagar via Pix</button>` : r.estado==='pago' ? `<button class="btn sm ghost" data-a="verComp" data-v="${r.indicacao_id}">Ver comprovante</button>` : ''}<button class="btn sm ghost" data-a="openInd" data-v="${r.indicacao_id}">Ver indicação</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="note">Nenhum lançamento.</td></tr>'}
    </tbody></table></div>
    ${ext.length > (S.finLim || 15) ? `<button class="btn ghost" data-a="finMais">Mostrar mais (${ext.length - (S.finLim || 15)} restantes)</button>` : ''}</div>`;
}
/* ---------- Condomínios: mapa ao vivo (gestor) ---------- */
const LEAF = { css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css', js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js' };
function loadCSS(href){ if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } }
const M = { map: null, el: null, layer: null, pins: {}, aberto: null, enquadrou: false, geoBusy: false, tentou: new Set(), flash: null, avisoBanco: false };
const temPos = c => c && c.latitude != null && c.longitude != null;
const gmaps = c => `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`;
function cStats(c){
  const L = S.D.inds.filter(i => i.condominio_id === c.id);
  return { n: L.length, ab: L.filter(i => i.status < 6).length, q: L.filter(i => i.status >= 3 && i.status !== 8).length,
    ind: S.D.perfis.filter(p => p.condominio_id === c.id && p.papel === 'indicador').length,
    nova: L.some(i => Date.now() - new Date(i.criado_em) < DAY), ult: L.map(i => i.criado_em).sort().pop() };
}
function aCondos(){
  const C = S.D.condos, sem = C.filter(c => !temPos(c)), aj = S.mapAjuste && condo(S.mapAjuste);
  const item = c => { const s = cStats(c), st = temPos(c) ? (c.geo_precisao === 'aproximada' ? '<span class="neg">posição aproximada</span>' : `${esc(c.bairro || '')}${c.cidade ? ' · ' + esc(c.cidade) : ''}`) : M.tentou.has(c.id) && !M.geoBusy ? '<span class="neg">endereço não encontrado</span>' : 'localizando…';
    return `<button class="mitem ${S.mapFoco === c.id ? 'on' : ''}" data-a="mapFoco" data-v="${c.id}"><span class="mdot ${s.ab ? 'on' : ''} ${s.nova ? 'live' : ''}"></span><span class="mtx"><b>${esc(c.nome)}</b><span class="note">${st}</span></span><span class="mcnt" title="Indicações">${s.n}</span></button>`; };
  return `<div class="card mapcard">
    <div class="sec-h"><div><h2>Mapa dos condomínios</h2><p class="note">${C.length} condomínio${C.length === 1 ? '' : 's'}${sem.length ? ` · ${sem.length} sem localização` : ' · todos no mapa'} · <span class="aovivo"><i></i>Ao vivo</span></p></div>
     <div class="maplegend"><span><i class="lg-on"></i>Indicação em aberto</span><span><i class="lg-off"></i>Sem indicação em aberto</span><span><i class="lg-live"></i>Nova nas últimas 24 h</span></div></div>
    <div class="mapwrap"><div class="mapbox">${aj ? `<div class="mapbanner">${temPos(aj) ? 'Arraste o pino' : 'Toque no mapa'} até a entrada de <b>${esc(aj.nome)}</b>. A posição é salva na hora.<button class="btn sm ghost" data-a="mapAjusteFim">Cancelar</button></div>` : ''}<div id="cmap-slot" class="mapslot"><p class="note">Carregando mapa…</p></div></div>
     <div class="maplist">${C.map(item).join('') || '<p class="note">Cadastre o primeiro condomínio abaixo.</p>'}</div></div>
   </div>
   <div class="grid2"><div class="tbl-wrap"><table><thead><tr><th>Condomínio</th><th>Bairro / cidade</th><th class="r">Indicadores</th><th class="r">Indicações</th><th></th></tr></thead><tbody>
   ${C.map(c => { const s = cStats(c); return `<tr><td><b>${esc(c.nome)}</b><br><span class="note">${esc(c.endereco||'')}</span></td><td>${esc(c.bairro||'')} · ${esc(c.cidade||'')}</td><td class="r num">${s.ind}</td><td class="r num">${s.n}</td><td><div class="btns" style="flex-wrap:nowrap"><button class="btn sm ghost" data-a="mapFoco" data-v="${c.id}" data-s="1">${ic('pin',16)}Mapa</button><button class="btn sm ghost" data-a="cqr" data-v="${c.id}">${ic('qr',16)}QR</button></div></td></tr>`; }).join('') || '<tr><td colspan="5" class="note">Cadastre o primeiro condomínio ao lado.</td></tr>'}
   </tbody></table></div>
   <form data-f="condo" class="card" novalidate><h2>Cadastrar condomínio</h2>
    <label class="f">Nome<input class="in" id="k-nome" name="nome" placeholder="Ex.: Residencial Solar das Palmeiras"></label>
    <label class="f">Endereço com número<input class="in" id="k-end" name="end" placeholder="Ex.: Av. dos Autonomistas, 3100"></label>
    <div class="row2"><label class="f">Bairro<input class="in" id="k-bairro" name="bairro"></label><label class="f">Cidade<input class="in" id="k-cidade" name="cidade" value="São Paulo"></label></div>
    <label class="f">Região<input class="in" id="k-reg" name="reg" placeholder="Ex.: Zona Sul"></label>
    <p class="note">O condomínio aparece no mapa sozinho, pelo endereço. Confira o pino e, se precisar, ajuste no ponto exato da portaria.</p>
    <button class="btn" type="submit">Cadastrar e gerar QR Code</button></form></div>`;
}
function popCondo(c){
  const s = cStats(c);
  return `<div class="cpop"><b class="cpop-t">${esc(c.nome)}</b><span class="note">${esc([c.endereco, c.bairro, c.cidade].filter(Boolean).join(' · '))}</span>
    ${c.geo_precisao === 'aproximada' ? '<span class="cpop-warn">Posição aproximada. Ajuste o pino.</span>' : ''}
    <div class="cpop-k"><span><b>${s.n}</b>indicações</span><span><b>${s.ab}</b>em aberto</span><span><b>${s.ind}</b>indicadores</span></div>
    ${s.ult ? `<span class="note">Última indicação ${ago(s.ult)}</span>` : ''}
    <div class="cpop-b"><button class="btn sm" data-a="condoInds" data-v="${c.id}">Ver indicações</button><button class="btn sm ghost" data-a="cqr" data-v="${c.id}">QR Code</button><button class="btn sm ghost" data-a="mapAjustar" data-v="${c.id}">Ajustar pino</button><a class="btn sm ghost" href="${gmaps(c)}" target="_blank" rel="noopener">Google Maps</a></div></div>`;
}
function iconCondo(c){
  const s = cStats(c), fl = M.flash && M.flash.id === c.id && Date.now() - M.flash.t < 60000;
  return L.divIcon({ className: 'cpin-w', iconSize: [40, 48], iconAnchor: [20, 46], popupAnchor: [0, -42],
    html: `<div class="cpin ${s.ab ? 'on' : ''} ${s.nova ? 'live' : ''} ${fl ? 'flash' : ''} ${S.mapAjuste === c.id ? 'drag' : ''} ${c.geo_precisao === 'aproximada' ? 'aprox' : ''}"><svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 47C20 47 37 30.5 37 18A17 17 0 0 0 3 18C3 30.5 20 47 20 47Z" class="cpin-s"/><rect x="13" y="9" width="14" height="19" rx="2" class="cpin-b"/><rect x="15.5" y="12" width="3.5" height="3.5" rx=".8" class="cpin-w1"/><rect x="21" y="12" width="3.5" height="3.5" rx=".8" class="cpin-l"/><rect x="15.5" y="17.5" width="3.5" height="3.5" rx=".8" class="cpin-w1"/><rect x="21" y="17.5" width="3.5" height="3.5" rx=".8" class="cpin-w1"/><rect x="18.3" y="23" width="3.4" height="5" rx=".8" class="cpin-w1"/></svg>${s.n ? `<b>${s.n}</b>` : ''}</div>` });
}
async function montaMapa(){
  const slot = $('#cmap-slot'); if (!slot) return;
  if (!window.L) {
    try { loadCSS(LEAF.css); await loadScript(LEAF.js); }
    catch(e) { slot.innerHTML = '<p class="note">Não foi possível carregar o mapa. Verifique a internet e clique em Atualizar.</p>'; return; }
  }
  const alvo = $('#cmap-slot'); if (!alvo) return;
  if (!M.el) { M.el = document.createElement('div'); M.el.className = 'cmap'; }
  alvo.innerHTML = ''; alvo.appendChild(M.el);
  if (!M.map) {
    M.map = L.map(M.el, { scrollWheelZoom: false, zoomControl: true }).setView([-23.55, -46.70], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(M.map);
    M.layer = L.layerGroup().addTo(M.map);
    M.map.on('click', e => { if (S.mapAjuste) salvaPos(S.mapAjuste, e.latlng, 'manual'); });
    M.el.addEventListener('mouseenter', () => M.map.scrollWheelZoom.enable());
    M.el.addEventListener('mouseleave', () => M.map.scrollWheelZoom.disable());
  }
  M.map.invalidateSize();
  M.el.classList.toggle('ajustando', !!S.mapAjuste);
  desenhaPins();
  geoPendentes();
}
function desenhaPins(){
  if (!M.map) return;
  M.layer.clearLayers(); M.pins = {};
  const C = S.D.condos.filter(temPos);
  C.forEach(c => {
    const mk = L.marker([c.latitude, c.longitude], { icon: iconCondo(c), draggable: S.mapAjuste === c.id, title: c.nome, riseOnHover: true, zIndexOffset: cStats(c).ab ? 500 : 0 })
      .bindPopup(() => popCondo(c), { maxWidth: 300, minWidth: 240, autoPanPadding: [24, 24] }).addTo(M.layer);
    mk.on('popupopen', () => M.aberto = c.id); mk.on('popupclose', () => { if (M.aberto === c.id) M.aberto = null; });
    mk.on('dragend', () => salvaPos(c.id, mk.getLatLng(), 'manual'));
    M.pins[c.id] = mk;
  });
  if (!M.enquadrou && C.length) {
    M.enquadrou = true;
    if (C.length === 1) M.map.setView([C[0].latitude, C[0].longitude], 16);
    else M.map.fitBounds(L.latLngBounds(C.map(c => [c.latitude, c.longitude])), { padding: [48, 48], maxZoom: 16 });
  }
  if (M.aberto && M.pins[M.aberto] && !S.mapAjuste) M.pins[M.aberto].openPopup();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const endExtenso = s => String(s || '').replace(/^\s*av\.?\s+/i, 'Avenida ').replace(/^\s*r\.\s*/i, 'Rua ').replace(/^\s*al\.?\s+/i, 'Alameda ').replace(/^\s*estr\.?\s+/i, 'Estrada ').replace(/^\s*pç?a\.?\s+/i, 'Praça ');
async function geocodifica(c){
  const base = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q=';
  const end = endExtenso(c.endereco), tent = [];
  if (end) { tent.push([[end, c.bairro, c.cidade].filter(Boolean).join(', '), 'exata']); tent.push([[end, c.cidade].filter(Boolean).join(', '), 'exata']); }
  if (c.bairro || c.cidade) tent.push([[c.bairro, c.cidade].filter(Boolean).join(', '), 'aproximada']);
  for (let k = 0; k < tent.length; k++) {
    if (k) await sleep(1100); // limite do serviço gratuito: 1 consulta por segundo
    try {
      const r = await fetch(base + encodeURIComponent(tent[k][0]), { headers: { Accept: 'application/json' } });
      const j = r.ok ? await r.json() : [];
      if (j[0]) {
        const exato = tent[k][1] === 'exata' && /house|building|residential|apartments/.test(j[0].addresstype + ' ' + j[0].type) ? 'exata' : tent[k][1] === 'exata' && /\d/.test(c.endereco || '') ? 'aproximada' : tent[k][1];
        return { lat: +j[0].lat, lng: +j[0].lon, prec: exato };
      }
    } catch(e) {}
  }
  return null;
}
async function geoPendentes(){
  if (M.geoBusy || papel() !== 'admin') return;
  const fila = S.D.condos.filter(c => !temPos(c) && !M.tentou.has(c.id)); if (!fila.length) return;
  M.geoBusy = true;
  for (const c of fila) {
    M.tentou.add(c.id);
    const g = await geocodifica(c);
    if (g) {
      Object.assign(c, { latitude: g.lat, longitude: g.lng, geo_precisao: g.prec });
      try { await q(sb.from('condominios').update({ latitude: g.lat, longitude: g.lng, geo_precisao: g.prec }).eq('id', c.id)); }
      catch(e) { if (!M.avisoBanco) { M.avisoBanco = true; toast('Para guardar a localização, rode o schema.sql atualizado no Supabase.'); } }
      if (fila.length > 1) M.enquadrou = false;
    }
    if (S.admTab === 'condos') render();
    await sleep(1100);
  }
  M.geoBusy = false; M.enquadrou = false;
  if (S.admTab === 'condos') render();
}
async function salvaPos(id, ll, prec){
  const c = condo(id); if (!c) return;
  Object.assign(c, { latitude: ll.lat, longitude: ll.lng, geo_precisao: prec });
  S.mapAjuste = null; M.aberto = id; render();
  try { await q(sb.from('condominios').update({ latitude: ll.lat, longitude: ll.lng, geo_precisao: prec }).eq('id', id)); toast('Localização salva'); }
  catch(e) { toast('Não foi possível salvar. Rode o schema.sql atualizado no Supabase.'); }
}
function aConvites(){
  const L = S.D.convites || [], now = Date.now();
  const st = c => c.usado_por ? `Usado por ${esc(perfil(c.usado_por)?.nome || '—')}` : new Date(c.expira_em) < now ? 'Vencido' : `Aguardando · vence ${fd(c.expira_em)}`;
  return `<div class="card"><div class="sec-h"><h2>Convidar corretor ou indicador</h2></div>
    <p class="note"><b>Corretor:</b> link individual, vale para uma pessoa por 7 dias; ela já entra com acesso de corretor. <b>Indicador:</b> link fixo para porteiros, zeladores e síndicos; pode mandar para quantas pessoas quiser, e o cadastro fica registrado como convite seu.</p>
    <div class="btns"><button class="btn" data-a="novoConvite" data-v="corretor">${ic('users',18)}Gerar link de corretor</button><button class="btn ghost" data-a="linkIndicador">${ic('building',18)}Link de indicador</button></div>
    ${L.length ? `<div class="hist">${L.slice(0,10).map(c => { const aberto = !c.usado_por && new Date(c.expira_em) > now; return `<div><div><b>${c.papel === 'admin' ? 'Gestor' : 'Corretor'}</b><div class="note">${st(c)}</div></div><div class="btns" style="justify-content:flex-end">${aberto ? `<button class="btn sm ghost" data-a="copy" data-v="${esc(SITE + '?g=' + c.token)}">${ic('copy',16)}Copiar link</button><button class="btn sm danger" data-a="cancelConvite" data-v="${esc(c.token)}">Cancelar</button>` : ''}</div></div>`; }).join('')}</div>` : ''}
   </div>`;
}
function aUsers(){
  const pend = S.D.perfis.filter(p => !p.condominio_id && p.condominio_texto);
  return `${aConvites()}${pend.length ? `<div class="alert"><b>${pend.length} cadastro${pend.length>1?'s':''} com condomínio fora da lista</b><p class="note">Cadastre o condomínio na aba Condomínios para organizar os relatórios: ${pend.map(p => `${esc(p.nome)} (${esc(p.condominio_texto)})`).join(', ')}.</p></div>` : ''}
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

/* ---------- Relatórios (somente gestor): PDF e Excel ---------- */
const LIBS = {
  pdf: ['https://cdn.jsdelivr.net/npm/jspdf@3.0.3/dist/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.2/dist/jspdf.plugin.autotable.min.js'],
  xlsx: ['https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js']
};
const libCache = {};
function loadScript(src){ return libCache[src] ||= new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete libCache[src]; fail(new Error('Não foi possível carregar o gerador de arquivos. Verifique a internet e tente de novo.')); }; document.head.appendChild(s); }); }
async function libs(k){ for (const s of LIBS[k]) await loadScript(s); }
const RELS = [
  ['completo','Relatório completo','Resumo, indicações, financeiro, indicadores, condomínios e auditoria em um só arquivo.','doc'],
  ['inds','Indicações','Todas as indicações do período, com etapa, condomínio, indicador e motivo de encerramento.','list'],
  ['fin','Financeiro','Recompensas geradas e pagas, fila de pagamento, Pix e comprovantes.','wallet'],
  ['indicadores','Indicadores','Desempenho de cada porteiro, zelador ou síndico: indicações, qualificadas, vendas e valores.','users'],
  ['condos','Condomínios','Indicações, qualificadas, vendas e conversão por condomínio e região.','building'],
  ['aud','Auditoria','Registro de cada ação feita no sistema, com data, hora e autor.','shield']
];
const isoDia = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function relJanela(){
  if (S.relPer !== 'pers') return janela(S.relPer || 'mes');
  const a = S.relDe ? new Date(S.relDe + 'T00:00') : null, b = S.relAte ? new Date(S.relAte + 'T00:00') : null;
  if (b) b.setDate(b.getDate() + 1);
  return [a, b];
}
function relPeriodoTxt(){
  const [a, b] = relJanela(), f = d => d.toLocaleDateString('pt-BR');
  const fim = b ? new Date(b - 1) : new Date();
  if (!a && !b) return 'Todo o período';
  if (!a) return `Até ${f(fim)}`;
  return `${f(a)} a ${f(fim)}`;
}
const alcancou = (i, k) => i.status >= k && i.status !== 8;
function relDados(){
  const [a, b] = relJanela(), em = d => (!a || d >= a) && (!b || d < b);
  const inds = S.D.inds.filter(i => em(new Date(i.criado_em)));
  const R = S.D.rewards, sum = L => L.reduce((x, r) => x + Number(r.valor), 0);
  const gerados = R.filter(r => r.estado !== 'cancelada' && em(new Date(r.criado_em)));
  const pagos = R.filter(r => r.estado === 'pago' && em(dataPago(r)));
  const lanc = R.filter(r => em(new Date(r.criado_em)) || (r.estado === 'pago' && em(dataPago(r))));
  const aPagar = R.filter(r => r.estado === 'disponivel' || r.estado === 'resgate'), proc = R.filter(r => r.estado === 'processamento');
  const qualif = inds.filter(i => alcancou(i, 3)).length, vendas = inds.filter(i => alcancou(i, 6)).length, encerr = inds.filter(i => i.status === 8).length;
  const ids = new Set(S.D.perfis.filter(p => p.papel === 'indicador').map(p => p.id)); inds.forEach(i => i.indicador_id && ids.add(i.indicador_id));
  const indicadores = [...ids].map(id => {
    const u = perfil(id), L = inds.filter(i => i.indicador_id === id), RR = R.filter(r => r.indicador_id === id);
    return { u, n: L.length, q: L.filter(i => alcancou(i,3)).length, v: L.filter(i => alcancou(i,6)).length, e: L.filter(i => i.status === 8).length,
      rec: sum(RR.filter(r => r.estado === 'pago' && em(dataPago(r)))), apagar: sum(RR.filter(r => r.estado === 'disponivel' || r.estado === 'resgate')), total: sum(RR.filter(r => r.estado === 'pago')) };
  }).sort((x, y) => y.q - x.q || y.n - x.n || String(x.u?.nome).localeCompare(String(y.u?.nome)));
  const condos = S.D.condos.map(c => { const L = inds.filter(i => i.condominio_id === c.id); return { c, ind: S.D.perfis.filter(p => p.condominio_id === c.id && p.papel === 'indicador').length, n: L.length, q: L.filter(i => alcancou(i,3)).length, v: L.filter(i => alcancou(i,6)).length }; });
  const fora = inds.filter(i => !i.condominio_id); if (fora.length) condos.push({ c: { nome: 'Outro endereço', bairro: '', cidade: '', regiao: '' }, ind: 0, n: fora.length, q: fora.filter(i => alcancou(i,3)).length, v: fora.filter(i => alcancou(i,6)).length });
  condos.sort((x, y) => y.n - x.n || x.c.nome.localeCompare(y.c.nome));
  return { a, b, em, inds, gerados, pagos, lanc, aPagar, proc, sum, qualif, vendas, encerr, indicadores, condos,
    novos: S.D.perfis.filter(p => p.papel === 'indicador' && em(new Date(p.criado_em))).length, ocorr: S.D.ocorr.filter(o => em(new Date(o.criado_em))).length };
}
async function relAuditoria(D){
  let qy = sb.from('auditoria').select('*').order('criado_em', { ascending: false }).limit(5000);
  if (D.a) qy = qy.gte('criado_em', D.a.toISOString());
  if (D.b) qy = qy.lt('criado_em', D.b.toISOString());
  try { return await q(qy); } catch(e) { return S.D.audit.filter(l => D.em(new Date(l.criado_em))); }
}
function aRel(){
  const D = relDados(), per = S.relPer || 'mes';
  const cont = { completo: `${D.inds.length} indicaç${D.inds.length===1?'ão':'ões'} · ${money(D.sum(D.pagos))} pagos`, inds: `${D.inds.length} indicaç${D.inds.length===1?'ão':'ões'} no período`, fin: `${D.lanc.length} lançamento${D.lanc.length===1?'':'s'} · ${money(D.sum(D.pagos))} pagos`,
    indicadores: `${D.indicadores.filter(x => x.n).length} com indicações no período`, condos: `${D.condos.filter(x => x.n).length} com indicações no período`, aud: 'Ações registradas no período' };
  return `<div class="card relper"><h2>Período do relatório</h2>
    <div class="filters">${PERIODOS.map(([k,l]) => `<button class="chipbtn ${per===k?'on':''}" data-a="relPer" data-v="${k}">${l}</button>`).join('')}<button class="chipbtn ${per==='pers'?'on':''}" data-a="relPer" data-v="pers">Escolher datas</button></div>
    ${per === 'pers' ? `<div class="row2"><label class="f">De<input class="in" type="date" id="r-de" value="${esc(S.relDe||'')}"></label><label class="f">Até<input class="in" type="date" id="r-ate" value="${esc(S.relAte||'')}"></label></div>` : ''}
    <p class="note"><b>${relPeriodoTxt()}</b></p>
    <label class="chk"><input type="checkbox" id="r-pess" ${S.relPess?'checked':''}> Incluir telefones dos proprietários e chaves Pix (dados pessoais, LGPD). Só marque se o arquivo ficar com você.</label>
   </div>
   <div class="relgrid">${RELS.map(([k,t,d,icn]) => `<div class="card relcard ${k==='completo'?'destaque':''}"><div class="relh"><span class="relic">${ic(icn,20)}</span><div><h2>${t}</h2><p class="note">${d}</p></div></div>
     <p class="relcnt">${cont[k]}</p>
     <div class="btns"><button class="btn sm" data-a="relGerar" data-v="${k}" data-t="pdf">${ic('doc',16)}PDF</button><button class="btn sm ghost" data-a="relGerar" data-v="${k}" data-t="xlsx">${ic('columns',16)}Excel</button></div></div>`).join('')}</div>
   <p class="note">Os arquivos são gerados no seu navegador, com os dados que você vê no painel. Somente o gestor tem acesso a esta área.</p>`;
}
/* monta as tabelas uma vez; PDF e Excel usam a mesma fonte */
function relTabelas(k, D, audit){
  const pess = !!S.relPess, dt = t => t ? new Date(t) : null, T = [];
  const nome = id => perfil(id)?.nome || (id ? '—' : 'QR Code');
  if (k === 'completo' || k === 'inds') T.push({ id:'inds', titulo:'Indicações', larg:[21,17,22].concat(pess?[17]:[]).concat([14,24,18,19,18,26]),
    cols:['ID','Recebida em','Proprietário'].concat(pess?['Telefone']:[]).concat(['Unidade','Condomínio / endereço','Indicador','Etapa','Origem','Motivo de encerramento']),
    tipos:['t','dt','t'].concat(pess?['t']:[]).concat(['t','t','t','t','t','t']),
    rows: D.inds.map(i => [i.id, dt(i.criado_em), i.proprietario_nome].concat(pess?[fph(i.telefone)]:[]).concat([i.unidade, i.endereco || condoNome(i.condominio_id), nome(i.indicador_id), ST[i.status], i.origem || '', i.motivo_encerramento || ''])) });
  if (k === 'completo' || k === 'fin') {
    T.push({ id:'fin', titulo:'Recompensas no período', aba:'Recompensas', larg:[16,22,12,12,18,12,22].concat(pess?[28]:[]),
      cols:['Indicação','Indicador','Gerada em','Valor','Estado','Pago em','Comprovante Pix'].concat(pess?['Chave Pix']:[]),
      tipos:['t','t','d','m','t','d','t'].concat(pess?['t']:[]),
      rows: D.lanc.map(r => { const u = perfil(r.indicador_id); return [r.indicacao_id, nome(r.indicador_id), dt(r.criado_em), Number(r.valor), REW[r.estado][1], r.estado === 'pago' ? dataPago(r) : null, r.comprovante_codigo || (r.comprovante_arquivo ? 'Arquivo anexado' : '')].concat(pess?[u?.pix_chave ? `${u.pix_tipo}: ${u.pix_chave}` : 'Não cadastrada']:[]); }) });
    T.push({ id:'fila', titulo:'A pagar agora (fila de pagamento)', aba:'A pagar agora', larg:[16,24,14,12,18,18],
      cols:['Indicação','Indicador','Liberada desde','Valor','Estado','Chave Pix'], tipos:['t','t','d','m','t','t'],
      rows: D.aPagar.map(r => { const u = perfil(r.indicador_id); return [r.indicacao_id, nome(r.indicador_id), dt(r.atualizado_em || r.criado_em), Number(r.valor), REW[r.estado][1], u?.pix_chave ? (pess ? `${u.pix_tipo}: ${u.pix_chave}` : 'Cadastrada') : 'Não cadastrada']; }) });
  }
  if (k === 'completo' || k === 'indicadores') T.push({ id:'indicadores', titulo:'Indicadores', larg:[22,14,24,11,12,9,12,13,13,14],
    cols:['Indicador','Função','Condomínio','Indicações','Qualificadas','Vendas','Encerradas','Recebido no período','A pagar agora','Recebido (total)'],
    tipos:['t','t','t','n','n','n','n','m','m','m'],
    rows: D.indicadores.map(x => [x.u?.nome || '—', x.u?.funcao || '', condo(x.u?.condominio_id)?.nome || x.u?.condominio_texto || '', x.n, x.q, x.v, x.e, x.rec, x.apagar, x.total]) });
  if (k === 'completo' || k === 'condos') T.push({ id:'condos', titulo:'Condomínios', larg:[30,18,14,14,11,11,11,9,12],
    cols:['Condomínio','Bairro','Cidade','Região','Indicadores','Indicações','Qualificadas','Vendas','Conversão'],
    tipos:['t','t','t','t','n','n','n','n','p'],
    rows: D.condos.map(x => [x.c.nome, x.c.bairro || '', x.c.cidade || '', x.c.regiao || '', x.ind, x.n, x.q, x.v, x.n ? x.v / x.n : 0]) });
  if (k === 'completo' || k === 'aud') T.push({ id:'aud', titulo:'Auditoria', larg:[18,24,70], cols:['Data e hora','Quem','Ação'], tipos:['dt','t','t'],
    rows: (audit || []).map(l => [dt(l.criado_em), perfil(l.autor_id)?.nome || 'Sistema', l.acao]) });
  return T;
}
function relResumo(D){
  return [
    ['Indicações recebidas', D.inds.length, 'n'], ['Oportunidades qualificadas', D.qualif, 'n'], ['Vendas concluídas', D.vendas, 'n'],
    ['Conversão indicação → venda', D.inds.length ? D.vendas / D.inds.length : 0, 'p'], ['Encerradas', D.encerr, 'n'], ['Ocorrências de duplicidade', D.ocorr, 'n'],
    ['Novos indicadores', D.novos, 'n'], ['Recompensas geradas', D.sum(D.gerados), 'm'], ['Recompensas pagas', D.sum(D.pagos), 'm'],
    ['A pagar agora', D.sum(D.aPagar), 'm'], ['Em processamento', D.sum(D.proc), 'm'], ['Valor por indicação qualificada', Number(S.D.valor), 'm']
  ];
}
const pct = v => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const fmtCel = (v, t) => v == null || v === '' ? '' : t === 'm' ? money(v) : t === 'p' ? pct(v) : t === 'd' ? v.toLocaleDateString('pt-BR') : t === 'dt' ? `${v.toLocaleDateString('pt-BR')} ${v.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}` : t === 'n' ? String(v) : String(v);
const relNomeArq = (k, ext) => `rendique-${({completo:'relatorio-completo',inds:'indicacoes',fin:'financeiro',indicadores:'indicadores',condos:'condominios',aud:'auditoria'})[k]}-${isoDia(new Date())}.${ext}`;
function baixar(blob, nome){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

const latin = s => String(s).replace(/→/g, '->').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x00-\xFF]/g, ''); // fontes do PDF só têm Latin-1
async function relPDF(k){
  await libs('pdf');
  const D = relDados(), audit = (k === 'completo' || k === 'aud') ? await relAuditoria(D) : null, T = relTabelas(k, D, audit);
  const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14;
  const NAVY = [29,58,95], GOLD = [245,184,61], INK = [26,32,44], MUTED = [100,110,125], LINE = [222,227,234];
  const titulo = RELS.find(r => r[0] === k)[1], gerado = fdt(new Date()), quem = S.perfil?.nome || 'Gestor';
  const tab = window.autoTable ? (o) => window.autoTable(doc, o) : (o) => doc.autoTable(o);
  // cabeçalho da 1ª página
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 30, 'F');
  const lx = M, ly = 6, u = 18 / 64; // logo "janela acesa" em 18 mm
  doc.setFillColor(255,255,255); doc.roundedRect(lx + 12*u, ly + 5*u, 40*u, 54*u, 5*u, 5*u, 'F');
  doc.setFillColor(...NAVY); [[19,13],[19,28],[35,28]].forEach(([x,y]) => doc.roundedRect(lx + x*u, ly + y*u, 10*u, 10*u, 2*u, 2*u, 'F'));
  doc.roundedRect(lx + 27*u, ly + 44*u, 10*u, 15*u, 2*u, 2*u, 'F');
  doc.setFillColor(...GOLD); doc.roundedRect(lx + 35*u, ly + 13*u, 10*u, 10*u, 2*u, 2*u, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('Rendique', M + 21, 17);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...GOLD); doc.text('Você conhece a oportunidade. Nós cuidamos do resto.', M + 21, 23);
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text(titulo, W - M, 15, { align: 'right' });
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.text(`Período: ${relPeriodoTxt()}`, W - M, 22, { align: 'right' });
  doc.setTextColor(...MUTED); doc.setFontSize(8.5); doc.text(`Gerado em ${gerado} por ${quem} (gestor)`, M, 37);
  let y = 42;
  // indicadores-chave
  if (k !== 'aud') {
    const R = relResumo(D), sel = k === 'fin' ? R.slice(7, 12) : k === 'condos' || k === 'indicadores' ? [R[0], R[1], R[2], R[3], R[6]] : k === 'inds' ? [R[0], R[1], R[2], R[3], R[4], R[5]] : R;
    const por = Math.min(6, sel.length), gap = 4, bw = (W - 2*M - gap*(por-1)) / por, bh = 18;
    sel.forEach(([l, v, t], n) => {
      const cx = M + (n % por) * (bw + gap), cy = y + Math.floor(n / por) * (bh + gap);
      doc.setDrawColor(...LINE); doc.setFillColor(247,249,252); doc.roundedRect(cx, cy, bw, bh, 2, 2, 'FD');
      doc.setFillColor(...(t === 'm' ? GOLD : NAVY)); doc.rect(cx, cy + 3, 1.2, bh - 6, 'F');
      doc.setTextColor(...MUTED); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(l.replace('→','a'), cx + 4, cy + 6.5);
      doc.setTextColor(...INK); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text(fmtCel(v, t), cx + 4, cy + 14);
    });
    y += Math.ceil(sel.length / por) * (bh + gap) + 4;
  }
  T.forEach((t, n) => {
    if (n && y > H - 50) { doc.addPage(); y = 18; }
    doc.setTextColor(...NAVY); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(t.titulo, M, y);
    doc.setTextColor(...MUTED); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text(`${t.rows.length} registro${t.rows.length===1?'':'s'}`, W - M, y, { align: 'right' });
    const soma = t.larg.reduce((a,b) => a+b, 0), cs = {};
    t.larg.forEach((l, j) => cs[j] = { cellWidth: (W - 2*M) * l / soma, halign: ['m','n','p'].includes(t.tipos[j]) ? 'right' : 'left' });
    tab({ startY: y + 3, margin: { left: M, right: M, top: 16, bottom: 16 }, head: [t.cols],
      body: t.rows.length ? t.rows.map(r => r.map((v, j) => latin(fmtCel(v, t.tipos[j])))) : [[{ content: 'Nenhum registro no período.', colSpan: t.cols.length, styles: { textColor: MUTED, fontStyle: 'italic' } }]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8 }, alternateRowStyles: { fillColor: [247,249,252] }, columnStyles: cs,
      didParseCell: h => { if (h.section === 'head' && ['m','n','p'].includes(t.tipos[h.column.index])) h.cell.styles.halign = 'right'; } });
    y = doc.lastAutoTable.finalY + 10;
  });
  if (y > H - 26) { doc.addPage(); y = 18; }
  doc.setTextColor(...MUTED); doc.setFontSize(7.5); doc.setFont('helvetica','italic');
  doc.text(doc.splitTextToSize('Recompensa fixa por indicação qualificada. Nenhuma remuneração percentual sobre a operação imobiliária. O indicador apenas informa a oportunidade; atendimento, captação e venda são feitos por corretor habilitado (CRECI). Documento com dados pessoais: guarde e compartilhe conforme a LGPD.', W - 2*M), M, y);
  const tot = doc.getNumberOfPages();
  for (let p = 1; p <= tot; p++) {
    doc.setPage(p); doc.setDrawColor(...LINE); doc.line(M, H - 10, W - M, H - 10);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`Rendique · ${titulo} · ${relPeriodoTxt()}`, M, H - 6); doc.text(`Página ${p} de ${tot}`, W - M, H - 6, { align: 'right' });
    if (p > 1) { doc.setFillColor(...NAVY); doc.rect(0, 0, W, 3, 'F'); }
  }
  baixar(doc.output('blob'), relNomeArq(k, 'pdf'));
}

async function relXLSX(k){
  await libs('xlsx');
  const D = relDados(), audit = (k === 'completo' || k === 'aud') ? await relAuditoria(D) : null, T = relTabelas(k, D, audit);
  const wb = new ExcelJS.Workbook(); wb.creator = 'Rendique'; wb.created = new Date();
  const NAVY = 'FF1D3A5F', GOLD = 'FFF5B83D', ZEBRA = 'FFF5F7FA', BORDA = { style: 'thin', color: { argb: 'FFDDE3EA' } };
  const local = d => d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000) : null; // Excel não tem fuso: grava a hora local
  const FMT = { m: '"R$" #,##0.00', p: '0.0%', d: 'dd/mm/yyyy', dt: 'dd/mm/yyyy hh:mm', n: '0' };
  const titulo = RELS.find(r => r[0] === k)[1];
  // Resumo
  const rs = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  rs.columns = [{ width: 36 }, { width: 22 }];
  rs.mergeCells('A1:B1'); Object.assign(rs.getCell('A1'), { value: `Rendique · ${titulo}` }); rs.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  rs.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; rs.getRow(1).height = 30; rs.getCell('A1').alignment = { vertical: 'middle', indent: 1 };
  rs.getCell('A2').value = 'Período'; rs.getCell('B2').value = relPeriodoTxt();
  rs.getCell('A3').value = 'Gerado em'; rs.getCell('B3').value = fdt(new Date());
  rs.getCell('A4').value = 'Gerado por'; rs.getCell('B4').value = `${S.perfil?.nome || 'Gestor'} (gestor)`;
  [2,3,4].forEach(r => rs.getCell('A'+r).font = { color: { argb: 'FF64707D' } });
  let r0 = 6; rs.getCell('A'+r0).value = 'Indicador'; rs.getCell('B'+r0).value = 'Valor';
  ['A','B'].forEach(c => { const x = rs.getCell(c+r0); x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; });
  relResumo(D).forEach(([l, v, t], n) => { const row = rs.getRow(r0 + 1 + n); row.getCell(1).value = l; row.getCell(2).value = v; row.getCell(2).numFmt = FMT[t]; row.getCell(2).font = { bold: true };
    if (t === 'm') row.getCell(1).border = { left: { style: 'thick', color: { argb: GOLD } } };
    if (n % 2) [1,2].forEach(c => row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }); });
  const nota = rs.getCell('A' + (r0 + 15)); nota.value = 'Recompensa fixa por indicação qualificada. Nenhuma remuneração percentual sobre a operação imobiliária.'; nota.font = { italic: true, size: 9, color: { argb: 'FF64707D' } };
  // uma aba por tabela
  T.forEach(t => {
    const ws = wb.addWorksheet((t.aba || t.titulo).replace(/[\\/?*[\]:]/g, '').slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = t.cols.map((c, j) => ({ header: c, width: Math.max(10, Math.round(t.larg[j] * 1.15)), style: FMT[t.tipos[j]] ? { numFmt: FMT[t.tipos[j]] } : {} }));
    t.rows.forEach(r => ws.addRow(r.map((v, j) => ['d','dt'].includes(t.tipos[j]) ? local(v) : v)));
    const h = ws.getRow(1); h.height = 22; h.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', wrapText: true }; });
    ws.eachRow((row, n) => { if (n > 1) row.eachCell({ includeEmpty: true }, (c, j) => { c.border = { bottom: BORDA }; if (n % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }; if (j === t.cols.length && t.id === 'aud') c.alignment = { wrapText: true }; }); });
    if (t.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.cols.length } };
    const somas = t.tipos.map((x, j) => x === 'm' || (x === 'n' && t.id !== 'fin') ? j : -1).filter(j => j >= 0);
    if (t.rows.length && somas.length) { const tr = ws.addRow([]), n = t.rows.length + 1; tr.getCell(1).value = 'Total'; somas.forEach(j => { const col = ws.getColumn(j + 1).letter; tr.getCell(j + 1).value = { formula: `SUBTOTAL(9,${col}2:${col}${n})` }; tr.getCell(j + 1).numFmt = FMT[t.tipos[j]]; });
      tr.eachCell({ includeEmpty: true }, c => { c.font = { bold: true }; c.border = { top: { style: 'thin', color: { argb: NAVY } } }; }); }
  });
  const buf = await wb.xlsx.writeBuffer();
  baixar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), relNomeArq(k, 'xlsx'));
}

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
  $('#bell').innerHTML = vBell() + (S.screen === 'app' && papel() === 'admin' ? vDrawer() : '');
  document.querySelectorAll('[data-qr]').forEach(drawQR);
  if (S.screen === 'app' && papel() === 'admin' && S.admTab === 'condos') montaMapa();
  if (S.screen === 'app' && S.tab === 'nova' && papel() === 'indicador') nvRestaura();
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
  logout: () => guard(async () => { S.drawer = null; S.bell = false; closeModal(); await sb.auth.signOut(); S.D = { inds:[], rewards:[], condos:[], perfis:[], ocorr:[], notifs:[], audit:[], hist:{}, convidados:null, valor:20 }; onSession(null); }),
  authMode: d => { const e = $('#l-email')?.value; if (e) S.email = e.trim().toLowerCase(); S.authMode = d.v; render(); },
  eye: (d, el) => { const i = document.getElementById(d.v); if (!i) return; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = show ? 'ocultar' : 'mostrar'; },
  resendSignup: () => guard(async () => { const { error } = await sb.auth.resend({ type: 'signup', email: S.email, options: { emailRedirectTo: SITE } }); if (error) throw error; toast('Novo código enviado'); }),
  resendRecovery: () => guard(async () => { const { error } = await sb.auth.resetPasswordForEmail(S.email, { redirectTo: SITE }); if (error) throw error; toast('Novo código enviado'); }),
  bell: () => { S.bell = !S.bell; render(); },
  readAll: () => guard(async () => { await q(sb.from('notificacoes').update({ lida: true }).eq('destinatario_id', S.perfil.id).eq('lida', false)); S.D.notifs.forEach(n => n.lida = true); render(); }),
  openNotif: d => guard(async () => {
    const n = S.D.notifs.find(x => String(x.id) === d.v); if (!n) return;
    if (!n.lida) { await q(sb.from('notificacoes').update({ lida: true }).eq('id', n.id)); n.lida = true; }
    S.bell = false;
    if (papel() === 'admin') { S.admTab = n.tipo === 'duplicidade' ? 'ocorr' : n.tipo === 'cadastro' ? 'users' : n.tipo === 'resgate' ? 'rec' : 'inds'; S.admFilter = 'all'; S.flash = n.indicacao_id; if (S.admTab === 'inds' && n.indicacao_id) { S.admGrupo = 'todas'; S.drawer = n.indicacao_id; loadHist(n.indicacao_id).then(render).catch(()=>{}); } render(); const row = n.indicacao_id && document.getElementById('row-' + n.indicacao_id); if (row) row.scrollIntoView({ block:'center' }); return; }
    if (papel() === 'indicador' && n.indicacao_id) { await act.det({ v: n.indicacao_id }); return; }
    render();
  }),
  askNotif: async () => { try { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Alertas do navegador ativados' : 'Alertas não autorizados neste navegador'); } catch(e) {} render(); },
  admGrupo: d => { S.admGrupo = d.v; render(); },
  finPer: d => { S.finPer = d.v; render(); },
  finEst: d => { S.finEst = d.v; S.finLim = 15; render(); },
  finMais: () => { S.finLim = (S.finLim || 15) + 30; render(); },
  exportFin: () => {
    const linhas = [['Indicação','Indicador','Chave Pix','Gerada em','Valor','Estado','Pago em','Código Pix']].concat(S.D.rewards.map(r => { const u = perfil(r.indicador_id); return [r.indicacao_id, u?.nome || '', u?.pix_chave ? `${u.pix_tipo}: ${u.pix_chave}` : '', new Date(r.criado_em).toLocaleDateString('pt-BR'), String(Number(r.valor).toFixed(2)).replace('.', ','), REW[r.estado][1], r.estado === 'pago' ? dataPago(r).toLocaleDateString('pt-BR') : '', r.comprovante_codigo || '']; }));
    const csv = '\ufeff' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `rendique-financeiro-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Planilha exportada');
  },
  relPer: d => { S.relPer = d.v; if (d.v === 'pers' && !S.relDe) { const n = new Date(); S.relDe = isoDia(new Date(n.getFullYear(), n.getMonth(), 1)); S.relAte = isoDia(n); } render(); },
  relGerar: (d, el) => {
    if (papel() !== 'admin') return toast('Somente o gestor pode gerar relatórios.');
    if (S.relPer === 'pers' && S.relDe && S.relAte && S.relAte < S.relDe) return toast('A data final é anterior à inicial.');
    const txt = el.innerHTML; el.disabled = true; el.textContent = 'Gerando…';
    guard(async () => { await (d.t === 'pdf' ? relPDF(d.v) : relXLSX(d.v)); toast(d.t === 'pdf' ? 'PDF gerado' : 'Planilha Excel gerada'); }).finally(() => { el.disabled = false; el.innerHTML = txt; });
  },
  mapFoco: d => { S.mapFoco = d.v; const c = condo(d.v); render();
    if (d.s) $('.mapcard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!temPos(c)) { toast(M.geoBusy ? 'Localizando o endereço…' : 'Endereço não encontrado. Toque no mapa no ponto da portaria.'); if (!M.geoBusy) { S.mapAjuste = c.id; render(); } return; }
    if (M.map) { M.map.flyTo([c.latitude, c.longitude], 17, { duration: .8 }); setTimeout(() => M.pins[c.id]?.openPopup(), 850); } },
  mapAjustar: d => { S.mapAjuste = d.v; M.map?.closePopup(); render(); const c = condo(d.v); if (temPos(c)) M.map?.setView([c.latitude, c.longitude], Math.max(M.map.getZoom(), 18)); },
  mapAjusteFim: () => { S.mapAjuste = null; render(); },
  condoInds: d => { const c = condo(d.v); S.admTab = 'inds'; S.admGrupo = 'todas'; S.admQ = c?.nome || ''; render(); window.scrollTo(0, 0); },
  nvPasso: d => {
    const p = S.nvStep || 0, dir = +d.v; S.nd = nvDados();
    if (dir > 0) { const e = nvErro(p, S.nd); if (e) return showErr('#f-err-p', e); }
    $('#f-err-p') && ($('#f-err-p').hidden = true);
    S.nvStep = Math.max(0, Math.min(4, p + dir)); render(); window.scrollTo(0, 0);
  },
  admView: d => { S.admView = d.v; render(); },
  noop: () => {},
  openInd: async d => { S.drawer = d.v; render(); if (!S.D.hist[d.v]) { try { await loadHist(d.v); render(); } catch(e) {} } },
  drawerClose: () => { S.drawer = null; render(); },
  drawerBg: (d, el, e) => { if (e.target === el) { S.drawer = null; render(); } },
  adv: d => guard(async () => { await rpc('mudar_status', { p_id: d.v, p_status: Number(d.s), p_motivo: null }); delete S.D.hist[d.v]; await refresh(); toast(`${d.v}: ${ST[Number(d.s)]}`); }),
  close: d => openModal(`<div style="text-align:left;display:flex;flex-direction:column;gap:14px">
     <div><p class="eyebrow">Encerrar ${esc(d.v)}</p><h2>Qual o motivo?</h2></div>
     <label class="f">Motivo<select class="in" id="m-motivo">${MOTIVOS.map(m => `<option>${m}</option>`).join('')}</select></label>
     <label class="f">Justificativa <small>(obrigatória)</small><textarea class="in" id="m-just" maxlength="500" placeholder="Explique o que aconteceu. Ex.: proprietário informou por WhatsApp que desistiu de vender este ano."></textarea></label>
     <p class="note">Fica registrado na linha do tempo e na auditoria. O indicador vê o motivo na indicação dele.</p>
     <div id="m-err" class="err" hidden></div>
     <div class="btns"><button class="btn danger" data-a="confirmClose" data-v="${esc(d.v)}">Encerrar indicação</button><button class="btn ghost" data-a="mclose">Cancelar</button></div></div>`),
  back1: d => { const i = S.D.inds.find(x => x.id === d.v); if (!i) return;
    const r = S.D.rewards.find(x => x.indicacao_id === i.id), novo = i.status - 1;
    const aviso = novo < 3 && r && r.estado === 'processamento' ? '<p class="note"><b>A recompensa em processamento será cancelada.</b> Se a indicação avançar de novo até "Oportunidade qualificada", ela volta automaticamente.</p>' : '';
    openModal(`<div style="text-align:left;display:flex;flex-direction:column;gap:14px">
     <div><p class="eyebrow">${esc(i.id)} · ${esc(i.proprietario_nome)}</p><h2>Voltar para "${ST[novo]}"?</h2></div>
     <p class="note">A indicação sai de "${ST[i.status]}" e volta uma etapa. O indicador é avisado e fica registrado na linha do tempo e na auditoria.</p>${aviso}
     <div class="btns"><button class="btn" data-a="confirmBack" data-v="${esc(i.id)}">${ic('undo',18)}Voltar etapa</button><button class="btn ghost" data-a="mclose">Cancelar</button></div></div>`); },
  confirmBack: d => guard(async () => { closeModal(); const st = await rpc('voltar_etapa', { p_id: d.v }); delete S.D.hist[d.v]; await refresh(); if (S.drawer === d.v) { try { await loadHist(d.v); } catch(e) {} render(); } toast(`${d.v} voltou para ${ST[st]}`); }),
  reopen: d => openModal(`<div style="text-align:left;display:flex;flex-direction:column;gap:14px">
     <div><p class="eyebrow">Reabrir ${esc(d.v)}</p><h2>Desfazer o encerramento?</h2></div>
     <p class="note">A indicação volta para a etapa em que estava antes de ser encerrada (no mínimo "Em validação") e aparece de novo em atendimento. Se ela já tinha recompensa, a recompensa volta para "Em processamento". O indicador é avisado e tudo fica registrado na auditoria.</p>
     <div class="btns"><button class="btn" data-a="confirmReopen" data-v="${esc(d.v)}">${ic('undo',18)}Reabrir indicação</button><button class="btn ghost" data-a="mclose">Cancelar</button></div></div>`),
  confirmReopen: d => guard(async () => { closeModal(); const st = await rpc('reabrir_indicacao', { p_id: d.v }); delete S.D.hist[d.v]; await refresh(); if (S.drawer === d.v) { try { await loadHist(d.v); } catch(e) {} render(); } toast(`${d.v} reaberta: ${ST[st]}`); }),
  confirmClose: d => guard(async () => {
    const m = $('#m-motivo')?.value || '', j = ($('#m-just')?.value || '').trim();
    if (j.length < 10) return showErr('#m-err', 'Escreva a justificativa (pelo menos 10 letras).');
    closeModal(); await rpc('mudar_status', { p_id: d.v, p_status: 8, p_motivo: `${m}: ${j}` }); delete S.D.hist[d.v]; await refresh(); toast(`${d.v} encerrada`);
  }),
  rew: d => guard(async () => { await rpc('mudar_recompensa', { p_indicacao: d.v, p_estado: d.e }); await refresh(); toast(d.e === 'pago' ? 'Pagamento registrado' : 'Recompensa liberada'); }),
  ocorr: d => guard(async () => { await rpc('resolver_ocorrencia', { p_id: Number(d.v), p_estado: d.e }); await refresh(); }),
  editPix: () => { S.editPix = !S.editPix; render(); },
  anexarComp: d => act.pagarPix({ v: d.v, modo: 'anexar' }),
  pagarPix: d => {
    const anexar = d.modo === 'anexar';
    const r = S.D.rewards.find(x => x.indicacao_id === d.v), u = perfil(r.indicador_id), t0 = new Date(), hoje = `${t0.getFullYear()}-${String(t0.getMonth()+1).padStart(2,'0')}-${String(t0.getDate()).padStart(2,'0')}`;
    const pix = u?.pix_chave ? `<div class="paybox"><span class="eyebrow">Chave Pix · ${esc(u.pix_tipo)}</span><div class="copyrow"><span>${esc(u.pix_chave)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(u.pix_chave)}">${ic('copy',16)}Copiar</button></div></div>`
      : `<div class="alert"><b>${esc(u?.nome || 'O indicador')} ainda não cadastrou a chave Pix.</b><p class="note">Peça para ele cadastrar em Carteira → Sua chave Pix.</p>${u?.telefone ? `<a class="btn sm wa" href="${waLink(u.telefone)}?text=${encodeURIComponent('Oi! Para receber sua recompensa do Rendique, cadastre sua chave Pix no app: Carteira → Sua chave Pix.')}" target="_blank" rel="noopener">${ic('chat',16)}Avisar pelo WhatsApp</a>` : ''}</div>`;
    openModal(`<form data-f="pagamento" class="cards" style="gap:14px;text-align:left" novalidate>
      <input type="hidden" name="ind" value="${esc(d.v)}"><input type="hidden" name="modo" value="${anexar ? 'anexar' : 'pagar'}">
      <div><p class="eyebrow">${anexar ? 'Comprovante' : 'Pagar recompensa'} · ${esc(d.v)}</p><h2>${anexar ? `Inserir comprovante de ${money(r.valor)}` : `${money(r.valor)} para ${esc(u?.nome || '—')}`}</h2></div>
      ${anexar ? `<p class="note">Pagamento para ${esc(u?.nome || '—')}. Anexe a foto ou o PDF do comprovante e/ou informe o código da transação.</p>` : `${pix}
      <p class="note">1. Faça o Pix no app do seu banco. 2. Volte aqui e registre o comprovante.</p>`}
      <label class="f">Data do pagamento<input class="in" type="date" id="pg-data" name="data" value="${anexar && r.pago_em ? r.pago_em : hoje}"></label>
      <label class="f">Código da transação Pix <small>(ID / E2E, opcional se anexar a foto)</small><input class="in mono" id="pg-cod" name="codigo" value="${esc(anexar ? (r.comprovante_codigo || '') : '')}" placeholder="E1234567820261007…"></label>
      <label class="f">Foto ou PDF do comprovante <small>(opcional se informar o código)</small><input class="in" type="file" id="pg-arq" name="arquivo" accept="image/*,application/pdf"></label>
      <div id="pg-err" class="err" hidden></div>
      <div class="btns"><button class="btn gold" type="submit">${anexar ? 'Salvar comprovante' : 'Confirmar pagamento'}</button><button type="button" class="btn ghost" data-a="mclose">Cancelar</button></div></form>`);
  },
  verComp: d => guard(async () => {
    const r = S.D.rewards.find(x => x.indicacao_id === d.v); if (!r) return;
    let link = '';
    if (r.comprovante_arquivo) { const { data, error } = await sb.storage.from('comprovantes').createSignedUrl(r.comprovante_arquivo, 600); if (!error && data?.signedUrl) link = data.signedUrl; }
    const quem = perfil(r.pago_por)?.nome;
    openModal(`<div style="text-align:left;display:flex;flex-direction:column;gap:12px"><p class="eyebrow">Comprovante · ${esc(r.indicacao_id)}</p><h2>${money(r.valor)} pago</h2>
      <dl class="kv"><dt>Data</dt><dd>${r.pago_em ? new Date(r.pago_em + 'T12:00').toLocaleDateString('pt-BR') : '—'}</dd>${quem?`<dt>Registrado por</dt><dd>${esc(quem)}</dd>`:''}${r.comprovante_codigo?`<dt>Código Pix</dt><dd class="mono">${esc(r.comprovante_codigo)}</dd>`:''}</dl>
      ${link ? (/\.pdf(\?|$)/i.test(r.comprovante_arquivo) ? `<a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener">Abrir comprovante (PDF)</a>` : `<a href="${esc(link)}" target="_blank" rel="noopener"><img src="${esc(link)}" alt="Comprovante do Pix" style="max-width:100%;border-radius:12px;border:1px solid var(--line)"></a>`) : (r.comprovante_arquivo ? '<p class="note">Não foi possível abrir o arquivo agora.</p>' : '')}
      ${!r.comprovante_codigo && !r.comprovante_arquivo ? '<p class="note">Ainda não há comprovante para este pagamento.</p>' : ''}
      ${papel() === 'admin' ? `<button class="btn ${r.comprovante_codigo || r.comprovante_arquivo ? 'ghost' : 'gold'}" data-a="anexarComp" data-v="${esc(r.indicacao_id)}">${ic('doc',18)}${r.comprovante_codigo || r.comprovante_arquivo ? 'Alterar comprovante' : 'Inserir comprovante'}</button>` : ''}
      <button class="btn ghost" data-a="mclose">Fechar</button></div>`);
  }),
  resgatar: () => guard(async () => {
    if (!S.perfil.pix_chave) { S.editPix = true; render(); return toast('Cadastre sua chave Pix antes de pedir o resgate.'); } const v = await rpc('solicitar_resgate', {}); await refresh(); toast(`Resgate de ${money(v)} solicitado`); }),
  lgpd: d => guard(async () => { await rpc('solicitar_lgpd', { p_tipo: d.v }); toast(`Pedido de ${d.v} registrado. Resposta em até 15 dias.`); }),
  copy: d => { try { navigator.clipboard.writeText(d.v).then(() => toast('Link copiado'), () => toast('Selecione o link e copie manualmente')); } catch(e) { toast('Selecione o link e copie manualmente'); } },
  novoConvite: d => guard(async () => {
    const tok = await rpc('criar_convite', { p_papel: d.v }); const url = `${SITE}?g=${tok}`, r = ROTULO[d.v];
    const txt = encodeURIComponent(`Oi! Você foi convidado para ser ${r} do Rendique. Crie sua conta por este link: ${url}`);
    await refresh();
    openModal(`<p class="eyebrow">Convite de ${r}</p><h2>Link pronto</h2><p class="note">Mande para a pessoa. O link vale para uma pessoa, por 7 dias.</p>
      <div class="copyrow"><span>${esc(url)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(url)}">${ic('copy',16)}Copiar</button></div>
      <a class="btn" style="text-decoration:none" href="https://wa.me/?text=${txt}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>
      <button class="btn ghost" data-a="mclose">Fechar</button>`);
  }),
  linkIndicador: () => {
    const url = `${SITE}?c=${S.perfil.codigo}`;
    const txt = encodeURIComponent(`Oi! Você trabalha em condomínio? Com o Rendique você indica quem quer vender o imóvel e ganha recompensa por indicação qualificada. Cadastre-se por este link: ${url}`);
    openModal(`<p class="eyebrow">Convite de indicador</p><h2>Link para porteiros, zeladores e síndicos</h2><p class="note">Pode mandar para várias pessoas e colocar em grupos. Quem se cadastrar por ele entra como indicador.</p>
      <div class="copyrow"><span>${esc(url)}</span><button class="btn sm ghost" data-a="copy" data-v="${esc(url)}">${ic('copy',16)}Copiar</button></div>
      <a class="btn" style="text-decoration:none" href="https://wa.me/?text=${txt}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>
      <button class="btn ghost" data-a="mclose">Fechar</button>`);
  },
  cancelConvite: d => guard(async () => { await rpc('cancelar_convite', { p_token: d.v }); await refresh(); toast('Convite cancelado'); }),
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
document.addEventListener('mouseover', e => { const t = e.target.closest?.('[data-tip]'); const tip = $('#ftip'); if (!tip) return; if (!t) { tip.hidden = true; return; } tip.innerHTML = t.dataset.tip; tip.hidden = false; const r = t.getBoundingClientRect(); tip.style.left = Math.min(window.innerWidth - 180, Math.max(8, r.left + r.width/2 - 80)) + 'px'; tip.style.top = (r.top + 8) + 'px'; });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('.lcard')) { e.target.click(); } if (e.key === 'Escape') { if (S.drawer) { S.drawer = null; render(); return; } if ($('#modal').innerHTML) closeModal(); else if (S.bell) { S.bell = false; render(); } } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.form?.dataset.f === 'nova') nvSync();
  if (t.id === 'c-condo') $('#c-outro-wrap').hidden = t.value !== 'outro';
  if (t.id === 'a-filter') { S.admFilter = t.value; render(); }
  if (t.id === 'r-de' || t.id === 'r-ate') { S[t.id === 'r-de' ? 'relDe' : 'relAte'] = t.value; render(); }
  if (t.id === 'r-pess') S.relPess = t.checked;
  if (t.dataset.papel) guard(async () => { await rpc('definir_papel', { p_usuario: t.dataset.papel, p_papel: t.value }); await refresh(); toast('Acesso atualizado'); });
});
document.addEventListener('input', e => {
  if (e.target.form?.dataset.f === 'nova') { if (e.target.id === 'f-cep') { const c = dig(e.target.value).slice(0,8); e.target.value = c.length > 5 ? c.slice(0,5) + '-' + c.slice(5) : c; nvCep(c); } nvSync(); }
  if (e.target.id === 'f-busca') { S.finQ = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#f-busca'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } return; }
  if (e.target.id === 'a-busca') { S.admQ = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#a-busca'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } return; } if (['f-phone','f-wa','p-phone','c-tel'].includes(e.target.id)) { const d = dig(e.target.value).slice(0,11); e.target.value = d.length > 2 ? fph(d) || d : d; } });

const okEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function authErr(e){
  const t = String(e?.message || '');
  if (/invalid login credentials/i.test(t)) return 'E-mail ou senha incorretos.';
  if (/already registered|already exists/i.test(t)) return 'Este e-mail já tem conta. Use a aba Entrar.';
  if (/password.*(at least|characters|weak)/i.test(t)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate|limit|seconds|too many/i.test(t)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (/expired|invalid.*(otp|token)|otp/i.test(t)) return 'Código inválido ou vencido. Peça um novo código.';
  return msg(e);
}
const forms = {
  login: fd => guard(async () => {
    const m = S.authMode, g = k => String(fd.get(k)||'');
    const email = g('email').trim().toLowerCase(), pass = g('l-pass'), pass2 = g('l-pass2');
    if (['entrar','criar','esqueci'].includes(m)) { if (!okEmail(email)) return showErr('#l-err', 'Digite um e-mail válido.'); S.email = email; }
    if (['criar','redefinir','novaSenha'].includes(m)) {
      if (pass.length < 6) return showErr('#l-err', 'A senha precisa ter pelo menos 6 caracteres.');
      if (pass !== pass2) return showErr('#l-err', 'As duas senhas não são iguais.');
    }
    if (m === 'entrar') {
      if (!pass) return showErr('#l-err', 'Digite sua senha.');
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) {
        if (/not confirmed/i.test(error.message)) { await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: SITE } }); S.authMode = 'confirmar'; render(); return; }
        return showErr('#l-err', authErr(error));
      }
      return onSession(data.session);
    }
    if (m === 'criar') {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: SITE } });
      if (error) return showErr('#l-err', authErr(error));
      if (data.session) return onSession(data.session);
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return showErr('#l-err', 'Este e-mail já tem conta. Use a aba Entrar.');
      S.authMode = 'confirmar'; render(); setTimeout(() => $('#l-code')?.focus(), 50); return;
    }
    if (m === 'confirmar') {
      const token = dig(fd.get('code')); if (token.length < 6) return showErr('#l-err', 'Digite o código que chegou no seu e-mail.');
      const { data, error } = await sb.auth.verifyOtp({ email: S.email, token, type: 'signup' });
      if (error) return showErr('#l-err', authErr(error));
      return onSession(data.session);
    }
    if (m === 'esqueci') {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: SITE });
      if (error) return showErr('#l-err', authErr(error));
      S.authMode = 'redefinir'; render(); setTimeout(() => $('#l-code')?.focus(), 50); return;
    }
    if (m === 'redefinir') {
      const token = dig(fd.get('code')); if (token.length < 6) return showErr('#l-err', 'Digite o código que chegou no seu e-mail.');
      const v = await sb.auth.verifyOtp({ email: S.email, token, type: 'recovery' });
      if (v.error) return showErr('#l-err', authErr(v.error));
      const u = await sb.auth.updateUser({ password: pass });
      if (u.error) return showErr('#l-err', authErr(u.error));
      S.authMode = 'entrar'; toast('Senha nova salva'); return onSession(v.data.session);
    }
    if (m === 'novaSenha') {
      const u = await sb.auth.updateUser({ password: pass });
      if (u.error) return showErr('#l-err', authErr(u.error));
      S.authMode = 'entrar'; history.replaceState(null, '', location.pathname); toast('Senha nova salva');
      const { data } = await sb.auth.getSession(); return onSession(data.session);
    }
  }),
  cadastro: fd => guard(async () => {
    const g = k => String(fd.get(k)||'').trim();
    if (!g('nome')) return showErr('#c-err', 'Informe seu nome completo.');
    if (dig(g('telefone')).length < 10) return showErr('#c-err', 'Informe seu celular com DDD.');
    if (g('convite_acesso')) {
      try { await rpc('cadastro_por_convite', { p_token: g('convite_acesso'), p_nome: g('nome'), p_telefone: dig(g('telefone')) }); }
      catch(e) { return showErr('#c-err', msg(e)); }
      saveLS('rendique-convite-acesso', null); S.convAcesso = null; S.convInfo = null;
      await onSession(S.session);
      return toast('Cadastro concluído!');
    }
    if (g('gestor')) {
      try { await rpc('completar_cadastro', { p_nome: g('nome'), p_telefone: dig(g('telefone')), p_funcao: 'Gestor', p_condominio_id: null, p_condominio_texto: null, p_convite: null }); }
      catch(e) { return showErr('#c-err', msg(e)); }
      await onSession(S.session);
      return toast(papel() === 'admin' ? 'Pronto! Este é o seu painel de gestor.' : 'Cadastro concluído.');
    }
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
    const d = S.nd = nvDados(), g = k => String(d[k]||'').trim();
    for (let p = 0; p < 4; p++) { const e = nvErro(p, d); if (e) { if ($('form.nvA')) { S.nvStep = p; nvSync(); } return showErr($('form.nvA') ? '#f-err-p' : '#f-err', e); } }
    if (!d.consent) return showErr('#f-err', 'Marque a confirmação de autorização do proprietário.');
    const onde = d.onde || nvOnde(), cid = onde === 'meu' ? S.perfil.condominio_id : onde === 'lista' ? g('condo') : null;
    const end = onde === 'novo' ? [g('cnome'), `${g('end')}, ${g('numero')} – ${g('bairro')}, ${g('cidade')}${dig(g('cep')).length === 8 ? ' · CEP ' + g('cep') : ''}`].filter(Boolean).join(' · ') : null;
    let r;
    try {
      r = await rpc('enviar_indicacao', { p: {
        proprietario_nome: g('owner'), telefone: dig(g('phone')), whatsapp: d.samewa ? dig(g('phone')) : dig(g('wa')) || dig(g('phone')), horario: g('horario'),
        condominio_id: cid, unidade: nvUnidade(d), endereco: end,
        tipo: g('tipo'), dormitorios: g('dorms'), interesse: g('interesse'), quando: g('quando'), como: g('como'), observacoes: g('obs'), consentimento: true } });
    } catch(e) { return showErr('#f-err', msg(e)); }
    S.nd = null; S.nvStep = 0;
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
  pix: fd => guard(async () => {
    try { await rpc('atualizar_pix', { p_tipo: String(fd.get('tipo')||''), p_chave: String(fd.get('chave')||'') }); } catch(e) { return showErr('#x-err', msg(e)); }
    S.editPix = false; await loadPerfil(); render(); toast('Chave Pix salva');
  }),
  pagamento: fd => guard(async () => {
    const ind = String(fd.get('ind')), codigo = String(fd.get('codigo')||'').trim(), file = fd.get('arquivo');
    let caminho = null;
    if (!codigo && !(file && file.size)) return showErr('#pg-err', 'Informe o código da transação Pix ou anexe o comprovante.');
    if (file && file.size) {
      if (file.size > 8 * 1024 * 1024) return showErr('#pg-err', 'O arquivo passa de 8 MB. Envie uma foto menor.');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      caminho = `${ind}/${Date.now()}.${ext}`;
      const { error } = await sb.storage.from('comprovantes').upload(caminho, file, { upsert: false, contentType: file.type || undefined });
      if (error) return showErr('#pg-err', 'Não foi possível enviar o comprovante: ' + msg(error));
    }
    const fn = String(fd.get('modo')) === 'anexar' ? 'anexar_comprovante' : 'registrar_pagamento';
    try { await rpc(fn, { p_indicacao: ind, p_data: String(fd.get('data')||'') || null, p_codigo: codigo || null, p_arquivo: caminho }); }
    catch(e) { return showErr('#pg-err', msg(e)); }
    closeModal(); await refresh(); toast(fn === 'anexar_comprovante' ? 'Comprovante salvo' : 'Pagamento registrado');
  }),
  cfg: fd => guard(async () => { await rpc('definir_valor_recompensa', { p_valor: Math.max(0, Math.round(Number(fd.get('valor')) || 0)) }); await refresh(); toast('Valor salvo'); })
};
document.addEventListener('submit', e => { e.preventDefault(); forms[e.target.dataset.f]?.(new FormData(e.target), e.target); });

boot();
