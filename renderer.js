const Renderer = (() => {
    const TYPE_COLORS = {
        'EV': { bg: '#0d9488', text: '#f0fdfa', border: '#14b8a6' },
        'TaticoNegócio': { bg: '#d97706', text: '#fffbeb', border: '#f59e0b' },
        'TaticoEngenharia': { bg: '#4f46e5', text: '#eef2ff', border: '#6366f1' }
    };

    const STATUS_ICONS = {
        'Finalizado': '✓',
        'PendenteSubida': '⏳',
        'EmAndamento': '▶'
    };

    let container = null;
    let sprints = [];
    let colWidth = 120;
    let selectedItemId = null;

    // Drag state
    let dragState = null;

    function init(el) {
        container = el;
        container.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function render() {
        if (!container) return;
        const config = State.getConfig();
        const items = State.getItems();
        sprints = Engine.calculateSprints(config);

        if (!sprints.length) {
            container.innerHTML = '<div class="roadmap-empty">Configure as datas para gerar o roadmap.</div>';
            return;
        }

        const monthBands = Engine.calculateMonthBands(sprints);
        const clampedItems = Engine.clampSegments(items, sprints);
        const trackEntries = Engine.allocateTracks(clampedItems, sprints);
        const trackCount = trackEntries.length ? Math.max(...trackEntries.map(e => e.track)) + 1 : 0;

        const sprintCount = sprints.length;
        colWidth = Math.max(120, Math.floor(800 / sprintCount));

        const headerEl = document.getElementById('roadmap-title');
        const subtitleEl = document.getElementById('roadmap-subtitle');
        if (headerEl) headerEl.textContent = `ROADMAP ${config.periodo}`;
        if (subtitleEl) subtitleEl.textContent = config.squad;

        renderLegend();

        let html = '';

        // Sticky header wrapper
        html += '<div class="roadmap-sticky-header">';

        // Month band
        html += '<div class="month-band" style="grid-template-columns: repeat(' + sprintCount + ', ' + colWidth + 'px);">';
        monthBands.forEach(band => {
            html += `<div class="month-cell" style="grid-column: span ${band.spanCount}">${band.label}</div>`;
        });
        html += '</div>';

        // Sprint band
        html += '<div class="sprint-band" style="grid-template-columns: repeat(' + sprintCount + ', ' + colWidth + 'px);">';
        sprints.forEach(s => {
            const label = `Sprint ${s.number}`;
            const dateRange = `${Engine.formatDateShort(s.startDate)} – ${Engine.formatDateShort(s.endDate)}`;
            html += `<div class="sprint-cell"><span class="sprint-number">${label}</span><span class="sprint-dates">${dateRange}</span></div>`;
        });
        html += '</div>';

        html += '</div>'; // end sticky header

        // Grid area
        const gridHeight = Math.max(trackCount, 3) * 52 + 16;
        html += `<div class="roadmap-grid" id="roadmap-grid" style="width: ${sprintCount * colWidth}px; min-height: ${gridHeight}px; position: relative;">`;

        // Vertical separators
        for (let i = 1; i < sprintCount; i++) {
            html += `<div class="sprint-separator" style="left: ${i * colWidth}px;"></div>`;
        }

        // Alternating sprint backgrounds
        for (let i = 0; i < sprintCount; i++) {
            if (i % 2 === 1) {
                html += `<div class="sprint-bg-alt" style="left: ${i * colWidth}px; width: ${colWidth}px;"></div>`;
            }
        }

        // Add item button (floating in the grid)
        html += `<button class="roadmap-add-btn" id="btn-roadmap-add" title="Adicionar item ao roadmap">+</button>`;

        // Item bars
        const minSprint = sprints[0].number;

        trackEntries.forEach(entry => {
            const item = entry.item;
            const track = entry.track;
            const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS['EV'];

            item.segments.forEach((seg, segIdx) => {
                const startCol = seg.sprintStart - minSprint;
                const span = seg.sprintEnd - seg.sprintStart + 1;
                const left = startCol * colWidth;
                const width = span * colWidth;
                const top = track * 52 + 8;

                let barClass = 'item-bar';
                if (item.intruder) barClass += ' intruder';
                if (item.id === selectedItemId) barClass += ' selected';

                const statusIcon = STATUS_ICONS[item.status] || '';
                const statusHtml = statusIcon ? `<span class="item-status-icon">${statusIcon}</span>` : '';

                const dataAttrs = `data-item-id="${item.id}" data-segment-index="${segIdx}" data-track="${track}"`;

                html += `<div class="${barClass}" ${dataAttrs} style="left:${left}px; width:${width}px; top:${top}px; background:${typeColor.bg}; color:${typeColor.text}; border-color:${typeColor.border};">`;
                html += `<div class="resize-handle resize-handle-left" data-item-id="${item.id}" data-segment-index="${segIdx}" data-side="left"></div>`;
                html += `<span class="item-title">${escapeHtml(item.title)}</span>`;
                html += statusHtml;

                // Delay overlays
                (seg.delays || []).forEach(delay => {
                    const dStart = delay.delaySprintStart - seg.sprintStart;
                    const dSpan = delay.delaySprintEnd - delay.delaySprintStart + 1;
                    const dLeft = (dStart / span) * 100;
                    const dWidth = (dSpan / span) * 100;
                    html += `<div class="delay-overlay" style="left:${dLeft}%; width:${dWidth}%;"></div>`;
                });

                html += `<div class="resize-handle resize-handle-right" data-item-id="${item.id}" data-segment-index="${segIdx}" data-side="right"></div>`;
                html += '</div>';
            });
        });

        html += '</div>'; // end grid

        container.innerHTML = html;

        // Attach hover events for tooltip
        container.querySelectorAll('.item-bar').forEach(bar => {
            bar.addEventListener('mouseenter', (e) => {
                if (dragState) return;
                const itemId = bar.dataset.itemId;
                const segIdx = parseInt(bar.dataset.segmentIndex, 10);
                const item = State.getItems().find(i => i.id === itemId);
                if (item) Tooltip.show(e, item, segIdx, sprints);
            });
            bar.addEventListener('mousemove', (e) => {
                if (!dragState) Tooltip.position(e);
            });
            bar.addEventListener('mouseleave', () => Tooltip.hide());
        });

        // Attach add button
        const addBtn = document.getElementById('btn-roadmap-add');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addItemOnRoadmap();
            });
        }
    }

    function setSelectedItem(id) {
        selectedItemId = id;
        // Highlight on roadmap without full re-render
        container.querySelectorAll('.item-bar').forEach(bar => {
            bar.classList.toggle('selected', bar.dataset.itemId === id);
        });
    }

    function addItemOnRoadmap() {
        const defaultSprint = sprints.length ? sprints[0].number : 1;
        const id = State.addItem({
            title: 'Novo Item',
            type: 'EV',
            intruder: false,
            status: '',
            observacao: '',
            segments: [{ sprintStart: defaultSprint, sprintEnd: defaultSprint, delays: [] }]
        });
        // Switch to items tab and select the new item
        switchToItemsTab();
        State.emit('item:select', id);
    }

    function switchToItemsTab() {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
        const itemsTab = document.querySelector('[data-target="section-items"]');
        if (itemsTab) itemsTab.classList.add('active');
        const itemsSection = document.getElementById('section-items');
        if (itemsSection) itemsSection.classList.add('active');
    }

    // ─── Drag & Drop / Resize ─────────────────────

    function onMouseDown(e) {
        const resizeHandle = e.target.closest('.resize-handle');
        const itemBar = e.target.closest('.item-bar');

        if (resizeHandle) {
            e.preventDefault();
            e.stopPropagation();
            Tooltip.hide();
            startResize(resizeHandle, e);
            return;
        }

        if (itemBar && !e.target.closest('.resize-handle')) {
            // Click to select
            const itemId = itemBar.dataset.itemId;
            selectedItemId = itemId;
            setSelectedItem(itemId);
            switchToItemsTab();
            State.emit('item:select', itemId);

            // Start drag on mousedown (will only activate after threshold)
            e.preventDefault();
            Tooltip.hide();
            startDrag(itemBar, e);
        }
    }

    function startDrag(bar, e) {
        const grid = document.getElementById('roadmap-grid');
        if (!grid) return;
        const gridRect = grid.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();

        dragState = {
            type: 'move',
            itemId: bar.dataset.itemId,
            segIdx: parseInt(bar.dataset.segmentIndex, 10),
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - barRect.left,
            offsetY: e.clientY - barRect.top,
            gridLeft: gridRect.left + container.scrollLeft,
            gridTop: gridRect.top + container.scrollTop,
            bar,
            moved: false,
            originalLeft: bar.offsetLeft,
            originalTop: bar.offsetTop
        };
    }

    function startResize(handle, e) {
        const bar = handle.closest('.item-bar');
        if (!bar) return;
        const grid = document.getElementById('roadmap-grid');
        if (!grid) return;
        const gridRect = grid.getBoundingClientRect();

        dragState = {
            type: 'resize',
            side: handle.dataset.side,
            itemId: handle.dataset.itemId,
            segIdx: parseInt(handle.dataset.segmentIndex, 10),
            startX: e.clientX,
            bar,
            gridLeft: gridRect.left + container.scrollLeft,
            moved: false,
            originalLeft: bar.offsetLeft,
            originalWidth: bar.offsetWidth
        };

        bar.classList.add('dragging');
    }

    function onMouseMove(e) {
        if (!dragState) return;

        const dx = e.clientX - dragState.startX;
        const dy = dragState.startY ? e.clientY - dragState.startY : 0;

        if (!dragState.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragState.moved = true;

        if (dragState.type === 'move') {
            dragState.bar.classList.add('dragging');
            const newLeft = dragState.originalLeft + dx;
            const newTop = dragState.originalTop + dy;
            dragState.bar.style.left = newLeft + 'px';
            dragState.bar.style.top = newTop + 'px';
            dragState.bar.style.zIndex = '100';
            dragState.bar.style.opacity = '0.85';
        } else if (dragState.type === 'resize') {
            if (dragState.side === 'right') {
                const newWidth = Math.max(colWidth, dragState.originalWidth + dx);
                dragState.bar.style.width = newWidth + 'px';
            } else {
                const newLeft = dragState.originalLeft + dx;
                const newWidth = dragState.originalWidth - dx;
                if (newWidth >= colWidth) {
                    dragState.bar.style.left = newLeft + 'px';
                    dragState.bar.style.width = newWidth + 'px';
                }
            }
        }
    }

    function onMouseUp(e) {
        if (!dragState) return;

        const state = dragState;
        dragState = null;

        state.bar.classList.remove('dragging');
        state.bar.style.opacity = '';
        state.bar.style.zIndex = '';

        if (!state.moved) return;

        const minSprint = sprints[0].number;
        const maxSprint = sprints[sprints.length - 1].number;
        const item = State.getItems().find(i => i.id === state.itemId);
        if (!item) return;

        const seg = item.segments[state.segIdx];
        if (!seg) return;

        if (state.type === 'move') {
            const grid = document.getElementById('roadmap-grid');
            const gridRect = grid.getBoundingClientRect();
            const barLeft = parseFloat(state.bar.style.left);
            const segSpan = seg.sprintEnd - seg.sprintStart;

            // Calculate new sprint start from position
            let newStartIdx = Math.round(barLeft / colWidth);
            newStartIdx = Math.max(0, Math.min(sprints.length - 1 - segSpan, newStartIdx));
            const newSprintStart = minSprint + newStartIdx;
            const newSprintEnd = newSprintStart + segSpan;

            if (newSprintEnd <= maxSprint) {
                const offset = newSprintStart - seg.sprintStart;
                seg.sprintStart = newSprintStart;
                seg.sprintEnd = newSprintEnd;
                // Shift delays with the segment
                (seg.delays || []).forEach(d => {
                    d.delaySprintStart = Math.max(newSprintStart, Math.min(newSprintEnd, d.delaySprintStart + offset));
                    d.delaySprintEnd = Math.max(newSprintStart, Math.min(newSprintEnd, d.delaySprintEnd + offset));
                });
                State.updateItem(state.itemId, { segments: item.segments });
            } else {
                render();
            }
        } else if (state.type === 'resize') {
            const barLeft = parseFloat(state.bar.style.left);
            const barWidth = parseFloat(state.bar.style.width);

            if (state.side === 'left') {
                let newStartIdx = Math.round(barLeft / colWidth);
                newStartIdx = Math.max(0, newStartIdx);
                const newSprintStart = minSprint + newStartIdx;
                if (newSprintStart <= seg.sprintEnd) {
                    seg.sprintStart = newSprintStart;
                    State.updateItem(state.itemId, { segments: item.segments });
                } else {
                    render();
                }
            } else {
                let endIdx = Math.round((barLeft + barWidth) / colWidth) - 1;
                endIdx = Math.max(seg.sprintStart - minSprint, Math.min(sprints.length - 1, endIdx));
                const newSprintEnd = minSprint + endIdx;
                if (newSprintEnd >= seg.sprintStart) {
                    seg.sprintEnd = newSprintEnd;
                    State.updateItem(state.itemId, { segments: item.segments });
                } else {
                    render();
                }
            }
        }
    }

    function renderLegend() {
        const legendEl = document.getElementById('roadmap-legend');
        if (!legendEl) return;

        let html = '';
        Object.entries(TYPE_COLORS).forEach(([type, colors]) => {
            const label = type === 'TaticoNegócio' ? 'Tático Negócio' : type === 'TaticoEngenharia' ? 'Tático Engenharia' : type;
            html += `<span class="legend-chip" style="background:${colors.bg}; color:${colors.text};">${label}</span>`;
        });

        html += '<span class="legend-chip legend-chip-outline intruder-chip">Intruder</span>';
        html += `<span class="legend-chip legend-chip-status"><span class="status-icon">✓</span> Finalizado</span>`;
        html += `<span class="legend-chip legend-chip-status"><span class="status-icon">⏳</span> Pendente Subida</span>`;
        html += '<span class="legend-chip legend-chip-delay">Delay</span>';

        legendEl.innerHTML = html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getSprints() { return sprints; }
    function getColWidth() { return colWidth; }

    return { init, render, getSprints, getColWidth, setSelectedItem };
})();
