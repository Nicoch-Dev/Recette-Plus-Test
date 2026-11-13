const recipeDetails =
    document.getElementById("personalRecipeDetails");

// ==========================================
// BOUTON RETOUR - FICHE RECETTE
// ==========================================

const recipeBackButton =
    document.getElementById("recipeBackButton");


if (recipeBackButton) {

    recipeBackButton.addEventListener(
        "click",
        function () {

            // Vérifier la page précédente

            const previousPage =
                document.referrer;

            // Retour si la navigation vient
            // d'une page de notre site

            if (previousPage) {

                try {

                    const previousUrl =
                        new URL(previousPage);

                    if (
                        previousUrl.origin ===
                        window.location.origin
                    ) {

                        window.history.back();

                        return;

                    }

                } catch (error) {

                    console.warn(
                        "Page précédente invalide :",
                        error
                    );

                }

            }


            // Si aucune page précédente
            // n'est disponible

            window.location.href =
                "./mes-recettes.html";

        }
    );

}


// ==========================================
// ID DE LA RECETTE
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const recipeId =
    Number(params.get("id"));



// ==========================================
// MISE À JOUR DES INGRÉDIENTS
// ==========================================

function updateIngredientQuantities(
    ingredients,
    originalServings,
    newServings
) {

    const list =
        document.getElementById(
            "scaledIngredients"
        );

    if (!list) {
        return;
    }

    list.innerHTML =
        ingredients
            .map(function (ingredient) {

                const scaledIngredient =
                    scaleIngredient(
                        ingredient,
                        originalServings,
                        newServings
                    );

                return `
                    <li>
                        ${scaledIngredient}
                    </li>
                `;
            })
            .join("");
}


// ==========================================
// SÉLECTEUR DE PERSONNES
// ==========================================

function setupServingsSelector(
    recipe,
    ingredients
) {

    const minusButton =
        document.getElementById(
            "servingsMinus"
        );

    const plusButton =
        document.getElementById(
            "servingsPlus"
        );

    const servingsValue =
        document.getElementById(
            "servingsValue"
        );

    if (
        !minusButton ||
        !plusButton ||
        !servingsValue
    ) {
        return;
    }

    const originalServings =
        getServingsNumber(
            recipe.servings
        );

    let currentServings =
        originalServings;

    function updateServings() {

        servingsValue.textContent =
            currentServings;

        const displayedServings =
            document.getElementById(
                "displayedServings"
            );

        const displayedServingsLabel =
            document.getElementById(
                "displayedServingsLabel"
            );

        if (displayedServings) {

            displayedServings.textContent =
                currentServings;
        }

        if (displayedServingsLabel) {

            displayedServingsLabel.textContent =
                currentServings > 1
                    ? "personnes"
                    : "personne";
        }

        updateIngredientQuantities(
            ingredients,
            originalServings,
            currentServings
        );

        minusButton.disabled =
            currentServings <= 1;
    }

    minusButton.addEventListener(
        "click",
        function () {

            if (
                currentServings <= 1
            ) {
                return;
            }

            currentServings -= 1;

            updateServings();
        }
    );

    plusButton.addEventListener(
        "click",
        function () {

            if (
                currentServings >= 50
            ) {
                return;
            }

            currentServings += 1;

            updateServings();
        }
    );

    updateServings();
}


// ==========================================
// CHARGEMENT DE LA RECETTE
// ==========================================

