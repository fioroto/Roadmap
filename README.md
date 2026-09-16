# Roadmap Planner

Planner visual de roadmap por sprint, em HTML/CSS/JS puro — sem build, sem dependências de runtime instaláveis. Pensado para squads que precisam de uma visão temporal de épicos e projetos por sprint, com exportação fácil para PNG/HTML para colar em apresentações.

O modelo incorpora o que as principais ferramentas de roadmap (Aha!, Productboard, Jira Plans, Roadmunk, ProductPlan, Linear, Notion, GitHub Projects) têm em comum: trilhas (swimlanes), progresso, saúde, confiança, dependências, múltiplas visões do mesmo dado, filtros, resumo executivo e linha de base para responder "o que mudou desde a última revisão".

## Funcionalidades

### Modelo
- **Configuração**: período, squad, datas, dias por sprint, número da sprint inicial, data de referência.
- **Trilhas (swimlanes)**: agrupe itens por tema, objetivo ou frente. Cada trilha vira uma faixa colapsável no roadmap, com cor, nome e descrição (o "porquê"). Itens sem trilha caem em "Sem trilha".
- **Itens**: título, trilha, tipo, status, responsável, tamanho (P/M/G/GG), observação, resultado esperado, links (ticket, doc, PR), marca de "intruder", destaque para stakeholders.
- **Sinais na barra**: progresso 0–100% (preenchimento), saúde RAG (ponto verde/amarelo/vermelho) e confiança — *Confirmado* (borda sólida), *Provável* (tracejada), *Exploratório* (pontilhada e hachurada) — para não vender falsa precisão.
- **Dependências**: "este item depende de…" com setas na timeline; a seta fica vermelha quando o item começa antes do fim da dependência (conflito).
- **Segmentação**: itens podem ter múltiplos segmentos com início/fim na metade da sprint e janelas de delay.
- **Tipos & status customizáveis**: cores, rótulos e ícones definidos pelo usuário; cada status pode marcar "conclui" (entra na contagem de concluídos).
- **Membros do time**: avatares coloridos ligados aos itens.
- **Marcos (milestones)**: linhas verticais com bandeirinha posicionadas por data (ex.: "Go-live", "Freeze").

### Visões
- **Timeline**: sprints × trilhas, com sprint vigente, linha "hoje", marcos, dependências e modo holofote.
- **Tabela**: todas as colunas do modelo, ordenável; clique na linha abre o editor.
- **Agora / Próximo / Depois / Concluído**: board derivado da timeline (Agora = toca a sprint atual ou está atrasado; Próximo = começa nas 2 sprints seguintes; Depois = o resto).
- **Filtros** por trilha, tipo, status, responsável, saúde, confiança e busca — valem para a timeline, a lista lateral e o resumo.
- **Cor por** tipo, trilha, saúde ou responsável; **zoom** −/auto/+; toggles de dependências e progresso.
- **Resumo executivo** no cabeçalho (entra no PNG): itens, concluídos (%), na sprint atual, em risco, atrasados, exploratórios.
- **Modo apresentação** (`P`): esconde painel e toolbar; `Esc` sai.

### Linha de base
- Salve uma **linha de base** (foto dos itens) em Config → Linha de base. Com uma linha de base ativa, a timeline mostra a posição antiga dos itens movidos como barra-fantasma e marca os novos com "Novo"; o painel lista Adicionados / Removidos / Movidos / Mudaram de trilha / Concluídos. A lista entra no HTML exportado.

### Edição e persistência
- **Múltiplos roadmaps**: mantenha vários roadmaps salvos (ex.: Q1, Q2, outra squad) e alterne pelo seletor no topo da aba Config.
- **Drag & resize**: arrastar barras (inclusive para outra trilha) e redimensionar pelas pontas — com **suporte a toque** e **navegação por teclado** (barra focada: `←/→` movem ½ sprint, `Shift+←/→` redimensionam, `Enter`/`Espaço` abre o editor).
- **Atalhos**: `1`/`2`/`3` trocam a visão, `P` apresentação, `Esc` deseleciona, `Delete`/`Backspace` remove o selecionado, `Ctrl/Cmd+Z` desfaz, `Ctrl/Cmd+Y` refaz.
- **Persistência**: localStorage automático + salvar/abrir arquivo via File System Access API (com auto-save opcional). Estado de visão (filtros, trilhas recolhidas, cor-por, zoom, linha de base ativa) fica fora do undo, numa chave própria.
- **Cores & temas**: customização de fundo, header e faixas com contraste automático, além de presets de **tema claro/escuro**.
- **Impressão**: `Ctrl+P` gera um PDF apenas do roadmap.

