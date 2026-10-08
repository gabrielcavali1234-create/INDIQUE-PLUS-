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
-- localização no mapa (preenchida pelo painel a partir do endereço; o gestor pode ajustar o pino)
alter table public.condominios add column if not exists latitude     double precision;
alter table public.condominios add column if not exists longitude    double precision;
alter table public.condominios add column if not exists geo_precisao text;

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
-- Opcional: trava o papel de gestor num e-mail específico (update configuracoes set email_gestor = '...')
alter table public.configuracoes add column if not exists email_gestor text;

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
-- O usuário logado pode virar gestor? (ainda não existe gestor e, se houver
-- e-mail travado em configuracoes.email_gestor, é esse e-mail)
create or replace function public.pode_ser_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not exists (select 1 from public.perfis where papel = 'admin')
     and coalesce((select lower(email_gestor) from public.configuracoes where id = 1),
                  (select lower(email) from auth.users where id = auth.uid()))
         = (select lower(email) from auth.users where id = auth.uid())
$$;
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

  if public.pode_ser_gestor() then v_papel := 'admin'; end if;
  if coalesce(trim(p_convite),'') <> '' and v_papel <> 'admin' then
    select id into v_convidador from public.perfis where codigo = upper(trim(p_convite));
  end if;
  loop
    v_codigo := upper(left(regexp_replace(translate(p_nome,'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç','AAAAEEIOOOUCaaaaeeiooouc'),'[^A-Za-z]','','g') || 'XXX', 3))
                || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (select 1 from public.perfis where codigo = v_codigo);
  end loop;

  insert into public.perfis (id, nome, telefone, funcao, papel, condominio_id, condominio_texto, codigo, convidado_por)
  values (auth.uid(), trim(p_nome), p_telefone,
          case when v_papel = 'admin' then 'Gestor' else coalesce(p_funcao,'Porteiro') end, v_papel,
          case when v_papel = 'admin' then null else p_condominio_id end,
          case when v_papel = 'admin' then null else nullif(trim(p_condominio_texto),'') end, v_codigo, v_convidador)
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

  if p_status >= 3 and p_status <> 8 and v_ind.indicador_id is not null then
    if not exists (select 1 from public.recompensas where indicacao_id = p_id) then
      select valor_recompensa into v_valor from public.configuracoes where id = 1;
      insert into public.recompensas (indicacao_id, indicador_id, valor) values (p_id, v_ind.indicador_id, v_valor);
      perform public.registra('Recompensa de R$ ' || v_valor || ' gerada para ' || p_id);
    else
      update public.recompensas set estado = 'processamento', atualizado_em = now() where indicacao_id = p_id and estado = 'cancelada';
    end if;
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

create or replace function public.reabrir_indicacao(p_id text) returns smallint
language plpgsql security definer set search_path = public as $$
declare
  v_ind public.indicacoes;
  v_prev smallint;
  v_nome text;
  v_rotulo text[] := array['Enviada','Em validação','Contato realizado','Oportunidade qualificada','Captação em andamento','Em negociação','Venda concluída','Recompensa liberada','Encerrada'];
begin
  if not public.is_admin() then raise exception 'Só o gestor pode reabrir uma indicação.'; end if;
  select * into v_ind from public.indicacoes where id = p_id for update;
  if not found then raise exception 'Indicação não encontrada.'; end if;
  if v_ind.status <> 8 then raise exception 'Esta indicação não está encerrada.'; end if;

  select status into v_prev from public.historico
   where indicacao_id = p_id and status <> 8 order by criado_em desc, id desc limit 1;
  v_prev := greatest(coalesce(v_prev, 1), 1);

  select nome into v_nome from public.perfis where id = auth.uid();
  update public.indicacoes set status = v_prev, motivo_encerramento = null, atualizado_em = now() where id = p_id;
  insert into public.historico (indicacao_id, status, autor_id, autor_nome) values (p_id, v_prev, auth.uid(), v_nome || ' (reaberta)');
  if v_prev >= 3 then
    update public.recompensas set estado = 'processamento', atualizado_em = now() where indicacao_id = p_id and estado = 'cancelada';
  end if;
  if v_ind.indicador_id is not null then
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
    values (v_ind.indicador_id, 'status', 'Sua indicação foi reaberta', p_id || ': ' || v_rotulo[v_prev + 1], p_id);
  end if;
  perform public.registra(p_id || ' reaberta → ' || v_rotulo[v_prev + 1]);
  return v_prev;