async function loadRecipe() {

    if (!recipeId) {

        recipeDetails.innerHTML = `
            <p>
                Recette introuvable.
            </p>
        `;

        return;
    }

    // ======================================
    // UTILISATEUR CONNECTÉ
    // ======================================

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();

    if (
        userError ||
        !user
    ) {

        console.error(
            "Erreur utilisateur :",
            userError
        );

        window.location.href =
            "./connexion.html";

        return;
    }

    // ======================================
    // CHARGER UNIQUEMENT SA PROPRE RECETTE
    // ======================================

    const {
        data: recipe,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select("*")
            .eq(
                "id",
                recipeId
            )
            .eq(
                "user_id",
                user.id
            )
            .maybeSingle();

    if (
        error ||
        !recipe
    ) {

        if (error) {

            console.error(
                "Erreur chargement recette :",
                error
            );
        }

        recipeDetails.innerHTML = `

            <div class="recipe-error">

                <p>
                    Cette recette est introuvable
                    ou ne vous appartient pas.
                </p>

                <a href="./mes-recettes.html">
                    ← Retour à mes recettes
                </a>

            </div>

        `;

        return;
    }

    displayRecipe(recipe);
}

// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getDefaultImage(category) {
    const normalizedCategory = (category || "")
        .toLowerCase()
        .trim();

    if (
        normalizedCategory.includes("entrée") ||
        normalizedCategory.includes("entree")
    ) {
        return "../image/default-entree.png";
    }

    if (normalizedCategory.includes("plat")) {
        return "../image/default-plat.png";
    }

    if (normalizedCategory.includes("dessert")) {
        return "../image/default-dessert.png";
    }

    if (
        normalizedCategory.includes("apéritif") ||
        normalizedCategory.includes("aperitif")
    ) {
        return "../image/default-apperitif.png";
    }

    if (
        normalizedCategory.includes("boisson") ||
        normalizedCategory.includes("cocktail") ||
        normalizedCategory.includes("café") ||
        normalizedCategory.includes("cafe") ||
        normalizedCategory.includes("thé") ||
        normalizedCategory.includes("the")
    ) {
        return "../image/default-boisson.png";
    }

    return "../image/default-plat.png";
}

// ==========================================
// VÉRIFIER SI LA RECETTE A UNE PHOTO PERSONNALISÉE
// ==========================================

function hasCustomRecipeImage(recipe) {

    if (!recipe.image) {
        return false;
    }

    const image = recipe.image.split("?")[0];

    const defaultImages = [
        "default-entree.png",
        "default-plat.png",
        "default-dessert.png",
        "default-apperitif.png",
        "default-boisson.png"
    ];

    return !defaultImages.some(function (filename) {

        return image.endsWith("/" + filename);

    });
}


// ==========================================
// AFFICHAGE DE LA RECETTE
// ==========================================

