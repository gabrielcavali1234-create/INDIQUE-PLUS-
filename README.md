# Rendique

> Você conhece a oportunidade. Nós cuidamos do resto.

Plataforma de indicação de oportunidades imobiliárias para porteiros, zeladores, síndicos e outros profissionais de condomínio. O indicador só informa a oportunidade, com autorização do proprietário. Atendimento, avaliação, captação, negociação e venda ficam exclusivamente com profissionais imobiliários habilitados.

**Acesse:** https://gabrielcavali1234-create.github.io/INDIQUE-PLUS-/

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

Protótipo navegável em um único arquivo (`index.html`), com dados de exemplo em memória.

Perfis disponíveis (troca no topo da página):

- **Indicador:** painel, nova indicação com consentimento LGPD, linha do tempo, carteira, QR Code pessoal, página pública do proprietário, convites, privacidade e termos, login por código.
- **Corretor:** oportunidades validadas com contato do proprietário e avanço de status.
- **Admin:** KPIs, funil, financeiro, top indicadores, validação, ocorrências de duplicidade, recompensas, condomínios com QR Code, configuração do programa e auditoria.

## Regras implementadas

- Recompensa fixa (R$ 20 por padrão) gerada quando a indicação chega a "Oportunidade qualificada". Nenhuma remuneração percentual.
- Bloqueio de duplicidade por telefone ou unidade, com envio para análise administrativa.
- Rede de convites com um único nível; incentivo só pode ser ativado após aprovação jurídica.
- Registro de data, hora, indicador, condomínio e histórico de alterações.

## Próximos passos

- Backend com banco de dados e autenticação por código (WhatsApp/SMS/e-mail)
- API para integração com CRM, pagamentos, assinatura digital e BI
- Criptografia de dados sensíveis e controle de permissões no servidor

## Aviso

Antes da implantação comercial, as regras de recompensa, os termos de participação e o fluxo operacional devem passar por análise jurídica especializada e pelas normas aplicáveis do CRECI.
