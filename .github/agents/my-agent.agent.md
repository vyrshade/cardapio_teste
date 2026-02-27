# Copilot Custom Instructions — Cardápio Digital

## Visão Geral do Projeto
Este é um sistema de **Cardápio Digital** para restaurantes, construído com React 19 + Vite 6. O sistema possui múltiplos módulos (Admin, Manutenção do Lojista, Menu do Cliente, KDS/Cozinha, App do Garçom) e usa Firebase (Auth + Firestore) como backend.

## Stack Técnica
- **Frontend:** React 19 (JSX) — NÃO usa TypeScript
- **Bundler:** Vite 6 com `@vitejs/plugin-react`
- **UI Library:** MUI (Material UI) v7 + `@emotion/react` + `@emotion/styled`
- **Formulários:** `react-hook-form` v7 + `@hookform/resolvers` + `zod` para validação de schemas
- **Roteamento:** `react-router` v7 (imports de `react-router`)
- **Backend:** Firebase Auth, Firestore (real-time listeners com `onSnapshot`)
- **API Backend:** Node.js com Firebase Functions / Google Cloud Functions (`api/` directory)
- **PWA:** `vite-plugin-pwa`
- **Date:** `date-fns` v2
- **Máscara de input:** `react-imask` / `imask` + `react-number-format`
- **QR Code:** `qrcode.react`

## Estrutura de Arquivos
Os arquivos no `src/` seguem uma convenção de nomenclatura baseada em prefixos:

### Prefixos e seus módulos:
- `adm_*` → Painel de **superusuário/admin** (gerenciar merchants, configurações globais, módulos, pagamentos)
- `app_mnt_*` → **Manutenção do lojista** (CRUD de categorias, produtos, opções, opção groups, mesas, usuários, KDS, pedidos, pagamentos, conta)
- `app_mnu_*` → **Menu público do cliente** (visualizar cardápio, adicionar ao carrinho, fazer pedido, pagar)
- `app_kds_*` → **Kitchen Display System** (tela de cozinha, lista de pedidos pendentes)
- `app_wtr_*` → **App do garçom/waiter** (gerenciar mesas, fazer pedidos pelos clientes, ver pedidos)
- `login*` → **Autenticação** (login, recuperação de senha, troca de senha)
- `app.jsx` → Entry point principal
- `router.jsx` → Definição de todas as rotas (usa `react-router` v7)
- `context.jsx` → Context API global (ThemeContext, etc.)
- `api.js` → Todas as funções de chamada à API e Firestore (funções de CRUD, listeners, uploads, etc.)
- `shared.jsx` → Componentes reutilizáveis (dialogs, formatação de moeda, componentes de UI compartilhados)
- `usr_auth.jsx` → Gerenciamento de autenticação do usuário
- `verify.jsx` → Verificação de email/conta
- `register.js` → Service Worker registration (PWA)

### Sufixos comuns:
- `*_list.jsx` → Componente de listagem (tabela/lista de itens)
- `*_form.jsx` → Componente de formulário (criar/editar)
- `*_mnt.jsx` → Componente de manutenção/dashboard

### Subdiretórios:
- `src/assets/` → Imagens e arquivos estáticos
- `src/locales/` → Arquivos de internacionalização (i18n)
- `src/utils/` → Funções utilitárias
- `api/` → Backend Node.js (Firebase/Cloud Functions)
- `api/src/` → Código-fonte do backend

## Modelo de Dados (Firestore)
A estrutura é organizada por **merchant** (estabelecimento):

```
/merchant/{merchantId}/
  ├── category/{categoryId}     → Categorias do cardápio
  ├── item/{itemId}             → Itens/produtos do cardápio
  ├── option/{optionId}         → Opções/complementos dos itens
  ├── table/{tableId}           → Mesas do restaurante
  ├── order/{orderId}           → Pedidos
  ├── order_status/{statusId}   → Status de pedidos
  ├── payment/{paymentId}       → Pagamentos
  ├── user/{userId}             → Usuários do merchant
  ├── kds/{kdsId}               → Configurações de KDS
  ├── customer/{customerId}     → Clientes
  ├── checkIn/{checkInId}       → Check-ins de mesa
  ├── checkout/{checkoutId}     → Checkouts
  ├── help/{helpId}             → Chamadas de ajuda
  └── event/{eventId}           → Eventos
```

## Sistema de Autenticação
- Firebase Auth com **custom claims**:
  - `merchantId` — ID do estabelecimento vinculado ao usuário
  - `accessLevel` — Nível de acesso:
    - `10` → Admin do merchant (lojista)
    - `1000` → Superusuário do sistema
  - `admin` → Boolean indicando se é administrador

## Convenções de Código

### Componentes React:
- Usar **function components** com hooks
- Componentes JSX (não TSX)
- Cada arquivo exporta UM componente principal
- Usar `useForm` do `react-hook-form` para formulários
- Validação com schemas `zod` + `zodResolver`

### UI/Estilo:
- Usar componentes do **MUI** (Material UI) v7
- Imports de `@mui/material`, `@mui/lab`, `@mui/x-date-pickers`
- Tema customizado via `@toolpad/core`
- Formatação de moeda BRL (`R$`) — considerar formato brasileiro
- Datas no formato brasileiro (dd/MM/yyyy)

### API & Firestore:
- Todas as chamadas ao Firestore e API estão centralizadas em `src/api.js`
- Usar `onSnapshot` para listeners em tempo real
- Usar as funções já existentes em `api.js` em vez de criar novas chamadas diretas ao Firestore
- Backend em `api/` usa Express-style handlers com Firebase Functions

### Rotas:
- Definidas em `src/router.jsx`
- Rota base usa parâmetros como `/:mct` (merchantId)
- Rotas protegidas verificam autenticação e nível de acesso

### Idioma:
- A interface é em **português brasileiro (pt-BR)**
- Comentários podem ser em português ou inglês
- Nomes de variáveis/funções são abreviados em inglês:
  - `mct` = merchant, `ctg` = category, `pdt` = product, `opt` = option
  - `opg` = option group, `tbl` = table, `ord` = order, `pay` = payment
  - `usr` = user, `mnt` = maintenance, `mnu` = menu, `kds` = kitchen display
  - `wtr` = waiter, `acc` = account, `pmt` = payment method
  - `cfg` = config, `mod` = module, `mkt` = market/marketplace
  - `itm` = item, `scs` = success, `chg` = change, `rcy` = recovery

## Scripts de Desenvolvimento
```bash
npm run dev        # Inicia o Vite dev server (porta padrão)
npm run dev:1      # Porta 1001
npm run dev:2      # Porta 1002
npm run dev:kds    # Porta 1003 (KDS)
npm run dev:wtr    # Porta 1004 (Waiter)
npm run build      # Build de produção + Service Worker
npm run lint       # ESLint
```

## Regras Importantes
1. **Sempre** usar os componentes MUI — não criar CSS customizado desnecessário
2. **Sempre** centralizar chamadas Firestore/API no `api.js`
3. **Sempre** seguir o padrão de nomenclatura de arquivos com prefixos
4. **Sempre** usar `react-hook-form` + `zod` para formulários
5. **Nunca** expor credenciais ou configs sensíveis do Firebase
6. O proxy de desenvolvimento aponta para `http://localhost:3000/api`
7. Ao criar novos componentes, seguir o padrão existente: um componente por arquivo, exports default
8. Manter compatibilidade com PWA (service worker)
