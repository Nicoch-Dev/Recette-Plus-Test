const recipesContainer =
    document.getElementById(
        "personalRecipes"
    );

// ==========================================
// BARRE DE RECHERCHE
// ==========================================

const recipeSearch =
    document.getElementById(
        "recipeSearch"
    );


function escapeRecipeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


// ==========================================
// RESTAURER LE TEXTE DE RECHERCHE
// ==========================================

if (recipeSearch) {

    const savedSearch =
        sessionStorage.getItem(
            "recettePlusRecipeSearch"
        );

    if (savedSearch !== null) {

        recipeSearch.value = savedSearch;

    }

}

// ==========================================
// MÉMORISER LA RECHERCHE DANS L'HISTORIQUE
// ==========================================

if (recipeSearch) {


    const savedSearch =
        window.history.state?.recipeSearch;

    if (savedSearch !== undefined) {

        recipeSearch.value = savedSearch;
    }

}

const pageTitle =
    document.getElementById(
        "recipesTitle"
    );

const categoryNavigation =
    document.getElementById(
        "categoryNavigation"
    );


// ==========================================
// CATÉGORIE DANS L'URL
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const selectedCategory =
    params.get(
        "categorie"
    );


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getDefaultImage(category) {

    const normalizedCategory =
        (category || "")
            .toLowerCase()
            .trim();


    if (
        normalizedCategory.includes("entrée") ||
        normalizedCategory.includes("entree")
    ) {

        return "../image/default-entree.png";

    }


    if (
        normalizedCategory.includes("plat")
    ) {

        return "../image/default-plat.png";

    }


    if (
        normalizedCategory.includes("dessert")
    ) {

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


function getSafeRecipeImage(image, category) {

    const fallback = getDefaultImage(category);

    if (typeof image !== "string" || !image.trim()) {
        return fallback;
    }

    const url = image.trim();

    if (
        url.startsWith("../image/") ||
        url.startsWith("./image/") ||
        url.startsWith("https://")
    ) {
        return url;
    }

    return fallback;

}



// ==========================================
// BOUTON RETOUR À TOUTES LES RECETTES
// ==========================================

if (
    selectedCategory &&
    categoryNavigation
) {

    categoryNavigation.innerHTML = `

        <a
            href="./mes-recettes.html"
            class="back-all-recipes"
        >
            ← Voir toutes mes recettes
        </a>

    `;

}


// ==========================================
// TITRE
// ==========================================

if (pageTitle) {

    if (selectedCategory) {

        pageTitle.textContent =
            `Mes recettes - ${selectedCategory}`;

    } else {

        pageTitle.textContent =
            "Mes recettes";

    }

}


// ==========================================
// CHARGEMENT DES RECETTES
// ==========================================

let loadedRecipes = [];

let activeCategory = selectedCategory || "";


/* ==========================================
   FILTRAGE DES RECETTES
========================================== */

function filterRecipes() {

    const searchText = recipeSearch
        ? recipeSearch.value.trim().toLowerCase()
        : "";

    const filteredRecipes = loadedRecipes.filter(
        function (recipe) {

            const matchesTitle =
                (recipe.title || "")
                    .toLowerCase()
                    .includes(searchText);

            const matchesCategory =
                !activeCategory ||
                (
                    activeCategory === "__sans_categorie__" &&
                    !recipe.category
                ) ||
                recipe.category === activeCategory;

            return matchesTitle && matchesCategory;

        }
    );

    displayRecipes(filteredRecipes);

}


// ==========================================
// CATÉGORIES PERSONNALISÉES
// ==========================================

let customCategories = [];

// ==========================================
// CHARGEMENT DES CATÉGORIES PERSONNALISÉES
// ==========================================

async function loadCustomCategories(userId) {

    const { data, error } = await supabaseClient
        .from("recipe_categories")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", {
            ascending: true
        });

    if (error) {

        console.error(
            "Erreur de chargement des catégories :",
            error
        );

        return;

    }

    customCategories = data || [];

}

// ==========================================
// ENREGISTRER UNE CATÉGORIE PERSONNALISÉE
// ==========================================

async function saveCustomCategory(categoryName, userId) {

    const { data, error } = await supabaseClient
        .from("recipe_categories")
        .insert({

            user_id: userId,

            name: categoryName

        })
        .select("id, name")
        .single();

    if (error) {

        console.error(
            "Erreur d'enregistrement de la catégorie :",
            error
        );

        return null;

    }

    return data;

}