### Importar / Exportar
- JSON completo (config + itens + linhas de base).
- **CSV de itens** (uma linha por segmento) — exporta e reimporta, abre no Excel/Sheets.
- CSV de configuração; TSV via colar do Excel/Sheets.
- PNG do roadmap (via html2canvas) — captura a visão ativa e os filtros aplicados.
- HTML autocontido (imagem embutida + lista de mudanças da linha de base).
- **Link compartilhável**: URL com o roadmap embutido (comprimido, sem servidor).

## Modelo de dados (schema v3)

Arquivos v2 (e anteriores) abrem normalmente; os campos novos recebem defaults.

```jsonc
{
  "config": {
    "periodo": "Q1/2026", "squad": "Squad Ativação",
    "dataInicio": "2026-01-05", "dataFim": "2026-04-06", "diasSprint": 14, "sprintStartNumber": 115,
    "lanes": [{ "id": "ln-…", "name": "Ativação", "color": "#6366f1", "description": "Aumentar conversão" }],
    "itemTypes": [{ "value": "EV", "label": "EV", "color": "#0d9488" }],
    "statusTypes": [{ "value": "Finalizado", "label": "Finalizado", "icon": "✓", "done": true }],
    "teamMembers": [], "milestones": [], "roadmapNotes": "", "referenceDate": ""
  },
  "items": [{
    "id": "item-…", "title": "Login social", "type": "EV", "laneId": "ln-…",
    "status": "EmAndamento", "responsavel": "mb-…", "size": "M",
    "progress": 60, "health": "yellow", "confidence": "high",
    "dependsOn": ["item-…"], "links": [{ "label": "JIRA-1", "url": "https://…" }],
    "outcome": "Reduzir abandono no cadastro", "observacao": "",
    "intruder": false, "highlight": false,
    "segments": [{ "sprintStart": 115, "sprintEnd": 116, "startHalf": false, "endHalf": false, "delays": [] }]
  }],
  "baselines": [{ "id": "bl-…", "name": "Revisão 1", "createdAt": "2026-02-10T12:00:00Z", "items": [] }]
}
```

Valores fixos: `health` ∈ `'' | green | yellow | red`; `confidence` ∈ `high | medium | low`; `size` ∈ `'' | P | M | G | GG`.

### CSV de itens

Colunas (uma linha por segmento; delays repetem a linha):

```
id,title,type,lane,status,responsavel,intruder,highlight,progress,health,confidence,size,dependsOn,links,outcome,observacao,segmentIndex,sprintStart,sprintEnd,startHalf,endHalf,delaySprintStart,delaySprintEnd
```

`lane` é o **nome** da trilha (criada se não existir); `dependsOn` é uma lista de ids separada por `|`; `links` usa `rótulo=url|rótulo=url`.

## Como rodar localmente

Como não há build, basta servir o diretório:

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

Ou abrir `index.html` diretamente no navegador (algumas APIs como File System Access exigem `http(s)://`).

## Estrutura

```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── engine.js          # sprints, meses, filtros, layout por trilha, dependências, buckets, resumo, diff
│   ├── state.js           # estado, schema v3, persistência, undo/redo, múltiplos roadmaps, linhas de base, CSV
│   ├── tooltip.js         # tooltip em hover de barra
│   ├── renderer.js        # timeline: trilhas, barras, sinais, setas, marcos, drag/resize
│   ├── views.js           # estado de visão, toolbar, resumo, tabela, board, apresentação, dispatcher
│   ├── config-panel.js    # configuração, trilhas, tipos, membros, marcos, linha de base
│   ├── item-editor.js     # lista e formulário de itens
│   ├── import-export.js   # JSON/CSV/TSV/PNG/HTML + link compartilhável + auto-save
│   └── app.js             # bootstrap, atalhos de teclado, cores, preview de link compartilhado
└── test/
    └── engine.test.js     # testes das funções puras do motor
```

## Stack

- HTML5, CSS3 (custom properties, sem framework).
- JavaScript ES2022, padrão IIFE com módulo `State` como event bus.
- [html2canvas](https://html2canvas.hertzen.com) via CDN para exportação PNG.

## Testes e lint

Sem instalar nada permanente (Node ≥ 18):

```bash
node --test          # testes do motor (test/engine.test.js)
npx eslint js/       # lint (configuração em .eslintrc.json)
```
