const State = (() => {
    const STORAGE_KEY = 'roadmap-planner-data';
    const SCHEMA_VERSION = 1;

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
            { value: '', label: 'Nenhum', icon: '' },
            { value: 'EmAndamento', label: 'Em Andamento', icon: '▶' },
            { value: 'Finalizado', label: 'Finalizado', icon: '✓' },
            { value: 'PendenteSubida', label: 'Pendente de Subida', icon: '⏳' }
        ],
        teamMembers: [],
        milestones: []
    };

    let state = { config: { ...defaultConfig }, items: [] };
    const listeners = {};

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
        state.config = { ...defaultConfig, ...(parsed.config || {}) };
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

    function setConfig(cfg) {
        pushHistory();
        state.config = { ...state.config, ...cfg };
        state.config.diasSprint = parseInt(state.config.diasSprint, 10) || 14;
        state.config.sprintStartNumber = parseInt(state.config.sprintStartNumber, 10) || 1;
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
        save();
        emit('state:changed', state);
        return item.id;
    }

    function updateItem(id, updates) {
        const idx = state.items.findIndex(i => i.id === id);
        if (idx === -1) return;
        pushHistory();
        state.items[idx] = normalizeItem({ ...state.items[idx], ...updates });
        save();
        emit('state:changed', state);
    }

    function deleteItem(id) {
        pushHistory();
        state.items = state.items.filter(i => i.id !== id);
        save();
        emit('state:changed', state);
    }

    function normalizeItems(items) {
        return (items || []).map(normalizeItem);
    }

    function normalizeItem(item) {
        let status = item.status || '';
        if (status === 'None' || status === 'none') status = '';
        const firstType = (state.config.itemTypes && state.config.itemTypes[0])
            ? state.config.itemTypes[0].value : 'EV';
        return {
            id: item.id || generateId(),
            title: item.title || 'Sem título',
            type: item.type || firstType,
            intruder: !!item.intruder,
            status,
            responsavel: item.responsavel || '',
            observacao: item.observacao || '',
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
        try {
            const payload = { version: SCHEMA_VERSION, data: state };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            if (typeof showToast === 'function') {
                const msg = (typeof I18n !== 'undefined')
                    ? I18n.t('state.save_failed', { msg: e.message })
                    : ('Falha ao salvar no navegador: ' + e.message);
                showToast(msg, 'error');
            } else {
                console.warn('[State] save failed:', e);
            }
        }
    }

    function load() {
        let raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('[State] localStorage unavailable:', e);
            return;
        }
        if (!raw) return;

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.warn('[State] saved data is not valid JSON; using defaults:', e);
            return;
        }

        const migrated = migrate(parsed);
        state.config = { ...defaultConfig, ...(migrated.config || {}) };
        state.items = normalizeItems(migrated.items);

        // If we migrated from a legacy format, persist in the new shape.
        if (!parsed.version) save();
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

    function exportJSON() {
        return JSON.stringify(state, null, 2);
    }

    function importJSON(jsonString) {
        const parsed = JSON.parse(jsonString);
        // Accept both legacy shape ({ config, items }) and versioned ({ version, data: { config, items } }).
        const source = parsed && parsed.version && parsed.data ? parsed.data : parsed;
        pushHistory();
        if (source.config) state.config = { ...defaultConfig, ...source.config };
        state.items = normalizeItems(source.items || []);
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function importConfigFromTSV(text) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (!lines.length) throw new Error(I18n.t('ie.error_no_data'));

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

        throw new Error(I18n.t('ie.error_paste_format'));
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
        if (lines.length < 2) throw new Error(I18n.t('ie.error_csv_header'));
        const headers = parseCSVLine(lines[0], sep);
        const values = parseCSVLine(lines[1], sep);
        const cfg = {};
        headers.forEach((h, i) => { if (values[i] !== undefined) cfg[h] = values[i]; });
        applyConfigMap(cfg);
    }

    function importItemsFromCSV(text) {
        const sep = detectSeparator(text);
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error(I18n.t('ie.error_csv_header'));
        const headers = parseCSVLine(lines[0], sep);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const vals = parseCSVLine(lines[i], sep);
            const row = {};
            headers.forEach((h, j) => { row[h] = vals[j] || ''; });
            rows.push(row);
        }

        const itemMap = {};
        rows.forEach(row => {
            const id = row.id || generateId();
            if (!itemMap[id]) {
                itemMap[id] = {
                    id,
                    title: row.title || '',
                    type: row.type || 'EV',
                    intruder: row.intruder === 'true' || row.intruder === '1',
                    status: row.status || '',
                    responsavel: row.responsavel || '',
                    observacao: row.observacao || '',
                    segments: []
                };
            }
            const segIdx = parseInt(row.segmentIndex, 10) || 0;
            while (itemMap[id].segments.length <= segIdx) {
                itemMap[id].segments.push({ sprintStart: 0, sprintEnd: 0, delays: [] });
            }
            const seg = itemMap[id].segments[segIdx];
            if (row.sprintStart) seg.sprintStart = parseInt(row.sprintStart, 10);
            if (row.sprintEnd) seg.sprintEnd = parseInt(row.sprintEnd, 10);
            if (row.startHalf) seg.startHalf = row.startHalf === 'true' || row.startHalf === '1';
            if (row.endHalf) seg.endHalf = row.endHalf === 'true' || row.endHalf === '1';

            if (row.delaySprintStart && row.delaySprintEnd) {
                seg.delays.push({
                    delaySprintStart: parseInt(row.delaySprintStart, 10),
                    delaySprintEnd: parseInt(row.delaySprintEnd, 10)
                });
            }
        });

        setItems(Object.values(itemMap));
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
        importConfigFromCSV, importItemsFromCSV,
        saveToFileSystem, loadFromFileSystem,
        getItemTypes, getStatusTypes, getTeamMembers, getMilestones,
        generateTypeId, getContrastColor, darkenColor,
        undo, redo,
        on, emit
    };
})();