end $$;
revoke execute on function public.reabrir_indicacao(text) from public, anon;
grant execute on function public.reabrir_indicacao(text) to authenticated;

create or replace function public.voltar_etapa(p_id text) returns smallint
language plpgsql security definer set search_path = public as $$
declare
  v_ind public.indicacoes;
  v_novo smallint;
  v_rew public.recompensas;
  v_nome text;
  v_rotulo text[] := array['Enviada','Em validação','Contato realizado','Oportunidade qualificada','Captação em andamento','Em negociação','Venda concluída','Recompensa liberada','Encerrada'];
begin
  if not public.is_admin() then raise exception 'Só o gestor pode voltar etapas.'; end if;
  select * into v_ind from public.indicacoes where id = p_id for update;
  if not found then raise exception 'Indicação não encontrada.'; end if;
  if v_ind.status = 8 then raise exception 'Indicação encerrada: use "Reabrir indicação".'; end if;
  if v_ind.status = 0 then raise exception 'Esta indicação já está na primeira etapa.'; end if;
  v_novo := v_ind.status - 1;

  select * into v_rew from public.recompensas where indicacao_id = p_id;
  if found and v_novo < 3 and v_rew.estado in ('disponivel','resgate','pago') then
    raise exception 'A recompensa desta indicação já foi liberada ou paga. Não dá para voltar para antes de "Oportunidade qualificada".';
  end if;

  select nome into v_nome from public.perfis where id = auth.uid();
  update public.indicacoes set status = v_novo, atualizado_em = now() where id = p_id;
  insert into public.historico (indicacao_id, status, autor_id, autor_nome) values (p_id, v_novo, auth.uid(), v_nome || ' (voltou etapa)');
  if v_novo < 3 then
    update public.recompensas set estado = 'cancelada', atualizado_em = now() where indicacao_id = p_id and estado = 'processamento';
  end if;
  if v_ind.indicador_id is not null then
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
    values (v_ind.indicador_id, 'status', 'Sua indicação foi atualizada', p_id || ': ' || v_rotulo[v_novo + 1], p_id);
  end if;
  perform public.registra(p_id || ' voltou para ' || v_rotulo[v_novo + 1]);
  return v_novo;
end $$;
revoke execute on function public.voltar_etapa(text) from public, anon;
grant execute on function public.voltar_etapa(text) to authenticated;

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

-- Permissões básicas (funciona com ou sem "Expor automaticamente novas tabelas")
grant usage on schema public to anon, authenticated;
grant select on public.condominios, public.perfis, public.indicacoes, public.historico, public.recompensas,
  public.ocorrencias, public.notificacoes, public.configuracoes, public.auditoria to authenticated;
grant insert, update, delete on public.condominios to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.completar_cadastro(text,text,text,uuid,text,text), public.enviar_indicacao(jsonb),
  public.mudar_status(text,int,text), public.mudar_recompensa(text,text), public.solicitar_resgate(),
  public.resolver_ocorrencia(bigint,text), public.definir_papel(uuid,text), public.definir_valor_recompensa(numeric),
  public.solicitar_lgpd(text), public.meus_convidados(), public.meu_papel(), public.is_admin(), public.is_staff(),
  public.pode_ser_gestor()
  to authenticated;

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
-- Convites de gestor e corretor (link de uso único, vale 7 dias)
-- ---------------------------------------------------------------------
create table if not exists public.convites_acesso (
  token      text primary key default replace(gen_random_uuid()::text, '-', ''),
  papel      text not null check (papel in ('admin','corretor')),
  criado_por uuid references public.perfis(id) on delete set null,
  usado_por  uuid references public.perfis(id) on delete set null,
  usado_em   timestamptz,
  expira_em  timestamptz not null default now() + interval '7 days',
  criado_em  timestamptz not null default now()
);
alter table public.convites_acesso enable row level security;
drop policy if exists convites_admin on public.convites_acesso;
create policy convites_admin on public.convites_acesso for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.convites_acesso from anon, authenticated;
grant select on public.convites_acesso to authenticated;

