const searchForm =
    document.getElementById("recipeSearch");

const searchInput =
    document.getElementById("searchInput");

const popularLinks =
    document.querySelectorAll(".popular-link");


// ==========================================
// RECHERCHE DEPUIS L'ACCUEIL
// ==========================================

searchForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const search =
            searchInput.value.trim();

        if (!search) {
            return;
        }

        // ==========================================
        // DÉTECTER UNE RECHERCHE OU UNE URL
        // ==========================================

        const isRecipeUrl =
            /^https?:\/\//i.test(search);


        // ==========================================
        // DIRIGER VERS LA PAGE RECHERCHE
        // ==========================================

        if (isRecipeUrl) {

            window.location.href =
                `./html/recherche.html?url=${encodeURIComponent(
                    search
                )}`;

        } else {

            window.location.href =
                `./html/recherche.html?q=${encodeURIComponent(
                    search
                )}`;

        }

    }
);


// ==========================================
// RECHERCHES POPULAIRES
// ==========================================

popularLinks.forEach(
    function (link) {

        link.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const search =
                    link.dataset.search;

                if (!search) {
                    return;
                }

                window.location.href =
                    `./html/recherche.html?q=${encodeURIComponent(
                        search
                    )}`;

            }
        );

    }
);


// ==========================================
// CATÉGORIES DES RECETTES UTILISATEUR
// SUPABASE
// ==========================================

const savedCategories =
    document.getElementById("savedCategories");


// ==========================================
// IMAGE PAR DÉFAUT SELON LA CATÉGORIE
// ==========================================

function getCategoryDefaultImage(category) {

    const normalizedCategory =
        (category || "")
            .toLowerCase()
            .trim();


    if (
        normalizedCategory.includes("entrée") ||
        normalizedCategory.includes("entree")
    ) {

        return "./image/default-entree.png";

    }


    if (
        normalizedCategory.includes("plat")
    ) {

        return "./image/default-plat.png";

    }


    if (
        normalizedCategory.includes("dessert")
    ) {

        return "./image/default-dessert.png";

    }


    if (
        normalizedCategory.includes("apéritif") ||
        normalizedCategory.includes("aperitif")
    ) {

        return "./image/default-apperitif.png";

    }


    if (
        normalizedCategory.includes("boisson") ||
        normalizedCategory.includes("cocktail") ||
        normalizedCategory.includes("café") ||
        normalizedCategory.includes("cafe") ||
        normalizedCategory.includes("thé") ||
        normalizedCategory.includes("the")
    ) {

        return "./image/default-boisson.png";

    }


    return "./image/default-plat.png";

}


// ==========================================
// CHARGEMENT DES CATÉGORIES
// ==========================================

