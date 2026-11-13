// ==========================================
// PLANNING DES REPAS
// Recette Plus
// ==========================================

const mealPlanner =
    document.getElementById("mealPlanner");

const weekTitle =
    document.getElementById("weekTitle");

const previousWeekButton =
    document.getElementById("previousWeek");

const nextWeekButton =
    document.getElementById("nextWeek");

const currentWeekButton =
    document.getElementById("currentWeek");

const addWeekToShoppingListButton =
    document.getElementById(
        "addWeekToShoppingList"
    );
    
const printPlannerButton =
    document.getElementById(
        "printPlanner"
    );    


let selectedWeek =
    getMonday(new Date());

let currentUser = null;

let userRecipes = [];

let plannerMeals = [];


// ==========================================
// TYPES DE PLATS
// ==========================================

const courses = [
    {
        type: "starter",
        label: "Entrée",
        icon: "🥗"
    },
    {
        type: "main",
        label: "Plat",
        icon: "🍽️"
    },
    {
        type: "dessert",
        label: "Dessert",
        icon: "🍰"
    }
];


// ==========================================
// TROUVER LE LUNDI
// ==========================================

function getMonday(date) {

    const result =
        new Date(date);

    result.setHours(12, 0, 0, 0);

    const day =
        result.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    result.setDate(
        result.getDate() +
        difference
    );

    return result;

}


// ==========================================
// AJOUTER DES JOURS
// ==========================================

function addDays(date, days) {

    const result =
        new Date(date);

    result.setDate(
        result.getDate() +
        days
    );

    return result;

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatPlannerDate(date) {

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "numeric",
            month: "long"
        }
    ).format(date);

}


// ==========================================
// FORMAT JOUR
// ==========================================

function formatPlannerDay(date) {

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            weekday: "long"
        }
    ).format(date);

}


// ==========================================
// DATE SUPABASE
// ==========================================

function formatDatabaseDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// ==========================================
// AUJOURD'HUI ?
// ==========================================

function isToday(date) {

    const today =
        new Date();

    return (
        date.getFullYear() ===
            today.getFullYear() &&

        date.getMonth() ===
            today.getMonth() &&

        date.getDate() ===
            today.getDate()
    );

}


// ==========================================
// NORMALISER UNE CATÉGORIE
// ==========================================

function normalizeCategory(value) {

    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


// ==========================================
// CATÉGORIE ATTENDUE
// ==========================================

function getExpectedCategory(
    courseType
) {

    if (
        courseType === "starter"
    ) {
        return "entree";
    }

    if (
        courseType === "main"
    ) {
        return "plat";
    }

    if (
        courseType === "dessert"
    ) {
        return "dessert";
    }

    return "";

}


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getDefaultRecipeImage(
    courseType
) {

    if (
        courseType === "starter"
    ) {
        return "../image/default-entree.png";
    }

    if (
        courseType === "dessert"
    ) {
        return "../image/default-dessert.png";
    }

    return "../image/default-plat.png";

}


// ==========================================
// CHARGER UTILISATEUR
// ==========================================

async function loadCurrentUser() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getUser();


    if (
        error ||
        !data.user
    ) {

        console.error(
            "Utilisateur introuvable :",
            error
        );

        return false;

    }


    currentUser =
        data.user;


    return true;

}


// ==========================================
// CHARGER MES RECETTES
// ==========================================

async function loadUserRecipes() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select(
                "id, title, category, image"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "title",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Erreur chargement recettes :",
            error
        );

        userRecipes = [];

        return;

    }


    userRecipes =
        data || [];

}


// ==========================================
// CHARGER LE PLANNING DE LA SEMAINE
// ==========================================

