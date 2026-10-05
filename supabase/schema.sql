-- =====================================================================
-- RENDIQUE · esquema do banco de dados (Supabase / PostgreSQL)
-- Cole este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Pode rodar de novo sem problema: ele não apaga dados existentes.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.condominios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  endereco    text,
  bairro      text,
  cidade      text default 'São Paulo',
  regiao      text,
  criado_em   timestamptz not null default now()
);

create table if not exists public.perfis (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null,
  telefone         text,
  funcao           text not null default 'Porteiro',
  papel            text not null default 'indicador' check (papel in ('indicador','corretor','admin')),
  condominio_id    uuid references public.condominios(id) on delete set null,
  condominio_texto text,
  codigo           text unique not null,
  convidado_por    uuid references public.perfis(id) on delete set null,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

create sequence if not exists public.indicacao_seq start 1;

create or replace function public.normaliza_unidade(t text) returns text
language sql immutable as $$
  select regexp_replace(
           lower(translate(coalesce(t,''), 'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')),
           '(apartamento|apto|ap|bloco|bl|torre|casa|cobertura|[^a-z0-9])', '', 'g')
$$;

create table if not exists public.indicacoes (
  id                  text primary key default ('IND-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.indicacao_seq')::text, 6, '0')),
  indicador_id        uuid references public.perfis(id) on delete set null,
  condominio_id       uuid references public.condominios(id) on delete set null,
  proprietario_nome   text not null,
  telefone            text not null,
  telefone_norm       text generated always as (regexp_replace(telefone, '\D', '', 'g')) stored,
  whatsapp            text,
  horario             text,
  unidade             text not null,
  unidade_norm        text generated always as (public.normaliza_unidade(unidade)) stored,
  endereco            text,
  tipo                text,
  dormitorios         text,
  interesse           text,
  quando              text,
  como                text,
  observacoes         text,
  origem              text not null default 'App do indicador',
  consentimento       boolean not null check (consentimento),
  consentimento_em    timestamptz not null default now(),
  status              smallint not null default 0 check (status between 0 and 8),
  motivo_encerramento text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index if not exists indicacoes_tel_idx on public.indicacoes (telefone_norm);
create index if not exists indicacoes_un_idx on public.indicacoes (condominio_id, unidade_norm);
create index if not exists indicacoes_ind_idx on public.indicacoes (indicador_id);

create table if not exists public.historico (
  id            bigserial primary key,
  indicacao_id  text not null references public.indicacoes(id) on delete cascade,
  status        smallint not null,
  autor_id      uuid,
  autor_nome    text,
  criado_em     timestamptz not null default now()
);
create index if not exists historico_ind_idx on public.historico (indicacao_id);

