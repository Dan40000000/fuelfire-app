(function () {
    const TOUR_KEY = 'fuelfire_onboarding_v1';
    const START_DELAY_MS = 600;
    const steps = [
        {
            selector: '#quick-actions-bar',
            title: 'Welcome to FuelFire',
            description: 'Everything you need—workouts, nutrition, health stats—is one tap away on this quick-launch strip.',
        },
        {
            selector: '#calorie-overview-card',
            title: 'AI Calorie Command Center',
            description: 'Tap here to log meals by voice, text, photo, or barcode. Anthropics AI breaks each entry into calories, macros, and updates this dashboard instantly.',
        },
        {
            selector: '#quick-action-log-food',
            title: 'Log Food with AI',
            description: 'Need to capture a meal fast? Open the AI logger to speak it, type it, or scan it—FuelFire handles the math for you.',
        },
        {
            selector: '#quick-action-quick-workout',
            title: 'Instant Quick Workout',
            description: 'Generate a brand-new routine in seconds. Perfect for hotel gyms, home setups, or when you just need to move now.',
        },
        {
            selector: '#menu-create-workout',
            title: 'Build Custom Programs',
            description: 'Inside “Create Workout” you can craft multi-week plans, add form notes, and save them for future sessions.',
            onBefore: () => setSidebarOpen(true),
            onAfter: () => setSidebarOpen(false)
        },
        {
            selector: '#menu-diet-creation',
            title: 'Personalized Meal Plans',
            description: 'Take the Enhanced Diet Quiz and get a 14-day plan with macros, recipes, and shopping lists tuned to your goals.',
            onBefore: () => setSidebarOpen(true),
            onAfter: () => setSidebarOpen(false)
        },
        {
            selector: '#health-dashboard-card',
            title: 'Apple Health Dashboard',
            description: 'Sync with Apple Health to see live steps, distance, heart rate trends, and active calories all in one place.',
        },
        {
            selector: '#menu-workout-techniques',
            title: 'Form & Technique Library',
            description: 'Need coaching cues or demos? Every exercise has form notes, muscle focus, and safety tips right here.',
            onBefore: () => setSidebarOpen(true),
            onAfter: () => setSidebarOpen(false)
        },
        {
            selector: '.hamburger',
            title: 'Navigate Anytime',
            description: 'Use the FuelFire menu to jump between workouts, meal plans, supplements, and health tools from any page.',
            onBefore: () => setSidebarOpen(false)
        }
    ];

    let currentStep = -1;
    let overlay, highlight, tooltip, titleEl, descEl, stepEl, prevBtn, nextBtn, skipBtn;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    window.addEventListener('load', () => {
        if (localStorage.getItem(TOUR_KEY)) {
            return;
        }

        // Only run on main dashboard
        const quickWorkout = document.querySelector('#quick-actions-bar');
        if (!quickWorkout) {
            return;
        }

        setTimeout(startTour, START_DELAY_MS);
    });

    function startTour() {
        ensureOverlay();
        overlay.classList.add('onboard-visible');
        showStep(0);
        document.addEventListener('keydown', handleKeydown);
    }

    function ensureOverlay() {
        if (overlay) return;

        const style = document.createElement('style');
        style.textContent = `
            #onboarding-overlay {
                position: fixed;
                inset: 0;
                z-index: 4000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.25s ease;
            }
            #onboarding-overlay.onboard-visible {
                opacity: 1;
            }
            #onboarding-overlay .onboard-highlight {
                position: fixed;
                border-radius: 18px;
                box-shadow: 0 0 0 9999px rgba(8, 14, 24, 0.78);
                transition: all 0.3s ease;
                pointer-events: none;
                border: 2px solid rgba(255, 255, 255, 0.9);
            }
            #onboarding-overlay .onboard-tooltip {
                position: fixed;
                left: 50%;
                bottom: 40px;
                transform: translateX(-50%);
                max-width: 320px;
                background: rgba(12, 19, 33, 0.95);
                color: #fff;
                padding: 24px 24px 20px;
                border-radius: 20px;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                pointer-events: auto;
            }
            #onboarding-overlay .onboard-tooltip.top {
                top: 40px;
                bottom: auto;
            }
            #onboarding-overlay h3 {
                margin: 0 0 8px;
                font-size: 18px;
                font-weight: 700;
            }
            #onboarding-overlay p {
                margin: 0 0 18px;
                font-size: 14px;
                line-height: 1.5;
                color: rgba(255,255,255,0.88);
            }
            #onboarding-overlay .onboard-step-indicator {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 12px;
                opacity: 0.7;
            }
            #onboarding-overlay .onboard-controls {
                display: flex;
                justify-content: space-between;
                gap: 12px;
            }
            #onboarding-overlay button {
                flex: 1;
                background: rgba(255,255,255,0.12);
                border: none;
                color: white;
                padding: 10px 14px;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s ease, transform 0.2s ease;
            }
            #onboarding-overlay button:hover {
                background: rgba(255,255,255,0.22);
            }
            #onboarding-overlay button.primary {
                background: linear-gradient(135deg, #4B9CD3 0%, #13294B 100%);
            }
            #onboarding-overlay button.primary:hover {
                transform: translateY(-1px);
            }
            #onboarding-overlay button.secondary {
                flex: none;
                padding: 10px 16px;
                background: rgba(255,255,255,0.08);
            }
            @media (max-width: 480px) {
                #onboarding-overlay .onboard-tooltip {
                    left: 24px;
                    right: 24px;
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);

        overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboard-highlight"></div>
            <div class="onboard-tooltip">
                <div class="onboard-step-indicator"></div>
                <h3></h3>
                <p></p>
                <div class="onboard-controls">
                    <button type="button" class="secondary" data-action="skip">Skip</button>
                    <div style="display:flex; gap:10px; flex:1;">
                        <button type="button" data-action="prev">Back</button>
                        <button type="button" class="primary" data-action="next">Next</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        highlight = overlay.querySelector('.onboard-highlight');
        tooltip = overlay.querySelector('.onboard-tooltip');
        stepEl = overlay.querySelector('.onboard-step-indicator');
        titleEl = overlay.querySelector('h3');
        descEl = overlay.querySelector('p');
        prevBtn = overlay.querySelector('[data-action="prev"]');
        nextBtn = overlay.querySelector('[data-action="next"]');
        skipBtn = overlay.querySelector('[data-action="skip"]');

        prevBtn.addEventListener('click', () => showStep(currentStep - 1));
        nextBtn.addEventListener('click', () => showStep(currentStep + 1));
        skipBtn.addEventListener('click', completeTour);
    }

    function showStep(index) {
        if (index < 0) {
            index = 0;
        }
        if (index >= steps.length) {
            completeTour();
            return;
        }

        if (currentStep >= 0 && currentStep < steps.length) {
            const previous = steps[currentStep];
            if (previous && typeof previous.onAfter === 'function') {
                try {
                    previous.onAfter();
                } catch (error) {
                    console.warn('Onboarding onAfter error:', error);
                }
            }
        }

        currentStep = index;
        const step = steps[index];
        if (typeof step.onBefore === 'function') {
            step.onBefore();
        }

        const target = document.querySelector(step.selector);
        if (!target) {
            if (typeof step.onAfter === 'function') {
                try {
                    step.onAfter();
                } catch (error) {
                    console.warn('Onboarding onAfter error:', error);
                }
            }
            showStep(index + 1);
            return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        requestAnimationFrame(() => {
            positionHighlight(target);
            updateTooltip(step, index);
        });
    }

    function positionHighlight(target) {
        const rect = target.getBoundingClientRect();
        const padding = 12;
        const top = rect.top - padding;
        const left = rect.left - padding;
        const width = rect.width + padding * 2;
        const height = rect.height + padding * 2;

        highlight.style.top = `${Math.max(top, 16)}px`;
        highlight.style.left = `${Math.max(left, 16)}px`;
        highlight.style.width = `${Math.max(width, 40)}px`;
        highlight.style.height = `${Math.max(height, 40)}px`;

        const preferTop = rect.top > window.innerHeight * 0.55;
        tooltip.classList.toggle('top', preferTop);
    }

    function updateTooltip(step, index) {
        const totalSteps = steps.length;
        stepEl.textContent = `Step ${index + 1} of ${totalSteps}`;
        titleEl.textContent = step.title;
        descEl.textContent = step.description;

        prevBtn.disabled = index === 0;
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';

        if (index === totalSteps - 1) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }
    }

    function completeTour() {
        if (currentStep >= 0 && currentStep < steps.length) {
            const step = steps[currentStep];
            if (step && typeof step.onAfter === 'function') {
                try {
                    step.onAfter();
                } catch (error) {
                    console.warn('Onboarding onAfter error:', error);
                }
            }
        }
        currentStep = -1;
        localStorage.setItem(TOUR_KEY, 'done');
        if (overlay) {
            overlay.classList.remove('onboard-visible');
            setTimeout(() => overlay.remove(), 250);
        }
        setSidebarOpen(false);
        document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(event) {
        if (!overlay || !overlay.classList.contains('onboard-visible')) return;
        if (event.key === 'ArrowRight' || event.key === ' ') {
            event.preventDefault();
            showStep(currentStep + 1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showStep(currentStep - 1);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            completeTour();
        }
    }

    function setSidebarOpen(shouldOpen) {
        const sidebar = document.getElementById('sidebar');
        const dimmer = document.querySelector('div.overlay');
        if (!sidebar) return;
        const isOpen = sidebar.classList.contains('open');
        if (shouldOpen && !isOpen) {
            sidebar.classList.add('open');
            if (dimmer) dimmer.classList.add('show');
        } else if (!shouldOpen && isOpen) {
            sidebar.classList.remove('open');
            if (dimmer) dimmer.classList.remove('show');
        }
    }
})();