async function loadPlannerMeals() {

    const monday =
        formatDatabaseDate(
            selectedWeek
        );

    const sunday =
        formatDatabaseDate(
            addDays(
                selectedWeek,
                6
            )
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("meal_planner")
            .select(
                `
                id,
                recipe_id,
                meal_date,
                meal_type,
                course_type,
                servings,
                recipes (
                    id,
                    title,
                    category,
                    image,
                    servings,
                    ingredients
                )
                `
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .gte(
                "meal_date",
                monday
            )
            .lte(
                "meal_date",
                sunday
            );


    if (error) {

        console.error(
            "Erreur chargement planning :",
            error
        );

        plannerMeals = [];

        return;

    }


    plannerMeals =
        data || [];

}


// ==========================================
// TROUVER UN REPAS
// ==========================================

function findPlannerMeal(
    date,
    mealType,
    courseType
) {

    return plannerMeals.find(
        function (meal) {

            return (
                meal.meal_date === date &&
                meal.meal_type === mealType &&
                meal.course_type === courseType
            );

        }
    );

}


// ==========================================
// AFFICHER LE PLANNING
// ==========================================

function displayPlanner() {

    mealPlanner.innerHTML = "";


    const sunday =
        addDays(
            selectedWeek,
            6
        );


    weekTitle.textContent =
        `${formatPlannerDate(selectedWeek)} — ${formatPlannerDate(sunday)}`;

        const printWeekTitle =
            document.getElementById(
                "printWeekTitle"
            );

        if (printWeekTitle) {

            printWeekTitle.textContent =
                `Semaine du ${formatPlannerDate(selectedWeek)} au ${formatPlannerDate(sunday)}`;

        }

    for (
        let index = 0;
        index < 7;
        index++
    ) {

        const date =
            addDays(
                selectedWeek,
                index
            );

        const databaseDate =
            formatDatabaseDate(date);


        const day =
            document.createElement(
                "article"
            );


        day.className =
            "planner-day";


        day.dataset.date =
            databaseDate;


        if (isToday(date)) {

            day.classList.add(
                "planner-day-today"
            );

        }


        // ==================================
        // TITRE JOUR
        // ==================================

        const heading =
            document.createElement(
                "div"
            );


        heading.className =
            "planner-day-heading";


        const dayName =
            document.createElement(
                "strong"
            );


        dayName.textContent =
            formatPlannerDay(date);


        const dayDate =
            document.createElement(
                "span"
            );


        dayDate.textContent =
            formatPlannerDate(date);


        heading.appendChild(
            dayName
        );

        heading.appendChild(
            dayDate
        );

        day.appendChild(
            heading
        );


        // MIDI

        day.appendChild(
            createMealSection(
                date,
                "lunch",
                "☀️ Midi"
            )
        );


        // SOIR

        day.appendChild(
            createMealSection(
                date,
                "dinner",
                "🌙 Soir"
            )
        );


        mealPlanner.appendChild(
            day
        );

    }

}


// ==========================================
// CRÉER MIDI / SOIR
// ==========================================

function createMealSection(
    date,
    mealType,
    mealLabel
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "planner-meal-section";


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "planner-meal-title";


    title.textContent =
        mealLabel;


    section.appendChild(
        title
    );


    courses.forEach(
        function (course) {

            section.appendChild(
                createCourseSlot(
                    date,
                    mealType,
                    course
                )
            );

        }
    );


    return section;

}


// ==========================================
// CRÉER UNE CASE
// ==========================================

function createCourseSlot(
    date,
    mealType,
    course
) {

    const databaseDate =
        formatDatabaseDate(date);


    const slot =
        document.createElement(
            "div"
        );


    slot.className =
        "planner-course-slot";


    const label =
        document.createElement(
            "div"
        );


    label.className =
        "planner-course-label";


    label.innerHTML =
        `<span>${course.icon}</span> ${course.label}`;


    slot.appendChild(
        label
    );


    const existingMeal =
        findPlannerMeal(
            databaseDate,
            mealType,
            course.type
        );


    if (
        existingMeal &&
        existingMeal.recipes
    ) {

        slot.appendChild(
            createRecipeDisplay(
                existingMeal
            )
        );

    } else {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "planner-add-course";


        button.textContent =
            "+ Ajouter";


        button.addEventListener(
            "click",
            function () {

                openRecipeSelector(
                    databaseDate,
                    mealType,
                    course
                );

            }
        );


        slot.appendChild(
            button
        );

    }


    return slot;

}


// ==========================================
// AFFICHER RECETTE DANS LA CASE
// ==========================================

function createRecipeDisplay(meal) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "planner-recipe-wrapper";


    // ======================================
    // RECETTE
    // ======================================

    const container =
        document.createElement("div");


    container.className =
        "planner-selected-recipe";


    const image =
        document.createElement("img");


    image.src =
        meal.recipes.image ||
        getDefaultRecipeImage(
            meal.course_type
        );


    image.alt =
        meal.recipes.title;


    const title =
        document.createElement("span");


    title.className =
        "planner-selected-title";


    title.textContent =
        meal.recipes.title;


    const removeButton =
        document.createElement("button");


    removeButton.type =
        "button";


    removeButton.className =
        "planner-remove-recipe";


    removeButton.textContent =
        "×";


    removeButton.setAttribute(
        "aria-label",
        "Retirer cette recette"
    );


    removeButton.addEventListener(
        "click",
        async function (event) {

            event.stopPropagation();

            await removeMeal(
                meal.id
            );

        }
    );


    container.addEventListener(
        "click",
        function () {

            window.location.href =
                `./ma-recette.html?id=${meal.recipe_id}`;

        }
    );


    container.appendChild(image);

    container.appendChild(title);

    container.appendChild(removeButton);


    wrapper.appendChild(container);


    // ======================================
    // PORTIONS
    // ======================================

    const servingsContainer =
        document.createElement("div");


    servingsContainer.className =
        "planner-servings";


    const minusButton =
        document.createElement("button");


    minusButton.type =
        "button";

    minusButton.textContent =
        "−";

    minusButton.setAttribute(
        "aria-label",
        "Diminuer le nombre de personnes"
    );


    const servingsText =
        document.createElement("span");


    let servings =
        Number(meal.servings) || 4;


    function updateServingsText() {

        servingsText.textContent =
            servings === 1
                ? "1 personne"
                : `${servings} personnes`;

    }


    updateServingsText();


    const plusButton =
        document.createElement("button");


    plusButton.type =
        "button";

    plusButton.textContent =
        "+";

    plusButton.setAttribute(
        "aria-label",
        "Augmenter le nombre de personnes"
    );


    // ======================================
    // BOUTON -
    // ======================================

    minusButton.addEventListener(
        "click",
        async function (event) {

            event.stopPropagation();


            if (servings <= 1) {
                return;
            }


            const newServings =
                servings - 1;


            const success =
                await updateMealServings(
                    meal.id,
                    newServings
                );


            if (success) {

                servings =
                    newServings;

                meal.servings =
                    newServings;

                updateServingsText();

            }

        }
    );


    // ======================================
    // BOUTON +
    // ======================================

    plusButton.addEventListener(
        "click",
        async function (event) {

            event.stopPropagation();


            if (servings >= 50) {
                return;
            }


            const newServings =
                servings + 1;


            const success =
                await updateMealServings(
                    meal.id,
                    newServings
                );


            if (success) {

                servings =
                    newServings;

                meal.servings =
                    newServings;

                updateServingsText();

            }

        }
    );


    servingsContainer.appendChild(
        minusButton
    );

    servingsContainer.appendChild(
        servingsText
    );

    servingsContainer.appendChild(
        plusButton
    );


    wrapper.appendChild(
        servingsContainer
    );


    return wrapper;

}

// ==========================================
// MODIFIER LES PORTIONS
// ==========================================

async function updateMealServings(
    mealId,
    servings
) {

    const {
        error
    } =
        await supabaseClient
            .from("meal_planner")
            .update({
                servings: servings
            })
            .eq(
                "id",
                mealId
            )
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "Erreur modification portions :",
            error
        );

        alert(
            "Impossible de modifier le nombre de personnes."
        );

        return false;

    }


    return true;

}