function displayRecipe(recipe) {

    document.title =
        `${recipe.title} | Recette Plus`;

    // ======================================
    // INGRÉDIENTS
    // ======================================

    const ingredients =
        Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [];

    const ingredientsHTML =
        ingredients
            .map(function (ingredient) {

                return `
                    <li>
                        ${ingredient}
                    </li>
                `;
            })
            .join("");

    const originalServings =
        getServingsNumber(
            recipe.servings
        );

    // ======================================
    // PRÉPARATION
    // ======================================

    let instructionsHTML = "";

    const instructions = Array.isArray(recipe.instructions)
        ? recipe.instructions
        : typeof recipe.instructions === "string"
            ? recipe.instructions.split(/\r?\n/)
            : [];

    const cleanInstructions = instructions
        .map(function (instruction) {

            return String(instruction).trim();

        })
        .filter(function (instruction) {

            return instruction.length > 0;

        });

    if (cleanInstructions.length > 0) {

        instructionsHTML = cleanInstructions
            .map(function (instruction, index) {

                const safeInstruction = instruction
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");

                return `

                <div class="instruction-step">

                    <strong>
                        Étape ${index + 1}
                    </strong>

                    <p>
                        ${safeInstruction}
                    </p>

                </div>

            `;

            })
            .join("");

    } else {

        instructionsHTML = `

        <p>
            Aucune étape de préparation disponible.
        </p>

    `;

    }

    // ======================================
    // HTML
    // ======================================

    recipeDetails.innerHTML = `

        <article class="recipe-full">

            <div class="print-logo">

                <img
                    src="../image/logo.PNG"
                    alt="Recette Plus"
                >

            </div>

            <div class="recipe-image-column">
                <div class="recipe-full-image">

                    <img
                        src="${recipe.image ||
        getDefaultImage(recipe.category)
        }"
                        alt="${recipe.title}"
                    >

                </div>

                <button
                    type="button"
                    id="generatePaidRecipeImage"
                    class="recipe-button"
                >
                    ✨ Générer une photo IA — 1 crédit
                </button>    

            </div>

            <div class="recipe-full-content">

                <span class="recipe-category">
                    ${recipe.category || ""}
                </span>

                <h1>
                    ${recipe.title}
                </h1>

                ${recipe.description
            ? `
                            <p class="recipe-description">
                                ${recipe.description}
                            </p>
                          `
            : ""
        }

                <div class="recipe-meta">

                    ${recipe.time
            ? `
                                <span>
                                    ⏱ ${recipe.time}
                                </span>
                              `
            : ""
        }

                    ${recipe.servings
            ? `
                               <span>
                                    👥 Pour
                                    <strong id="displayedServings">
                                        ${originalServings}
                                    </strong>
                                    <span id="displayedServingsLabel">
                                        ${originalServings > 1
                ? "personnes"
                : "personne"
            }
                                    </span>
                                </span>
                              `
            : ""
        }

                    ${recipe.source === "ai"

            ? `
                                <span>
                                    ✨ Recette créée avec l'IA
                                </span>
                            `

            : recipe.source_url

                ? `
                                    <span class="recipe-original-source">
                                        🌐 Source :
                                        <a
                                            href="${recipe.source_url}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ${recipe.source || "Voir la recette originale"}
                                        </a>
                                    </span>
                                `

                : ""
        }

                </div>

                ${recipe.servings
            ? `

                            <div class="servings-selector">

                                <span class="servings-label">
                                    Quantités pour
                                </span>

                                <div class="servings-controls">

                                    <button
                                        type="button"
                                        id="servingsMinus"
                                        class="servings-button"
                                        aria-label="Retirer une personne"
                                    >
                                        −
                                    </button>

                                    <span
                                        id="servingsValue"
                                        class="servings-value"
                                    >
                                        ${originalServings}
                                    </span>

                                    <span class="servings-persons">
                                        personnes
                                    </span>

                                    <button
                                        type="button"
                                        id="servingsPlus"
                                        class="servings-button"
                                        aria-label="Ajouter une personne"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>

                          `
            : ""
        }

                <section class="recipe-section">

                    <h2>
                        Ingrédients
                    </h2>

                    <ul
                        class="recipe-ingredients"
                        id="scaledIngredients"
                    >
                        ${ingredientsHTML}
                    </ul>

                </section>

                <section class="recipe-section">

                    <h2>
                        Préparation
                    </h2>

                    <div class="recipe-instructions">
                        ${instructionsHTML}
                    </div>

                </section>


                <!-- ==================================
                     ACTIONS DE LA RECETTE
                =================================== -->

                <div class="recipe-actions">


                    <!-- ACTIONS PRINCIPALES -->

                    <div class="recipe-actions-primary">

                        <button
                            type="button"
                            id="cookingModeButton"
                            class="cooking-mode-button"
                        >
                            👨‍🍳 Mode cuisine
                        </button>

                        <button
                            type="button"
                            id="addToShoppingList"
                            class="shopping-list-button"
                        >
                            🛒 Ajouter à ma liste
                        </button>

                    </div>


                    <!-- ACTIONS SECONDAIRES -->

                    <div class="recipe-actions-secondary">

                        <button
                            type="button"
                            id="favoriteButton"
                            class="favorite-button"
                        >
                            ♡ Ajouter aux favoris
                        </button>

                        <button
                            type="button"
                            id="shareRecipe"
                            class="share-recipe-button"
                            aria-label="Partager la recette"
                            title="Partager"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M12 3v12"
                                ></path>

                                <path
                                    d="M8 7l4-4 4 4"
                                ></path>

                                <path
                                    d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"
                                ></path>
                            </svg>
                        </button>

                        <button
                            type="button"
                            id="printRecipe"
                            class="print-recipe-button"
                        >
                            🖨 Imprimer
                        </button>

                    </div>


                    <!-- GESTION DE LA RECETTE -->

                    <div class="recipe-actions-management">

                        <button
                            type="button"
                            id="communityButton"
                            class="community-button"
                        >
                            Publier dans la communauté
                        </button>

                        <a
                            href="./modifier-recette.html?id=${recipe.id}"
                            class="edit-recipe-button"
                        >
                            Modifier
                        </a>

                        <button
                            type="button"
                            id="deleteRecipe"
                            class="delete-recipe-button"
                        >
                            Supprimer
                        </button>

                    </div>

                </div>

            </div>

        </article>

    `;

    if (recipe.servings) {

        setupServingsSelector(
            recipe,
            ingredients
        );
    }

    setupFavoriteButton(recipe.id);

    setupShareButton(recipe);

    setupPrintButton();

    setupCommunityButton(recipe);

    setupDeleteButton(recipe.id);

    setupShoppingListButton(recipe);

    setupPaidRecipeImageButton(recipe);
}

