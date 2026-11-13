// ==========================================
// MODE CUISINE
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        const button =
            event.target.closest(
                "#cookingModeButton"
            );


        if (!button) {
            return;
        }


        openCookingMode();

    }
);


// ==========================================
// ÉTAT DU MINUTEUR
// ==========================================

let cookingTimerInterval = null;

let cookingTimerEndTime = null;

let cookingTimerRemaining = 0;

let cookingTimerRunning = false;

// ==========================================
// AUDIO IPHONE / SAFARI
// ==========================================

let cookingAudioContext = null;


function initializeCookingAudio() {

    try {

        const AudioContext =
            window.AudioContext ||
            window["webkitAudioContext"];


        if (!AudioContext) {
            return;
        }


        if (!cookingAudioContext) {

            cookingAudioContext =
                new AudioContext();

        }


        if (
            cookingAudioContext.state ===
            "suspended"
        ) {

            cookingAudioContext.resume();

        }

    } catch (error) {

        console.warn(
            "Audio indisponible.",
            error
        );

    }

}


// ==========================================
// OUVERTURE
// ==========================================

function openCookingMode() {

    const recipe =
        document.querySelector(
            ".recipe-full"
        );


    if (!recipe) {
        return;
    }


    // ======================================
    // TITRE
    // ======================================

    const titleElement =
        recipe.querySelector("h1");


    const title =
        titleElement
            ? titleElement.textContent.trim()
            : "Ma recette";


    // ======================================
    // PERSONNES
    // ======================================

    const servingsElement =
        document.getElementById(
            "servingsValue"
        );


    const servings =
        servingsElement
            ? servingsElement.textContent.trim()
            : "";


    // ======================================
    // INGRÉDIENTS ACTUELLEMENT AFFICHÉS
    // ======================================

    const ingredientElements =
        document.querySelectorAll(
            "#scaledIngredients li"
        );


    const ingredients =
        Array.from(
            ingredientElements
        )
            .map(function (element) {

                return (
                    element.textContent.trim()
                );

            })
            .filter(Boolean);


    // ======================================
    // ÉTAPES
    // ======================================

    const stepElements =
        document.querySelectorAll(
            ".recipe-instructions .instruction-step"
        );


    let steps =
        Array.from(
            stepElements
        )
            .map(function (element) {

                const paragraph =
                    element.querySelector("p");


                return paragraph
                    ? paragraph.textContent.trim()
                    : "";

            })
            .filter(Boolean);


    /*
        Compatibilité avec les anciennes recettes
        qui n'utilisent pas .instruction-step.
    */

    if (steps.length === 0) {

        const instructions =
            document.querySelector(
                ".recipe-instructions"
            );


        if (instructions) {

            const text =
                instructions
                    .innerText
                    .trim();


            if (text) {

                steps =
                    text
                        .split(/\n+/)
                        .map(function (step) {

                            return step.trim();

                        })
                        .filter(Boolean);

            }

        }

    }


    if (steps.length === 0) {

        alert(
            "Aucune étape de préparation trouvée."
        );

        return;
    }


    createCookingInterface(
        title,
        servings,
        ingredients,
        steps
    );

}


// ==========================================
// DÉTECTION D'UNE DURÉE
// ==========================================

