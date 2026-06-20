# Construções Barros — App de Orçamentos

## Visão Geral
App mobile Expo (pt-PT) para a empresa **Construções Barros** (António Virgílio Marques Barros, Valença) criar, guardar, gerar PDF e partilhar orçamentos com layout sempre igual, profissional, adequado a submissão a seguradoras.

## Stack
- Frontend: Expo SDK 54, expo-router, expo-print, expo-sharing, expo-image, expo-linear-gradient, expo-blur, expo-haptics, Ionicons
- Backend: FastAPI + MongoDB (motor)
- Storage: MongoDB (collections: `orcamentos`, `company`, `counters`)

## Funcionalidades
1. **Lista de Orçamentos** — histórico com filtros (Todos/Rascunho/Enviado/Aceite), totais agregados, pull-to-refresh.
2. **Novo Orçamento** — formulário em pt-PT com:
   - Numeração automática `AnoNNN` (ex: 2026001)
   - Cliente (nome, NIF, contacto, morada)
   - Sinistro/Seguradora (segurado, seguradora, apólice, data sinistro, obra, vistoria)
   - Itens de trabalho (descrição, qtd, unidade, preço, IVA 0/6/13/23) introduzidos manualmente
   - Observações
   - Validade (15/30/60/90 dias)
   - Cálculo automático de Subtotal/IVA/Total
3. **Detalhe + PDF** — pré-visualização visual do documento, geração de PDF com `expo-print` (layout idêntico ao orçamento original com logo + cabeçalho + tabela + assinatura), partilha via WhatsApp/Email/Sistema. Mudar estado: Rascunho → Enviado → Aceite.
4. **Definições** — editar dados da empresa (que aparecem em todos os PDFs) e IBAN opcional.

## Endpoints
- `GET /api/company` · `PUT /api/company`
- `GET /api/orcamentos` · `POST /api/orcamentos`
- `GET /api/orcamentos/{id}` · `PATCH /api/orcamentos/{id}` · `DELETE /api/orcamentos/{id}`
- `GET /api/orcamentos/next-number`

## Dados pré-carregados (Definições)
- Empresa: CONSTRUÇÕES BARROS
- Titular: António Virgílio Marques Barros
- NIF: 195060822
- Morada: Bc Eira Velha 1, 4930-341 - Valença
- Tel: 930 582 585 · Email: construcoesbarros.valenca@gmail.com
