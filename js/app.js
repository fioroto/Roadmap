document.addEventListener('DOMContentLoaded', () => {
    State.load();

    Renderer.init(document.getElementById('roadmap-container'));
    Tooltip.init();
    ConfigPanel.init();
    ItemEditor.init();
    ImportExport.init();

    State.on('state:changed', () => Renderer.render());
    State.on('config:changed', () => Renderer.render());
    State.on('item:select', (id) => Renderer.setSelectedItem(id));

    // If main text is light (dark bg), return a lighter muted gray; else a darker one.
    function getMutedColor(contrastColor) {
        return contrastColor === '#1e293b' ? '#64748b' : '#94a3b8';
    }

    function applyColors(cfg) {
        if (!cfg) return;
        const root = document.documentElement.style;

        if (cfg.bgColor) {
            root.setProperty('--bg-primary', cfg.bgColor);
        }
        if (cfg.headerColor) {
            const headerEl = document.querySelector('.app-header');
            if (headerEl) headerEl.style.background = cfg.headerColor;
            const c = State.getContrastColor(cfg.headerColor);
            root.setProperty('--header-text', c);
            root.setProperty('--header-text-secondary', getMutedColor(c));
        }
        if (cfg.monthBandColor) {
            root.setProperty('--month-band-bg', cfg.monthBandColor);
            root.setProperty('--month-band-text', State.getContrastColor(cfg.monthBandColor));
        }
        if (cfg.sprintBandColor) {
            root.setProperty('--sprint-band-bg', cfg.sprintBandColor);
            const c = State.getContrastColor(cfg.sprintBandColor);
            root.setProperty('--sprint-band-text', c);
            root.setProperty('--sprint-band-text-muted', getMutedColor(c));
        }
    }

    State.on('config:changed', applyColors);

    // Panel tab switching
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.panel-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const target = document.getElementById(tab.dataset.target);
            if (target) target.classList.add('active');
        });
    });

    // Panel toggle
    const toggleBtn = document.getElementById('btn-toggle-panel');
    const sidePanel = document.getElementById('side-panel');
    if (toggleBtn && sidePanel) {
        toggleBtn.addEventListener('click', () => {
            sidePanel.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed');
            const collapsed = sidePanel.classList.contains('collapsed');
            toggleBtn.textContent = collapsed ? '▶' : '◀';
            toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            // Re-render roadmap after panel transition completes (200ms)
            setTimeout(() => Renderer.render(), 210);
        });
    }

    applyColors(State.getConfig());

    Renderer.render();

    // ── Roadmap compartilhado via URL (#d=...) ──
    function showSharedBanner() {
        if (document.getElementById('shared-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'shared-banner';
        banner.className = 'shared-banner';

        const label = document.createElement('span');
        label.textContent = 'Você está vendo um roadmap compartilhado (ainda não salvo).';
        banner.appendChild(label);

        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-primary btn-sm';
        importBtn.textContent = 'Importar para meus roadmaps';
        importBtn.addEventListener('click', () => {
            State.commitShared('Compartilhado');
            history.replaceState(null, '', location.pathname + location.search);
            banner.remove();
            showToast('Roadmap importado', 'success');
        });
        banner.appendChild(importBtn);

        const discardBtn = document.createElement('button');
        discardBtn.className = 'btn btn-secondary btn-sm';
        discardBtn.textContent = 'Descartar';
        discardBtn.addEventListener('click', () => {
            State.load();
            history.replaceState(null, '', location.pathname + location.search);
            applyColors(State.getConfig());
            Renderer.render();
            banner.remove();
        });
        banner.appendChild(discardBtn);

        document.body.appendChild(banner);
    }

    const hash = location.hash || '';
    if (hash.startsWith('#d=')) {
        ImportExport.decodeShareParam(hash.slice(3))
            .then(parsed => {
                State.previewShared(parsed);
                showSharedBanner();
            })
            .catch(err => showToast('Link compartilhado inválido: ' + err.message, 'error'));
    }

    // ─── Keyboard shortcuts ─────────────────────────────
    let lastSelectedId = null;
    State.on('item:select', (id) => { lastSelectedId = id; });

    document.addEventListener('keydown', (e) => {
        const target = e.target;
        const isEditable = target && (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable
        );

        // Ctrl/Cmd + Z / Y — undo/redo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
            if (isEditable) return;
            e.preventDefault();
            State.undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
            if (isEditable) return;
            e.preventDefault();
            State.redo();
            return;
        }

        if (isEditable) return;

        if (e.key === 'Escape') {
            State.emit('item:select', null);
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (lastSelectedId && confirm('Excluir o item selecionado?')) {
                e.preventDefault();
                State.deleteItem(lastSelectedId);
                lastSelectedId = null;
            }
        }
    });
});