function detectCookingTime(text) {

    const normalizedText =
        String(text || "")
            .toLowerCase()
            .replace(/,/g, ".");


    // ======================================
    // HEURES + MINUTES
    //
    // Exemples :
    // 1 h 30
    // 1h30
    // 1 heure 30 minutes
    // 2 heures 15 min
    // ======================================

    let match =
        normalizedText.match(
            /(\d+(?:\.\d+)?)\s*(?:h|heure|heures)\s*(\d+)?\s*(?:min|minute|minutes)?/
        );


    if (match) {

        const hours =
            Number(match[1]);

        const minutes =
            match[2]
                ? Number(match[2])
                : 0;


        const totalSeconds =
            Math.round(
                (
                    hours * 60 +
                    minutes
                ) * 60
            );


        if (totalSeconds > 0) {

            return {
                seconds: totalSeconds,
                label:
                    formatCookingDuration(
                        totalSeconds
                    )
            };

        }

    }


    // ======================================
    // MINUTES
    //
    // 25 minutes
    // 20 min
    // ======================================

    match =
        normalizedText.match(
            /(\d+(?:\.\d+)?)\s*(?:min|minute|minutes)\b/
        );


    if (match) {

        const minutes =
            Number(match[1]);


        const totalSeconds =
            Math.round(
                minutes * 60
            );


        if (totalSeconds > 0) {

            return {
                seconds: totalSeconds,
                label:
                    formatCookingDuration(
                        totalSeconds
                    )
            };

        }

    }


    // ======================================
    // SECONDES
    //
    // 30 secondes
    // 45 sec
    //
    // Pratique aussi pour tester le minuteur.
    // ======================================

    match =
        normalizedText.match(
            /(\d+)\s*(?:s|sec|seconde|secondes)\b/
        );


    if (match) {

        const seconds =
            Number(match[1]);


        if (seconds > 0) {

            return {
                seconds: seconds,
                label:
                    formatCookingDuration(
                        seconds
                    )
            };

        }

    }


    return null;
}


// ==========================================
// FORMAT DURÉE
// ==========================================

function formatCookingDuration(seconds) {

    const totalMinutes =
        Math.floor(
            seconds / 60
        );

    const remainingSeconds =
        seconds % 60;


    if (
        totalMinutes >= 60 &&
        remainingSeconds === 0
    ) {

        const hours =
            Math.floor(
                totalMinutes / 60
            );

        const minutes =
            totalMinutes % 60;


        if (minutes === 0) {

            return (
                `${hours} h`
            );

        }


        return (
            `${hours} h ${minutes} min`
        );

    }


    if (
        totalMinutes > 0 &&
        remainingSeconds === 0
    ) {

        return (
            `${totalMinutes} min`
        );

    }


    if (totalMinutes > 0) {

        return (
            `${totalMinutes} min ${remainingSeconds} s`
        );

    }


    return (
        `${remainingSeconds} s`
    );
}


// ==========================================
// FORMAT COMPTE À REBOURS
// ==========================================

function formatTimerDisplay(seconds) {

    const safeSeconds =
        Math.max(
            0,
            Math.ceil(seconds)
        );


    const hours =
        Math.floor(
            safeSeconds / 3600
        );


    const minutes =
        Math.floor(
            (
                safeSeconds % 3600
            ) / 60
        );


    const secs =
        safeSeconds % 60;


    if (hours > 0) {

        return (
            String(hours)
                .padStart(2, "0") +
            ":" +
            String(minutes)
                .padStart(2, "0") +
            ":" +
            String(secs)
                .padStart(2, "0")
        );

    }


    return (
        String(minutes)
            .padStart(2, "0") +
        ":" +
        String(secs)
            .padStart(2, "0")
    );
}


// ==========================================
// CRÉATION DE L'INTERFACE
// ==========================================