// ==========================================
// OUVRIR SÉLECTEUR DE RECETTES
// ==========================================

function openRecipeSelector(
    date,
    mealType,
    course
) {

    closeRecipeSelector();


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "plannerRecipeOverlay";


    overlay.className =
        "planner-recipe-overlay";


    const modal =
        document.createElement(
            "div"
        );


    modal.className =
        "planner-recipe-modal";


    // HEADER

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "planner-recipe-modal-header";


    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        `${course.icon} Choisir une ${course.label.toLowerCase()}`;


    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.type =
        "button";


    closeButton.className =
        "planner-modal-close";


    closeButton.textContent =
        "×";


    closeButton.addEventListener(
        "click",
        closeRecipeSelector
    );


    header.appendChild(
        title
    );

    header.appendChild(
        closeButton
    );


    modal.appendChild(
        header
    );


    // ======================================
    // FILTRER LES RECETTES
    // ======================================

    const expectedCategory =
        getExpectedCategory(
            course.type
        );


    const filteredRecipes =
        userRecipes.filter(
            function (recipe) {

                return (
                    normalizeCategory(
                        recipe.category
                    ) ===
                    expectedCategory
                );

            }
        );


    const list =
        document.createElement(
            "div"
        );


    list.className =
        "planner-recipe-list";


    if (
        filteredRecipes.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "planner-recipe-empty";


        empty.innerHTML =
            `
                <p>
                    Aucune recette dans cette catégorie.
                </p>

                <a href="./creer-recette.html">
                    + Créer une recette
                </a>
            `;


        list.appendChild(
            empty
        );

    } else {

        filteredRecipes.forEach(
            function (recipe) {

                const card =
                    document.createElement(
                        "button"
                    );


                card.type =
                    "button";


                card.className =
                    "planner-recipe-choice";


                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    recipe.image ||
                    getDefaultRecipeImage(
                        course.type
                    );


                image.alt =
                    recipe.title;


                const name =
                    document.createElement(
                        "span"
                    );


                name.textContent =
                    recipe.title;


                card.appendChild(
                    image
                );

                card.appendChild(
                    name
                );


                card.addEventListener(
                    "click",
                    async function () {

                        await saveMeal(
                            date,
                            mealType,
                            course.type,
                            recipe.id
                        );

                    }
                );


                list.appendChild(
                    card
                );

            }
        );

    }


    modal.appendChild(
        list
    );


    overlay.appendChild(
        modal
    );


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {

                closeRecipeSelector();

            }

        }
    );


    document.body.appendChild(
        overlay
    );


    document.body.classList.add(
        "planner-modal-open"
    );

}