// ==================================
// CATÉGORIES DU CARNET
// ==================================

const recipeCategories = [

    {
        label: "Toutes",
        value: ""
    },

    {
        label: "Entrées",
        value: "Entrée"
    },

    {
        label: "Plats",
        value: "Plat"
    },

    {
        label: "Garnitures",
        value: "Garniture"
    },

    {
        label: "Desserts",
        value: "Dessert"
    },

    {
        label: "Apéritifs",
        value: "Apéritif"
    },

    {
        label: "Boissons",
        value: "Boisson"
    },

    {
        label: "Sans catégorie",
        value: "__sans_categorie__"
    }

];

// ==================================
// AFFICHAGE DES BOUTONS DE CATÉGORIES
// ==================================

const recipeCategoryFilters =
    document.getElementById("recipeCategoryFilters");

// ==========================================
// AFFICHAGE DES CATÉGORIES PERSONNALISÉES
// ==========================================

function displayCustomCategories() {

    if (!recipeCategoryFilters) {

        return;

    }

    // ==========================================
    // AFFICHER LES CATÉGORIES DANS LE PANNEAU
    // ==========================================

    const categoryManagementList = document.getElementById(
        "categoryManagementList"
    );

    if (categoryManagementList) {

        // Vider la liste avant de la reconstruire

        categoryManagementList.innerHTML = "";


        // Afficher chaque catégorie personnalisée

        customCategories.forEach(function (category) {

            // ==========================================
            // CRÉER LA LIGNE DE LA CATÉGORIE
            // ==========================================

            const categoryItem = document.createElement("div");

            categoryItem.className = "category-management-item";


            // ==========================================
            // NOM DE LA CATÉGORIE
            // ==========================================

            const categoryName = document.createElement("span");

            categoryName.textContent = category.name;


            // ==========================================
            // CONTENEUR DES ACTIONS
            // ==========================================

            const categoryActions = document.createElement("div");

            categoryActions.className = "category-management-actions";


            // ==========================================
            // BOUTON RENOMMER
            // ==========================================

            const renameButton = document.createElement("button");

            renameButton.type = "button";

            renameButton.className = "category-rename-button";

            renameButton.textContent = "Renommer";

            // ==========================================
            // DEMANDER LE NOUVEAU NOM DE LA CATÉGORIE
            // ==========================================

            renameButton.addEventListener("click", async function () {

                const newName = prompt(
                    "Nouveau nom de la catégorie :",
                    category.name
                );

                // Annulation

                if (newName === null) {

                    return;

                }

                // Nettoyer le nom saisi

                const cleanName = newName.trim();

                if (!cleanName) {

                    alert("Le nom de la catégorie ne peut pas être vide.");

                    return;

                }

                // Aucun changement

                if (cleanName === category.name) {

                    return;

                }

                // Vérification avant enregistrement

                // ==========================================
                // ENREGISTRER LE RENOMMAGE DANS SUPABASE
                // ==========================================

                const renameSuccess = await renameCustomCategory(
                    category.id,
                    cleanName
                );

                if (!renameSuccess) {

                    alert(
                        "Impossible de renommer cette catégorie."
                    );

                    return;

                }


                // ==========================================
                // ACTUALISER LES CATÉGORIES EN MÉMOIRE
                // ==========================================

                const oldName = category.name;

                category.name = cleanName;


                // Mettre à jour les recettes déjà chargées

                loadedRecipes.forEach(function (recipe) {

                    if (recipe.category === oldName) {

                        recipe.category = cleanName;

                    }

                });


                // Conserver le filtre actif

                if (activeCategory === oldName) {

                    activeCategory = cleanName;

                }


                // Actualiser les boutons et le panneau

                displayCustomCategories();

                alert("Catégorie renommée avec succès !");

            });


            // ==========================================
            // BOUTON SUPPRIMER
            // ==========================================

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className = "category-delete-button";

            deleteButton.textContent = "Supprimer";

            // ==========================================
            // CONFIRMATION DE SUPPRESSION
            // ==========================================

            deleteButton.addEventListener("click", async function () {

                const confirmation = confirm(
                    "Voulez-vous supprimer la catégorie \"" +
                    category.name +
                    "\" ?\n\n" +
                    "Les recettes associées seront conservées " +
                    "dans « Sans catégorie »."
                );

                if (!confirmation) {

                    return;

                }

                // ==========================================
                // SUPPRESSION DANS SUPABASE
                // ==========================================

                const deleteSuccess = await deleteCustomCategory(
                    category.id
                );

                if (!deleteSuccess) {

                    alert(
                        "Impossible de supprimer cette catégorie."
                    );

                    return;

                }


                // ==========================================
                // ACTUALISER LES DONNÉES LOCALES
                // ==========================================

                updateDeletedCategory(
                    category.id,
                    category.name
                );


                // Actualiser les boutons et le panneau

                displayCustomCategories();

                // ==========================================
                // ACTUALISER LE FILTRE SÉLECTIONNÉ
                // ==========================================

                recipeCategoryFilters
                    .querySelectorAll(".recipe-category-button")
                    .forEach(function (categoryButton) {

                        categoryButton.classList.toggle(
                            "active",
                            categoryButton.dataset.category === activeCategory
                        );

                    });


                // ==========================================
                // ACTUALISER L'AFFICHAGE DES RECETTES
                // ==========================================

                filterRecipes();

                alert("Catégorie supprimée. Vos recettes sont conservées.");

            });


            // ==========================================
            // ASSEMBLER LA LIGNE
            // ==========================================

            categoryActions.appendChild(renameButton);

            categoryActions.appendChild(deleteButton);

            categoryItem.appendChild(categoryName);

            categoryItem.appendChild(categoryActions);

            categoryManagementList.appendChild(categoryItem);

        });

    }

    // Supprimer les anciens boutons personnalisés

    recipeCategoryFilters
        .querySelectorAll(".custom-category-button")
        .forEach(function (button) {

            button.remove();

        });


    // Créer les boutons des catégories personnelles

    customCategories.forEach(function (category) {

        const button = document.createElement("button");

        button.type = "button";

        button.className =
            "recipe-category-button custom-category-button";

        button.textContent = category.name;

        button.dataset.category = category.name;

        // ==========================================
        // FILTRAGE DES CATÉGORIES PERSONNALISÉES
        // ==========================================

        button.addEventListener("click", function () {

            activeCategory = category.name;

            // Mettre à jour le bouton sélectionné

            recipeCategoryFilters
                .querySelectorAll(".recipe-category-button")
                .forEach(function (categoryButton) {

                    categoryButton.classList.toggle(
                        "active",
                        categoryButton.dataset.category === activeCategory
                    );

                });


            
            // Afficher les recettes selon les filtres actifs

            filterRecipes();


        });

        // Insérer avant le bouton + Catégorie

        const addButton =
            recipeCategoryFilters.querySelector(
                ".add-category-button"
            );

        recipeCategoryFilters.insertBefore(
            button,
            addButton
        );

    });

}

