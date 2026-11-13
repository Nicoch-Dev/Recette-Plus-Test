const favoritesContainer =
    document.getElementById("favoritesContainer");


// ==========================================
// IMAGE PAR DÉFAUT
// ==========================================

function getDefaultImage(category) {

    const normalizedCategory =
        String(category || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim();


    if (
        normalizedCategory === "entree"
    ) {
        return "../image/default-entree.png";
    }


    if (
        normalizedCategory === "aperitif"
    ) {
        return "../image/default-apperitif.png";
    }


    if (
        normalizedCategory === "boisson"
    ) {
        return "../image/default-boisson.png";
    }


    if (
        normalizedCategory === "dessert"
    ) {
        return "../image/default-dessert.png";
    }


    return "../image/default-plat.png";

}


// ==========================================
// CHARGEMENT DES FAVORIS
// ==========================================

async function loadFavorites() {

    favoritesContainer.innerHTML = `
        <p class="loading-recipes">
            Chargement de vos favoris...
        </p>
    `;


    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if (userError || !user) {

        console.error(
            "Erreur utilisateur :",
            userError
        );

        favoritesContainer.innerHTML = `
            <p>
                Vous devez être connecté.
            </p>
        `;

        return;
    }


    // ======================================
    // FAVORIS + RECETTES ASSOCIÉES
    // ======================================

    const {
        data: favorites,
        error
    } =
        await supabaseClient
            .from("favorites")
            .select(`
                id,
                recipe_id,
                created_at,
                recipes (
                    id,
                    title,
                    category,
                    time,
                    image,
                    source
                )
            `)
            .eq("user_id", user.id)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Erreur chargement favoris :",
            error
        );

        favoritesContainer.innerHTML = `
            <p>
                Impossible de charger vos favoris.
            </p>
        `;

        return;
    }


    displayFavorites(favorites);

}


// ==========================================
// AFFICHAGE
// ==========================================

function displayFavorites(favorites) {

    favoritesContainer.innerHTML = "";


    if (
        !favorites ||
        favorites.length === 0
    ) {

        favoritesContainer.innerHTML = `

            <div class="no-recipes">

                <p>
                    Vous n'avez encore aucune recette favorite.
                </p>

                <a
                    href="./mes-recettes.html"
                    class="recipe-button"
                >
                    Voir mes recettes
                </a>

            </div>

        `;

        return;
    }


    favorites.forEach(
        function (favorite) {

            const recipe =
                favorite.recipes;


            if (!recipe) {
                return;
            }


            const card =
                document.createElement(
                    "article"
                );


            card.classList.add(
                "recipe-card"
            );


            card.innerHTML = `

                <img
                    src="${
                        recipe.image ||
                        getDefaultImage(
                            recipe.category
                        )
                    }"
                    alt="${recipe.title}"
                    class="recipe-card-image"
                >


                <div class="recipe-card-content">

                    <span class="recipe-category">
                        ${recipe.category || ""}
                    </span>


                    <h3>
                        ${recipe.title}
                    </h3>


                    ${
                        recipe.time
                            ? `
                                <p class="recipe-time">
                                    ⏱ ${recipe.time}
                                </p>
                              `
                            : ""
                    }


                    ${
                        recipe.source === "ai"
                            ? `
                                <p class="recipe-ai-badge">
                                    ✨ Recette IA
                                </p>
                              `
                            : ""
                    }


                    <div class="favorite-actions">

                        <a
                            href="./ma-recette.html?id=${recipe.id}"
                            class="recipe-button"
                        >
                            Voir la recette
                        </a>


                        <button
                            type="button"
                            class="remove-favorite-button"
                            data-favorite-id="${favorite.id}"
                        >
                            ♥ Retirer
                        </button>

                    </div>

                </div>

            `;


            favoritesContainer.appendChild(
                card
            );

        }
    );


    setupRemoveButtons();

}


// ==========================================
// RETIRER UN FAVORI
// ==========================================

function setupRemoveButtons() {

    const buttons =
        document.querySelectorAll(
            ".remove-favorite-button"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function () {

                    const favoriteId =
                        button.dataset.favoriteId;


                    button.disabled =
                        true;


                    button.textContent =
                        "Suppression...";


                    const {
                        error
                    } =
                        await supabaseClient
                            .from("favorites")
                            .delete()
                            .eq(
                                "id",
                                favoriteId
                            );


                    if (error) {

                        console.error(
                            "Erreur suppression favori :",
                            error
                        );


                        button.disabled =
                            false;


                        button.textContent =
                            "♥ Retirer";


                        return;
                    }


                    loadFavorites();

                }
            );

        }
    );

}


// ==========================================
// LANCEMENT
// ==========================================

loadFavorites();

