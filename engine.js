const Engine = (() => {
    function calculateSprints(config) {
        const sprints = [];
        const start = new Date(config.dataInicio + 'T00:00:00');
        const end = new Date(config.dataFim + 'T00:00:00');
        const days = config.diasSprint;
        let num = config.sprintStartNumber;
        let cur = new Date(start);

        while (cur <= end) {
            const sprintEnd = new Date(cur);
            sprintEnd.setDate(sprintEnd.getDate() + days - 1);
            sprints.push({
                number: num,
                startDate: new Date(cur),
                endDate: sprintEnd > end ? new Date(end) : sprintEnd
            });
            num++;
            cur.setDate(cur.getDate() + days);
        }
        return sprints;
    }

    function calculateMonthBands(sprints) {
        if (!sprints.length) return [];
        const bands = [];
        let current = null;

        sprints.forEach((s, i) => {
            const mid = new Date(s.startDate);
            mid.setDate(mid.getDate() + Math.floor((s.endDate - s.startDate) / 86400000 / 2));
            const monthKey = `${mid.getFullYear()}-${mid.getMonth()}`;
            const monthName = mid.toLocaleString('pt-BR', { month: 'long' });
            const label = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            if (current && current.key === monthKey) {
                current.spanCount++;
            } else {
                current = { key: monthKey, label, startIndex: i, spanCount: 1 };
                bands.push(current);
            }
        });
        return bands;
    }

    function allocateTracks(items, sprints) {
        if (!sprints.length || !items.length) return [];

        const sprintNumbers = sprints.map(s => s.number);
        const minSprint = sprintNumbers[0];
        const maxSprint = sprintNumbers[sprintNumbers.length - 1];

        const entries = items.map(item => {
            let globalStart = Infinity, globalEnd = -Infinity;
            item.segments.forEach(seg => {
                const ss = Math.max(seg.sprintStart, minSprint);
                const se = Math.min(seg.sprintEnd, maxSprint);
                if (ss < globalStart) globalStart = ss;
                if (se > globalEnd) globalEnd = se;
            });
            return { item, globalStart, globalEnd };
        });

        const tracks = [];

        entries.forEach(entry => {
            let placed = false;
            for (let t = 0; t < tracks.length; t++) {
                const canPlace = entry.item.segments.every(seg => {
                    const ss = Math.max(seg.sprintStart, minSprint);
                    const se = Math.min(seg.sprintEnd, maxSprint);
                    return tracks[t].every(occ => occ.end < ss || occ.start > se);
                });
                if (canPlace) {
                    entry.item.segments.forEach(seg => {
                        tracks[t].push({
                            start: Math.max(seg.sprintStart, minSprint),
                            end: Math.min(seg.sprintEnd, maxSprint)
                        });
                    });
                    entry.track = t;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const t = tracks.length;
                tracks.push([]);
                entry.item.segments.forEach(seg => {
                    tracks[t].push({
                        start: Math.max(seg.sprintStart, minSprint),
                        end: Math.min(seg.sprintEnd, maxSprint)
                    });
                });
                entry.track = t;
            }
        });

        return entries.map(e => ({ item: e.item, track: e.track }));
    }

    function clampSegments(items, sprints) {
        if (!sprints.length) return items;
        const min = sprints[0].number;
        const max = sprints[sprints.length - 1].number;

        return items.map(item => ({
            ...item,
            segments: item.segments.map(seg => {
                const ss = Math.max(min, Math.min(max, seg.sprintStart));
                const se = Math.max(ss, Math.min(max, seg.sprintEnd));
                return {
                    ...seg,
                    sprintStart: ss,
                    sprintEnd: se,
                    delays: (seg.delays || []).map(d => ({
                        delaySprintStart: Math.max(ss, Math.min(se, d.delaySprintStart)),
                        delaySprintEnd: Math.max(ss, Math.min(se, d.delaySprintEnd))
                    }))
                };
            })
        }));
    }

    function formatDateShort(date) {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${d}/${m}`;
    }

    return { calculateSprints, calculateMonthBands, allocateTracks, clampSegments, formatDateShort };
})();