if (recipeCategoryFilters) {

    recipeCategories.forEach(function (category) {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "recipe-category-button";

        if (category.value === activeCategory) {

            button.classList.add("active");

        }

        button.textContent = category.label;

        button.dataset.category = category.value;

        // ==================================
        // CLIC SUR UNE CATÉGORIE
        // ==================================

        button.addEventListener("click", function () {

            activeCategory = category.value;

            recipeCategoryFilters
                .querySelectorAll(".recipe-category-button")
                .forEach(function (categoryButton) {

                    categoryButton.classList.toggle(
                        "active",
                        categoryButton.dataset.category === activeCategory
                    );

                });

            
            // Appliquer la recherche et la catégorie sélectionnée

            filterRecipes();


        });

        recipeCategoryFilters.appendChild(button);

    });

    // ==================================
    // BOUTON AJOUTER UNE CATÉGORIE
    // ==================================

    const addCategoryButton =
        document.createElement("button");

    addCategoryButton.type = "button";

    addCategoryButton.className =
        "recipe-category-button add-category-button";

    addCategoryButton.textContent = "+ Catégorie";

    // ==================================
    // SAISIE D'UNE NOUVELLE CATÉGORIE
    // ==================================

    addCategoryButton.addEventListener("click", async function () {

        const categoryName = prompt(
            "Nom de votre nouvelle catégorie :"
        );

        if (categoryName === null) {

            return;

        }

        const cleanName = categoryName.trim();

        if (!cleanName) {

            alert("Veuillez saisir un nom de catégorie.");

            return;

        }

        // ==========================================
        // ENREGISTREMENT DANS SUPABASE
        // ==========================================

        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {

            alert("Vous devez être connecté pour créer une catégorie.");

            return;

        }

        const newCategory = await saveCustomCategory(
            cleanName,
            user.id
        );

        if (!newCategory) {

            alert(
                "Impossible d'enregistrer cette catégorie. " +
                "Vérifiez qu'elle n'existe pas déjà."
            );

            return;

        }

        customCategories.push(newCategory);

        displayCustomCategories();

        console.log(
            "Catégorie enregistrée :",
            newCategory
        );

        alert("Catégorie enregistrée avec succès !");

    });

    recipeCategoryFilters.appendChild(addCategoryButton);

}