// ==========================================
// FERMER SÉLECTEUR
// ==========================================

function closeRecipeSelector() {

    const overlay =
        document.getElementById(
            "plannerRecipeOverlay"
        );


    if (overlay) {

        overlay.remove();

    }


    document.body.classList.remove(
        "planner-modal-open"
    );

}


// ==========================================
// ENREGISTRER UNE RECETTE
// ==========================================

async function saveMeal(
    date,
    mealType,
    courseType,
    recipeId
) {

    const {
        error
    } =
        await supabaseClient
            .from("meal_planner")
            .insert({
                user_id:
                    currentUser.id,

                recipe_id:
                    recipeId,

                meal_date:
                    date,

                meal_type:
                    mealType,

                course_type:
                    courseType
            });


    if (error) {

        console.error(
            "Erreur ajout planning :",
            error
        );

        alert(
            "Impossible d'ajouter cette recette au planning."
        );

        return;

    }


    closeRecipeSelector();


    await loadPlannerMeals();

    displayPlanner();

}


// ==========================================
// RETIRER UNE RECETTE
// ==========================================

async function removeMeal(mealId) {

    const {
        error
    } =
        await supabaseClient
            .from("meal_planner")
            .delete()
            .eq(
                "id",
                mealId
            )
            .eq(
                "user_id",
                currentUser.id
            );


    if (error) {

        console.error(
            "Erreur suppression planning :",
            error
        );

        alert(
            "Impossible de retirer cette recette."
        );

        return;

    }


    await loadPlannerMeals();

    displayPlanner();

}


// ==========================================
// CHANGER DE SEMAINE
// ==========================================