// ==========================================
// PHOTO IA PAYANTE (RECETTE EXISTANTE)
// ==========================================

function setupPaidRecipeImageButton(recipe) {
    const button = document.getElementById("generatePaidRecipeImage");

    if (!button) return;

    button.addEventListener("click", async function () {
        const confirmed = window.confirm(
            "Générer une photo IA pour cette recette ? Coût : 1 crédit IA."
        );

        if (!confirmed) return;

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "✨ Génération en cours...";

        try {
            const { data, error } = await supabaseClient.functions.invoke(
                "generate-paid-recipe-image",
                {
                    body: {
                        recipe_id: recipe.id
                    }
                }
            );

            if (error) {
                let message = error.message || "La génération a échoué.";

                if (
                    error.context &&
                    typeof error.context.json === "function"
                ) {
                    try {
                        const details = await error.context.json();
                        message = details.error || message;
                    } catch (_) {
                        // Réponse non JSON
                    }
                }

                throw new Error(message);
            }

            if (!data?.success || !data?.imageUrl) {
                throw new Error(
                    data?.error || "La photo n'a pas été confirmée."
                );
            }

            // Actualiser la recette avec sa nouvelle photo
            await loadRecipe();

        } catch (error) {
            console.error("Erreur photo IA payante :", error);

            alert(
                error.message || "Impossible de générer la photo IA."
            );

            button.disabled = false;
            button.textContent = originalText;
        }
    });
}


// ==========================================
// FAVORIS
// ==========================================

async function setupFavoriteButton(recipeId) {

    const favoriteButton =
        document.getElementById(
            "favoriteButton"
        );

    if (!favoriteButton) {
        return;
    }

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();

    if (userError) {

        console.error(
            "Erreur utilisateur :",
            userError
        );

        return;
    }

    // ======================================
    // NON CONNECTÉ
    // ======================================

    if (!user) {

        favoriteButton.textContent =
            "♡ Ajouter aux favoris";

        favoriteButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "./connexion.html";
            }
        );

        return;
    }

    // ======================================
    // VÉRIFIER SI DÉJÀ FAVORI
    // ======================================

    const {
        data: existingFavorite,
        error
    } =
        await supabaseClient
            .from("favorites")
            .select("id")
            .eq(
                "user_id",
                user.id
            )
            .eq(
                "recipe_id",
                recipeId
            )
            .maybeSingle();

    if (error) {

        console.error(
            "Erreur vérification favori :",
            error
        );

        return;
    }

    updateFavoriteButton(
        favoriteButton,
        !!existingFavorite
    );

    // ======================================
    // CLIC SUR LE BOUTON
    // ======================================

    favoriteButton.addEventListener(
        "click",
        async function () {

            favoriteButton.disabled =
                true;

            const {
                data: currentFavorite,
                error: checkError
            } =
                await supabaseClient
                    .from("favorites")
                    .select("id")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "recipe_id",
                        recipeId
                    )
                    .maybeSingle();

            if (checkError) {

                console.error(
                    "Erreur favoris :",
                    checkError
                );

                favoriteButton.disabled =
                    false;

                return;
            }

            // ==================================
            // RETIRER DES FAVORIS
            // ==================================

            if (currentFavorite) {

                const {
                    error
                } =
                    await supabaseClient
                        .from("favorites")
                        .delete()
                        .eq(
                            "id",
                            currentFavorite.id
                        );

                if (error) {

                    console.error(
                        "Erreur suppression favori :",
                        error
                    );

                    favoriteButton.disabled =
                        false;

                    return;
                }

                updateFavoriteButton(
                    favoriteButton,
                    false
                );

            }

            // ==================================
            // AJOUTER AUX FAVORIS
            // ==================================

            else {

                const {
                    error
                } =
                    await supabaseClient
                        .from("favorites")
                        .insert({

                            user_id:
                                user.id,

                            recipe_id:
                                recipeId
                        });

                if (error) {

                    console.error(
                        "Erreur ajout favori :",
                        error
                    );

                    favoriteButton.disabled =
                        false;

                    return;
                }

                updateFavoriteButton(
                    favoriteButton,
                    true
                );
            }

            favoriteButton.disabled =
                false;
        }
    );
}


// ==========================================
// APPARENCE DU BOUTON FAVORI
// ==========================================

