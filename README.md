# Roadmap Planner

Planner visual de roadmap por sprint, em HTML/CSS/JS puro — sem build, sem dependências de runtime instaláveis. Pensado para squads que precisam de uma visão temporal de épicos e projetos por sprint, com exportação fácil para PNG/HTML para colar em apresentações.

## Funcionalidades

- **Configuração**: período, squad, datas, dias por sprint, número da sprint inicial.
- **Itens**: título, tipo, status, responsável, observação, marca de "intruder".
- **Segmentação**: itens podem ter múltiplos segmentos com início/fim na metade da sprint e janelas de delay.
- **Tipos & status customizáveis**: cores, rótulos e ícones definidos pelo usuário.
- **Membros do time**: avatares coloridos ligados aos itens, com filtro por responsável.
- **Drag & resize**: arrastar barras e redimensionar pelas pontas.
- **Atalhos**: `Esc` deseleciona, `Delete`/`Backspace` remove o selecionado, `Ctrl/Cmd+Z` desfaz, `Ctrl/Cmd+Y` (ou `Ctrl+Shift+Z`) refaz.
- **Persistência**: localStorage automático + salvar/abrir arquivo via File System Access API (com auto-save opcional).
- **Cores**: customização de fundo, header, faixa de meses e faixa de sprints com cálculo automático de contraste.
- **Importar / Exportar**:
  - JSON completo (config + itens).
  - CSV de configuração ou de itens.
  - TSV via colar do Excel/Sheets (chave→valor ou cabeçalho+valores).
  - PNG do roadmap (via html2canvas).
  - HTML que referencia o PNG (para distribuir em pasta).

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
└── js/
    ├── engine.js          # cálculo de sprints, meses, alocação de tracks
    ├── state.js           # estado, persistência, undo/redo, import/export
    ├── tooltip.js         # tooltip em hover de barra
    ├── renderer.js        # montagem do roadmap e drag/resize
    ├── config-panel.js    # painel de configuração + tipos + membros
    ├── item-editor.js     # lista e formulário de itens
    ├── import-export.js   # JSON/CSV/TSV/PNG/HTML + auto-save
    └── app.js             # bootstrap, atalhos de teclado, cores
```

## Stack

- HTML5, CSS3 (custom properties, sem framework).
- JavaScript ES2022, padrão IIFE com módulo `State` como event bus.
- [html2canvas](https://html2canvas.hertzen.com) via CDN para exportação PNG.

## Lint (opcional)

Com Node instalado, rode o ESLint sem instalar nada permanente:

```bash
npx eslint js/
```

A configuração está em `.eslintrc.json`.
