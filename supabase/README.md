# Configurar o banco de dados do Rendique (Supabase)

São 4 passos, todos no painel do Supabase (supabase.com → seu projeto `rendique`).

## 1. Criar as tabelas

1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Copie todo o conteúdo do arquivo [`schema.sql`](schema.sql) (no GitHub, botão **Copy raw file**) e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".

Pode rodar de novo no futuro, quando o arquivo for atualizado: ele não apaga dados.

## 2. Endereço do site

Em **Authentication → URL Configuration**:

- **Site URL:** `https://gabrielcavali1234-create.github.io/INDIQUE-PLUS-/`
- **Redirect URLs:** clique em **Add URL** e adicione o mesmo endereço.

## 3. E-mail com código de acesso

O login é sem senha: a pessoa digita o e-mail e recebe um código de 6 dígitos.

Em **Authentication → Emails** (ou **Email Templates**), abra o modelo **Magic Link** e troque por:

**Assunto:**

```
Seu código de acesso ao Rendique
```

**Corpo (Message body):**

```html
<h2>Seu código de acesso</h2>
<p>Digite este código no Rendique para entrar:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ou toque no link: <a href="{{ .ConfirmationURL }}">entrar no Rendique</a></p>
<p>Se você não pediu este código, ignore este e-mail.</p>
```

Faça o mesmo no modelo **Confirm signup**, que é o enviado no primeiro acesso de cada pessoa.

> O envio de e-mails padrão do Supabase permite poucos e-mails por hora. Serve para testes. Antes de abrir para muitos porteiros, configure um SMTP próprio (por exemplo Resend) em **Authentication → SMTP Settings**.

## 4. Primeiro acesso

Abra o site e entre com o **seu** e-mail. A primeira pessoa que completa o cadastro vira **gestor** automaticamente. As próximas entram como indicadores. Para transformar alguém em corretor ou gestor, use a aba **Usuários** do painel.

## O que o banco já faz sozinho

- Gera o ID de cada indicação (`IND-2026-000001`).
- Bloqueia duplicidade por telefone ou unidade e abre uma ocorrência para o gestor.
- Registra data, hora e autor de cada mudança de status (linha do tempo e auditoria).
- Cria a recompensa quando a indicação vira "Oportunidade qualificada", com o valor configurado.
- Notifica o gestor a cada nova indicação, cadastro, duplicidade ou pedido de resgate, em tempo real (sininho).
- Notifica o indicador a cada avanço da indicação dele.
- Regras de segurança (RLS): cada indicador só vê os próprios dados; ninguém altera indicações ou recompensas fora das regras.
