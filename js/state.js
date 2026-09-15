const State = (() => {
    const STORAGE_KEY = 'roadmap-planner-data';
    const SCHEMA_VERSION = 3;   // v3: lanes, progress, health, confidence, size, dependsOn, links, outcome

    const defaultConfig = {
        periodo: 'Q1/2026',
        squad: 'Squad Ativação',
        dataInicio: '2026-01-05',
        dataFim: '2026-04-06',
        diasSprint: 14,
        sprintStartNumber: 115,
        bgColor: '#0f172a',
        headerColor: '#1e293b',
        monthBandColor: '#1e293b',
        sprintBandColor: '#334155',
        itemTypes: [
            { value: 'EV', label: 'EV', color: '#0d9488' },
            { value: 'TaticoNegócio', label: 'Tático Negócio', color: '#d97706' },
            { value: 'TaticoEngenharia', label: 'Tático Engenharia', color: '#4f46e5' }
        ],
        statusTypes: [
            { value: '', label: 'Nenhum', icon: '', done: false },
            { value: 'EmAndamento', label: 'Em Andamento', icon: '▶', done: false },
            { value: 'Finalizado', label: 'Finalizado', icon: '✓', done: true },
            { value: 'PendenteSubida', label: 'Pendente de Subida', icon: '⏳', done: false }
        ],
        teamMembers: [],
        milestones: [],
        lanes: [],              // { id, name, color, description } — swimlanes (tema / objetivo / frente)
        roadmapNotes: '',
        referenceDate: ''
    };

    // Fixed vocabularies (not user-editable; keep rendering and exports predictable).
    const HEALTH_TYPES = [
        { value: '', label: 'Sem saúde', color: '' },
        { value: 'green', label: 'No prazo', color: '#22c55e' },
        { value: 'yellow', label: 'Atenção', color: '#f59e0b' },
        { value: 'red', label: 'Em risco', color: '#ef4444' }
    ];
    const CONFIDENCE_TYPES = [
        { value: 'high', label: 'Confirmado' },
        { value: 'medium', label: 'Provável' },
        { value: 'low', label: 'Exploratório' }
    ];
    const SIZE_TYPES = [
        { value: '', label: '—' },
        { value: 'P', label: 'P' },
        { value: 'M', label: 'M' },
        { value: 'G', label: 'G' },
        { value: 'GG', label: 'GG' }
    ];
    const HEALTH_VALUES = HEALTH_TYPES.map(h => h.value);
    const CONFIDENCE_VALUES = CONFIDENCE_TYPES.map(c => c.value);
    const SIZE_VALUES = SIZE_TYPES.map(s => s.value);
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;

    let state = { config: normalizeConfig({}), items: [] };
    const listeners = {};

    // ─── Múltiplos roadmaps ──────────────────────────────
    // `state` is always the ACTIVE roadmap (working copy). `roadmaps` holds every
    // roadmap's payload; on save() the active one is synced back into it.
    let roadmaps = {};      // id -> { name, config, items }
    let activeId = null;
    let activeName = 'Roadmap 1';
    let suppressSave = false;   // true while previewing a shared roadmap (see previewShared)

    // ─── History (undo/redo) ─────────────────────────────
    const MAX_HISTORY = 50;
    const history = [];
    const future = [];

    function snapshot() {
        return JSON.stringify(state);
    }

    function pushHistory() {
        history.push(snapshot());
        if (history.length > MAX_HISTORY) history.shift();
        future.length = 0;
    }

    function restore(serialized) {
        const parsed = JSON.parse(serialized);
        state.config = normalizeConfig(parsed.config);
        state.items = normalizeItems(parsed.items);
    }

    function undo() {
        if (!history.length) return;
        future.push(snapshot());
        restore(history.pop());
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function redo() {
        if (!future.length) return;
        history.push(snapshot());
        restore(future.pop());
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
    }

    function emit(event, data) {
        (listeners[event] || []).forEach(fn => fn(data));
    }

    function getConfig() { return state.config; }
    function getItems() { return state.items; }
    function getState() { return state; }
    function getItemTypes() { return state.config.itemTypes || defaultConfig.itemTypes; }
    function getStatusTypes() { return state.config.statusTypes || defaultConfig.statusTypes; }
    function getTeamMembers() { return state.config.teamMembers || []; }
    function getMilestones() { return state.config.milestones || []; }
    function getLanes() { return state.config.lanes || []; }
    function getHealthTypes() { return HEALTH_TYPES; }
    function getConfidenceTypes() { return CONFIDENCE_TYPES; }
    function getSizeTypes() { return SIZE_TYPES; }

    function setConfig(cfg) {
        pushHistory();
        state.config = normalizeConfig({ ...state.config, ...cfg });
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function setItems(items) {
        pushHistory();
        state.items = normalizeItems(items);
        save();
        emit('state:changed', state);
    }

    function addItem(item) {
        pushHistory();
        item.id = item.id || generateId();
        state.items.push(normalizeItem(item));
        pruneDependencies(state.items);
        save();
        emit('state:changed', state);
        return item.id;
    }

    function updateItem(id, updates) {
        const idx = state.items.findIndex(i => i.id === id);
        if (idx === -1) return;
        pushHistory();
        state.items[idx] = normalizeItem({ ...state.items[idx], ...updates });
        pruneDependencies(state.items);
        save();
        emit('state:changed', state);
    }

    function deleteItem(id) {
        pushHistory();
        state.items = state.items.filter(i => i.id !== id);
        // Drop dangling references in the same undo step.
        state.items.forEach(it => {
            if (it.dependsOn.includes(id)) it.dependsOn = it.dependsOn.filter(d => d !== id);
        });
        save();
        emit('state:changed', state);
    }

    // ─── Normalization ───────────────────────────────────
    function normalizeConfig(cfg) {
        const merged = { ...defaultConfig, ...(cfg || {}) };
        merged.diasSprint = Math.max(1, parseInt(merged.diasSprint, 10) || 14);
        merged.sprintStartNumber = parseInt(merged.sprintStartNumber, 10) || 1;

        if (!Array.isArray(merged.itemTypes) || !merged.itemTypes.length) merged.itemTypes = defaultConfig.itemTypes.map(t => ({ ...t }));
        if (!Array.isArray(merged.statusTypes) || !merged.statusTypes.length) merged.statusTypes = defaultConfig.statusTypes.map(s => ({ ...s }));
        merged.statusTypes = merged.statusTypes.map(s => ({
            value: s.value == null ? '' : String(s.value),
            label: s.label || '',
            icon: s.icon || '',
            // Legacy (v2) status lists have no `done`; "Finalizado" is the conventional terminal status.
            done: s.done === undefined ? s.value === 'Finalizado' : !!s.done
        }));
        if (!Array.isArray(merged.teamMembers)) merged.teamMembers = [];
        if (!Array.isArray(merged.milestones)) merged.milestones = [];

        merged.lanes = (Array.isArray(merged.lanes) ? merged.lanes : [])
            .filter(l => l && typeof l === 'object')
            .map(l => ({
                id: l.id || generateTypeId('ln'),
                name: (l.name || 'Trilha').toString(),
                color: HEX_RE.test(l.color) ? l.color : '#6366f1',
                description: (l.description || '').toString()
            }));

        // View state never lives in config (it would pollute undo and rebuild forms).
        delete merged.colorBy; delete merged.zoom; delete merged.collapsedLaneIds;
        delete merged.showDependencies; delete merged.showProgress; delete merged.baselines;
        delete merged.activeBaselineId;
        return merged;
    }

    function normalizeItems(items) {
        const list = (items || []).map(normalizeItem);
        pruneDependencies(list);
        return list;
    }

    // Referential clean-up: dependsOn may only point to existing items.
    function pruneDependencies(list) {
        const ids = new Set(list.map(i => i.id));
        list.forEach(it => {
            const kept = it.dependsOn.filter(d => ids.has(d));
            if (kept.length !== it.dependsOn.length) it.dependsOn = kept;
        });
    }

    // Shape-only validation (no cross-item references — see pruneDependencies).
    function normalizeItem(item) {
        let status = item.status || '';
        if (status === 'None' || status === 'none') status = '';
        const firstType = (state.config.itemTypes && state.config.itemTypes[0])
            ? state.config.itemTypes[0].value : 'EV';
        const id = item.id || generateId();

        let progress = parseInt(item.progress, 10);
        if (!Number.isFinite(progress)) progress = 0;
        progress = Math.max(0, Math.min(100, progress));

        const dependsOn = [];
        (Array.isArray(item.dependsOn) ? item.dependsOn : []).forEach(d => {
            if (typeof d === 'string' && d && d !== id && !dependsOn.includes(d)) dependsOn.push(d);
        });

        const links = (Array.isArray(item.links) ? item.links : [])
            .filter(l => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url.trim()))
            .map(l => ({ label: (l.label || '').toString().trim(), url: l.url.trim() }));

        return {
            id,
            title: item.title || 'Sem título',
            type: item.type || firstType,
            laneId: typeof item.laneId === 'string' ? item.laneId : '',
            intruder: !!item.intruder,
            highlight: !!item.highlight,
            status,
            responsavel: item.responsavel || '',
            observacao: item.observacao || '',
            outcome: item.outcome || '',
            progress,
            health: HEALTH_VALUES.includes(item.health) ? item.health : '',
            confidence: CONFIDENCE_VALUES.includes(item.confidence) ? item.confidence : 'high',
            size: SIZE_VALUES.includes(item.size) ? item.size : '',
            dependsOn,
            links,
            segments: (item.segments || []).map(seg => ({
                sprintStart: seg.sprintStart,
                sprintEnd: seg.sprintEnd,
                startHalf: !!seg.startHalf,
                endHalf: !!seg.endHalf,
                delays: (seg.delays || []).map(d => ({
                    delaySprintStart: d.delaySprintStart,
                    delaySprintEnd: d.delaySprintEnd
                }))
            }))
        };
    }

    function generateId() {
        return 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function generateTypeId(prefix) {
        return (prefix || 'type') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    }

    // ─── Trilhas (swimlanes) ─────────────────────────────
    // Always immutable updates: defaultConfig.lanes is shared by reference through
    // the shallow spread in normalizeConfig, so never push into state.config.lanes.
    const LANE_COLORS = ['#6366f1', '#0d9488', '#d97706', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316'];

    function addLane(name, extra) {
        const lanes = getLanes();
        const lane = {
            id: generateTypeId('ln'),
            name: (name && name.trim()) || 'Nova trilha',
            color: LANE_COLORS[lanes.length % LANE_COLORS.length],
            description: '',
            ...(extra || {})
        };
        setConfig({ lanes: [...lanes, lane] });
        return lane.id;
    }

    function updateLane(id, patch) {
        const lanes = getLanes();
        if (!lanes.some(l => l.id === id)) return;
        setConfig({ lanes: lanes.map(l => l.id === id ? { ...l, ...patch, id } : l) });
    }

    function moveLane(id, dir) {
        const lanes = getLanes();
        const idx = lanes.findIndex(l => l.id === id);
        const to = idx + dir;
        if (idx === -1 || to < 0 || to >= lanes.length) return;
        const next = lanes.slice();
        [next[idx], next[to]] = [next[to], next[idx]];
        setConfig({ lanes: next });
    }

    // Removes the lane and unassigns its items in a single undo step.
    function deleteLane(id) {
        const lanes = getLanes();
        if (!lanes.some(l => l.id === id)) return;
        pushHistory();
        state.config = normalizeConfig({ ...state.config, lanes: lanes.filter(l => l.id !== id) });
        state.items.forEach(it => { if (it.laneId === id) it.laneId = ''; });
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    // Finds a lane by (case-insensitive) name, creating it when missing. Used by
    // CSV import. Returns the lane id. Does NOT emit — the caller batches.
    function ensureLaneByNameNoEmit(name) {
        const clean = (name || '').trim();
        if (!clean) return '';
        const found = getLanes().find(l => l.name.trim().toLowerCase() === clean.toLowerCase());
        if (found) return found.id;
        const lane = { id: generateTypeId('ln'), name: clean, color: LANE_COLORS[getLanes().length % LANE_COLORS.length], description: '' };
        state.config = normalizeConfig({ ...state.config, lanes: [...getLanes(), lane] });
        return lane.id;
    }

    function getContrastColor(hexColor) {
        const hex = (hexColor || '#000000').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const toLinear = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
        const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        return L > 0.179 ? '#1e293b' : '#f0fdfa';
    }

    function darkenColor(hexColor, amount) {
        const hex = (hexColor || '#000000').replace('#', '');
        const r = Math.max(0, Math.round((parseInt(hex.substring(0, 2), 16) || 0) * (1 - amount)));
        const g = Math.max(0, Math.round((parseInt(hex.substring(2, 4), 16) || 0) * (1 - amount)));
        const b = Math.max(0, Math.round((parseInt(hex.substring(4, 6), 16) || 0) * (1 - amount)));
        return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    }

    function save() {
        if (suppressSave) return;
        try {
            if (!activeId) activeId = generateTypeId('rm');
            roadmaps[activeId] = { name: activeName, config: state.config, items: state.items };
            const payload = { version: SCHEMA_VERSION, activeId, roadmaps };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            if (typeof showToast === 'function') {
                showToast('Falha ao salvar no navegador: ' + e.message, 'error');
            } else {
                console.warn('[State] save failed:', e);
            }
        }
    }

    function initDefaultRoadmap() {
        activeId = generateTypeId('rm');
        activeName = 'Roadmap 1';
        state.config = normalizeConfig({});
        state.items = [];
        roadmaps = { [activeId]: { name: activeName, config: state.config, items: state.items } };
    }

    function loadActiveInto(slot) {
        state.config = normalizeConfig(slot.config);
        state.items = normalizeItems(slot.items);
    }

    function load() {
        suppressSave = false;   // a fresh load is authoritative; re-enable persistence
        let raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('[State] localStorage unavailable:', e);
            initDefaultRoadmap();
            return;
        }
        if (!raw) { initDefaultRoadmap(); return; }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.warn('[State] saved data is not valid JSON; using defaults:', e);
            initDefaultRoadmap();
            return;
        }

        // v2/v3: envelope with multiple roadmaps. v3 only adds fields, which
        // normalizeConfig/normalizeItem default — same envelope shape.
        if (parsed && (parsed.version === 2 || parsed.version === 3) && parsed.roadmaps && typeof parsed.roadmaps === 'object') {
            roadmaps = {};
            Object.keys(parsed.roadmaps).forEach(id => {
                const r = parsed.roadmaps[id] || {};
                // normalizeItem reads state.config.itemTypes for the default type;
                // set the config first so each roadmap normalizes against its own types.
                state.config = normalizeConfig(r.config);
                roadmaps[id] = {
                    name: r.name || 'Roadmap',
                    config: state.config,
                    items: normalizeItems(r.items)
                };
            });
            const ids = Object.keys(roadmaps);
            if (!ids.length) { initDefaultRoadmap(); return; }
            activeId = roadmaps[parsed.activeId] ? parsed.activeId : ids[0];
            activeName = roadmaps[activeId].name;
            state.config = roadmaps[activeId].config;
            state.items = roadmaps[activeId].items;
            if (parsed.version !== SCHEMA_VERSION) save();
            return;
        }

        // Legacy v0/v1 → wrap as a single roadmap and persist in the current shape.
        const migrated = migrate(parsed);
        activeId = generateTypeId('rm');
        activeName = 'Roadmap 1';
        state.config = normalizeConfig(migrated.config);
        state.items = normalizeItems(migrated.items);
        roadmaps = { [activeId]: { name: activeName, config: state.config, items: state.items } };
        save();
    }

    function migrate(parsed) {
        // v0 (legacy): { config, items } at top level — no version field.
        // v1: { version: 1, data: { config, items } }.
        if (!parsed || typeof parsed !== 'object') return { config: {}, items: [] };
        if (!parsed.version) {
            return { config: parsed.config || {}, items: parsed.items || [] };
        }
        const data = parsed.data || {};
        return { config: data.config || {}, items: data.items || [] };
    }

    // ─── API de múltiplos roadmaps ───────────────────────
    function listRoadmaps() {
        return Object.keys(roadmaps).map(id => ({ id, name: roadmaps[id].name }));
    }

    function getActiveRoadmapId() { return activeId; }

    function switchRoadmap(id) {
        if (!roadmaps[id] || id === activeId) return;
        save();                       // persist the current active roadmap first
        activeId = id;
        activeName = roadmaps[id].name;
        loadActiveInto(roadmaps[id]);
        history.length = 0; future.length = 0;   // undo history is per-roadmap
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function createRoadmap(name) {
        save();
        const id = generateTypeId('rm');
        activeId = id;
        activeName = (name && name.trim()) || 'Novo Roadmap';
        state.config = normalizeConfig({});
        state.items = [];
        roadmaps[id] = { name: activeName, config: state.config, items: state.items };
        history.length = 0; future.length = 0;
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
        return id;
    }

    function deleteRoadmap(id) {
        if (!roadmaps[id]) return;
        const wasActive = (id === activeId);
        delete roadmaps[id];
        let ids = Object.keys(roadmaps);
        if (!ids.length) {
            initDefaultRoadmap();
        } else if (wasActive) {
            activeId = ids[0];
            activeName = roadmaps[activeId].name;
            loadActiveInto(roadmaps[activeId]);
            history.length = 0; future.length = 0;
        }
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function renameRoadmap(id, name) {
        if (!roadmaps[id] || !name || !name.trim()) return;
        roadmaps[id].name = name.trim();
        if (id === activeId) activeName = name.trim();
        save();
        emit('config:changed', state.config);
    }

    // ─── Preview de roadmap compartilhado (via URL) ──────
    // Carrega o roadmap na cópia de trabalho SEM persistir (suppressSave),
    // preservando os roadmaps reais do usuário no localStorage.
    function previewShared(parsed) {
        const source = parsed && parsed.version && parsed.data ? parsed.data : parsed;
        if (!source || typeof source !== 'object') return;
        suppressSave = true;
        state.config = normalizeConfig(source.config);
        state.items = normalizeItems(source.items || []);
        history.length = 0; future.length = 0;
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    // Converte o roadmap em preview num roadmap salvo de verdade.
    function commitShared(name) {
        suppressSave = false;
        const id = generateTypeId('rm');
        activeId = id;
        activeName = (name && name.trim()) || 'Compartilhado';
        roadmaps[id] = { name: activeName, config: state.config, items: state.items };
        history.length = 0; future.length = 0;
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
        return id;
    }

    function exportJSON() {
        return JSON.stringify(state, null, 2);
    }

    function importJSON(jsonString) {
        const parsed = JSON.parse(jsonString);
        // Accept both legacy shape ({ config, items }) and versioned ({ version, data: { config, items } }).
        const source = parsed && parsed.version && parsed.data ? parsed.data : parsed;
        pushHistory();
        if (source.config) state.config = normalizeConfig(source.config);
        state.items = normalizeItems(source.items || []);
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function importConfigFromTSV(text) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (!lines.length) throw new Error('Nenhum dado encontrado');

        const firstLineCols = lines[0].split('\t');

        if (lines.length >= 2 && firstLineCols.length >= 3) {
            const headers = firstLineCols.map(h => h.trim());
            const values = lines[1].split('\t').map(v => v.trim());
            const cfg = {};
            headers.forEach((h, i) => { if (values[i] !== undefined) cfg[h] = values[i]; });
            applyConfigMap(cfg);
            return;
        }

        if (firstLineCols.length === 2) {
            const cfg = {};
            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length >= 2) cfg[parts[0].trim()] = parts[1].trim();
            });
            applyConfigMap(cfg);
            return;
        }

        throw new Error('Formato não reconhecido. Use duas colunas (chave→valor) ou cabeçalho+valores.');
    }

    function applyConfigMap(cfg) {
        const mapped = {};
        Object.keys(cfg).forEach(k => {
            const val = cfg[k];
            switch (k) {
                case 'periodo': mapped.periodo = val; break;
                case 'squad': mapped.squad = val; break;
                case 'dataInicio': mapped.dataInicio = val; break;
                case 'dataFim': mapped.dataFim = val; break;
                case 'diasSprint': mapped.diasSprint = parseInt(val, 10); break;
                case 'sprintStartNumber': mapped.sprintStartNumber = parseInt(val, 10); break;
            }
        });
        setConfig(mapped);
    }

    function parseCSVLine(line, sep) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === sep) { result.push(current.trim()); current = ''; }
                else { current += ch; }
            }
        }
        result.push(current.trim());
        return result;
    }

    function detectSeparator(text) {
        const firstLine = text.split(/\r?\n/)[0];
        const commas = (firstLine.match(/,/g) || []).length;
        const semis = (firstLine.match(/;/g) || []).length;
        return semis > commas ? ';' : ',';
    }

    function importConfigFromCSV(text) {
        const sep = detectSeparator(text);
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV precisa de cabeçalho + pelo menos uma linha');
        const headers = parseCSVLine(lines[0], sep);
        const values = parseCSVLine(lines[1], sep);
        const cfg = {};
        headers.forEach((h, i) => { if (values[i] !== undefined) cfg[h] = values[i]; });
        applyConfigMap(cfg);
    }

    // CSV columns (one row per segment). `lane` is the lane NAME (created when
    // missing); `dependsOn` is a `|`-separated list of item ids; `links` is
    // `label=url|label=url`.
    const ITEM_CSV_COLUMNS = [
        'id', 'title', 'type', 'lane', 'status', 'responsavel', 'intruder', 'highlight',
        'progress', 'health', 'confidence', 'size', 'dependsOn', 'links', 'outcome', 'observacao',
        'segmentIndex', 'sprintStart', 'sprintEnd', 'startHalf', 'endHalf', 'delaySprintStart', 'delaySprintEnd'
    ];

    function csvEscape(v) {
        const s = v == null ? '' : String(v);
        return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function exportItemsCSV() {
        const lanesById = new Map(getLanes().map(l => [l.id, l.name]));
        const rows = [ITEM_CSV_COLUMNS.join(',')];
        state.items.forEach(it => {
            const base = {
                id: it.id, title: it.title, type: it.type,
                lane: lanesById.get(it.laneId) || '',
                status: it.status, responsavel: it.responsavel,
                intruder: it.intruder ? 'true' : 'false',
                highlight: it.highlight ? 'true' : 'false',
                progress: it.progress, health: it.health, confidence: it.confidence, size: it.size,
                dependsOn: it.dependsOn.join('|'),
                links: it.links.map(l => (l.label ? l.label + '=' : '') + l.url).join('|'),
                outcome: it.outcome, observacao: it.observacao
            };
            const segs = it.segments.length ? it.segments : [{ sprintStart: '', sprintEnd: '', delays: [] }];
            segs.forEach((seg, si) => {
                const delays = seg.delays && seg.delays.length ? seg.delays : [null];
                delays.forEach(d => {
                    const row = {
                        ...base,
                        segmentIndex: si,
                        sprintStart: seg.sprintStart, sprintEnd: seg.sprintEnd,
                        startHalf: seg.startHalf ? 'true' : 'false',
                        endHalf: seg.endHalf ? 'true' : 'false',
                        delaySprintStart: d ? d.delaySprintStart : '',
                        delaySprintEnd: d ? d.delaySprintEnd : ''
                    };
                    rows.push(ITEM_CSV_COLUMNS.map(c => csvEscape(row[c])).join(','));
                });
            });
        });
        return rows.join('\n');
    }

    function importItemsFromCSV(text) {
        const sep = detectSeparator(text);
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV precisa de cabeçalho + pelo menos uma linha');
        const headers = parseCSVLine(lines[0], sep);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = parseCSVLine(lines[i], sep);
            const row = {};
            headers.forEach((h, j) => { row[h] = vals[j] || ''; });
            rows.push(row);
        }

        const truthy = v => v === 'true' || v === '1';
        const itemMap = {};
        pushHistory();
        rows.forEach(row => {
            const id = row.id || generateId();
            if (!itemMap[id]) {
                const links = (row.links || '').split('|').filter(Boolean).map(part => {
                    const eq = part.indexOf('=');
                    return eq > 0 && !/^https?:/i.test(part) ? { label: part.slice(0, eq), url: part.slice(eq + 1) } : { label: '', url: part };
                });
                itemMap[id] = {
                    id,
                    title: row.title || '',
                    type: row.type || 'EV',
                    laneId: row.laneId || ensureLaneByNameNoEmit(row.lane),
                    intruder: truthy(row.intruder),
                    highlight: truthy(row.highlight),
                    status: row.status || '',
                    responsavel: row.responsavel || '',
                    observacao: row.observacao || '',
                    outcome: row.outcome || '',
                    progress: row.progress,
                    health: row.health || '',
                    confidence: row.confidence || 'high',
                    size: row.size || '',
                    dependsOn: (row.dependsOn || '').split('|').map(s => s.trim()).filter(Boolean),
                    links,
                    segments: []
                };
            }
            const MAX_SEGMENTS = 50;
            let segIdx = parseInt(row.segmentIndex, 10);
            if (!Number.isFinite(segIdx) || segIdx < 0) segIdx = 0;
            if (segIdx >= MAX_SEGMENTS) {
                throw new Error(`segmentIndex inválido (${segIdx}); máximo permitido é ${MAX_SEGMENTS - 1}`);
            }
            while (itemMap[id].segments.length <= segIdx) {
                itemMap[id].segments.push({ sprintStart: 0, sprintEnd: 0, delays: [] });
            }
            const seg = itemMap[id].segments[segIdx];
            if (row.sprintStart) seg.sprintStart = parseInt(row.sprintStart, 10);
            if (row.sprintEnd) seg.sprintEnd = parseInt(row.sprintEnd, 10);
            if (row.startHalf) seg.startHalf = truthy(row.startHalf);
            if (row.endHalf) seg.endHalf = truthy(row.endHalf);

            if (row.delaySprintStart && row.delaySprintEnd) {
                seg.delays.push({
                    delaySprintStart: parseInt(row.delaySprintStart, 10),
                    delaySprintEnd: parseInt(row.delaySprintEnd, 10)
                });
            }
        });

        // Single undo step for lanes created above + items.
        state.items = normalizeItems(Object.values(itemMap));
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    async function saveToFileSystem() {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'roadmap.json',
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(exportJSON());
            await writable.close();
            State._lastFileHandle = handle;
            return true;
        } catch (e) {
            if (e.name !== 'AbortError') throw e;
            return false;
        }
    }

    async function loadFromFileSystem() {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const file = await handle.getFile();
            const text = await file.text();
            importJSON(text);
            State._lastFileHandle = handle;
            return true;
        } catch (e) {
            if (e.name !== 'AbortError') throw e;
            return false;
        }
    }

    return {
        getConfig, getItems, getState, setConfig, setItems,
        addItem, updateItem, deleteItem, load, save,
        exportJSON, importJSON, importConfigFromTSV,
        importConfigFromCSV, importItemsFromCSV, exportItemsCSV,
        saveToFileSystem, loadFromFileSystem,
        getItemTypes, getStatusTypes, getTeamMembers, getMilestones,
        getLanes, addLane, updateLane, moveLane, deleteLane,
        getHealthTypes, getConfidenceTypes, getSizeTypes,
        generateTypeId, getContrastColor, darkenColor,
        listRoadmaps, getActiveRoadmapId, switchRoadmap,
        createRoadmap, deleteRoadmap, renameRoadmap,
        previewShared, commitShared,
        undo, redo,
        on, emit
    };
})();
