# Configurar o banco de dados do Rendique (Supabase)

São 4 passos, todos no painel do Supabase (supabase.com → seu projeto `rendique`).

## 1. Criar as tabelas

1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Copie todo o conteúdo do arquivo [`schema.sql`](schema.sql) (no GitHub, botão **Copy raw file**) e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

Pode rodar de novo no futuro, quando o arquivo for atualizado: ele não apaga dados.

## 2. Endereço do site

Em **Authentication → URL Configuration**:

- **Site URL:** `https://darkslategrey-eland-869418.hostingersite.com/` (quando o domínio estiver pronto: `https://rendique.com.br/`)
- **Redirect URLs:** clique em **Add URL** e adicione o mesmo endereço.

## 3. Confirmação de e-mail com código (servidor próprio + modelos + ligar)

O login é com **e-mail e senha**. O Supabase manda e-mail em dois momentos: para **confirmar a conta** no cadastro e quando a pessoa toca em **Esqueci minha senha**. O app já tem as duas telas de código (6 dígitos).

**1. Servidor de e-mail próprio (obrigatório).** O envio padrão do Supabase só entrega para os membros da equipe do projeto; sem isso, quem se cadastra não recebe o código. Em **Authentication → Emails → SMTP Settings**, ligue *Enable custom SMTP*:

- Remetente: `nao-responda@rendique.com.br` · Nome: `Rendique`
- Host: `smtp.hostinger.com` · Porta: `465`
- Usuário: o e-mail completo · Senha: a senha dessa caixa de e-mail (criada no painel da Hostinger, em E-mails)

**2. Modelos em português.** Em **Authentication → Emails → Templates**:

- *Confirm signup* — Assunto: `{{ .Token }} é o seu código Rendique` · Corpo: arquivo `supabase/emails/confirmar-cadastro.html` inteiro
- *Reset password* — Assunto: `{{ .Token }} é o código para criar sua senha nova` · Corpo: arquivo `supabase/emails/redefinir-senha.html` inteiro

**3. Limite de envio.** Em **Authentication → Rate Limits**, aumente *Rate limit for sending emails* (com servidor próprio começa em 30 por hora) para 100 ou mais.

**4. Ligar a confirmação.** Em **Authentication → Sign In / Providers → Email**, ligue **Confirm email** e salve. Quem já tinha conta continua entrando normalmente.

**Teste:** numa aba anônima, faça um cadastro com um e-mail seu. O código chega em menos de 1 minuto (confira o spam). Teste também *Esqueci minha senha*.

## 4. Primeiro acesso e convites

- O primeiro cadastro vira **gestor** e vê a tela "Bem-vindo, gestor" (só nome e celular). Para travar isso num e-mail: `update public.configuracoes set email_gestor = 'seu@email' where id = 1;`
- **Corretores**: no painel, aba **Usuários → Gerar link de corretor**. O link vale para uma pessoa, por 7 dias.
- **Indicadores** (porteiros, zeladores, síndicos): aba **Usuários → Link de indicador**. Link fixo, pode ser enviado para várias pessoas.
- Outro gestor: a pessoa se cadastra normalmente e você troca o acesso dela para Gestor na aba Usuários.
- Quem se cadastra sem convite entra como **indicador**. O gestor pode mudar o acesso na aba Usuários.

## O que o banco já faz sozinho

- Gera o ID de cada indicação (`IND-2026-000001`).
- Bloqueia duplicidade por telefone ou unidade e abre uma ocorrência para o gestor.
- Registra data, hora e autor de cada mudança de status (linha do tempo e auditoria).
- Cria a recompensa quando a indicação vira "Oportunidade qualificada", com o valor configurado.
- Notifica o gestor a cada nova indicação, cadastro, duplicidade ou pedido de resgate, em tempo real (sininho).
- Notifica o indicador a cada avanço da indicação dele.
- Regras de segurança (RLS): cada indicador só vê os próprios dados; ninguém altera indicações ou recompensas fora das regras.
