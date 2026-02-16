gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

// Prevent mobile address bar show/hide from triggering ScrollTrigger recalculations
ScrollTrigger.config({ ignoreMobileResize: true });

// On touch devices, normalizeScroll prevents the address bar from moving
// in the first place, which eliminates viewport-resize-driven jitter
if (isTouchDevice) {
    ScrollTrigger.normalizeScroll(true);
}

const smoother = ScrollSmoother.create({
    wrapper: "#smooth-wrapper",
    content: "#smooth-content",
    smooth: isTouchDevice ? 0 : 1.2,
    effects: false,
    normalizeScroll: isTouchDevice,
});

// Match postcss-pxv
function pxv(value) {
    const vw = Math.min(window.innerWidth, 1600);
    return value * vw / 1440;
}

const STACKING_CONFIG = {
    navSelector: "header",
    showMarkers: false,

    stackOffset: 80,
    stackOffsetMobile: 120,

    // How many pixels of scroll between each card's trigger point.
    scrollPerCard: 150,

    // How long each card's slide-in animation takes.
    animDuration: 0.6,

    // Extra scroll to hold the pin after the last card animates in.
    holdAfterLast: 200,
};

function buildStackingCards() {
    const section = document.querySelector(".stacking-cards");
    if (!section) return;

    const container = section.querySelector(".cards-container");
    const cards = gsap.utils.toArray(".stacking-cards .card");
    const nav = document.querySelector(STACKING_CONFIG.navSelector);

    // Kill previous triggers and timelines
    ScrollTrigger.getAll().forEach(st => st.kill());
    cards.forEach(card => gsap.set(card, { clearProps: "all" }));

    const navHeight = nav ? nav.offsetHeight : 0;

    const isMobile = window.innerWidth < 768;
    const stackOffset = pxv(isMobile ? STACKING_CONFIG.stackOffsetMobile : STACKING_CONFIG.stackOffset);

    // Container height = tallest card + total offset for all stacked cards
    let maxCardHeight = 0;
    cards.forEach(card => {
        if (card.offsetHeight > maxCardHeight) maxCardHeight = card.offsetHeight;
    });
    const stackedHeight = maxCardHeight + stackOffset * (cards.length - 1);
    container.style.height = stackedHeight + "px";

    const animatingCards = cards.length - 1;
    const totalScroll = STACKING_CONFIG.scrollPerCard * animatingCards + STACKING_CONFIG.holdAfterLast;

    const offScreenY = maxCardHeight + stackedHeight + 200;

    const cardAnims = [];
    const triggered = [];

    cards.forEach((card, i) => {
        gsap.set(card, { zIndex: i + 1, force3D: true });

        const targetY = stackOffset * i;

        if (i === 0) {
            gsap.set(card, { opacity: 1, y: targetY });
            cardAnims.push(null);
            triggered.push(true);
            return;
        }

        gsap.set(card, { opacity: 0, y: offScreenY });

        const anim = gsap.to(card, {
            y: targetY,
            opacity: 1,
            duration: STACKING_CONFIG.animDuration,
            ease: "power2.out",
            paused: true,
            force3D: true,
        });

        cardAnims.push(anim);
        triggered.push(false);
    });

    ScrollTrigger.create({
        trigger: section,
        start: () => `top ${navHeight}px`,
        end: () => `+=${totalScroll}`,
        pin: true,
        markers: STACKING_CONFIG.showMarkers,
        id: "cards-pin",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
            const scrolled = self.progress * totalScroll;

            for (let i = 1; i < cards.length; i++) {
                const threshold = (i - 1) * STACKING_CONFIG.scrollPerCard + 1;

                if (scrolled >= threshold && !triggered[i]) {
                    triggered[i] = true;
                    cardAnims[i].play();
                } else if (scrolled < threshold && triggered[i]) {
                    triggered[i] = false;
                    cardAnims[i].reverse();
                }
            }
        },
    });
}

// ── Debug Panel ──
function createDebugPanel() {
    const panel = document.createElement("div");
    panel.id = "debug-panel";
    panel.innerHTML = `
        <style>
            #debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.9);
                color: #fff;
                padding: 16px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 13px;
                z-index: 99999;
                min-width: 220px;
                cursor: move;
                user-select: none;
            }
            #debug-panel.collapsed .debug-body { display: none; }
            #debug-panel .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                font-weight: bold;
                font-size: 14px;
            }
            #debug-panel .debug-toggle {
                background: none;
                border: none;
                color: #fff;
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
            }
            #debug-panel label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 6px 0;
                gap: 8px;
            }
            #debug-panel input[type="range"] {
                width: 100px;
                accent-color: #FF7F11;
            }
            #debug-panel .val {
                min-width: 36px;
                text-align: right;
                color: #FF7F11;
            }
            #debug-panel .debug-check {
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 6px 0;
            }
        </style>
        <div class="debug-header">
            <span>Config</span>
            <button class="debug-toggle" onclick="this.closest('#debug-panel').classList.toggle('collapsed')">_</button>
        </div>
        <div class="debug-body">
            <label>stackOffset <input type="range" min="0" max="200" value="${STACKING_CONFIG.stackOffset}" data-key="stackOffset"><span class="val">${STACKING_CONFIG.stackOffset}</span></label>
            <label>stackOffsetMobile <input type="range" min="0" max="300" value="${STACKING_CONFIG.stackOffsetMobile}" data-key="stackOffsetMobile"><span class="val">${STACKING_CONFIG.stackOffsetMobile}</span></label>
            <label>scrollPerCard <input type="range" min="10" max="500" value="${STACKING_CONFIG.scrollPerCard}" data-key="scrollPerCard"><span class="val">${STACKING_CONFIG.scrollPerCard}</span></label>
            <label>animDuration <input type="range" min="0.1" max="2" step="0.1" value="${STACKING_CONFIG.animDuration}" data-key="animDuration"><span class="val">${STACKING_CONFIG.animDuration}</span></label>
            <label>holdAfterLast <input type="range" min="0" max="800" value="${STACKING_CONFIG.holdAfterLast}" data-key="holdAfterLast"><span class="val">${STACKING_CONFIG.holdAfterLast}</span></label>
            <div class="debug-check">
                <input type="checkbox" id="debug-markers" ${STACKING_CONFIG.showMarkers ? "checked" : ""}>
                <label for="debug-markers" style="margin:0">showMarkers</label>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Sliders update config and rebuild
    panel.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener("input", () => {
            const key = input.dataset.key;
            const val = parseFloat(input.value);
            STACKING_CONFIG[key] = val;
            input.nextElementSibling.textContent = val;
            buildStackingCards();
        });
    });

    // Markers checkbox
    panel.querySelector("#debug-markers").addEventListener("change", (e) => {
        STACKING_CONFIG.showMarkers = e.target.checked;
        buildStackingCards();
    });

    // Dragging
    let dragX, dragY, panelX, panelY;
    panel.addEventListener("pointerdown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
        dragX = e.clientX;
        dragY = e.clientY;
        const rect = panel.getBoundingClientRect();
        panelX = rect.left;
        panelY = rect.top;
        const onMove = (e) => {
            panel.style.right = "auto";
            panel.style.left = (panelX + e.clientX - dragX) + "px";
            panel.style.top = (panelY + e.clientY - dragY) + "px";
        };
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    });
}

window.addEventListener("load", () => {
    buildStackingCards();
    createDebugPanel();

    // Only rebuild on actual width changes (orientation, real resize)
    let lastWidth = window.innerWidth;
    let resizeTimeout;
    window.addEventListener("resize", () => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => buildStackingCards(), 300);
    });
});