create or replace function public._novo_codigo(p_nome text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  loop
    v := upper(left(regexp_replace(translate(p_nome,'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç','AAAAEEIOOOUCaaaaeeiooouc'),'[^A-Za-z]','','g') || 'XXX', 3))
         || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    exit when not exists (select 1 from public.perfis where codigo = v);
  end loop;
  return v;
end $$;

create or replace function public.criar_convite(p_papel text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  if p_papel not in ('admin','corretor') then raise exception 'Tipo de convite inválido.'; end if;
  insert into public.convites_acesso (papel, criado_por) values (p_papel, auth.uid()) returning token into v;
  perform public.registra('Convite de ' || case when p_papel = 'admin' then 'gestor' else 'corretor' end || ' criado');
  return v;
end $$;

create or replace function public.cancelar_convite(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  delete from public.convites_acesso where token = p_token and usado_por is null;
  perform public.registra('Convite cancelado');
end $$;

create or replace function public.info_convite(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('papel', c.papel, 'valido', c.usado_por is null and c.expira_em > now(),
                            'convidado_por', split_part(p.nome, ' ', 1))
    from public.convites_acesso c left join public.perfis p on p.id = c.criado_por
   where c.token = p_token
$$;

create or replace function public.cadastro_por_convite(p_token text, p_nome text, p_telefone text) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare v_c public.convites_acesso; v_perfil public.perfis;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if coalesce(trim(p_nome),'') = '' then raise exception 'Informe seu nome.'; end if;
  select * into v_perfil from public.perfis where id = auth.uid();
  if found then raise exception 'Este e-mail já tem cadastro no Rendique.'; end if;
  select * into v_c from public.convites_acesso where token = p_token for update;
  if not found then raise exception 'Convite não encontrado.'; end if;
  if v_c.usado_por is not null then raise exception 'Este convite já foi usado. Peça um novo ao gestor.'; end if;
  if v_c.expira_em < now() then raise exception 'Este convite venceu. Peça um novo ao gestor.'; end if;

  insert into public.perfis (id, nome, telefone, funcao, papel, codigo)
  values (auth.uid(), trim(p_nome), p_telefone, case when v_c.papel = 'admin' then 'Gestor' else 'Corretor' end, v_c.papel, public._novo_codigo(p_nome))
  returning * into v_perfil;
  update public.convites_acesso set usado_por = auth.uid(), usado_em = now() where token = p_token;

  perform public.registra('Cadastro por convite: ' || v_perfil.nome || ' (' || v_perfil.papel || ')');
  perform public.notifica_admins('cadastro', case when v_c.papel = 'admin' then 'Novo gestor cadastrado' else 'Novo corretor cadastrado' end, v_perfil.nome, null);
  return v_perfil;
end $$;

revoke execute on function public._novo_codigo(text), public.criar_convite(text), public.cancelar_convite(text),
  public.cadastro_por_convite(text,text,text) from public, anon;
revoke execute on function public._novo_codigo(text) from authenticated;
grant execute on function public.criar_convite(text), public.cancelar_convite(text), public.cadastro_por_convite(text,text,text) to authenticated;
grant execute on function public.info_convite(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Pagamento de recompensas via Pix, com comprovante
-- ---------------------------------------------------------------------
alter table public.perfis add column if not exists pix_tipo text;
alter table public.perfis add column if not exists pix_chave text;
alter table public.recompensas add column if not exists pago_em date;
alter table public.recompensas add column if not exists pago_por uuid references public.perfis(id) on delete set null;
alter table public.recompensas add column if not exists comprovante_codigo text;
alter table public.recompensas add column if not exists comprovante_arquivo text;
alter table public.recompensas add column if not exists registrado_em timestamptz;

create or replace function public.atualizar_pix(p_tipo text, p_chave text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if p_tipo not in ('CPF','Celular','E-mail','Chave aleatória') then raise exception 'Escolha o tipo da chave Pix.'; end if;
  if coalesce(trim(p_chave),'') = '' then raise exception 'Informe a chave Pix.'; end if;
  update public.perfis set pix_tipo = p_tipo, pix_chave = trim(p_chave) where id = auth.uid();
  perform public.registra('Chave Pix atualizada');
end $$;

create or replace function public.registrar_pagamento(p_indicacao text, p_data date, p_codigo text, p_arquivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_r public.recompensas;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_r from public.recompensas where indicacao_id = p_indicacao for update;
  if not found then raise exception 'Recompensa não encontrada.'; end if;
  if v_r.estado not in ('disponivel','resgate') then raise exception 'Esta recompensa não está liberada para pagamento.'; end if;
  if coalesce(trim(p_codigo),'') = '' and coalesce(trim(p_arquivo),'') = '' then
    raise exception 'Informe o código da transação Pix ou anexe o comprovante.';
  end if;
  update public.recompensas
     set estado = 'pago', atualizado_em = now(), registrado_em = now(),
         pago_em = coalesce(p_data, current_date), pago_por = auth.uid(),
         comprovante_codigo = nullif(trim(p_codigo),''), comprovante_arquivo = nullif(trim(p_arquivo),'')
   where id = v_r.id;
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, indicacao_id)
  values (v_r.indicador_id, 'recompensa', 'Recompensa paga', 'R$ ' || v_r.valor || ' · ' || p_indicacao, p_indicacao);
  perform public.registra('Pagamento registrado: ' || p_indicacao || ' (R$ ' || v_r.valor || ')');
end $$;

revoke execute on function public.atualizar_pix(text,text), public.registrar_pagamento(text,date,text,text) from public, anon;
grant execute on function public.atualizar_pix(text,text), public.registrar_pagamento(text,date,text,text) to authenticated;

create or replace function public.anexar_comprovante(p_indicacao text, p_data date, p_codigo text, p_arquivo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_r public.recompensas;
begin
  if not public.is_admin() then raise exception 'Sem permissão.'; end if;
  select * into v_r from public.recompensas where indicacao_id = p_indicacao for update;
  if not found then raise exception 'Recompensa não encontrada.'; end if;
  if v_r.estado <> 'pago' then raise exception 'Use "Pagar via Pix" para recompensas ainda não pagas.'; end if;
  if coalesce(trim(p_codigo),'') = '' and coalesce(trim(p_arquivo),'') = '' then
    raise exception 'Informe o código da transação Pix ou anexe o comprovante.';
  end if;
  update public.recompensas
     set pago_em = coalesce(p_data, pago_em, current_date),
         pago_por = coalesce(pago_por, auth.uid()),
         comprovante_codigo = coalesce(nullif(trim(p_codigo),''), comprovante_codigo),
         comprovante_arquivo = coalesce(nullif(trim(p_arquivo),''), comprovante_arquivo),
         registrado_em = now(), atualizado_em = now()
   where id = v_r.id;
  perform public.registra('Comprovante anexado: ' || p_indicacao);
end $$;
revoke execute on function public.anexar_comprovante(text,date,text,text) from public, anon;
grant execute on function public.anexar_comprovante(text,date,text,text) to authenticated;

-- Pasta privada para os comprovantes (Supabase Storage)
insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;
drop policy if exists comprovantes_enviar on storage.objects;
create policy comprovantes_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.is_admin());
drop policy if exists comprovantes_ver on storage.objects;
create policy comprovantes_ver on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (public.is_admin()
         or exists (select 1 from public.recompensas r where r.comprovante_arquivo = name and r.indicador_id = auth.uid())));

-- ---------------------------------------------------------------------
-- Tempo real: o sininho do gestor acende na hora
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificacoes') then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;
