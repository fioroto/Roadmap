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

    // Apply background color from config
    State.on('config:changed', (cfg) => {
        if (cfg.bgColor) {
            document.documentElement.style.setProperty('--bg-primary', cfg.bgColor);
        }
    });

    // Panel tab switching
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
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
            toggleBtn.textContent = sidePanel.classList.contains('collapsed') ? '▶' : '◀';
        });
    }

    // Apply initial bg color
    const initialBg = State.getConfig().bgColor;
    if (initialBg) {
        document.documentElement.style.setProperty('--bg-primary', initialBg);
    }

    Renderer.render();
});