function updateFavoriteButton(
    button,
    isFavorite
) {

    if (isFavorite) {

        button.textContent =
            "♥ Retirer des favoris";

        button.classList.add(
            "is-favorite"
        );

    } else {

        button.textContent =
            "♡ Ajouter aux favoris";

        button.classList.remove(
            "is-favorite"
        );
    }
}


// ==========================================
// PARTAGER LA RECETTE
// ==========================================

function setupShareButton(recipe) {

    const shareButton =
        document.getElementById(
            "shareRecipe"
        );

    if (!shareButton) {
        return;
    }

    shareButton.addEventListener(
        "click",
        async function () {

            // ======================================
            // INGRÉDIENTS
            // ======================================

            const ingredientElements =
                document.querySelectorAll(
                    "#scaledIngredients li"
                );

            const ingredientsText =
                Array.from(
                    ingredientElements
                )
                    .map(function (element) {

                        return (
                            `• ${element.textContent.trim()}`
                        );
                    })
                    .join("\n");

            const displayedServings =
                document.getElementById(
                    "servingsValue"
                );

            const currentServings =
                displayedServings
                    ? displayedServings.textContent.trim()
                    : getServingsNumber(
                        recipe.servings
                    );

            // ======================================
            // PRÉPARATION
            // ======================================

            let instructionsText = "";

            if (
                Array.isArray(
                    recipe.instructions
                )
            ) {

                instructionsText =
                    recipe.instructions
                        .map(function (
                            instruction,
                            index
                        ) {

                            return (
                                `${index + 1}. ${instruction}`
                            );
                        })
                        .join("\n");

            } else {

                instructionsText =
                    recipe.instructions || "";
            }

            // ======================================
            // TEXTE À PARTAGER
            // ======================================

            const shareText = `
🍴 ${recipe.title}

${recipe.description || ""}

${recipe.time ? `⏱ Temps : ${recipe.time}` : ""}
${recipe.servings ? `👥 Pour ${currentServings} ${Number(currentServings) > 1 ? "personnes" : "personne"}` : ""}

INGRÉDIENTS

${ingredientsText}

PRÉPARATION

${instructionsText}

Recette partagée depuis Recette Plus
            `.trim();

            // ======================================
            // PARTAGE NATIF
            // ======================================

            if (navigator.share) {

                try {

                    await navigator.share({

                        title:
                            recipe.title,

                        text:
                            shareText
                    });

                } catch (error) {

                    if (
                        error.name !==
                        "AbortError"
                    ) {

                        console.error(
                            "Erreur partage :",
                            error
                        );
                    }
                }

                return;
            }

            // ======================================
            // SINON COPIER LE TEXTE
            // ======================================

            try {

                await navigator.clipboard
                    .writeText(
                        shareText
                    );

                shareButton.classList.add(
                    "share-success"
                );

                setTimeout(
                    function () {

                        shareButton.classList.remove(
                            "share-success"
                        );
                    },
                    1500
                );

            } catch (error) {

                console.error(
                    "Erreur copie :",
                    error
                );

                alert(
                    "Impossible de partager la recette."
                );
            }
        }
    );
}


// ==========================================
// IMPRIMER LA RECETTE
// ==========================================

function setupPrintButton() {

    const printButton =
        document.getElementById(
            "printRecipe"
        );

    if (!printButton) {
        return;
    }

    printButton.addEventListener(
        "click",
        function () {

            window.print();
        }
    );
}


// ==========================================
// COMMUNAUTÉ
// ==========================================

async function setupCommunityButton(recipe) {

    const communityButton =
        document.getElementById(
            "communityButton"
        );

    if (!communityButton) {
        return;
    }


    // ==========================================
    // PROTECTION DES RECETTES IMPORTÉES
    // ==========================================

    if (recipe.source === "imported") {

        communityButton.disabled = true;

        communityButton.textContent =
            "Publication indisponible pour une recette importée";

        communityButton.title =
            "Cette recette provient d'un site externe.";

        return;
    }


    updateCommunityButton(
        communityButton,
        recipe.is_public
    );

    communityButton.addEventListener(
        "click",
        async function () {

            communityButton.disabled =
                true;

            const newStatus =
                !recipe.is_public;

            const {
                error
            } =
                await supabaseClient
                    .from("recipes")
                    .update({
                        is_public:
                            newStatus
                    })
                    .eq(
                        "id",
                        recipe.id
                    );

            if (error) {

                console.error(
                    "Erreur publication communauté :",
                    error
                );

                alert(
                    "Impossible de modifier la publication."
                );

                communityButton.disabled =
                    false;

                return;
            }

            recipe.is_public =
                newStatus;

            updateCommunityButton(
                communityButton,
                recipe.is_public
            );

            communityButton.disabled =
                false;
        }
    );
}


