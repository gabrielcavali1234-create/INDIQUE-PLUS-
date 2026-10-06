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
- **Gestor:** visão geral, funil, financeiro, ranking, indicações, ocorrências de duplicidade, recompensas, condomínios com QR Code, usuários e tipos de acesso, programa e auditoria. Sininho com notificações em tempo real.

## Regras implementadas

- Recompensa fixa (R$ 20 por padrão) gerada quando a indicação chega a "Oportunidade qualificada". Nenhuma remuneração percentual.
- Bloqueio de duplicidade por telefone ou unidade, com envio para análise administrativa.
- Rede de convites com um único nível; incentivo só pode ser ativado após aprovação jurídica.
- Registro de data, hora, indicador, condomínio e histórico de alterações.

## Próximos passos

- Aviso ao gestor por e-mail e WhatsApp
- SMTP próprio para os e-mails de cadastro e senha
- API para integração com CRM, pagamentos, assinatura digital e BI
- Criptografia de dados sensíveis e controle de permissões no servidor

## Aviso

Antes da implantação comercial, as regras de recompensa, os termos de participação e o fluxo operacional devem passar por análise jurídica especializada e pelas normas aplicáveis do CRECI.
