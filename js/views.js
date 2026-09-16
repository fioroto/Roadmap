// View state (session-scoped, persisted per roadmap in its own storage key),
// the toolbar (view switcher, filters, color-by, zoom), the executive summary,
// the table and Now/Next/Later board views, presentation mode, and the render
// dispatcher. Nothing here goes through State.setConfig: view state must not
// create undo steps nor rebuild the side panel / open item form.
const Views = (() => {
    const STORAGE_KEY = 'roadmap-planner-view';
    const VIEWS = ['timeline', 'table', 'board'];
    const VIEW_LABELS = { timeline: 'Timeline', table: 'Tabela', board: 'Agora / Próximo / Depois' };
    const ZOOMS = ['auto', 'compact', 'normal', 'wide'];
    const COLOR_BY = ['type', 'lane', 'health', 'member'];
    const COLOR_BY_LABELS = { type: 'Tipo', lane: 'Trilha', health: 'Saúde', member: 'Responsável' };

    function defaults() {
        return {
            view: 'timeline',
            filters: { laneId: '', type: '', status: '', memberId: '', health: '', confidence: '', search: '' },
            colorBy: 'type',
            zoom: 'auto',
            showDependencies: true,
            showProgress: true,
            collapsedLaneIds: [],
            activeBaselineId: '',
            tableSort: { key: 'start', dir: 1 },
            presentation: false
        };
    }

    let vs = defaults();
    let boundRoadmapId = null;
    let selectedItemId = null;
    let searchDebounce = null;

    function init() {
        loadFor(State.getActiveRoadmapId());
        renderToolbar();
        // Switching roadmaps emits config:changed; pick up that roadmap's view state.
        State.on('config:changed', () => {
            const id = State.getActiveRoadmapId();
            if (id !== boundRoadmapId) loadFor(id);
            renderToolbar();
        });
        State.on('item:select', (id) => {
            selectedItemId = id;
            markSelected();
        });
        applyPresentationClass();
    }

    function readAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) { return {}; }
    }

    function loadFor(roadmapId) {
        boundRoadmapId = roadmapId;
        const all = readAll();
        const saved = roadmapId && all[roadmapId] ? all[roadmapId] : {};
        const d = defaults();
        vs = {
            ...d,
            ...saved,
            filters: { ...d.filters, ...(saved.filters || {}) },
            tableSort: { ...d.tableSort, ...(saved.tableSort || {}) },
            collapsedLaneIds: Array.isArray(saved.collapsedLaneIds) ? saved.collapsedLaneIds.slice() : [],
            presentation: false   // never restore presentation mode across reloads
        };
        if (!VIEWS.includes(vs.view)) vs.view = 'timeline';
        if (!ZOOMS.includes(vs.zoom)) vs.zoom = 'auto';
        if (!COLOR_BY.includes(vs.colorBy)) vs.colorBy = 'type';
    }

    function persist() {
        if (!boundRoadmapId) return;
        try {
            const all = readAll();
            const { presentation, ...rest } = vs;   // eslint-disable-line no-unused-vars
            all[boundRoadmapId] = rest;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        } catch (_) { /* storage may be unavailable; view state is best-effort */ }
    }

    function changed(event) {
        persist();
        syncToolbar();
        State.emit(event || 'view:changed', vs);
    }

    // ─── Getters ─────────────────────────────────────────
    function getViewState() { return vs; }
    function getView() { return vs.view; }
    function getFilters() { return vs.filters; }
    function getCollapsedLaneIds() { return vs.collapsedLaneIds; }
    function isLaneCollapsed(id) { return vs.collapsedLaneIds.includes(id); }
    function getActiveBaselineId() { return vs.activeBaselineId; }
    function isPresentation() { return vs.presentation; }

    // ─── Setters ─────────────────────────────────────────
    function setView(name) {
        if (!VIEWS.includes(name) || name === vs.view) return;
        vs.view = name;
        changed('view:changed');
    }

    function setFilters(patch) {
        vs.filters = { ...vs.filters, ...(patch || {}) };
        changed('filters:changed');
    }

    function clearFilters() {
        vs.filters = defaults().filters;
        changed('filters:changed');
    }

    function setColorBy(v) {
        if (!COLOR_BY.includes(v)) return;
        vs.colorBy = v;
        changed('view:changed');
    }

    function setZoom(v) {
        if (!ZOOMS.includes(v)) return;
        vs.zoom = v;
        changed('view:changed');
    }

    function stepZoom(dir) {
        const order = ['compact', 'normal', 'wide'];
        const cur = vs.zoom === 'auto' ? 'normal' : vs.zoom;
        const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir));
        setZoom(order[idx]);
    }

    function setShowDependencies(flag) { vs.showDependencies = !!flag; changed('view:changed'); }
    function setShowProgress(flag) { vs.showProgress = !!flag; changed('view:changed'); }

    function toggleLaneCollapsed(id) {
        if (typeof id !== 'string') return;
        const set = new Set(vs.collapsedLaneIds);
        if (set.has(id)) set.delete(id); else set.add(id);
        vs.collapsedLaneIds = [...set];
        changed('view:changed');
    }

    function setActiveBaselineId(id) {
        vs.activeBaselineId = id || '';
        changed('view:changed');
    }

    function setTableSort(key) {
        if (vs.tableSort.key === key) vs.tableSort = { key, dir: -vs.tableSort.dir };
        else vs.tableSort = { key, dir: 1 };
        changed('view:changed');
    }

    function setPresentation(flag) {
        vs.presentation = !!flag;
        applyPresentationClass();
        changed('view:changed');
    }

    function togglePresentation() { setPresentation(!vs.presentation); }

    function applyPresentationClass() {
        document.body.classList.toggle('presentation', !!vs.presentation);
        const btn = document.getElementById('tb-presentation');
        if (btn) btn.setAttribute('aria-pressed', vs.presentation ? 'true' : 'false');
    }

    // ─── Toolbar ─────────────────────────────────────────
    function renderToolbar() {
        const el = document.getElementById('roadmap-toolbar');
        if (!el) return;
        const lanes = State.getLanes();
        const types = State.getItemTypes();
        const statuses = State.getStatusTypes();
        const members = State.getTeamMembers();
        const health = State.getHealthTypes();
        const confidence = State.getConfidenceTypes();
        const f = vs.filters;

        const opt = (value, label, selected) => `<option value="${escapeAttr(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
        const select = (id, label, current, entries, noneLabel) => {
            let html = `<select id="${id}" class="tb-select" aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">`;
            html += opt('', label + ': todos', current === '');
            if (noneLabel) html += opt('__none__', noneLabel, current === '__none__');
            entries.forEach(e => { html += opt(e.value, e.label, current === e.value); });
            html += '</select>';
            return html;
        };

        let html = '<div class="tb-group tb-views" role="tablist" aria-label="Visão">';
        VIEWS.forEach(v => {
            html += `<button type="button" class="tb-view${vs.view === v ? ' active' : ''}" data-view="${v}" role="tab" aria-selected="${vs.view === v ? 'true' : 'false'}">${escapeHtml(VIEW_LABELS[v])}</button>`;
        });
        html += '</div>';

        html += '<div class="tb-group tb-filters">';
        html += `<input type="search" id="tb-search" class="tb-search" placeholder="Buscar…" aria-label="Buscar itens" value="${escapeAttr(f.search || '')}">`;
        if (lanes.length) html += select('tb-f-lane', 'Trilha', f.laneId, lanes.map(l => ({ value: l.id, label: l.name })), 'Sem trilha');
        html += select('tb-f-type', 'Tipo', f.type, types.map(t => ({ value: t.value, label: t.label })));
        html += select('tb-f-status', 'Status', f.status, statuses.filter(s => s.value !== '').map(s => ({ value: s.value, label: s.label })), 'Sem status');
        if (members.length) html += select('tb-f-member', 'Responsável', f.memberId, members.map(m => ({ value: m.id, label: m.name })), 'Sem responsável');
        html += select('tb-f-health', 'Saúde', f.health, health.filter(h => h.value).map(h => ({ value: h.value, label: h.label })), 'Sem saúde');
        html += select('tb-f-confidence', 'Confiança', f.confidence, confidence.map(c => ({ value: c.value, label: c.label })));
        html += `<button type="button" id="tb-clear" class="btn btn-secondary btn-sm tb-clear${Engine.isFilterActive(f) ? '' : ' hidden'}" title="Limpar filtros">Limpar</button>`;
        html += '</div>';

        html += '<div class="tb-group tb-display">';
        html += `<label class="tb-label" for="tb-colorby">Cor</label><select id="tb-colorby" class="tb-select" aria-label="Colorir por">${COLOR_BY.map(c => opt(c, COLOR_BY_LABELS[c], vs.colorBy === c)).join('')}</select>`;
        html += `<label class="tb-check" title="Mostrar setas de dependência"><input type="checkbox" id="tb-deps"${vs.showDependencies ? ' checked' : ''}> Dependências</label>`;
        html += `<label class="tb-check" title="Mostrar progresso nas barras"><input type="checkbox" id="tb-progress"${vs.showProgress ? ' checked' : ''}> Progresso</label>`;
        html += '<span class="tb-zoom" role="group" aria-label="Zoom">';
        html += '<button type="button" class="tb-zoom-btn" id="tb-zoom-out" title="Reduzir largura das sprints" aria-label="Reduzir zoom">−</button>';
        html += `<button type="button" class="tb-zoom-btn tb-zoom-auto${vs.zoom === 'auto' ? ' active' : ''}" id="tb-zoom-auto" title="Ajustar à tela">Auto</button>`;
        html += '<button type="button" class="tb-zoom-btn" id="tb-zoom-in" title="Aumentar largura das sprints" aria-label="Aumentar zoom">+</button>';
        html += '</span>';
        html += `<button type="button" id="tb-presentation" class="btn btn-secondary btn-sm" title="Modo apresentação (P)" aria-pressed="${vs.presentation ? 'true' : 'false'}">Apresentação</button>`;
        html += '</div>';

        el.innerHTML = html;
        bindToolbar(el);
    }

    function bindToolbar(el) {
        el.querySelectorAll('.tb-view').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));

        const search = el.querySelector('#tb-search');
        search.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => setFilters({ search: search.value }), 150);
        });

        const bindSelect = (id, key) => {
            const s = el.querySelector('#' + id);
            if (s) s.addEventListener('change', () => setFilters({ [key]: s.value }));
        };
        bindSelect('tb-f-lane', 'laneId');
        bindSelect('tb-f-type', 'type');
        bindSelect('tb-f-status', 'status');
        bindSelect('tb-f-member', 'memberId');
        bindSelect('tb-f-health', 'health');
        bindSelect('tb-f-confidence', 'confidence');
        el.querySelector('#tb-clear').addEventListener('click', clearFilters);

        el.querySelector('#tb-colorby').addEventListener('change', (e) => setColorBy(e.target.value));
        el.querySelector('#tb-deps').addEventListener('change', (e) => setShowDependencies(e.target.checked));
        el.querySelector('#tb-progress').addEventListener('change', (e) => setShowProgress(e.target.checked));
        el.querySelector('#tb-zoom-out').addEventListener('click', () => stepZoom(-1));
        el.querySelector('#tb-zoom-in').addEventListener('click', () => stepZoom(1));
        el.querySelector('#tb-zoom-auto').addEventListener('click', () => setZoom('auto'));
        el.querySelector('#tb-presentation').addEventListener('click', togglePresentation);
    }

    // Cheap value sync (no rebuild → the search box keeps focus while typing).
    function syncToolbar() {
        const el = document.getElementById('roadmap-toolbar');
        if (!el) return;
        el.querySelectorAll('.tb-view').forEach(btn => {
            const active = btn.dataset.view === vs.view;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const clear = el.querySelector('#tb-clear');
        if (clear) clear.classList.toggle('hidden', !Engine.isFilterActive(vs.filters));
        const setVal = (id, v) => { const s = el.querySelector('#' + id); if (s && s.value !== v) s.value = v; };
        setVal('tb-f-lane', vs.filters.laneId || '');
        setVal('tb-f-type', vs.filters.type || '');
        setVal('tb-f-status', vs.filters.status || '');
        setVal('tb-f-member', vs.filters.memberId || '');
        setVal('tb-f-health', vs.filters.health || '');
        setVal('tb-f-confidence', vs.filters.confidence || '');
        setVal('tb-colorby', vs.colorBy);
        const search = el.querySelector('#tb-search');
        if (search && document.activeElement !== search && search.value !== (vs.filters.search || '')) search.value = vs.filters.search || '';
        const auto = el.querySelector('#tb-zoom-auto');
        if (auto) auto.classList.toggle('active', vs.zoom === 'auto');
        const deps = el.querySelector('#tb-deps'); if (deps) deps.checked = !!vs.showDependencies;
        const prog = el.querySelector('#tb-progress'); if (prog) prog.checked = !!vs.showProgress;
        const pres = el.querySelector('#tb-presentation'); if (pres) pres.setAttribute('aria-pressed', vs.presentation ? 'true' : 'false');
        // Zoom only applies to the timeline; dependency arrows too.
        el.querySelector('.tb-zoom').classList.toggle('hidden', vs.view !== 'timeline');
        el.querySelector('#tb-deps').parentElement.classList.toggle('hidden', vs.view !== 'timeline');
    }

    // ─── Executive summary (in the header → exported with the PNG) ──
    function referenceDate() {
        const refDateStr = (State.getConfig().referenceDate || '').trim();
        let d = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
        if (isNaN(d.getTime())) d = new Date();
        return d;
    }

    function renderSummary(visibleItems, sprints) {
        const el = document.getElementById('roadmap-summary');
        if (!el) return;
        if (!sprints.length || !State.getItems().length) { el.innerHTML = ''; return; }
        const s = Engine.computeSummary(visibleItems, sprints, referenceDate(), State.getStatusTypes());
        const parts = [];
        parts.push(`<span class="sum-item"><strong>${s.total}</strong> ${s.total === 1 ? 'item' : 'itens'}</span>`);
        parts.push(`<span class="sum-item"><strong>${s.done}</strong> concluídos <span class="sum-pct">(${s.donePct}%)</span></span>`);
        if (s.hasCurrent) parts.push(`<span class="sum-item"><strong>${s.inCurrent}</strong> na sprint atual</span>`);
        if (s.atRisk) parts.push(`<span class="sum-item sum-risk"><span class="health-dot health-red"></span><strong>${s.atRisk}</strong> em risco</span>`);
        if (s.overdue) parts.push(`<span class="sum-item sum-overdue"><strong>${s.overdue}</strong> atrasados</span>`);
        if (s.tentative) parts.push(`<span class="sum-item sum-tentative"><strong>${s.tentative}</strong> exploratórios</span>`);
        if (Engine.isFilterActive(vs.filters)) parts.push('<span class="sum-item sum-filtered">(filtrado)</span>');
        el.innerHTML = parts.join('<span class="sum-sep">·</span>');
    }

    // ─── Shared helpers for table / board ────────────────
    function lookups() {
        return {
            lanes: State.getLanes(),
            types: State.getItemTypes(),
            statuses: State.getStatusTypes(),
            members: State.getTeamMembers(),
            health: State.getHealthTypes(),
            confidence: State.getConfidenceTypes(),
            itemsById: new Map(State.getItems().map(i => [i.id, i]))
        };
    }

    function laneOf(item, lk) { return lk.lanes.find(l => l.id === item.laneId) || null; }
    function typeOf(item, lk) { return lk.types.find(t => t.value === item.type) || null; }
    function labelOf(list, value) { const e = list.find(x => x.value === value); return e ? e.label : ''; }

    function sprintLabel(n) {
        if (!Number.isFinite(n)) return '—';
        const whole = Math.floor(n);
        return `S${whole}${n !== whole ? '½' : ''}`;
    }

    function healthDot(item, lk) {
        const h = item.health ? lk.health.find(x => x.value === item.health) : null;
        return h && h.color ? `<span class="health-dot health-${escapeAttr(item.health)}" title="${escapeAttr(h.label)}"></span>` : '';
    }

    function laneChip(item, lk) {
        const lane = laneOf(item, lk);
        if (!lane) return '';
        return `<span class="lane-chip"><span class="lane-color" style="background:${escapeAttr(lane.color)}"></span>${escapeHtml(lane.name)}</span>`;
    }

    function memberAvatar(item, lk) {
        const m = item.responsavel ? lk.members.find(x => x.id === item.responsavel) : null;
        if (!m) return '';
        return `<span class="member-avatar-tiny" style="background:${escapeAttr(m.color)};color:${State.getContrastColor(m.color)};" title="${escapeAttr(m.name)}">${escapeHtml((m.name || '?')[0].toUpperCase())}</span>`;
    }

    function progressBar(item) {
        return `<span class="mini-progress" title="${item.progress}%"><span style="width:${item.progress}%"></span></span><span class="mini-progress-label">${item.progress}%</span>`;
    }

    function selectItem(id) {
        selectedItemId = id;
        Renderer.setSelectedItem(id);
        Renderer.switchToItemsTab();
        State.emit('item:select', id);
    }

    function markSelected() {
        document.querySelectorAll('[data-view-item-id]').forEach(el => {
            el.classList.toggle('selected', el.dataset.viewItemId === selectedItemId);
        });
    }

    function bindItemClicks(container) {
        container.querySelectorAll('[data-view-item-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('a')) return;
                selectItem(el.dataset.viewItemId);
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(el.dataset.viewItemId); }
            });
        });
    }

    // ─── Table view ──────────────────────────────────────
    const TABLE_COLUMNS = [
        { key: 'title', label: 'Título' },
        { key: 'lane', label: 'Trilha' },
        { key: 'type', label: 'Tipo' },
        { key: 'status', label: 'Status' },
        { key: 'member', label: 'Responsável' },
        { key: 'start', label: 'Início' },
        { key: 'end', label: 'Fim' },
        { key: 'progress', label: 'Progresso' },
        { key: 'health', label: 'Saúde' },
        { key: 'confidence', label: 'Confiança' },
        { key: 'size', label: 'Tamanho' },
        { key: 'deps', label: 'Depende de' },
        { key: 'links', label: 'Links' }
    ];
    const HEALTH_ORDER = { red: 0, yellow: 1, green: 2, '': 3 };
    const CONF_ORDER = { low: 0, medium: 1, high: 2 };
    const SIZE_ORDER = { GG: 0, G: 1, M: 2, P: 3, '': 4 };

    function sortValue(item, key, lk) {
        const r = Engine.itemRange(item);
        switch (key) {
            case 'title': return (item.title || '').toLowerCase();
            case 'lane': { const l = laneOf(item, lk); return l ? lk.lanes.indexOf(l) : Infinity; }
            case 'type': { const t = typeOf(item, lk); return t ? lk.types.indexOf(t) : Infinity; }
            case 'status': return lk.statuses.findIndex(s => s.value === item.status);
            case 'member': { const m = lk.members.find(x => x.id === item.responsavel); return m ? m.name.toLowerCase() : '~'; }
            case 'start': return Number.isFinite(r.start) ? r.start : Infinity;
            case 'end': return Number.isFinite(r.end) ? r.end : Infinity;
            case 'progress': return item.progress;
            case 'health': return HEALTH_ORDER[item.health] ?? 3;
            case 'confidence': return CONF_ORDER[item.confidence] ?? 2;
            case 'size': return SIZE_ORDER[item.size] ?? 4;
            case 'deps': return item.dependsOn.length;
            case 'links': return item.links.length;
            default: return 0;
        }
    }

    function renderTable(container, visibleItems) {
        const lk = lookups();
        const { key, dir } = vs.tableSort;
        const rows = visibleItems.slice().sort((a, b) => {
            const va = sortValue(a, key, lk), vb = sortValue(b, key, lk);
            if (va < vb) return -dir;
            if (va > vb) return dir;
            return 0;
        });

        let html = '<div class="roadmap-table-wrap"><table class="roadmap-table"><thead><tr>';
        TABLE_COLUMNS.forEach(c => {
            const active = c.key === key;
            html += `<th scope="col" class="${active ? 'sorted' : ''}"><button type="button" class="th-sort" data-sort="${c.key}">${escapeHtml(c.label)}<span class="th-arrow">${active ? (dir === 1 ? '▲' : '▼') : ''}</span></button></th>`;
        });
        html += '</tr></thead><tbody>';

        if (!rows.length) {
            html += `<tr><td colspan="${TABLE_COLUMNS.length}" class="table-empty">Nenhum item para exibir.</td></tr>`;
        }
        rows.forEach(item => {
            const r = Engine.itemRange(item);
            const type = typeOf(item, lk);
            const done = Engine.isDone(item, lk.statuses);
            const conflict = Engine.hasDependencyConflict(item, lk.itemsById);
            const deps = item.dependsOn.map(id => lk.itemsById.get(id)).filter(Boolean).map(d => escapeHtml(d.title)).join(', ');
            const links = item.links.map(l => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || l.url)}</a>`).join(', ');
            const conf = lk.confidence.find(c => c.value === item.confidence);
            html += `<tr data-view-item-id="${escapeAttr(item.id)}" tabindex="0" class="${item.id === selectedItemId ? 'selected' : ''}${done ? ' is-done' : ''}">`;
            html += `<td class="td-title"><span class="type-dot" style="background:${escapeAttr(type ? type.color : '#6b7280')}"></span>${escapeHtml(item.title)}${item.intruder ? ' <span class="td-badge td-intruder">Intruder</span>' : ''}${item.highlight ? ' <span class="td-star">★</span>' : ''}</td>`;
            html += `<td>${laneChip(item, lk) || '<span class="td-muted">—</span>'}</td>`;
            html += `<td>${escapeHtml(type ? type.label : item.type)}</td>`;
            html += `<td>${escapeHtml(labelOf(lk.statuses, item.status) || '—')}</td>`;
            html += `<td>${memberAvatar(item, lk)} ${escapeHtml((lk.members.find(m => m.id === item.responsavel) || {}).name || '')}</td>`;
            html += `<td class="td-num">${sprintLabel(r.start)}</td>`;
            html += `<td class="td-num">${sprintLabel(r.end)}</td>`;
            html += `<td class="td-progress">${progressBar(item)}</td>`;
            html += `<td>${healthDot(item, lk)} ${escapeHtml(labelOf(lk.health, item.health))}</td>`;
            html += `<td class="conf-${escapeAttr(item.confidence)}">${escapeHtml(conf ? conf.label : '')}</td>`;
            html += `<td class="td-num">${escapeHtml(item.size || '—')}</td>`;
            html += `<td>${deps || '<span class="td-muted">—</span>'}${conflict ? ' <span class="td-badge td-conflict" title="Começa antes do fim da dependência">⚠ conflito</span>' : ''}</td>`;
            html += `<td class="td-links">${links || '<span class="td-muted">—</span>'}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        container.innerHTML = html;
        container.querySelectorAll('.th-sort').forEach(btn => btn.addEventListener('click', () => setTableSort(btn.dataset.sort)));
        bindItemClicks(container);
    }

    // ─── Now / Next / Later board ────────────────────────
    function renderBoard(container, visibleItems, sprints) {
        const lk = lookups();
        const buckets = Engine.bucketNowNextLater(visibleItems, sprints, referenceDate(), lk.statuses);
        const cur = Engine.getCurrentSprintIndex(sprints, referenceDate());
        const curLabel = cur >= 0 ? `Sprint ${sprints[cur].number}` : 'fora do período';
        const columns = [
            { key: 'now', title: 'Agora', hint: `Na sprint atual (${curLabel}) ou atrasado`, items: buckets.now },
            { key: 'next', title: 'Próximo', hint: 'Começa nas 2 próximas sprints', items: buckets.next },
            { key: 'later', title: 'Depois', hint: 'Mais adiante — direção, não compromisso', items: buckets.later },
            { key: 'done', title: 'Concluído', hint: 'Status de conclusão ou 100%', items: buckets.done }
        ];
        const byStart = (a, b) => (Engine.itemRange(a).start || 0) - (Engine.itemRange(b).start || 0);

        let html = '<div class="roadmap-board">';
        columns.forEach(col => {
            html += `<section class="board-col board-col-${col.key}" aria-label="${escapeAttr(col.title)}">`;
            html += `<header class="board-col-header"><span class="board-col-title">${escapeHtml(col.title)}</span><span class="board-col-count">${col.items.length}</span><span class="board-col-hint">${escapeHtml(col.hint)}</span></header>`;
            html += '<div class="board-cards">';
            if (!col.items.length) html += '<div class="board-empty">—</div>';
            col.items.slice().sort(byStart).forEach(item => {
                const r = Engine.itemRange(item);
                const type = typeOf(item, lk);
                const conflict = Engine.hasDependencyConflict(item, lk.itemsById);
                html += `<article class="board-card${item.id === selectedItemId ? ' selected' : ''} conf-${escapeAttr(item.confidence)}" data-view-item-id="${escapeAttr(item.id)}" tabindex="0" style="border-left-color:${escapeAttr(type ? type.color : '#6b7280')}">`;
                html += `<div class="board-card-top">${healthDot(item, lk)}<span class="board-card-title">${escapeHtml(item.title)}</span>${item.highlight ? '<span class="td-star">★</span>' : ''}${memberAvatar(item, lk)}</div>`;
                html += '<div class="board-card-meta">';
                html += laneChip(item, lk);
                html += `<span class="board-card-range">${sprintLabel(r.start)} → ${sprintLabel(r.end)}</span>`;
                if (item.size) html += `<span class="td-badge">${escapeHtml(item.size)}</span>`;
                if (item.confidence !== 'high') html += `<span class="td-badge td-conf">${escapeHtml(labelOf(lk.confidence, item.confidence))}</span>`;
                if (conflict) html += '<span class="td-badge td-conflict">⚠ conflito</span>';
                html += '</div>';
                if (item.progress > 0) html += `<div class="board-card-progress">${progressBar(item)}</div>`;
                if (item.outcome) html += `<div class="board-card-outcome">${escapeHtml(item.outcome)}</div>`;
                html += '</article>';
            });
            html += '</div></section>';
        });
        html += '</div>';
        container.innerHTML = html;
        bindItemClicks(container);
    }

    // ─── Render dispatcher ───────────────────────────────
    // Single entry point for every "redraw" call site.
    function render() {
        const container = document.getElementById('roadmap-container');
        const config = State.getConfig();
        const sprints = Engine.calculateSprints(config);
        const visibleItems = Engine.filterItems(State.getItems(), vs.filters);
        renderSummary(visibleItems, sprints);

        if (vs.view === 'timeline' || !container) {
            Renderer.render();
            return;
        }
        if (!sprints.length) {
            container.innerHTML = '<div class="roadmap-empty">Configure as datas para gerar o roadmap.</div>';
            return;
        }
        const headerEl = document.getElementById('roadmap-title');
        const subtitleEl = document.getElementById('roadmap-subtitle');
        if (headerEl) headerEl.textContent = `ROADMAP ${config.periodo}`;
        if (subtitleEl) subtitleEl.textContent = config.squad;

        if (vs.view === 'table') renderTable(container, visibleItems);
        else renderBoard(container, visibleItems, sprints);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str == null ? '' : String(str))
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    return {
        init, render, renderToolbar,
        getViewState, getView, getFilters, getCollapsedLaneIds, isLaneCollapsed, getActiveBaselineId, isPresentation,
        setView, setFilters, clearFilters, setColorBy, setZoom, stepZoom,
        setShowDependencies, setShowProgress, toggleLaneCollapsed, setActiveBaselineId, setTableSort,
        setPresentation, togglePresentation
    };
})();