async function loadRecipes() {

    if (!recipesContainer) {
        return;
    }


    recipesContainer.innerHTML = `

        <p class="loading-recipes">
            Chargement des recettes...
        </p>

    `;


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


    if (userError) {

        console.error(
            "Erreur utilisateur :",
            userError
        );


        recipesContainer.innerHTML = `

            <div class="no-recipes">

                <p>
                    Impossible de récupérer votre compte.
                </p>

            </div>

        `;

        return;
    }


    if (!user) {

        recipesContainer.innerHTML = `

            <div class="no-recipes">

                <p>
                    Connectez-vous pour retrouver vos recettes.
                </p>

                <a
                    href="./connexion.html"
                    class="create-recipe-button"
                >
                    Se connecter
                </a>

            </div>

        `;

        return;
    }


    try {

        // ==========================================
        // CHARGEMENT DES CATÉGORIES PERSONNALISÉES
        // ==========================================

        await loadCustomCategories(user.id);

        displayCustomCategories();

        // ==================================
        // IMPORTANT :
        // UNIQUEMENT LES RECETTES DU COMPTE
        // ==================================

        let query =
            supabaseClient
                .from("recipes")
                .select("*")

                .eq(
                    "user_id",
                    user.id
                )

                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        // ==================================
        // FILTRE CATÉGORIE
        // ==================================


        const {
            data,
            error
        } =
            await query;


        if (error) {

            throw error;

        }


        loadedRecipes = data || [];

        const visibleRecipes = selectedCategory

            ? loadedRecipes.filter(
                function (recipe) {

                    return recipe.category === selectedCategory;

                }
            )

            : loadedRecipes;

        displayRecipes(
            visibleRecipes
        );

        // ==========================================
        // RÉAPPLIQUER LA RECHERCHE RESTAURÉE
        // ==========================================

        if (recipeSearch && recipeSearch.value.trim()) {

            recipeSearch.dispatchEvent(
                new Event("input")
            );

        }

    } catch (error) {

        console.error(
            "Erreur loadRecipes :",
            error
        );


        recipesContainer.innerHTML = `

            <div class="no-recipes">

                <p>
                    Impossible de charger vos recettes.
                </p>

            </div>

        `;

    }

}


// ==========================================
// AFFICHAGE DES RECETTES
// ==========================================

function displayRecipes(recipes) {

    if (!recipesContainer) {
        return;
    }


    recipesContainer.innerHTML =
        "";


    if (
        !recipes ||
        recipes.length === 0
    ) {

        recipesContainer.innerHTML = `

            <div class="no-recipes">

                <p>

                  ${recipeSearch && recipeSearch.value.trim()

                ? "Aucune recette ne correspond à votre recherche."

                : selectedCategory

                    ? `Aucune recette dans la catégorie ${selectedCategory}.`

                    : "Vous n'avez pas encore de recette."
            }  

                </p>


                ${!recipeSearch || !recipeSearch.value.trim()

                ? `

        <a
            href="./creer-recette.html"
            class="create-recipe-button"
        >
            Créer une recette
        </a>

    `

                : ""

            }

            </div>

        `;


        return;

    }


    recipes.forEach(
        function (recipe) {

            const card =
                document.createElement(
                    "article"
                );


            card.classList.add(
                "recipe-card"
            );


            card.innerHTML = `

                <img
                    
                
                src="${escapeRecipeHTML(
                getSafeRecipeImage(recipe.image, recipe.category)
            )}"

                alt="${escapeRecipeHTML(recipe.title)}"

                    class="recipe-card-image"
                >


                <div class="recipe-card-content">

                    <span class="recipe-category">

                    ${escapeRecipeHTML(recipe.category)}    

                    </span>


                    <h3>
                        ${escapeRecipeHTML(recipe.title)}
                    </h3>


                    ${recipe.time

                    ? `

                                <p class="recipe-time">
                                    ⏱ ${escapeRecipeHTML(recipe.time)}
                                </p>

                              `

                    : ""
                }


                    <a
                        href="./ma-recette.html?id=${recipe.id}"
                        class="recipe-button"
                    >
                        Voir la recette
                    </a>

                </div>

            `;


            recipesContainer
                .appendChild(
                    card
                );

        }
    );

}

