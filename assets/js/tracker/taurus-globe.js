(function () {
    const GOLD = '#FFD700';
    const EARTH_NIGHT = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';
    const EARTH_BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

    let globe = null;
    let container = null;
    let statusEl = null;
    let resizeObserver = null;
    let currentVisitors = [];
    let resizeTimer = null;

    function toNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    function pickCoordinate(visitor, type) {
        const location = visitor.location || {};
        const candidates = type === 'lat'
            ? [location.lat, location.latitude, visitor.lat, visitor.latitude]
            : [location.lng, location.lon, location.longitude, visitor.lng, visitor.lon, visitor.longitude];

        for (const candidate of candidates) {
            const value = toNumber(candidate);
            if (value !== null) return value;
        }
        return null;
    }

    function hasValidCoordinates(lat, lng) {
        return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    }

    function formatLastSeen(visitor) {
        const raw = visitor.lastSeenTime || visitor.last_seen || visitor.lastSeen;
        let date = null;

        if (raw && typeof raw.toMillis === 'function') date = new Date(raw.toMillis());
        else if (raw) date = new Date(raw);

        if (!date || Number.isNaN(date.getTime())) return 'Unknown';
        return date.toLocaleString('tr-TR');
    }

    function normalizeVisitors(visitors) {
        const locationCounts = new Map();

        return visitors.map((visitor) => {
            const lat = pickCoordinate(visitor, 'lat');
            const lng = pickCoordinate(visitor, 'lng');

            if (!hasValidCoordinates(lat, lng)) return null;

            const locationKey = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
            const duplicateCount = (locationCounts.get(locationKey) || 0) + 1;
            locationCounts.set(locationKey, duplicateCount);

            const location = visitor.location || {};
            const city = location.city || visitor.city || 'Unknown';
            const country = location.country || visitor.country || visitor.country_name || '';
            const device = visitor.device || {};
            const isOnline = Boolean(visitor.isOnline || visitor.online);

            return {
                id: visitor.id || visitor.session_id || visitor.sessionID || locationKey,
                lat,
                lng,
                city,
                country,
                isOnline,
                duplicateCount,
                radius: isOnline ? 0.22 + Math.min(duplicateCount, 6) * 0.025 : 0.16,
                altitude: isOnline ? 0.035 : 0.018,
                color: isOnline ? GOLD : 'rgba(255,215,0,0.48)',
                label: [
                    '<div style="font-family: Manrope, sans-serif; color: #fff;">',
                    `<strong style="color:${GOLD};">${city}${country ? ', ' + country : ''}</strong>`,
                    `<div style="font-size:11px; color:#b8b8b8; margin-top:4px;">${device.model || device.type || 'Unknown Device'}</div>`,
                    `<div style="font-size:10px; color:#777; margin-top:2px;">${isOnline ? 'ONLINE' : 'OFFLINE'} - ${formatLastSeen(visitor)}</div>`,
                    '</div>'
                ].join('')
            };
        }).filter(Boolean);
    }

    function updateStatus(mapped, total) {
        if (!statusEl) return;
        const missing = Math.max(total - mapped, 0);
        statusEl.textContent = `${mapped} mapped / ${missing} missing coordinates`;
    }

    function resize() {
        if (!globe || !container) return;

        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 320);
        globe.width(width).height(height);
    }

    function debouncedResize() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 80);
    }

    function init(containerId) {
        if (globe) {
            debouncedResize();
            return globe;
        }

        container = document.getElementById(containerId);
        if (!container || typeof Globe !== 'function') return null;

        statusEl = document.getElementById('taurus-globe-status');

        globe = Globe()(container)
            .backgroundColor('rgba(0,0,0,0)')
            .globeImageUrl(EARTH_NIGHT)
            .bumpImageUrl(EARTH_BUMP)
            .showAtmosphere(true)
            .atmosphereColor(GOLD)
            .atmosphereAltitude(0.12)
            .pointLat('lat')
            .pointLng('lng')
            .pointAltitude('altitude')
            .pointRadius('radius')
            .pointColor('color')
            .pointResolution(24)
            .pointLabel('label')
            .pointsTransitionDuration(700)
            .ringLat('lat')
            .ringLng('lng')
            .ringColor((point) => (t) => `rgba(255,215,0,${(1 - t) * (point.isOnline ? 0.75 : 0.32)})`)
            .ringMaxRadius((point) => point.isOnline ? 3.8 : 2.4)
            .ringPropagationSpeed((point) => point.isOnline ? 0.9 : 0.45)
            .ringRepeatPeriod((point) => point.isOnline ? 900 : 1800);

        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 220;
        controls.maxDistance = 520;

        globe.pointOfView({ lat: 25, lng: 20, altitude: 2.25 }, 0);
        globe.onGlobeReady(() => {
            resize();
            globe.pointsData(currentVisitors).ringsData(currentVisitors);
        });

        resizeObserver = new ResizeObserver(debouncedResize);
        resizeObserver.observe(container);
        window.addEventListener('resize', debouncedResize);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) debouncedResize();
        });

        resize();
        updateStatus(0, 0);
        return globe;
    }

    function updateVisitors(visitors) {
        const source = Array.isArray(visitors) ? visitors.slice(0, 50) : [];
        currentVisitors = normalizeVisitors(source);
        updateStatus(currentVisitors.length, source.length);

        if (!globe) return;
        globe.pointsData(currentVisitors).ringsData(currentVisitors);
    }

    window.TaurusGlobe = {
        init,
        resize,
        updateVisitors
    };
})();