async function displaySavedCategories() {

    if (!savedCategories) {
        return;
    }


    savedCategories.innerHTML = `
        <p class="loading-categories">
            Chargement des catégories...
        </p>
    `;


    // ======================================
    // UTILISATEUR CONNECTÉ ?
    // ======================================

    const {
        data: {
            user
        }
    } =
        await supabaseClient
            .auth
            .getUser();


    // ======================================
    // NON CONNECTÉ
    // ======================================

    if (!user) {

        savedCategories.innerHTML = `

            <div class="no-saved-recipes">

                <p>
                    Connectez-vous pour retrouver
                    vos recettes et vos catégories.
                </p>

                <a href="./html/connexion.html">
                    Se connecter
                </a>

            </div>

        `;

        return;
    }


    // ======================================
    // RECETTES DEPUIS SUPABASE
    // ======================================

    const {
        data: recipes,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select(
                "id, category, image"
            )
            .eq(
                "user_id",
                user.id
            );


    if (error) {

        console.error(
            "Erreur catégories :",
            error
        );


        savedCategories.innerHTML = `

            <div class="no-saved-recipes">

                <p>
                    Impossible de charger vos catégories.
                </p>

            </div>

        `;

        return;
    }


    // ======================================
    // AUCUNE RECETTE
    // ======================================

    if (!recipes || recipes.length === 0) {

        savedCategories.innerHTML = `

            <div class="no-saved-recipes">

                <p>
                    Vous n'avez pas encore de recette.
                </p>

                <a href="./html/creer-recette.html">
                    Créer ma première recette
                </a>

            </div>

        `;

        return;
    }


    // ======================================
    // CONSTRUCTION DES CATÉGORIES
    // ======================================

    const categories = {};


    recipes.forEach(function (recipe) {

        const category =
            recipe.category;


        if (!category) {
            return;
        }


        if (!categories[category]) {

            categories[category] = {

                count: 0,

                image:
                    recipe.image ||
                    getCategoryDefaultImage(
                        category
                    )

            };

        }


        categories[category].count++;


        // Si la première recette n'avait pas
        // de vraie photo mais qu'une autre en a une

        if (
            !categories[category].image ||
            categories[category].image.includes(
                "default-"
            )
        ) {

            if (recipe.image) {

                categories[category].image =
                    recipe.image;

            }

        }

    });


    // ======================================
    // AFFICHAGE
    // ======================================

    // ==========================================
    // AUCUNE CATÉGORIE DISPONIBLE
    // ==========================================

    if (Object.keys(categories).length === 0) {

        savedCategories.innerHTML = `

        <div class="no-saved-recipes">

            <p>
                Vos recettes ne sont pas encore
                classées dans des catégories.
            </p>

            <a href="./html/mes-recettes.html">
                Organiser mes recettes
            </a>

        </div>

    `;

        return;

    }

    savedCategories.innerHTML = "";


    Object.entries(categories)
        .forEach(
            function ([category, data]) {

                const link =
                    document.createElement(
                        "a"
                    );


                link.classList.add(
                    "saved-category"
                );


                link.href =
                    `./html/mes-recettes.html?categorie=${encodeURIComponent(category)}`;


                // ======================================
                // IMAGE DE LA CATÉGORIE
                // ======================================

                const image = document.createElement("img");

                image.classList.add("category-image");

                image.src = data.image;
                image.alt = category;


                // ======================================
                // CONTENU DE LA CARTE
                // ======================================

                const content = document.createElement("div");

                content.classList.add("category-content");


                // ======================================
                // NOM DE LA CATÉGORIE
                // ======================================

                const name = document.createElement("span");

                name.classList.add("category-name");

                name.textContent = category;


                // ======================================
                // NOMBRE DE RECETTES
                // ======================================

                const number = document.createElement("span");

                number.classList.add("category-number");

                number.textContent = `${data.count} ${data.count > 1 ? "recettes" : "recette"
                    }`;


                // ======================================
                // CONSTRUCTION DE LA CARTE
                // ======================================

                content.appendChild(name);

                content.appendChild(number);

                link.appendChild(image);

                link.appendChild(content);


                savedCategories.appendChild(
                    link
                );

            }
        );

}


// ==========================================
// LANCEMENT
// ==========================================

displaySavedCategories();

// ==========================================
// NOTIFICATION PAIEMENT STRIPE
// ==========================================

const paymentStatus = new URLSearchParams(
    window.location.search
).get("payment");

if (paymentStatus === "success") {

    const notification = document.createElement("div");

    notification.className = "payment-notification";

    notification.innerHTML = `
        <strong>✓ Paiement réussi !</strong>
        <span>
            Votre paiement a été confirmé.
            Vos crédits seront disponibles
            dès leur ajout à votre compte.
        </span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );
}

// ==========================================
// NOTIFICATION ANNULATION PAIEMENT STRIPE
// ==========================================

const cancelPaymentStatus = new URLSearchParams(
    window.location.search
).get("payment");

if (cancelPaymentStatus === "cancel") {

    const notification = document.createElement("div");

    notification.className =
        "payment-notification payment-notification-cancel";

    notification.innerHTML = `
        <strong> Paiement annulé</strong>
        <span>
            Votre achat n'a pas été effectué.
            Aucun crédit n'a été ajouté.
            Vous pouvez réessayer à tout moment.
        </span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);

    window.history.replaceState(
        {},
        document.title,
        window.location.pathname
    );
}



