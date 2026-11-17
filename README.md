# 🎸 Agenda de Shows da Banda

Aplicação web responsiva e instalável (PWA) para gerir a agenda de shows de uma banda, com dashboard de calendário, cadastro de eventos, locais e contratantes, além de autenticação administrativa.

## Stack

- Node.js + Express + TypeScript
- Prisma + PostgreSQL
- React + Vite
- Zod para validação
- PWA (manifest + service worker)

## Arquitetura

- `src/routes` — rotas da API
- `src/controllers` — handlers HTTP
- `src/services` — regras de negócio e validação
- `src/repositories` — acesso ao Prisma
- `client/src` — interface em React
- `dist/client` — build do frontend servido pelo backend em produção

## Funcionalidades

- Login administrativo com JWT
- Perfis separados: administradores gerenciam os dados; usuários comuns veem somente a agenda resumida
- Cadastro público de contas comuns pela tela inicial; administradores também podem cadastrar contas pela seção **Usuários**
- CRUD de shows
- Cadastro dos dados do contratante (nome, CPF, CNPJ ou RG, e-mail e telefone) junto ao show
- Registro da data, horários de início e término (incluindo shows que atravessam a meia-noite), responsável pela venda e valor do cachê
- Cadastro do custo por show e resumo de custo total e lucro no dashboard
- Bloqueio de shows com horários sobrepostos; eventos no mesmo dia são permitidos quando seus horários não coincidem
- Planejamento opcional de entrada e parcelas, com cálculo do saldo e vencimentos previstos até uma semana antes do show
- Definição do tipo de evento (público ou privado)
- Registro de pagamentos parciais, cálculo automático do saldo e anexação de comprovantes
- Anexação de múltiplos contratos PDF por evento, com download e remoção
- Listagem de contratantes e locais auxiliares
- Dashboard com resumo de eventos
- Layout responsivo para mobile/desktop
- Instalação como app (PWA)

## Requisitos

- Node.js 20+
- PostgreSQL
- Docker (opcional para subir o banco com Docker Compose)

## Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agenda_shows?schema=public"
PORT=3000
JWT_SECRET="agenda-banda-secret"
ADMIN_EMAIL="admin@banda.com"
ADMIN_PASSWORD="defina-uma-senha-forte-com-12-ou-mais-caracteres"
```

## Executar o projeto

1. Subir o PostgreSQL (ou usar Docker Compose):

```bash
docker compose up -d
```

Se o volume do PostgreSQL já tiver sido inicializado com outro nome de banco, alterar `POSTGRES_DB` não renomeia nem migra essa base. Faça backup e migre os dados antes de apontar a aplicação para `agenda_shows`.

2. Rodar as migrações:

```bash
npx prisma migrate dev
```

3. Iniciar em modo de desenvolvimento:

```bash
npm run dev
```

A API e a interface ficam disponíveis em:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Documentação Swagger: `http://localhost:3000/api/docs`
- Especificação OpenAPI em JSON: `http://localhost:3000/api/docs.json`
- Testes REST Client: instale a extensão REST Client do VS Code, abra `testes.http` e clique em **Send Request** acima de cada requisição

Em desenvolvimento, o Vite encaminha automaticamente as chamadas `/api` para o backend na porta `3000`.

## Endpoints principais

- `POST /api/auth/login`
- `POST /api/auth/register` (cadastro público; cria perfil `USER` e inicia a sessão)
- `POST /api/auth/change-password` (autenticado; exige senha atual e invalida as sessões após a troca)
- `GET /api/auth/users` (somente administrador)
- `POST /api/auth/users` (somente administrador; cria perfil `USER`)
- `GET /api/shows` (agenda resumida para `USER`; dados completos para `ADMIN`)
- `POST /api/shows`
- `PUT /api/shows/:id`
- `DELETE /api/shows/:id`
- `GET /api/shows/:id/pagamentos`
- `POST /api/shows/:id/pagamentos` (multipart: `valor`, `dataPagamento` e `comprovante`)
- `GET /api/pagamentos/:pagamentoId/comprovante`
- `DELETE /api/pagamentos/:pagamentoId`
- `GET /api/shows/:id/contratos`
- `POST /api/shows/:id/contratos` (multipart, vários arquivos PDF no campo `contratos`, máximo de 10 arquivos e 8 MB por arquivo)
- `GET /api/contratos/:contratoId/arquivo`
- `DELETE /api/contratos/:contratoId`
- `GET /api/contratantes`
- `GET /api/locais`
- `POST /api/locais` (somente administrador)

Contas com perfil `USER` podem consultar apenas título do evento, cidade, data, horários, status e local. Cadastros, dados pessoais dos contratantes, informações financeiras, pagamentos, contratos, comprovantes e a lista de locais auxiliares são restritos a `ADMIN`. Administradores criam usuários comuns na seção **Usuários** do painel; o cadastro não permite criar novos administradores.
Senhas de novas contas devem ter pelo menos 12 caracteres. Letras maiúsculas e símbolos são aceitos, mas não obrigatórios; prefira senhas longas e exclusivas.

No cadastro de show, o valor do show representa o cachê acordado com a banda. A aplicação não gerencia vendas de ingressos.
As condições de pagamento permitem configurar uma entrada padrão de 10% (editável) e grupos de parcelas combinadas pela quantidade e valor de cada parcela, sem datas previstas. O painel calcula subtotais, total combinado e valor ainda não distribuído. O saldo deve ser quitado até sete dias antes do show; cada valor efetivamente recebido é registrado separadamente com data, hora e comprovante.
O campo do cachê aceita valores em reais com ou sem separadores de milhar; valores com mais de duas casas decimais são arredondados para centavos. Shows cancelados não reservam horário. Os intervalos são considerados de início inclusivo e término exclusivo, então um show pode começar no mesmo horário em que outro termina.
Comprovantes de pagamento aceitam PDF, JPG, PNG ou WEBP, com tamanho máximo de 8 MB, e são salvos em `uploads/comprovantes` no servidor.
Contratos PDF podem ser selecionados no formulário do evento e são enviados ao salvar o cadastro ou as alterações; cada arquivo pode ter até 8 MB, com máximo de 10 por envio, e é salvo em `uploads/contratos`.
O envio, a listagem, o download e a remoção de contratos exigem perfil de administrador. Pagamentos, comprovantes e dados de contratantes também são restritos a administradores.
As pastas de uploads não são incluídas no Git; configure volume persistente e backup no servidor de hospedagem para preservar os arquivos.

## Credenciais locais padrão

- E-mail: `admin@banda.com`
- Senha: `admin123`

> Essas credenciais padrão são apenas para desenvolvimento local. Em produção, defina `ADMIN_PASSWORD` com uma senha forte de pelo menos 12 caracteres e não reutilize essa senha em outros serviços.