create table if not exists public.recompensas (
  id            bigserial primary key,
  indicacao_id  text unique not null references public.indicacoes(id) on delete cascade,
  indicador_id  uuid references public.perfis(id) on delete set null,
  valor         numeric(10,2) not null,
  estado        text not null default 'processamento' check (estado in ('processamento','disponivel','resgate','pago','cancelada')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ocorrencias (
  id                 bigserial primary key,
  tentativa_por      uuid references public.perfis(id) on delete set null,
  proprietario_nome  text,
  telefone           text,
  unidade            text,
  condominio_id      uuid references public.condominios(id) on delete set null,
  indicacao_original text references public.indicacoes(id) on delete set null,
  motivo             text not null,
  estado             text not null default 'aberta' check (estado in ('aberta','mantida','suspeita')),
  criado_em          timestamptz not null default now()
);

create table if not exists public.notificacoes (
  id              bigserial primary key,
  destinatario_id uuid not null references public.perfis(id) on delete cascade,
  tipo            text not null,
  titulo          text not null,
  corpo           text,
  indicacao_id    text references public.indicacoes(id) on delete cascade,
  lida            boolean not null default false,
  criado_em       timestamptz not null default now()
);
create index if not exists notificacoes_dest_idx on public.notificacoes (destinatario_id, lida, criado_em desc);

create table if not exists public.configuracoes (
  id               int primary key default 1 check (id = 1),
  valor_recompensa numeric(10,2) not null default 20
);
insert into public.configuracoes (id) values (1) on conflict do nothing;

create table if not exists public.auditoria (
  id        bigserial primary key,
  autor_id  uuid,
  acao      text not null,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('admin','corretor'), false)
$$;

create or replace function public.registra(acao text) returns void
language sql security definer set search_path = public as $$
  insert into public.auditoria (autor_id, acao) values (auth.uid(), acao)
$$;

create or replace function public.notifica_admins(p_tipo text, p_titulo text, p_corpo text, p_ind text) returns void
language sql security definer set search_path = public as $$
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
  select id, p_tipo, p_titulo, p_corpo, p_ind from public.perfis where papel = 'admin' and ativo
$$;

-- ---------------------------------------------------------------------
-- Cadastro do perfil (o primeiro usuário vira administrador)
-- ---------------------------------------------------------------------
create or replace function public.completar_cadastro(
  p_nome text, p_telefone text, p_funcao text,
  p_condominio_id uuid, p_condominio_texto text, p_convite text
) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare
  v_papel text := 'indicador';
  v_codigo text;
  v_convidador uuid;
  v_perfil public.perfis;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if coalesce(trim(p_nome),'') = '' then raise exception 'Informe seu nome.'; end if;
  select * into v_perfil from public.perfis where id = auth.uid();
  if found then return v_perfil; end if;

  if not exists (select 1 from public.perfis where papel = 'admin') then v_papel := 'admin'; end if;
  if coalesce(trim(p_convite),'') <> '' then
    select id into v_convidador from public.perfis where codigo = upper(trim(p_convite));
  end if;
  loop
    v_codigo := upper(left(regexp_replace(translate(p_nome,'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç','AAAAEEIOOOUCaaaaeeiooouc'),'[^A-Za-z]','','g') || 'XXX', 3))
                || '-' || upper(substr(encode(gen_random_bytes(3),'hex'), 1, 4));
    exit when not exists (select 1 from public.perfis where codigo = v_codigo);
  end loop;

  insert into public.perfis (id, nome, telefone, funcao, papel, condominio_id, condominio_texto, codigo, convidado_por)
  values (auth.uid(), trim(p_nome), p_telefone, coalesce(p_funcao,'Porteiro'), v_papel, p_condominio_id, nullif(trim(p_condominio_texto),''), v_codigo, v_convidador)
  returning * into v_perfil;

  perform public.registra('Novo cadastro: ' || v_perfil.nome || ' (' || v_perfil.papel || ')');
  if v_papel <> 'admin' then
    perform public.notifica_admins('cadastro', 'Novo indicador cadastrado', v_perfil.nome || ' · ' || v_perfil.funcao, null);
  end if;
  return v_perfil;
end $$;

-- ---------------------------------------------------------------------
-- Enviar indicação (com bloqueio de duplicidade)
-- ---------------------------------------------------------------------
create or replace function public._inserir_indicacao(p jsonb, p_indicador uuid, p_origem text, p_autor_nome text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tel text := regexp_replace(coalesce(p->>'telefone',''), '\D', '', 'g');
  v_un  text := public.normaliza_unidade(p->>'unidade');
  v_condo uuid := nullif(p->>'condominio_id','')::uuid;
  v_dup public.indicacoes;
  v_id text;
  v_condo_nome text;
begin
  if coalesce(trim(p->>'proprietario_nome'),'') = '' then raise exception 'Informe o nome do proprietário.'; end if;
  if length(v_tel) < 10 then raise exception 'Informe um telefone com DDD.'; end if;
  if coalesce(trim(p->>'unidade'),'') = '' then raise exception 'Informe a unidade.'; end if;
  if coalesce((p->>'consentimento')::boolean, false) is not true then raise exception 'É preciso confirmar a autorização do proprietário.'; end if;

  select * into v_dup from public.indicacoes
   where status <> 8 and (telefone_norm = v_tel or (v_condo is not null and condominio_id = v_condo and v_un <> '' and unidade_norm = v_un))
   order by criado_em limit 1;

  if found then
    insert into public.ocorrencias (tentativa_por, proprietario_nome, telefone, unidade, condominio_id, indicacao_original, motivo)
    values (p_indicador, p->>'proprietario_nome', v_tel, p->>'unidade', v_condo, v_dup.id,
            case when v_dup.telefone_norm = v_tel then 'Telefone já cadastrado' else 'Imóvel já cadastrado' end);
    perform public.notifica_admins('duplicidade', 'Tentativa de indicação duplicada',
            coalesce(p_autor_nome,'Alguém') || ' tentou indicar ' || (p->>'proprietario_nome') || ', já registrado em ' || v_dup.id, v_dup.id);
    perform public.registra('Duplicidade bloqueada: tentativa sobre ' || v_dup.id);
    return jsonb_build_object('duplicada', true);
  end if;

  insert into public.indicacoes (indicador_id, condominio_id, proprietario_nome, telefone, whatsapp, horario, unidade, endereco,
                                 tipo, dormitorios, interesse, quando, como, observacoes, origem, consentimento)
  values (p_indicador, v_condo, trim(p->>'proprietario_nome'), v_tel, nullif(regexp_replace(coalesce(p->>'whatsapp',''),'\D','','g'),''),
          p->>'horario', trim(p->>'unidade'), nullif(p->>'endereco',''), p->>'tipo', p->>'dormitorios', p->>'interesse',
          p->>'quando', p->>'como', nullif(p->>'observacoes',''), p_origem, true)
  returning id into v_id;

  insert into public.historico (indicacao_id, status, autor_id, autor_nome) values (v_id, 0, p_indicador, coalesce(p_autor_nome, 'Proprietário via QR Code'));
  select nome into v_condo_nome from public.condominios where id = v_condo;
  perform public.notifica_admins('nova_indicacao', 'Nova indicação ' || v_id,
          coalesce(p_autor_nome,'QR Code') || ' indicou ' || trim(p->>'proprietario_nome') || coalesce(' · ' || v_condo_nome, ''), v_id);
  perform public.registra('Nova indicação ' || v_id || ' (' || p_origem || ')');
  return jsonb_build_object('duplicada', false, 'id', v_id);
end $$;
revoke all on function public._inserir_indicacao(jsonb, uuid, text, text) from public, anon, authenticated;

create or replace function public.enviar_indicacao(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  select nome into v_nome from public.perfis where id = auth.uid() and ativo;
  if v_nome is null then raise exception 'Complete seu cadastro antes de indicar.'; end if;
  return public._inserir_indicacao(p, auth.uid(), 'App do indicador', v_nome);
end $$;

-- Formulário público do QR Code (o proprietário preenche sem login)
create or replace function public.indicacao_publica(p_codigo text, p_condominio uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ind public.perfis; v_condo uuid := p_condominio; v_origem text;
begin
  if coalesce(p_codigo,'') <> '' then
    select * into v_ind from public.perfis where codigo = upper(p_codigo) and ativo;
    if v_ind.id is null then raise exception 'QR Code inválido.'; end if;
    v_condo := coalesce(v_condo, v_ind.condominio_id);
    v_origem := 'QR Code pessoal ' || v_ind.codigo;
  else
    if not exists (select 1 from public.condominios where id = v_condo) then raise exception 'QR Code inválido.'; end if;
    v_origem := 'QR Code do condomínio';
  end if;
  return public._inserir_indicacao(p || jsonb_build_object('condominio_id', v_condo), v_ind.id, v_origem, null);
end $$;

-- Dados públicos para a página do QR Code
create or replace function public.info_qr(p_codigo text, p_condominio uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p_codigo,'') <> '' then
      (select jsonb_build_object('nome', split_part(pf.nome,' ',1), 'codigo', pf.codigo, 'condominio', c.nome)
         from public.perfis pf left join public.condominios c on c.id = pf.condominio_id
        where pf.codigo = upper(p_codigo) and pf.ativo)
    else (select jsonb_build_object('condominio', nome) from public.condominios where id = p_condominio)
  end
$$;

-- ---------------------------------------------------------------------
-- Mudança de status (equipe) e recompensa automática
-- ---------------------------------------------------------------------
create or replace function public.mudar_status(p_id text, p_status int, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ind public.indicacoes;
  v_papel text := public.meu_papel();
  v_nome text;
  v_valor numeric;
  v_rotulo text[] := array['Enviada','Em validação','Contato realizado','Oportunidade qualificada','Captação em andamento','Em negociação','Venda concluída','Recompensa liberada','Encerrada'];
begin
  if v_papel not in ('admin','corretor') then raise exception 'Sem permissão.'; end if;
  select * into v_ind from public.indicacoes where id = p_id for update;
  if not found then raise exception 'Indicação não encontrada.'; end if;
  if v_ind.status = 8 then raise exception 'Esta indicação está encerrada.'; end if;
  if p_status < 0 or p_status > 8 or p_status = v_ind.status then raise exception 'Status inválido.'; end if;
  if v_papel = 'corretor' and (v_ind.status = 0 or p_status = 7) then raise exception 'Essa etapa é do administrador.'; end if;

  select nome into v_nome from public.perfis where id = auth.uid();
  update public.indicacoes set status = p_status, atualizado_em = now(),
         motivo_encerramento = case when p_status = 8 then p_motivo else motivo_encerramento end
   where id = p_id;
  insert into public.historico (indicacao_id, status, autor_id, autor_nome) values (p_id, p_status, auth.uid(), v_nome);

  if p_status >= 3 and p_status <> 8 and v_ind.indicador_id is not null
     and not exists (select 1 from public.recompensas where indicacao_id = p_id) then
    select valor_recompensa into v_valor from public.configuracoes where id = 1;
    insert into public.recompensas (indicacao_id, indicador_id, valor) values (p_id, v_ind.indicador_id, v_valor);
    perform public.registra('Recompensa de R$ ' || v_valor || ' gerada para ' || p_id);
  end if;
  if p_status = 8 then
    update public.recompensas set estado = 'cancelada', atualizado_em = now() where indicacao_id = p_id and estado = 'processamento';
  end if;

  if v_ind.indicador_id is not null then
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
    values (v_ind.indicador_id, 'status', 'Sua indicação avançou', p_id || ': ' || v_rotulo[p_status + 1], p_id);
  end if;
  perform public.registra(p_id || ' → ' || v_rotulo[p_status + 1]);
end $$;

-- Recompensas: o admin libera e registra pagamento; o indicador pede resgate
create or replace function public.mudar_recompensa(p_indicacao text, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
declare v_r public.recompensas;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_r from public.recompensas where indicacao_id = p_indicacao for update;
  if not found then raise exception 'Recompensa não encontrada.'; end if;
  if not ((v_r.estado = 'processamento' and p_estado = 'disponivel') or (v_r.estado in ('disponivel','resgate') and p_estado = 'pago')) then
    raise exception 'Mudança de estado não permitida.';
  end if;
  update public.recompensas set estado = p_estado, atualizado_em = now() where id = v_r.id;
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
  values (v_r.indicador_id, 'recompensa', case when p_estado = 'pago' then 'Recompensa paga' else 'Recompensa disponível' end,
          'R$ ' || v_r.valor || ' · ' || p_indicacao, p_indicacao);
  perform public.registra('Recompensa de ' || p_indicacao || ' → ' || p_estado);
end $$;

create or replace function public.solicitar_resgate() returns numeric
language plpgsql security definer set search_path = public as $$
declare v_total numeric; v_nome text;
begin
  select coalesce(sum(valor),0) into v_total from public.recompensas where indicador_id = auth.uid() and estado = 'disponivel';
  if v_total = 0 then raise exception 'Não há saldo disponível.'; end if;
  update public.recompensas set estado = 'resgate', atualizado_em = now() where indicador_id = auth.uid() and estado = 'disponivel';
  select nome into v_nome from public.perfis where id = auth.uid();
  perform public.notifica_admins('resgate', 'Pedido de resgate', v_nome || ' pediu R$ ' || v_total, null);
  perform public.registra('Resgate solicitado: R$ ' || v_total);
  return v_total;
end $$;

create or replace function public.resolver_ocorrencia(p_id bigint, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  if p_estado not in ('mantida','suspeita') then raise exception 'Estado inválido.'; end if;
  update public.ocorrencias set estado = p_estado where id = p_id;
  perform public.registra('Ocorrência ' || p_id || ' → ' || p_estado);
end $$;

create or replace function public.definir_papel(p_usuario uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  if p_papel not in ('indicador','corretor','admin') then raise exception 'Papel inválido.'; end if;
  if p_usuario = auth.uid() and p_papel <> 'admin' then raise exception 'Você não pode remover seu próprio acesso de administrador.'; end if;
  update public.perfis set papel = p_papel where id = p_usuario;
  perform public.registra('Papel de ' || (select nome from public.perfis where id = p_usuario) || ' → ' || p_papel);
end $$;

create or replace function public.definir_valor_recompensa(p_valor numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  if p_valor < 0 then raise exception 'Valor inválido.'; end if;
  update public.configuracoes set valor_recompensa = p_valor where id = 1;
  perform public.registra('Valor da recompensa → R$ ' || p_valor);
end $$;

create or replace function public.solicitar_lgpd(p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  select nome into v_nome from public.perfis where id = auth.uid();
  perform public.notifica_admins('lgpd', 'Pedido LGPD: ' || p_tipo, coalesce(v_nome,'Usuário') || ' pediu ' || p_tipo || ' de dados', null);
  perform public.registra('Solicitação LGPD: ' || p_tipo);
end $$;

create or replace function public.meus_convidados()
returns table (nome text, funcao text, condominio text, criado_em timestamptz, indicacoes bigint)
language sql stable security definer set search_path = public as $$
  select p.nome, p.funcao, coalesce(c.nome, p.condominio_texto), p.criado_em,
         (select count(*) from public.indicacoes i where i.indicador_id = p.id)
    from public.perfis p left join public.condominios c on c.id = p.condominio_id
   where p.convidado_por = auth.uid()
   order by p.criado_em desc
$$;

-- ---------------------------------------------------------------------
-- Segurança: Row Level Security
-- ---------------------------------------------------------------------
alter table public.condominios   enable row level security;
alter table public.perfis        enable row level security;
alter table public.indicacoes    enable row level security;
alter table public.historico     enable row level security;
alter table public.recompensas   enable row level security;
alter table public.ocorrencias   enable row level security;
alter table public.notificacoes  enable row level security;
alter table public.configuracoes enable row level security;
alter table public.auditoria     enable row level security;

drop policy if exists condominios_ler on public.condominios;
create policy condominios_ler on public.condominios for select to authenticated using (true);
drop policy if exists condominios_admin on public.condominios;
create policy condominios_admin on public.condominios for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated using (id = auth.uid() or public.is_staff());

drop policy if exists indicacoes_ler on public.indicacoes;
create policy indicacoes_ler on public.indicacoes for select to authenticated
  using (indicador_id = auth.uid() or public.is_admin() or (public.meu_papel() = 'corretor' and status >= 1));

drop policy if exists historico_ler on public.historico;
create policy historico_ler on public.historico for select to authenticated
  using (exists (select 1 from public.indicacoes i where i.id = indicacao_id));

drop policy if exists recompensas_ler on public.recompensas;
create policy recompensas_ler on public.recompensas for select to authenticated using (indicador_id = auth.uid() or public.is_admin());

drop policy if exists ocorrencias_ler on public.ocorrencias;
create policy ocorrencias_ler on public.ocorrencias for select to authenticated using (public.is_admin());

drop policy if exists notificacoes_ler on public.notificacoes;
create policy notificacoes_ler on public.notificacoes for select to authenticated using (destinatario_id = auth.uid());
drop policy if exists notificacoes_marcar on public.notificacoes;
create policy notificacoes_marcar on public.notificacoes for update to authenticated
  using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());

drop policy if exists configuracoes_ler on public.configuracoes;
create policy configuracoes_ler on public.configuracoes for select to authenticated using (true);

drop policy if exists auditoria_ler on public.auditoria;
create policy auditoria_ler on public.auditoria for select to authenticated using (public.is_admin());

-- Permissões de coluna: o usuário só pode marcar notificação como lida
revoke update on public.notificacoes from authenticated;
grant update (lida) on public.notificacoes to authenticated;
revoke insert, update, delete on public.indicacoes, public.historico, public.recompensas, public.ocorrencias,
  public.perfis, public.configuracoes, public.auditoria from anon, authenticated;
revoke all on public.condominios from anon;

-- Funções: quem pode chamar
revoke execute on function public.completar_cadastro(text,text,text,uuid,text,text), public.enviar_indicacao(jsonb),
  public.mudar_status(text,int,text), public.mudar_recompensa(text,text), public.solicitar_resgate(),
  public.resolver_ocorrencia(bigint,text), public.definir_papel(uuid,text), public.definir_valor_recompensa(numeric),
  public.solicitar_lgpd(text), public.registra(text), public.notifica_admins(text,text,text,text) from public, anon;
revoke execute on function public.registra(text), public.notifica_admins(text,text,text,text) from authenticated;
grant execute on function public.indicacao_publica(text,uuid,jsonb), public.info_qr(text,uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Tempo real: o sininho do gestor acende na hora
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificacoes') then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;