async function changeWeek(days) {

    selectedWeek =
        addDays(
            selectedWeek,
            days
        );


    await loadPlannerMeals();

    displayPlanner();

}


// ==========================================
// SEMAINE PRÉCÉDENTE
// ==========================================

previousWeekButton.addEventListener(
    "click",
    async function () {

        await changeWeek(-7);

    }
);


// ==========================================
// SEMAINE SUIVANTE
// ==========================================

nextWeekButton.addEventListener(
    "click",
    async function () {

        await changeWeek(7);

    }
);


// ==========================================
// AUJOURD'HUI
// ==========================================

currentWeekButton.addEventListener(
    "click",
    async function () {

        selectedWeek =
            getMonday(
                new Date()
            );


        await loadPlannerMeals();

        displayPlanner();

    }
);


// ==========================================
// INITIALISATION
// ==========================================

async function initializePlanner() {

    const userLoaded =
        await loadCurrentUser();


    if (!userLoaded) {
        return;
    }


    await loadUserRecipes();

    await loadPlannerMeals();

    displayPlanner();

}

// ==========================================
// RÉCUPÉRER LE NOMBRE DE PORTIONS
// ==========================================

function getPlannerServingsNumber(value) {

    const match =
        String(value || "")
            .replace(",", ".")
            .match(/\d+(?:\.\d+)?/);


    if (!match) {
        return 1;
    }


    const number =
        Number(match[0]);


    return number > 0
        ? number
        : 1;

}


// ==========================================
// LIRE UNE QUANTITÉ
// ==========================================

function parsePlannerQuantity(value) {

    const text =
        String(value || "")
            .trim();


    // Exemple :
    // 1 1/2 kg

    let match =
        text.match(
            /^(\d+)\s+(\d+)\/(\d+)/
        );


    if (match) {

        return {
            quantity:
                Number(match[1]) +
                Number(match[2]) /
                Number(match[3]),

            length:
                match[0].length
        };

    }


    // Exemple :
    // 1/2 litre

    match =
        text.match(
            /^(\d+)\/(\d+)/
        );


    if (match) {

        return {
            quantity:
                Number(match[1]) /
                Number(match[2]),

            length:
                match[0].length
        };

    }


    // Exemple :
    // 250 g
    // 1,5 kg

    match =
        text.match(
            /^(\d+(?:[.,]\d+)?)/
        );


    if (match) {

        return {
            quantity:
                Number(
                    match[1]
                        .replace(",", ".")
                ),

            length:
                match[0].length
        };

    }


    return null;

}


// ==========================================
// FORMATER UNE QUANTITÉ
// ==========================================

function formatPlannerQuantity(
    quantity
) {

    const rounded =
        Math.round(
            quantity * 100
        ) / 100;


    if (
        Number.isInteger(
            rounded
        )
    ) {

        return String(
            rounded
        );

    }


    return String(
        rounded
    ).replace(
        ".",
        ","
    );

}


// ==========================================
// RECALCULER UN INGRÉDIENT
// ==========================================

function scalePlannerIngredient(
    ingredient,
    originalServings,
    plannedServings
) {

    const text =
        String(ingredient || "")
            .trim();


    if (!text) {
        return "";
    }


    const parsed =
        parsePlannerQuantity(
            text
        );


    // Pas de quantité :
    // "sel", "poivre", etc.
    // On garde tel quel.

    if (!parsed) {
        return text;
    }


    const ratio =
        plannedServings /
        originalServings;


    const newQuantity =
        parsed.quantity *
        ratio;


    const rest =
        text
            .slice(
                parsed.length
            )
            .trimStart();


    return (
        `${formatPlannerQuantity(newQuantity)} ${rest}`
    ).trim();

}


// ==========================================
// AJOUTER LA SEMAINE AUX COURSES
// ==========================================