// ==========================================
// RECHERCHE INSTANTANÉE PAR TITRE
// ==========================================

if (recipeSearch) {

    recipeSearch.addEventListener(
        "input",
        function () {

            // ==========================================
            // SAUVEGARDER LA RECHERCHE
            // ==========================================

            window.history.replaceState(
                {
                    ...window.history.state,
                    recipeSearch: recipeSearch.value
                },
                ""
            );

            // ==========================================
            // CONSERVER LE TEXTE RECHERCHÉ
            // ==========================================

            sessionStorage.setItem(
                "recettePlusRecipeSearch",
                recipeSearch.value
            );

            filterRecipes();

        }
    );

}


// ==========================================
// LANCEMENT
// ==========================================

loadRecipes();

// ==========================================
// OUVERTURE ET FERMETURE DU PANNEAU
// DE GESTION DES CATÉGORIES
// ==========================================

const manageCategoriesButton = document.getElementById(
    "manageRecipeCategories"
);

const categoryManagementPanel = document.getElementById(
    "categoryManagementPanel"
);


// ==========================================
// OUVERTURE ET FERMETURE DU PANNEAU
// ==========================================

const closeCategoriesButton = document.getElementById(
    "closeCategoryManagement"
);

const categoryManagementContainer = document.querySelector(
    ".recipe-category-management"
);


if (
    manageCategoriesButton &&
    categoryManagementPanel &&
    closeCategoriesButton &&
    categoryManagementContainer
) {

    // ==========================================
    // OUVRIR LE PANNEAU
    // ==========================================

    manageCategoriesButton.addEventListener("click", function () {

        categoryManagementContainer.hidden = true;

        categoryManagementPanel.hidden = false;

        manageCategoriesButton.setAttribute(
            "aria-expanded",
            "true"
        );

    });


    // ==========================================
    // FERMER LE PANNEAU
    // ==========================================

    closeCategoriesButton.addEventListener("click", function () {

        categoryManagementPanel.hidden = true;

        categoryManagementContainer.hidden = false;

        manageCategoriesButton.setAttribute(
            "aria-expanded",
            "false"
        );

    });

}

// ==========================================
// RENOMMER UNE CATÉGORIE PERSONNALISÉE
// ==========================================

async function renameCustomCategory(categoryId, newName) {

    const { error } = await supabaseClient
        .rpc("rename_recipe_category", {

            p_category_id: categoryId,

            p_new_name: newName

        });


    if (error) {

        console.error(
            "Erreur de renommage de la catégorie :",
            error
        );

        return false;

    }


    return true;

}

// ==========================================
// SUPPRIMER UNE CATÉGORIE PERSONNALISÉE
// ==========================================

async function deleteCustomCategory(categoryId) {

    const { error } = await supabaseClient
        .rpc("delete_recipe_category", {

            p_category_id: categoryId

        });


    if (error) {

        console.error(
            "Erreur de suppression de la catégorie :",
            error
        );

        return false;

    }


    return true;

}

// ==========================================
// ACTUALISER LES DONNÉES APRÈS SUPPRESSION
// ==========================================

function updateDeletedCategory(categoryId, categoryName) {

    // Retirer la catégorie de la liste locale

    customCategories = customCategories.filter(
        function (category) {

            return category.id !== categoryId;

        }
    );


    // Conserver les recettes, sans catégorie

    loadedRecipes.forEach(function (recipe) {

        if (recipe.category === categoryName) {

            recipe.category = null;

        }

    });


    // Réinitialiser le filtre si nécessaire

    if (activeCategory === categoryName) {

        activeCategory = "";

    }

}

