# Plano de execução

Vou entregar tudo em uma sequência que garante que nada quebre no meio do caminho: primeiro corrijo os bugs críticos (foto de perfil, copiar PIX, fluxo das taxas), depois refino visual do admin e do checkout, depois refaço a home com pegada quente moderna, e por último adiciono mídia no chat.

## 1. Bugs críticos

**Foto de perfil não aparece na home**
- Verificar bucket `club-assets` (público) e URL salva em `club_settings.avatar_url`.
- Ajustar `Index.tsx` pra ter fallback robusto (`onError` → avatar padrão) e forçar `loading="eager"` no avatar.
- Adicionar cache-busting quando a URL vier do storage.

**Fluxo de taxas sequenciais (verificação)**
- Auditar `paradise-webhook`: quando venda principal é aprovada, precisa gerar 1ª taxa (se houver `post_purchase_fees` ativas), enviar cobrança PIX pelo Telegram e só liberar o link VIP quando todas forem pagas.
- Auditar `telegram-send-vip`: hoje envia VIP direto quando venda aprova. Vou trocar para: se existem taxas ativas → envia cobrança da 1ª taxa; senão → envia VIP.
- Criar/ajustar handler que, ao aprovar uma `transaction_fees`, dispara a próxima taxa; quando não houver próxima, envia o link VIP.
- Adicionar log claro no `telegram_messages`/console pra cada etapa.

**Botão "copiar" do PIX**
- No `PixCheckoutDialog` trocar `navigator.clipboard` por fallback com `document.execCommand('copy')` quando `clipboard` não disponível (iOS/contexto não seguro).
- Toast de sucesso/erro visível.
- Adicionar renderização do QR code como imagem (`qr_code_base64` já vem da Paradise) além do código copia-e-cola.

## 2. Checkout PIX (UX)

- Reformular `PixCheckoutDialog`:
  - Inputs de nome/telefone maiores, máscara de telefone brasileira, validação inline.
  - QR code em destaque (imagem grande centralizada) com sombra quente.
  - Bloco "Copia e cola" com botão de copiar bem visível + confirmação.
  - Contador de expiração se `expires_at` presente.
  - Estados: formulário → carregando → PIX gerado → aprovado.

## 3. Admin panel — polimento visual + cards colapsados

**FeesEditor**
- Após criar taxa: fica como card compacto (nome + valor + ordem + toggle ativo + botão "Editar" e "Excluir").
- Clicar em "Editar" abre um Sheet/Dialog com o formulário completo. Card fica limpo pra print.

**PlansEditor / SettingsEditor / SalesEditor**
- Mesma lógica: cards resumo, edição em dialog.
- Header do admin com gradiente quente, sidebar/tabs mais polidos, tipografia consistente.
- Cards com bordas suaves, `shadow-admin`, espaçamento generoso.

**Admin.tsx layout**
- Header sticky com nome do painel, avatar do admin e status.
- Grid responsivo mais moderno; melhor contraste no dark.

## 4. Redesign da home (pegada laranja quente, moderna, "creator premium")

Paleta locada:
- `#1A0F0A` (bg), `#2A1810` (surface), `#FFF5EB` (fg), `#F97316` (accent).
- Gradientes quentes (âmbar → coral), sombras douradas suaves.

Tipografia:
- Display: **Fraunces** (serifa moderna, editorial, quente).
- Body: **Manrope** (geométrica limpa).

Estrutura nova da `Index.tsx`:
- Banner com parallax leve + overlay quente.
- Avatar sobreposto com anel gradiente animado.
- Nome + verificado + bio com melhor hierarquia.
- Stats em cards horizontais com ícones e números grandes.
- Planos em cards com destaque para o "highlighted" (badge, brilho, escala maior).
- Galeria com grid mansonry-like + hover reveal + blur premium.
- Rodapé sutil com marca d'água.

Sem mudar lógica de negócio — só estrutura visual e tokens.

## 5. Chat admin com mídia (imagem, áudio, vídeo)

- Bucket novo `chat-media` (público, com policies).
- `telegram-send-message` edge function: aceitar `media_url` + `media_type` (`photo`/`video`/`audio`/`voice`) e usar `sendPhoto` / `sendVideo` / `sendVoice` / `sendAudio` do Telegram Bot API.
- `TelegramChatEditor`:
  - Botão de anexar imagem/vídeo (upload → bucket → envia).
  - Botão de gravar áudio (MediaRecorder → webm → upload → envia como voice).
  - Preview antes de enviar.
  - Bubbles do chat renderizam mídia recebida/enviada.
- Migration: adicionar colunas `media_url`, `media_type` em `telegram_messages`.
- Webhook do Telegram já grava updates; ampliar pra baixar mídia recebida (photo/voice/video) via `getFile`, salvar em `chat-media` e gravar URL.

## Detalhes técnicos

- Migrations novas:
  1. Adicionar `media_url TEXT`, `media_type TEXT` em `telegram_messages`.
  2. Criar bucket `chat-media` (tool `storage_create_bucket`) + policies em `storage.objects`.
- Novas fontes: `bun add @fontsource/fraunces @fontsource/manrope` + imports em `main.tsx` + `tailwind.config.ts`.
- Tokens no `index.css`: adicionar `--gradient-warm-hero`, `--shadow-warm-glow`, ajustar tokens existentes pra nova paleta HSL.
- Manter todas as tabelas, RLS e funções existentes; só somar o necessário.

## Ordem de execução

1. Migration (telegram_messages + bucket) → aprovar.
2. Bugs (avatar, copiar PIX, fluxo taxas).
3. Refino admin (cards colapsados + visual).
4. Redesign home + fontes/tokens.
5. Mídia no chat (edge function + UI + webhook).
6. Testes: gerar PIX teste, simular aprovação, confirmar cascata das taxas até liberar VIP, testar copiar e QR, testar envio de imagem/áudio pelo admin.

Posso começar?