function createCookingInterface(
    title,
    servings,
    ingredients,
    steps
) {

    const existingMode =
        document.getElementById(
            "cookingMode"
        );


    if (existingMode) {
        existingMode.remove();
    }


    let currentStep = 0;


    // ======================================
    // CONTENEUR
    // ======================================

    const cookingMode =
        document.createElement("div");


    cookingMode.id =
        "cookingMode";

    cookingMode.className =
        "cooking-mode";


    // ======================================
    // INGRÉDIENTS
    // ======================================

    const ingredientsHTML =
        ingredients
            .map(function (ingredient) {

                return `
                    <li>
                        ${escapeCookingHTML(
                            ingredient
                        )}
                    </li>
                `;

            })
            .join("");


    cookingMode.innerHTML = `

        <div class="cooking-mode-container">


            <div class="cooking-mode-header">

                <div>

                    <span class="cooking-mode-label">
                        👨‍🍳 Mode cuisine
                    </span>

                    <h1>
                        ${escapeCookingHTML(title)}
                    </h1>

                    ${
                        servings
                            ? `
                                <p class="cooking-mode-servings">
                                    👥 Pour
                                    ${escapeCookingHTML(servings)}
                                    ${
                                        Number(servings) > 1
                                            ? "personnes"
                                            : "personne"
                                    }
                                </p>
                              `
                            : ""
                    }

                </div>


                <button
                    type="button"
                    id="closeCookingMode"
                    class="close-cooking-mode"
                    aria-label="Quitter le mode cuisine"
                >
                    ✕
                </button>

            </div>


            <div
                id="activeCookingTimer"
                class="active-cooking-timer"
                hidden
            >

                <div class="active-timer-main">

                    <span class="active-timer-icon">
                        ⏱️
                    </span>

                    <div>

                        <span class="active-timer-label">
                            Minuteur
                        </span>

                        <strong
                            id="activeTimerDisplay"
                            class="active-timer-display"
                        >
                            00:00
                        </strong>

                    </div>

                </div>


                <div class="active-timer-actions">

                    <button
                        type="button"
                        id="pauseCookingTimer"
                        class="timer-small-button"
                    >
                        Pause
                    </button>

                    <button
                        type="button"
                        id="cancelCookingTimer"
                        class="timer-small-button timer-cancel-button"
                    >
                        Annuler
                    </button>

                </div>

            </div>


            <div class="cooking-mode-layout">


                <aside class="cooking-ingredients">

                    <h2>
                        Ingrédients
                    </h2>

                    <ul>
                        ${ingredientsHTML}
                    </ul>

                </aside>


                <section class="cooking-step-area">

                    <p
                        id="cookingStepCounter"
                        class="cooking-step-counter"
                    ></p>


                    <div class="cooking-step-card">

                        <span
                            id="cookingStepNumber"
                            class="cooking-step-number"
                        ></span>


                        <div class="cooking-step-content">

                            <p
                                id="cookingStepText"
                                class="cooking-step-text"
                            ></p>


                            <div
                                id="stepTimerArea"
                                class="step-timer-area"
                            ></div>

                        </div>

                    </div>


                    <div class="cooking-navigation">

                        <button
                            type="button"
                            id="previousCookingStep"
                            class="cooking-nav-button cooking-previous"
                        >
                            ← Précédente
                        </button>


                        <button
                            type="button"
                            id="nextCookingStep"
                            class="cooking-nav-button cooking-next"
                        >
                            Suivante →
                        </button>

                    </div>

                </section>


            </div>


        </div>

    `;


    document.body.appendChild(
        cookingMode
    );


    document.body.classList.add(
        "cooking-mode-open"
    );


    // ======================================
    // ÉLÉMENTS
    // ======================================

    const counter =
        document.getElementById(
            "cookingStepCounter"
        );


    const number =
        document.getElementById(
            "cookingStepNumber"
        );


    const text =
        document.getElementById(
            "cookingStepText"
        );


    const timerArea =
        document.getElementById(
            "stepTimerArea"
        );


    const previousButton =
        document.getElementById(
            "previousCookingStep"
        );


    const nextButton =
        document.getElementById(
            "nextCookingStep"
        );


    const closeButton =
        document.getElementById(
            "closeCookingMode"
        );


    const pauseButton =
        document.getElementById(
            "pauseCookingTimer"
        );


    const cancelButton =
        document.getElementById(
            "cancelCookingTimer"
        );


    // ======================================
    // AFFICHAGE ÉTAPE
    // ======================================

    function displayStep() {

        counter.textContent =
            `Étape ${currentStep + 1} sur ${steps.length}`;


        number.textContent =
            currentStep + 1;


        text.textContent =
            steps[currentStep];


        previousButton.disabled =
            currentStep === 0;


        if (
            currentStep ===
            steps.length - 1
        ) {

            nextButton.textContent =
                "Terminer ✓";

        } else {

            nextButton.textContent =
                "Suivante →";

        }


        // ==================================
        // DÉTECTION DU TEMPS
        // ==================================

        const detectedTime =
            detectCookingTime(
                steps[currentStep]
            );


        timerArea.innerHTML = "";


        if (detectedTime) {

            const startButton =
                document.createElement(
                    "button"
                );


            startButton.type =
                "button";


            startButton.className =
                "start-step-timer";


            startButton.textContent =
                `⏱ Lancer le minuteur — ${detectedTime.label}`;


            startButton.addEventListener(
                "click",
                function () {

                    startCookingTimer(
                        detectedTime.seconds
                    );

                }
            );


            timerArea.appendChild(
                startButton
            );

        }


        // ==================================
        // REMONTER SUR L'ÉTAPE
        // ==================================

        const stepArea =
            document.querySelector(
                ".cooking-step-area"
            );


        if (stepArea) {

            stepArea.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    }


    // ======================================
    // PRÉCÉDENTE
    // ======================================

    previousButton.addEventListener(
        "click",
        function () {

            if (currentStep <= 0) {
                return;
            }


            currentStep -= 1;

            displayStep();

        }
    );


    // ======================================
    // SUIVANTE
    // ======================================

    nextButton.addEventListener(
        "click",
        function () {

            if (
                currentStep <
                steps.length - 1
            ) {

                currentStep += 1;

                displayStep();

                return;
            }


            closeCookingMode();

        }
    );


    // ======================================
    // PAUSE / REPRENDRE
    // ======================================

    pauseButton.addEventListener(
        "click",
        function () {

            if (cookingTimerRunning) {

                pauseCookingTimer();

            } else {

                resumeCookingTimer();

            }

        }
    );


    // ======================================
    // ANNULER
    // ======================================

    cancelButton.addEventListener(
        "click",
        function () {

            cancelCookingTimer();

        }
    );


    // ======================================
    // FERMER
    // ======================================

    closeButton.addEventListener(
        "click",
        closeCookingMode
    );


    // ======================================
    // PREMIÈRE ÉTAPE
    // ======================================

    displayStep();


    /*
        Si un minuteur existait déjà,
        on remet son affichage.
    */

    refreshCookingTimer();

}


// ==========================================
// DÉMARRER LE MINUTEUR
// ==========================================

function startCookingTimer(seconds) {

    initializeCookingAudio();

    clearCookingTimerInterval();


    cookingTimerRemaining =
        seconds;


    cookingTimerEndTime =
        Date.now() +
        seconds * 1000;


    cookingTimerRunning =
        true;


    startCookingTimerInterval();

    refreshCookingTimer();

}


// ==========================================
// INTERVALLE
// ==========================================

function startCookingTimerInterval() {

    clearCookingTimerInterval();


    cookingTimerInterval =
        setInterval(
            function () {

                updateCookingTimer();

            },
            250
        );

}


// ==========================================
// MISE À JOUR DU MINUTEUR
// ==========================================

function updateCookingTimer() {

    if (!cookingTimerRunning) {
        return;
    }


    cookingTimerRemaining =
        Math.max(
            0,
            Math.ceil(
                (
                    cookingTimerEndTime -
                    Date.now()
                ) / 1000
            )
        );


    refreshCookingTimer();


    if (
        cookingTimerRemaining <= 0
    ) {

        finishCookingTimer();

    }

}


// ==========================================
// RAFRAÎCHIR L'AFFICHAGE
// ==========================================

function refreshCookingTimer() {

    const container =
        document.getElementById(
            "activeCookingTimer"
        );


    const display =
        document.getElementById(
            "activeTimerDisplay"
        );


    const pauseButton =
        document.getElementById(
            "pauseCookingTimer"
        );


    if (
        !container ||
        !display ||
        !pauseButton
    ) {
        return;
    }


    if (
        cookingTimerRemaining <= 0 &&
        !cookingTimerRunning
    ) {

        container.hidden =
            true;

        return;
    }


    container.hidden =
        false;


    display.textContent =
        formatTimerDisplay(
            cookingTimerRemaining
        );


    pauseButton.textContent =
        cookingTimerRunning
            ? "Pause"
            : "Reprendre";

}


// ==========================================
// PAUSE
// ==========================================

function pauseCookingTimer() {

    if (!cookingTimerRunning) {
        return;
    }


    cookingTimerRemaining =
        Math.max(
            0,
            Math.ceil(
                (
                    cookingTimerEndTime -
                    Date.now()
                ) / 1000
            )
        );


    cookingTimerRunning =
        false;


    cookingTimerEndTime =
        null;


    clearCookingTimerInterval();

    refreshCookingTimer();

}


// ==========================================
// REPRENDRE
// ==========================================

function resumeCookingTimer() {

    if (
        cookingTimerRunning ||
        cookingTimerRemaining <= 0
    ) {
        return;
    }


    cookingTimerEndTime =
        Date.now() +
        cookingTimerRemaining * 1000;


    cookingTimerRunning =
        true;


    startCookingTimerInterval();

    refreshCookingTimer();

}


// ==========================================
// ANNULER
// ==========================================

function cancelCookingTimer() {

    clearCookingTimerInterval();


    cookingTimerRunning =
        false;


    cookingTimerEndTime =
        null;


    cookingTimerRemaining =
        0;


    refreshCookingTimer();

}


// ==========================================
// FIN DU MINUTEUR
// ==========================================

function finishCookingTimer() {

    clearCookingTimerInterval();


    cookingTimerRunning =
        false;


    cookingTimerEndTime =
        null;


    cookingTimerRemaining =
        0;


    const container =
        document.getElementById(
            "activeCookingTimer"
        );


    const display =
        document.getElementById(
            "activeTimerDisplay"
        );


    const pauseButton =
        document.getElementById(
            "pauseCookingTimer"
        );


    if (container) {

        container.hidden =
            false;

        container.classList.add(
            "timer-finished"
        );

    }


    if (display) {

        display.textContent =
            "🔔 Temps écoulé !";

    }


    if (pauseButton) {

        pauseButton.hidden =
            true;

    }


    /*
        Petit signal sonore sans fichier audio.
    */

    playCookingTimerSound();

}


// ==========================================
// SON DU MINUTEUR
// ==========================================

function playCookingTimerSound() {

    try {

        if (!cookingAudioContext) {
            return;
        }


        const context =
            cookingAudioContext;


        if (
            context.state ===
            "suspended"
        ) {

            context.resume();

        }


        const frequencies = [
            880,
            880,
            1100,
            1100
        ];


        frequencies.forEach(
            function (
                frequency,
                index
            ) {

                const oscillator =
                    context.createOscillator();


                const gain =
                    context.createGain();


                oscillator.connect(
                    gain
                );


                gain.connect(
                    context.destination
                );


                oscillator.type =
                    "sine";


                oscillator.frequency.value =
                    frequency;


                const startTime =
                    context.currentTime +
                    index * 0.4;


                gain.gain.setValueAtTime(
                    0.3,
                    startTime
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.001,
                    startTime + 0.3
                );


                oscillator.start(
                    startTime
                );


                oscillator.stop(
                    startTime + 0.3
                );

            }
        );

    } catch (error) {

        console.warn(
            "Impossible de jouer le signal.",
            error
        );

    }

}


// ==========================================
// NETTOYER L'INTERVALLE
// ==========================================

function clearCookingTimerInterval() {

    if (cookingTimerInterval) {

        clearInterval(
            cookingTimerInterval
        );


        cookingTimerInterval =
            null;

    }

}


// ==========================================
// FERMETURE DU MODE CUISINE
// ==========================================

function closeCookingMode() {

    const cookingMode =
        document.getElementById(
            "cookingMode"
        );


    if (cookingMode) {
        cookingMode.remove();
    }


    document.body.classList.remove(
        "cooking-mode-open"
    );


    /*
        Le minuteur est arrêté lorsqu'on quitte
        complètement le Mode Cuisine.
    */

    cancelCookingTimer();

}


// ==========================================
// PROTECTION HTML
// ==========================================

function escapeCookingHTML(value) {

    return String(value || "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
   
}