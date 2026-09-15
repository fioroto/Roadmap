// View state (session-scoped, persisted per roadmap in its own storage key) and
// the render dispatcher. Nothing here goes through State.setConfig: view state
// must not create undo steps nor rebuild the side panel / open item form.
const Views = (() => {
    const STORAGE_KEY = 'roadmap-planner-view';
    const VIEWS = ['timeline', 'table', 'board'];
    const ZOOMS = ['auto', 'compact', 'normal', 'wide'];
    const COLOR_BY = ['type', 'lane', 'health', 'member'];

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
            presentation: false
        };
    }

    let vs = defaults();
    let boundRoadmapId = null;

    function init() {
        loadFor(State.getActiveRoadmapId());
        // Switching roadmaps emits config:changed; pick up that roadmap's view state.
        State.on('config:changed', () => {
            const id = State.getActiveRoadmapId();
            if (id !== boundRoadmapId) loadFor(id);
        });
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

    function setPresentation(flag) {
        vs.presentation = !!flag;
        changed('view:changed');
    }

    // ─── Render dispatcher ───────────────────────────────
    // Single entry point for every "redraw" call site. Extended by the table
    // and board views; the timeline is the Renderer.
    function render() {
        Renderer.render();
    }

    return {
        init, render,
        getViewState, getView, getFilters, getCollapsedLaneIds, isLaneCollapsed, getActiveBaselineId, isPresentation,
        setView, setFilters, clearFilters, setColorBy, setZoom, stepZoom,
        setShowDependencies, setShowProgress, toggleLaneCollapsed, setActiveBaselineId, setPresentation
    };
})();
