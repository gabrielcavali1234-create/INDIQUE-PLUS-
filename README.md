# INDIQUE+

> Você conhece a oportunidade. Nós cuidamos do resto.

Plataforma de indicação de oportunidades imobiliárias para porteiros, zeladores, síndicos e outros profissionais de condomínio. O indicador só informa a oportunidade, com autorização do proprietário. Atendimento, avaliação, captação, negociação e venda ficam exclusivamente com profissionais imobiliários habilitados.

## Estado atual

Protótipo navegável em um único arquivo (`index.html`), mobile first, com dados de exemplo em memória. Basta abrir no navegador.

Perfis disponíveis (troca no topo da página):

- **Indicador**: dashboard, nova indicação com consentimento LGPD, linha do tempo, carteira, QR Code pessoal, página pública do proprietário, convites, privacidade e termos, login por código.
- **Corretor**: oportunidades validadas com contato do proprietário e avanço de status.
- **Admin**: KPIs, funil, financeiro, top indicadores, validação, ocorrências de duplicidade, recompensas, condomínios com QR Code, configuração do programa e auditoria.

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