async function addWeekToShoppingList() {

    if (
        !currentUser ||
        plannerMeals.length === 0
    ) {

        alert(
            "Aucune recette n'est prévue cette semaine."
        );

        return;

    }


    addWeekToShoppingListButton.disabled =
        true;


    const originalButtonText =
        addWeekToShoppingListButton.textContent;


    addWeekToShoppingListButton.textContent =
        "Ajout en cours...";


    try {

        const shoppingRows = [];


        plannerMeals.forEach(
            function (meal) {

                if (
                    !meal.recipes
                ) {
                    return;
                }


                const ingredients =
                    Array.isArray(
                        meal.recipes.ingredients
                    )
                        ? meal.recipes.ingredients
                        : [];


                const originalServings =
                    getPlannerServingsNumber(
                        meal.recipes.servings
                    );


                const plannedServings =
                    Number(
                        meal.servings
                    ) || originalServings;


                ingredients.forEach(
                    function (ingredient) {

                        const scaledIngredient =
                            scalePlannerIngredient(
                                ingredient,
                                originalServings,
                                plannedServings
                            );


                        if (
                            !scaledIngredient
                        ) {
                            return;
                        }


                        shoppingRows.push({
                            user_id:
                                currentUser.id,

                            recipe_id:
                                meal.recipe_id,

                            recipe_title:
                                meal.recipes.title,

                            ingredient:
                                scaledIngredient,

                            checked:
                                false
                        });

                    }
                );

            }
        );


        if (
            shoppingRows.length === 0
        ) {

            alert(
                "Aucun ingrédient à ajouter."
            );

            return;

        }


        // ==================================
        // ÉVITER LES DOUBLONS
        // ==================================
        //
        // On vérifie les lignes déjà
        // présentes pour les recettes
        // actuellement au planning.
        // ==================================

        const recipeIds =
            [
                ...new Set(
                    plannerMeals
                        .map(
                            meal =>
                                meal.recipe_id
                        )
                        .filter(Boolean)
                )
            ];


        let existingRows = [];


        if (
            recipeIds.length > 0
        ) {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "shopping_list"
                    )
                    .select(
                        "recipe_id, ingredient"
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .in(
                        "recipe_id",
                        recipeIds
                    );


            if (error) {
                throw error;
            }


            existingRows =
                data || [];

        }


        // ==================================
        // CRÉER LES CLÉS EXISTANTES
        // ==================================

        const existingKeys =
            new Set(
                existingRows.map(
                    function (row) {

                        return (
                            `${row.recipe_id}|` +
                            `${String(row.ingredient).trim().toLowerCase()}`
                        );

                    }
                )
            );


        const rowsToInsert =
            shoppingRows.filter(
                function (row) {

                    const key =
                        `${row.recipe_id}|` +
                        `${String(row.ingredient).trim().toLowerCase()}`;


                    if (
                        existingKeys.has(
                            key
                        )
                    ) {

                        return false;

                    }


                    existingKeys.add(
                        key
                    );


                    return true;

                }
            );


        if (
            rowsToInsert.length === 0
        ) {

            alert(
                "Les courses de cette semaine sont déjà dans ta liste."
            );

            return;

        }


        // ==================================
        // ENREGISTRER
        // ==================================

        const {
            error
        } =
            await supabaseClient
                .from(
                    "shopping_list"
                )
                .insert(
                    rowsToInsert
                );


        if (error) {
            throw error;
        }


        // Badge panier

        if (
            typeof updateShoppingBadge ===
            "function"
        ) {

            await updateShoppingBadge();

        }


        alert(
            `${rowsToInsert.length} ingrédient(s) ajouté(s) à ta liste de courses.`
        );


    } catch (error) {

        console.error(
            "Erreur ajout courses semaine :",
            error
        );


        alert(
            "Impossible d'ajouter les courses de la semaine."
        );


    } finally {

        addWeekToShoppingListButton.disabled =
            false;


        addWeekToShoppingListButton.textContent =
            originalButtonText;

    }

}


// ==========================================
// BOUTON COURSES DE LA SEMAINE
// ==========================================

addWeekToShoppingListButton.addEventListener(
    "click",
    addWeekToShoppingList
);

// ==========================================
// IMPRIMER LE PLANNING
// ==========================================

printPlannerButton.addEventListener(
    "click",
    function () {

        window.print();

    }
);


initializePlanner();