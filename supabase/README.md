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

## 3. E-mails em português, com código (recomendado)

O login é com **e-mail e senha**. O Supabase só manda e-mail em dois momentos: para **confirmar a conta** no cadastro e quando a pessoa clica em **Esqueci minha senha**. Os modelos de fábrica vêm em inglês e só com um link; trocando, eles passam a vir em português e com um código de 6 dígitos que a pessoa digita no site.

Em **Authentication → Emails** (ou **Email Templates**):

**Modelo "Confirm signup"**

Assunto:

```
Confirme seu cadastro no Rendique
```

Corpo:

```html
<h2>Bem-vindo ao Rendique!</h2>
<p>Digite este código no site para ativar sua conta:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ou toque no link: <a href="{{ .ConfirmationURL }}">ativar minha conta</a></p>
<p>Se você não se cadastrou, ignore este e-mail.</p>
```

**Modelo "Reset Password"**

Assunto:

```
Crie uma senha nova no Rendique
```

Corpo:

```html
<h2>Senha nova</h2>
<p>Digite este código no Rendique para criar uma senha nova:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ou toque no link: <a href="{{ .ConfirmationURL }}">criar senha nova</a></p>
<p>Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
```

> O envio de e-mails padrão do Supabase permite poucos e-mails por hora. Serve para começar. Com muitos cadastros por dia, configure um SMTP próprio (por exemplo Resend) em **Authentication → SMTP Settings**.

## 4. Primeiro acesso e novos gestores

- O primeiro cadastro vira **gestor** e vê a tela "Bem-vindo, gestor" (só nome e celular). Para travar isso num e-mail: `update public.configuracoes set email_gestor = 'seu@email' where id = 1;`
- Novos **gestores** e **corretores**: no painel, aba **Usuários → Convidar gestor ou corretor**. O link vale para uma pessoa, por 7 dias.
- Quem se cadastra sem convite entra como **indicador**. O gestor pode mudar o acesso na aba Usuários.

## O que o banco já faz sozinho

- Gera o ID de cada indicação (`IND-2026-000001`).
- Bloqueia duplicidade por telefone ou unidade e abre uma ocorrência para o gestor.
- Registra data, hora e autor de cada mudança de status (linha do tempo e auditoria).
- Cria a recompensa quando a indicação vira "Oportunidade qualificada", com o valor configurado.
- Notifica o gestor a cada nova indicação, cadastro, duplicidade ou pedido de resgate, em tempo real (sininho).
- Notifica o indicador a cada avanço da indicação dele.
- Regras de segurança (RLS): cada indicador só vê os próprios dados; ninguém altera indicações ou recompensas fora das regras.
