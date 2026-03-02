const State = (() => {
    const STORAGE_KEY = 'roadmap-planner-data';

    const defaultConfig = {
        periodo: 'Q1/2026',
        squad: 'Squad Ativação',
        dataInicio: '2026-01-05',
        dataFim: '2026-04-06',
        diasSprint: 14,
        sprintStartNumber: 115,
        bgColor: '#0f172a',
        headerColor: '#1e293b',
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
        ]
    };

    let state = { config: { ...defaultConfig }, items: [] };
    const listeners = {};

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

    function setConfig(cfg) {
        state.config = { ...state.config, ...cfg };
        state.config.diasSprint = parseInt(state.config.diasSprint, 10) || 14;
        state.config.sprintStartNumber = parseInt(state.config.sprintStartNumber, 10) || 1;
        save();
        emit('config:changed', state.config);
        emit('state:changed', state);
    }

    function setItems(items) {
        state.items = normalizeItems(items);
        save();
        emit('state:changed', state);
    }

    function addItem(item) {
        item.id = item.id || generateId();
        state.items.push(normalizeItem(item));
        save();
        emit('state:changed', state);
        return item.id;
    }

    function updateItem(id, updates) {
        const idx = state.items.findIndex(i => i.id === id);
        if (idx === -1) return;
        state.items[idx] = normalizeItem({ ...state.items[idx], ...updates });
        save();
        emit('state:changed', state);
    }

    function deleteItem(id) {
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
            observacao: item.observacao || '',
            segments: (item.segments || []).map(seg => ({
                sprintStart: seg.sprintStart,
                sprintEnd: seg.sprintEnd,
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
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                state.config = { ...defaultConfig, ...parsed.config };
                state.items = normalizeItems(parsed.items);
            }
        } catch (e) { /* ignore */ }
    }

    function exportJSON() {
        return JSON.stringify(state, null, 2);
    }

    function importJSON(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (parsed.config) state.config = { ...defaultConfig, ...parsed.config };
        state.items = normalizeItems(parsed.items || []);
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
        getItemTypes, getStatusTypes,
        generateTypeId, getContrastColor, darkenColor,
        on, emit
    };
})();
