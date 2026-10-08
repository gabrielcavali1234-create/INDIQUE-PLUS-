# Rendique

> Você conhece a oportunidade. Nós cuidamos do resto.

Plataforma de indicação de oportunidades imobiliárias para porteiros, zeladores, síndicos e outros profissionais de condomínio. O indicador só informa a oportunidade, com autorização do proprietário. Atendimento, avaliação, captação, negociação e venda ficam exclusivamente com profissionais imobiliários habilitados.

**Acesse:** https://darkslategrey-eland-869418.hostingersite.com/

## Identidade visual

- **Logo:** "Janela acesa": um prédio com uma única janela acesa, a oportunidade que o profissional do condomínio enxerga.
- **Cores:** azul-marinho `#1D3A5F` e amarelo `#F5B83D`.
- **Tipografia:** Sora (títulos) e Figtree (textos).

## Celular ou computador

Na primeira visita, o usuário escolhe como quer usar:

- **Celular:** telas enxutas, botões grandes e menu embaixo.
- **Computador:** menu lateral, painéis lado a lado e formulários em colunas.

A escolha fica salva no navegador e pode ser trocada a qualquer momento pelos ícones no topo.

## Estado atual

Sistema com **login (e-mail e senha)** e **banco de dados Supabase**, publicado na Hostinger a partir da branch `main`.

- `index.html` + `app.js`: o sistema real. `config.js`: endereço e chave pública do Supabase.
- `demo.html`: demonstração com dados de exemplo, sem login.
- `supabase/`: esquema do banco (`schema.sql`) e guia de configuração.

Tipos de acesso (definidos no banco; o primeiro cadastro vira gestor):

- **Indicador:** painel, nova indicação com consentimento LGPD, linha do tempo, carteira, QR Code pessoal, convites, privacidade e termos.
- **Corretor:** oportunidades validadas com contato do proprietário e avanço de status.
- **Gestor:** visão geral, funil, financeiro, ranking, indicações, ocorrências de duplicidade, recompensas, condomínios com QR Code, usuários e tipos de acesso, programa, auditoria e relatórios em PDF e Excel. Sininho com notificações em tempo real.

## Regras implementadas

- Recompensa fixa (R$ 20 por padrão) gerada quando a indicação chega a "Oportunidade qualificada". Nenhuma remuneração percentual.
- Bloqueio de duplicidade por telefone ou unidade, com envio para análise administrativa.
- Rede de convites com um único nível; incentivo só pode ser ativado após aprovação jurídica.
- Registro de data, hora, indicador, condomínio e histórico de alterações.

## Onde estamos (06/10/2026)

**Infraestrutura**
- Código: GitHub `gabrielcavali1234-create/INDIQUE-PLUS-` (branch `main` = produção).
- Site: Hostinger, implantado a partir da `main` → https://darkslategrey-eland-869418.hostingersite.com/
- Banco e login: Supabase, projeto `rendique` (São Paulo) → https://sktbupsjzaqbceapgrpl.supabase.co
- Gestor principal: conta criada; papel de gestor travado no e-mail do dono (`configuracoes.email_gestor`).
- Confirmação de e-mail do Supabase: **desligada** por enquanto (ver pendências).

**Pronto e funcionando**
- Login com e-mail e senha, "esqueci minha senha", escolha celular/computador.
- Primeiro acesso do gestor separado (só nome e celular).
- Painel do gestor: visão geral, indicações, ocorrências, recompensas, condomínios, usuários, programa, auditoria, sininho em tempo real.
- Convite por link para **corretor** (uso único, 7 dias) e link fixo de **indicador** (aba Usuários).
- **Relatórios** (aba Relatórios, só gestor): completo, indicações, financeiro, indicadores, condomínios e auditoria, em PDF ou Excel, por período. Telefones e chaves Pix só entram se o gestor marcar a opção.
- Painel do indicador e do corretor; QR Code pessoal e por condomínio.

**Como atualizar o banco**: rodar `supabase/schema.sql` inteiro no SQL Editor (não apaga dados).

## Pendências

- [ ] **Religar a confirmação de e-mail** (Supabase → Authentication → Sign In / Providers → Email → Confirm email). Foi desligada para facilitar o início.
- [ ] **Configurar SMTP próprio** (ex.: Resend) em Authentication → SMTP Settings, para não esbarrar no limite de e-mails do Supabase. Necessário antes de religar a confirmação.
- [ ] Trocar os modelos de e-mail para português com código (guia em `supabase/README.md`, item 3).
- [ ] Ligar a implantação automática na Hostinger (webhook do GitHub).
- [ ] **Domínio `rendique.com.br` → Hostinger** (em andamento):
  1. Registro.br: provedor **HSTDOMAINS (127)** no titular e no domínio.
  2. Hostinger: transferir domínio → "Alterar para os nameservers da Hostinger" → **"Usar registros padrão"** (não manter os registros do Registro.br, que bloqueiam e-mail) → Confirmar.
  3. Quando o domínio estiver ativo: no Painel do site, **Conectar domínio** `rendique.com.br` e ativar SSL.
  4. Supabase → URL Configuration: Site URL `https://rendique.com.br/` e adicionar `https://rendique.com.br/` e `https://www.rendique.com.br/` em Redirect URLs.
- [ ] Aviso ao gestor por e-mail e WhatsApp a cada nova indicação.
- [ ] Testar o fluxo completo: cadastrar condomínio, convidar corretor, porteiro fazer indicação, avançar status, liberar recompensa.

## Próximos passos (depois das pendências)

- Filtros de relatório por condomínio e por porteiro
- API para integração com CRM, pagamentos, assinatura digital e BI
- Criptografia de dados sensíveis no banco

## Aviso

Antes da implantação comercial, as regras de recompensa, os termos de participação e o fluxo operacional devem passar por análise jurídica especializada e pelas normas aplicáveis do CRECI.
