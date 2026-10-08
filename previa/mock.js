window.__SESSION={user:{id:'u-gestor',email:'gestor@exemplo.com'}};
(function(){
const D=864e5, N=Date.now(), iso=t=>new Date(t).toISOString();
const condos=[
 {id:'c1',nome:'Residencial Jardim das Acácias',endereco:'Rua Domingos de Morais, 1820',bairro:'Vila Mariana',cidade:'São Paulo',regiao:'Zona Sul'},
 {id:'c2',nome:'Condomínio Vila Real',endereco:'Alameda Rio Negro, 450',bairro:'Alphaville',cidade:'Barueri',regiao:'Oeste'},
 {id:'c3',nome:'Edifício Monte Azul',endereco:'Rua dos Pinheiros, 905',bairro:'Pinheiros',cidade:'São Paulo',regiao:'Zona Oeste'},
 {id:'c4',nome:'Residencial Bosque Verde',endereco:'Av. dos Autonomistas, 3100',bairro:'Centro',cidade:'Osasco',regiao:'Oeste'}];
const P=(id,nome,funcao,papel,condo,codigo,dias,conv)=>({id,nome,telefone:'11987654321',funcao,papel,condominio_id:condo,codigo,ativo:true,criado_em:iso(N-dias*D),convidado_por:conv||null});
const perfis=[P('u-gestor','Gabriel Cavali','Gestor','admin',null,'GAB-1A2B',30),Object.assign(P('u1','João Batista','Porteiro','indicador','c1','JOA-8F72',28),{pix_tipo:'Celular',pix_chave:'11987654321'}),P('u2','Cláudia Ramos','Zeladora','indicador','c2','CLA-3K19',20,'u1'),P('u3','Severino Alves','Síndico','indicador','c3','SEV-7D40',15),P('u4','Rita Moura','Porteira','indicador','c4','RIT-2B85',4,'u1'),P('u5','Ana Prado','Corretora','corretor',null,'ANA-5C11',25)];
const rows=[[109,'u1','c1','Marta Siqueira','Apto 82 · Bloco B',7,26],[110,'u1','c1','Hélio Nogueira','Apto 21 · Bloco A',8,24],[111,'u2','c2','Mário Fontes','Casa 7',6,19],[113,'u1','c1','Paula Andrade','Apto 134 · Bloco A',6,17],[115,'u2','c2','Denise Araújo','Casa 22',3,14],[117,'u3','c3','Gustavo Pires','Apto 51',5,12],[118,'u1','c1','Roberto Kenji','Apto 41 · Bloco C',5,10],[119,'u3','c3','Teresa Lima','Apto 72',1,8],[121,'u1','c1','Lívia Prates','Cobertura 161',4,7],[122,'u1','c1','Otávio Lemos','Apto 63 · Bloco A',3,5],[123,'u1','c1','Sandra Viegas','Apto 12 · Bloco C',2,3],[124,'u1','c1','Fábio Torres','Apto 93 · Bloco B',1,2],[126,'u4','c4','Jorge Almeida','Apto 33 · Torre 2',0,1],[127,'u1','c1','Celina Rocha','Apto 104 · Bloco A',0,0.05]];
const inds=[],hist=[],rew=[];
rows.forEach(([n,u,c,o,un,st,ago],k)=>{const id='IND-2026-'+String(n).padStart(6,'0');const t0=N-ago*D;
 inds.push({id,indicador_id:u,condominio_id:c,proprietario_nome:o,telefone:'119'+String(87412233+k*1371).slice(0,8),unidade:un,tipo:'Apartamento',dormitorios:'3',horario:'Tarde',origem:k===12?'QR Code pessoal RIT-2B85':'App do indicador',status:st,criado_em:iso(t0),atualizado_em:iso(t0+ago*D*.8),motivo_encerramento:st===8?'Proprietário desistiu da venda':null});
 const steps=st===8?[0,1,2,8]:Array.from({length:st+1},(_,i)=>i);steps.forEach((s,i)=>hist.push({id:hist.length+1,indicacao_id:id,status:s,criado_em:iso(t0+(steps.length>1?ago*D*.8*i/(steps.length-1):0))}));
 if(st>=3&&st!==8)rew.push({id:rew.length+1,indicacao_id:id,indicador_id:u,valor:20,estado:['IND-2026-000109','IND-2026-000113','IND-2026-000111'].includes(id)?'pago':['IND-2026-000118','IND-2026-000117'].includes(id)?'disponivel':'processamento',criado_em:iso(t0+D)});});
inds[3].status=8; // vary
const notifs=[
 {id:1,destinatario_id:'u-gestor',tipo:'nova_indicacao',titulo:'Nova indicação IND-2026-000127',corpo:'João Batista indicou Celina Rocha · Residencial Jardim das Acácias',indicacao_id:'IND-2026-000127',lida:false,criado_em:iso(N-60*60e3)},
 {id:2,destinatario_id:'u-gestor',tipo:'duplicidade',titulo:'Tentativa de indicação duplicada',corpo:'Severino Alves tentou indicar Gustavo Pires, já registrado em IND-2026-000117',indicacao_id:'IND-2026-000117',lida:false,criado_em:iso(N-3*3600e3)},
 {id:3,destinatario_id:'u-gestor',tipo:'nova_indicacao',titulo:'Nova indicação IND-2026-000126',corpo:'QR Code indicou Jorge Almeida · Residencial Bosque Verde',indicacao_id:'IND-2026-000126',lida:false,criado_em:iso(N-D)},
 {id:4,destinatario_id:'u-gestor',tipo:'cadastro',titulo:'Novo indicador cadastrado',corpo:'Rita Moura · Porteira',lida:true,criado_em:iso(N-4*D)},
 {id:5,destinatario_id:'u-gestor',tipo:'resgate',titulo:'Pedido de resgate',corpo:'Cláudia Ramos pediu R$ 20,00',lida:true,criado_em:iso(N-5*D)},
 {id:11,destinatario_id:'u1',tipo:'status',titulo:'Sua indicação avançou',corpo:'IND-2026-000123: Contato realizado',indicacao_id:'IND-2026-000123',lida:false,criado_em:iso(N-2*3600e3)},
 {id:12,destinatario_id:'u1',tipo:'recompensa',titulo:'Recompensa disponível',corpo:'R$ 20,00 · IND-2026-000118',indicacao_id:'IND-2026-000118',lida:false,criado_em:iso(N-D)}];
const ocorr=[{id:1,tentativa_por:'u3',proprietario_nome:'Gustavo Pires',telefone:'11989907766',unidade:'Apto 51',condominio_id:'c3',indicacao_original:'IND-2026-000117',motivo:'Telefone já cadastrado',estado:'aberta',criado_em:iso(N-3*3600e3)}];
const audit=[{id:1,autor_id:null,acao:'Nova indicação IND-2026-000127 (App do indicador)',criado_em:iso(N-3600e3)},{id:2,autor_id:'u5',acao:'IND-2026-000123 → Contato realizado',criado_em:iso(N-2*3600e3)},{id:3,autor_id:null,acao:'Duplicidade bloqueada: tentativa sobre IND-2026-000117',criado_em:iso(N-3*3600e3)},{id:4,autor_id:'u-gestor',acao:'Recompensa de IND-2026-000118 → disponivel',criado_em:iso(N-D)}];
window.__SEEDDB={perfis,condominios:condos,indicacoes:inds,historico:hist,recompensas:rew,ocorrencias:ocorr,notificacoes:notifs,configuracoes:[{id:1,valor_recompensa:20}],auditoria:audit};
})();
(function(){const db=window.__SEEDDB,D=864e5,N=Date.now();
 const pos={c1:[-23.5925,-46.6370],c2:[-23.4985,-46.8490],c3:[-23.5660,-46.6880],c4:[-23.5400,-46.7800]};
 db.condominios.forEach(c=>{if(pos[c.id]){c.latitude=pos[c.id][0];c.longitude=pos[c.id][1];c.geo_precisao='exata';}});
 db.condominios.push({id:'c5',nome:'Condomínio Art Home',endereco:'Av. Doná Blandina Ignêz Júlio, 461',bairro:'Jaguaribe',cidade:'Osasco',regiao:null});
 db.indicacoes.push({id:'IND-2026-000130',indicador_id:null,condominio_id:'c5',proprietario_nome:'Proprietário (exemplo)',telefone:'11999990000',unidade:'Apto 52',tipo:'Apartamento',dormitorios:'2',horario:'Manhã',origem:'QR Code do condomínio',status:1,criado_em:new Date(N-3*D).toISOString(),atualizado_em:new Date(N-3*D).toISOString()});
})();
(function(){
const DB = window.__DB = window.__SEEDDB || { perfis:[], condominios:[{id:'c1',nome:'Residencial Jardim das Acácias',bairro:'Vila Mariana',cidade:'São Paulo',regiao:'Zona Sul'}], indicacoes:[], historico:[], recompensas:[], ocorrencias:[], notificacoes:[], configuracoes:[{id:1,valor_recompensa:20}], auditoria:[] };
let session = window.__SESSION || null; let seq=1, nid=1; const listeners=[];
const now=()=>new Date().toISOString();
function builder(table){
  let rows=null, op='select', patch=null, filters=[], ord=null, lim=null, ret=false;
  const b={
    select(){ret=true;return b}, eq(k,v){filters.push(r=>r[k]===v);return b}, order(k,o){ord=[k,o&&o.ascending===false?-1:1];return b}, limit(n){lim=n;return b}, gte(k,v){filters.push(r=>r[k]>=v);return b}, lt(k,v){filters.push(r=>r[k]<v);return b},
    update(p){op='update';patch=p;return b}, insert(p){op='insert';patch=p;return b},
    then(res,rej){ try{
      let t=DB[table]||(DB[table]=[]);
      if(op==='insert'){const r={id:'x'+(nid++),criado_em:now(),...patch};t.push(r);return res({data:[r],error:null})}
      let out=t.filter(r=>filters.every(f=>f(r)));
      const me=session&&DB.perfis.find(p=>p.id===session.user.id);
      if(table==='notificacoes'&&session) out=out.filter(r=>r.destinatario_id===session.user.id);
      if(me&&me.papel==='indicador'&&(table==='indicacoes'||table==='recompensas')) out=out.filter(r=>r.indicador_id===me.id);
      if(op==='update'){out.forEach(r=>Object.assign(r,patch));return res({data:out,error:null})}
      if(ord) out=[...out].sort((a,b)=>(a[ord[0]]>b[ord[0]]?1:-1)*ord[1]);
      if(lim) out=out.slice(0,lim);
      res({data:out,error:null}) }catch(e){rej(e)} }
  }; return b;
}
const RPC={
  completar_cadastro(a){const p={id:session.user.id,nome:a.p_nome,telefone:a.p_telefone,funcao:a.p_funcao,papel:DB.perfis.some(x=>x.papel==='admin')?'indicador':'admin',condominio_id:a.p_condominio_id,condominio_texto:a.p_condominio_texto,codigo:'GAB-1A2B',ativo:true,criado_em:now()};DB.perfis.push(p);return p},
  enviar_indicacao({p}){ if(DB.indicacoes.some(i=>i.telefone===p.telefone)) return {duplicada:true}; const id='IND-2026-'+String(seq++).padStart(6,'0'); DB.indicacoes.push({id,...p,indicador_id:session.user.id,status:0,origem:'App do indicador',criado_em:now(),atualizado_em:now()}); DB.historico.push({id:nid++,indicacao_id:id,status:0,criado_em:now()}); DB.notificacoes.push({id:nid++,destinatario_id:session.user.id,tipo:'nova_indicacao',titulo:'Nova indicação '+id,corpo:'Teste',indicacao_id:id,lida:false,criado_em:now()}); return {duplicada:false,id}},
  mudar_status(a){const i=DB.indicacoes.find(x=>x.id===a.p_id);i.status=a.p_status;i.motivo_encerramento=a.p_motivo;DB.historico.push({id:nid++,indicacao_id:i.id,status:a.p_status,criado_em:now()}); if(a.p_status>=3&&a.p_status!==8&&!DB.recompensas.some(r=>r.indicacao_id===i.id))DB.recompensas.push({id:nid++,indicacao_id:i.id,indicador_id:i.indicador_id,valor:20,estado:'processamento',criado_em:now()});return null},
  reabrir_indicacao(a){const i=DB.indicacoes.find(x=>x.id===a.p_id);const prev=DB.historico.filter(h=>h.indicacao_id===i.id&&h.status!==8).slice(-1)[0];i.status=Math.max(prev?prev.status:1,1);i.motivo_encerramento=null;DB.historico.push({id:nid++,indicacao_id:i.id,status:i.status,criado_em:now()});return i.status},
  voltar_etapa(a){const i=DB.indicacoes.find(x=>x.id===a.p_id);i.status-=1;DB.historico.push({id:nid++,indicacao_id:i.id,status:i.status,criado_em:now()});return i.status},
  mudar_recompensa(a){DB.recompensas.find(r=>r.indicacao_id===a.p_indicacao).estado=a.p_estado},
  meus_convidados(){return []},
  atualizar_pix(a){const p=DB.perfis.find(x=>x.id===session.user.id);p.pix_tipo=a.p_tipo;p.pix_chave=a.p_chave},
  anexar_comprovante(a){const r=DB.recompensas.find(x=>x.indicacao_id===a.p_indicacao);if(a.p_codigo)r.comprovante_codigo=a.p_codigo;if(a.p_arquivo)r.comprovante_arquivo=a.p_arquivo;r.pago_em=a.p_data||r.pago_em},
  registrar_pagamento(a){const r=DB.recompensas.find(x=>x.indicacao_id===a.p_indicacao);Object.assign(r,{estado:'pago',pago_em:a.p_data,pago_por:session.user.id,comprovante_codigo:a.p_codigo,comprovante_arquivo:a.p_arquivo})},
  criar_convite(a){DB.convites_acesso=DB.convites_acesso||[];const t='tok'+(nid++);DB.convites_acesso.push({token:t,papel:a.p_papel,criado_por:session.user.id,usado_por:null,expira_em:new Date(Date.now()+7*864e5).toISOString(),criado_em:now()});return t},
  info_convite(a){const c=(DB.convites_acesso||[]).find(x=>x.token===a.p_token);return c?{papel:c.papel,valido:!c.usado_por,convidado_por:'Gabriel'}:null},
  cadastro_por_convite(a){const c=DB.convites_acesso.find(x=>x.token===a.p_token);const p={id:session.user.id,nome:a.p_nome,telefone:a.p_telefone,funcao:c.papel==='admin'?'Gestor':'Corretor',papel:c.papel,codigo:'MAR-1',ativo:true,criado_em:now()};DB.perfis.push(p);c.usado_por=p.id;return p},
  cancelar_convite(a){DB.convites_acesso=DB.convites_acesso.filter(x=>x.token!==a.p_token)}, pode_ser_gestor(){return !DB.perfis.some(p=>p.papel==='admin')}, info_qr(){return {nome:'Gabriel',codigo:'GAB-1A2B',condominio:'Residencial Jardim das Acácias'}},
  indicacao_publica(){return {duplicada:false,id:'IND-2026-000099'}}, definir_papel(){}, definir_valor_recompensa(){}, solicitar_resgate(){return 20}, resolver_ocorrencia(){}, solicitar_lgpd(){}
};
window.supabase={createClient(){return {
  auth:{ async getSession(){return {data:{session}}}, async signInWithOtp(){return {error:null}},
    async signUp(){return {data:{user:{identities:[{}]},session:null},error:null}}, async signInWithPassword(a){ if(a.password!=='senha123') return {data:{},error:{message:'Invalid login credentials'}}; session={user:{id:'u-gestor',email:a.email}}; return {data:{session},error:null}}, async resend(){return {error:null}}, async resetPasswordForEmail(){return {error:null}}, async updateUser(){return {data:{},error:null}},
    async verifyOtp(){session={user:{id:'u-gestor',email:'gestor@x.com'}};return {data:{session},error:null}},
    onAuthStateChange(cb){listeners.push(cb);return {data:{subscription:{unsubscribe(){}}}}}, async signOut(){session=null;return {error:null}} },
  from:builder,
  async rpc(n,a){ try{ return {data:RPC[n](a||{}),error:null} }catch(e){ return {data:null,error:{message:e.message}} } },
  storage:{from(){return {async upload(){return {error:null}},async createSignedUrl(){return {data:{signedUrl:'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22160%22><rect width=%22300%22 height=%22160%22 fill=%22%23ddd%22/></svg>'},error:null}}}}},
  channel(){const c={on(a,b,cb){window.__rt=cb;return c},subscribe(){return c}};return c}, removeChannel(){}
}}};
})();
window.RENDIQUE_CONFIG={supabaseUrl:'https://previa.local',supabaseKey:'previa'};
window.__simula=function(){const db=window.__DB,ids=['c5','c3','c2','c4'],c=ids[Math.floor(Math.random()*ids.length)],n=db.indicacoes.length+500,id='IND-2026-'+String(n).padStart(6,'0'),t=new Date().toISOString(),nome=db.condominios.find(x=>x.id===c).nome;
 db.indicacoes.push({id,indicador_id:null,condominio_id:c,proprietario_nome:'Proprietário (exemplo)',telefone:'119'+String(80000000+n),unidade:'Apto '+(10+n%90),tipo:'Apartamento',dormitorios:'2',horario:'Tarde',origem:'QR Code do condomínio',status:0,criado_em:t,atualizado_em:t});
 const no={id:9000+n,destinatario_id:'u-gestor',tipo:'nova_indicacao',titulo:'Nova indicação '+id,corpo:nome,indicacao_id:id,lida:false,criado_em:t};db.notificacoes.push(no);
 if(window.__rt) window.__rt({new:no});};