function updateCommunityButton(
    button,
    isPublic
) {

    if (isPublic) {

        button.textContent =
            "✓ Publiée dans la communauté";

        button.classList.add(
            "is-public"
        );

    } else {

        button.textContent =
            "Publier dans la communauté";

        button.classList.remove(
            "is-public"
        );
    }
}


// ==========================================
// SUPPRESSION DE LA RECETTE
// ==========================================

function setupDeleteButton(id) {

    const deleteButton =
        document.getElementById(
            "deleteRecipe"
        );

    if (!deleteButton) {
        return;
    }

    deleteButton.addEventListener(
        "click",
        async function () {

            const confirmation =
                confirm(
                    "Voulez-vous vraiment supprimer cette recette ?"
                );

            if (!confirmation) {
                return;
            }

            deleteButton.disabled =
                true;

            deleteButton.textContent =
                "Suppression...";

            const {
                error
            } =
                await supabaseClient
                    .from("recipes")
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (error) {

                console.error(
                    "Erreur suppression recette :",
                    error
                );

                alert(
                    "Impossible de supprimer la recette."
                );

                deleteButton.disabled =
                    false;

                deleteButton.textContent =
                    "Supprimer";

                return;
            }

            window.location.href =
                "./mes-recettes.html";
        }
    );
}


// ==========================================
// AJOUTER À LA LISTE DE COURSES
// ==========================================

function setupShoppingListButton(recipe) {

    const button =
        document.getElementById(
            "addToShoppingList"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async function () {

            const originalText =
                button.textContent;

            button.disabled = true;

            button.textContent =
                "Ajout en cours...";

            try {

                // ==========================
                // UTILISATEUR CONNECTÉ
                // ==========================

                const {
                    data: {
                        user
                    },
                    error: userError
                } =
                    await supabaseClient
                        .auth
                        .getUser();

                if (
                    userError ||
                    !user
                ) {

                    throw new Error(
                        "Utilisateur non connecté."
                    );
                }

                // ==========================
                // INGRÉDIENTS AFFICHÉS
                // ==========================

                const ingredientElements =
                    document.querySelectorAll(
                        "#scaledIngredients li"
                    );

                const ingredients =
                    Array.from(
                        ingredientElements
                    )
                        .map(
                            function (element) {

                                return (
                                    element
                                        .textContent
                                        .trim()
                                );
                            }
                        )
                        .filter(Boolean);

                if (
                    ingredients.length === 0
                ) {

                    throw new Error(
                        "Aucun ingrédient trouvé."
                    );
                }

                // ==========================
                // PRÉPARATION DES LIGNES
                // ==========================

                const items =
                    ingredients.map(
                        function (ingredient) {

                            return {

                                user_id:
                                    user.id,

                                recipe_id:
                                    recipe.id,

                                recipe_title:
                                    recipe.title,

                                ingredient:
                                    ingredient,

                                checked:
                                    false
                            };
                        }
                    );

                // ==========================
                // ENREGISTREMENT SUPABASE
                // ==========================

                const {
                    error
                } =
                    await supabaseClient
                        .from(
                            "shopping_list"
                        )
                        .insert(
                            items
                        );

                if (error) {
                    throw error;
                }

                // ==========================
                // CONFIRMATION
                // ==========================

                button.textContent =
                    "✓ Ajouté à la liste";

                setTimeout(
                    function () {

                        button.textContent =
                            originalText;

                        button.disabled =
                            false;
                    },
                    1800
                );

            } catch (error) {

                console.error(
                    "Erreur liste de courses :",
                    error
                );

                button.textContent =
                    "Erreur lors de l'ajout";

                setTimeout(
                    function () {

                        button.textContent =
                            originalText;

                        button.disabled =
                            false;
                    },
                    2000
                );
            }
        }
    );
}


// ==========================================
// LANCEMENT
// ==========================================

loadRecipe();