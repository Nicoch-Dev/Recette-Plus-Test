
const recipeForm =
    document.getElementById("recipeForm");

const recipeMessage =
    document.getElementById("recipeMessage");

const imageInput =
    document.getElementById("recipeImage");

const recipeLimitOffer =
    document.getElementById("recipeLimitOffer");


// ==========================================
// ENREGISTREMENT DE LA RECETTE
// ==========================================

recipeForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        // Masquer l'ancienne proposition commerciale
        if (recipeLimitOffer) {
            recipeLimitOffer.hidden = true;
            recipeLimitOffer.replaceChildren();
        }

        // ======================================
        // RÉCUPÉRATION DES CHAMPS
        // ======================================

        const title =
            document
                .getElementById("recipeTitle")
                .value
                .trim();

        const category =
            document
                .getElementById("recipeCategory")
                .value;

        const time =
            document
                .getElementById("recipeTime")
                .value
                .trim();

        const servings =
            document
                .getElementById("recipeServings")
                .value;

        const ingredientsText =
            document
                .getElementById("recipeIngredients")
                .value
                .trim();

        const instructions =
            document
                .getElementById("recipeInstructions")
                .value
                .trim();


        // ======================================
        // VÉRIFICATION
        // ======================================

        if (
            title === "" ||
            category === "" ||
            ingredientsText === "" ||
            instructions === ""
        ) {

            recipeMessage.textContent =
                "Merci de remplir tous les champs obligatoires.";

            return;
        }


        // ======================================
        // TRANSFORMATION DES INGRÉDIENTS
        // ======================================

        const ingredients =
            ingredientsText
                .split("\n")
                .map(function (ingredient) {
                    return ingredient.trim();
                })
                .filter(function (ingredient) {
                    return ingredient !== "";
                });


        // ======================================
        // UPLOAD DE LA PHOTO
        // ======================================

        let imageUrl = "";

        const file =
            imageInput.files[0];

        if (file) {

            const fileExtension =
                file.name
                    .split(".")
                    .pop();

            const fileName =
                `${Date.now()}.${fileExtension}`;

            const filePath =
                `recipes/${fileName}`;

            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from("recipe-images")
                    .upload(
                        filePath,
                        file
                    );

            if (uploadError) {

                console.error(
                    "Erreur upload image :",
                    uploadError
                );

                recipeMessage.textContent =
                    "Impossible d'envoyer la photo.";

                return;
            }

            const {
                data: publicUrlData
            } =
                supabaseClient
                    .storage
                    .from("recipe-images")
                    .getPublicUrl(filePath);

            imageUrl =
                publicUrlData.publicUrl;
        }


        // ======================================
        // UTILISATEUR CONNECTÉ
        // ======================================

        const {
            data: {
                user
            }
        } =
            await supabaseClient
                .auth
                .getUser();

        if (!user) {

            recipeMessage.textContent =
                "Vous devez être connecté pour créer une recette.";

            return;
        }


        // ======================================
        // OBJET RECETTE
        // ======================================

        const recipe = {

            title: title,

            category: category,

            time: time,

            servings: servings,

            image: imageUrl,

            ingredients: ingredients,

            instructions: instructions,

            // ==========================================
            // ORIGINE DE LA RECETTE
            // ==========================================

            source: sessionStorage.getItem("recettePlusImportedRecipe")
                ? "imported"
                : "manual",

            source_url: (() => {

                try {

                    const imported = JSON.parse(
                        sessionStorage.getItem("recettePlusImportedRecipe")
                    );

                    return imported?.source_url || null;

                } catch {

                    return null;

                }

            })(),

            user_id: user.id
        };


        // ======================================
        // MESSAGE D'ENREGISTREMENT
        // ======================================

        recipeMessage.textContent =
            "Enregistrement de la recette...";


        // ======================================
        // ENVOI VERS SUPABASE
        // ======================================

        const {
            data,
            error
        } =
            await supabaseClient
                .from("recipes")
                .insert(recipe)
                .select()
                .single();


        // ======================================
        // GESTION DES ERREURS
        // ======================================

        if (error) {

            console.error(
                "Erreur Supabase complète :",
                error
            );

            if (
                error.message &&
                error.message.includes("RECIPE_LIMIT_REACHED")
            ) {

                // Lire le type de compte
                const {
                    data: billing,
                    error: billingError
                } =
                    await supabaseClient
                        .from("user_billing")
                        .select("has_purchased_pack")
                        .eq("user_id", user.id)
                        .single();

                if (billingError || !billing) {

                    console.error(
                        "Impossible de lire la formule :",
                        billingError
                    );

                    recipeMessage.textContent =
                        "Votre carnet de recettes est plein. " +
                        "Supprimez une recette pour libérer une place " +
                        "ou consultez les offres disponibles.";

                } else if (billing.has_purchased_pack === true) {

                    // ==================================
                    // COMPTE AVEC PACK : 30 RECETTES
                    // ==================================

                    recipeMessage.textContent =
                        "Votre carnet est plein : " +
                        "30 recettes sur 30.";

                    if (recipeLimitOffer) {

                        recipeLimitOffer.textContent =
                            "Passez à Premium pour profiter " +
                            "d'un carnet de recettes illimité. " +
                            "Vous pouvez aussi supprimer une recette " +
                            "pour libérer une place.";

                        recipeLimitOffer.hidden = false;
                    }

                } else {

                    // ==================================
                    // COMPTE GRATUIT : 10 RECETTES
                    // ==================================

                    recipeMessage.textContent =
                        "Votre carnet est plein : " +
                        "10 recettes sur 10.";

                    if (recipeLimitOffer) {

                        const description =
                            document.createTextNode(
                                "Achetez un "
                            );

                        const packLink =
                            document.createElement("a");

                        packLink.href =
                            "../html/credits.html";

                        packLink.textContent =
                            "pack de crédits";

                        const explanation =
                            document.createTextNode(
                                " pour passer à 30 recettes enregistrées, " +
                                "ou choisissez Premium pour un carnet illimité. " +
                                "Vous pouvez aussi supprimer une recette " +
                                "pour libérer une place."
                            );

                        recipeLimitOffer.append(
                            description,
                            packLink,
                            explanation
                        );

                        recipeLimitOffer.hidden = false;
                    }
                }

            } else {

                // Autre erreur Supabase
                recipeMessage.textContent =
                    "Erreur : " + error.message;
            }

            return;
        }


        // ======================================
        // SUCCÈS
        // ======================================

        console.log(
            "Recette enregistrée dans Supabase :",
            data
        );

        recipeMessage.textContent =
            "Votre recette a bien été enregistrée !";

        // ==========================================
        // NETTOYER LA RECETTE IMPORTÉE
        // ==========================================

        sessionStorage.removeItem(
            "recettePlusImportedRecipe"
        );


        // ======================================
        // REDIRECTION
        // ======================================

        setTimeout(
            function () {

                window.location.href =
                    `../html/ma-recette.html?id=${data.id}`;

            },
            800
        );

    }
);

// ==========================================
// CHARGER LES CATÉGORIES PERSONNALISÉES
// ==========================================

async function loadCustomRecipeCategories(userId) {

    const { data, error } = await supabaseClient
        .from("recipe_categories")
        .select("id, name")
        .eq("user_id", userId)
        .order("name", { ascending: true });


    if (error) {

        console.error(
            "Erreur de chargement des catégories :",
            error
        );

        return [];

    }


    return data || [];

}

// ==========================================
// AFFICHER LES CATÉGORIES PERSONNALISÉES
// ==========================================

function displayCustomRecipeCategories(categories) {

    const categoryGroup = document.getElementById(
        "customRecipeCategories"
    );

    if (!categoryGroup) {

        return;

    }

    // Vider les anciennes catégories

    categoryGroup.innerHTML = "";


    // Ajouter les catégories personnelles

    categories.forEach(function (category) {

        const option = document.createElement("option");

        option.value = category.name;

        option.textContent = category.name;

        categoryGroup.appendChild(option);

    });

}

// ==========================================
// INITIALISER LES CATÉGORIES PERSONNALISÉES
// ==========================================

async function initializeCustomRecipeCategories() {

    // Vérifier l'utilisateur connecté

    const { data: { user }, error } =
        await supabaseClient.auth.getUser();

    if (error || !user) {

        return;

    }

    // Charger ses catégories depuis Supabase

    const categories = await loadCustomRecipeCategories(
        user.id
    );

    // Les afficher dans la liste déroulante

    displayCustomRecipeCategories(categories);

}


// Lancer le chargement

initializeCustomRecipeCategories();

// ==========================================
// PRÉREMPLIR UNE RECETTE IMPORTÉE
// ==========================================

function prefillImportedRecipe() {

    const storedRecipe = sessionStorage.getItem(
        "recettePlusImportedRecipe"
    );

    if (!storedRecipe) {
        return;
    }


    try {

        const recipe = JSON.parse(storedRecipe);


        // Nom de la recette

        document.getElementById("recipeTitle").value =
            recipe.title || "";

        // ==========================================
        // NOMBRE DE PERSONNES
        // ==========================================

        const servings = Number(recipe.servings);

        if (
            Number.isInteger(servings) &&
            servings >= 1 &&
            servings <= 50
        ) {

            document.getElementById("recipeServings").value =
                servings;

        }

        // ==========================================
        // PRÉREMPLIR LE TEMPS DE LA RECETTE
        // ==========================================

        const recipeTime =
            recipe.total_time ||
            recipe.preparation_time ||
            "";

        if (recipeTime) {

            document.getElementById("recipeTime").value =
                recipeTime;

        }


        // Ingrédients

        document.getElementById("recipeIngredients").value =
            Array.isArray(recipe.ingredients)
                ? recipe.ingredients.join("\n")
                : "";


        // Préparation

        document.getElementById("recipeInstructions").value =
            Array.isArray(recipe.instructions)
                ? recipe.instructions.join("\n\n")
                : "";

    } catch (error) {

        console.error(
            "Erreur de préremplissage :",
            error
        );

    }

}


// ==========================================
// LANCER LE PRÉREMPLISSAGE
// ==========================================

prefillImportedRecipe();

// ==========================================
// RECALCUL DES INGRÉDIENTS
// RECETTES IMPORTÉES
// ==========================================

function setupImportedRecipeQuantities() {

    const importedRecipe = sessionStorage.getItem(
        "recettePlusImportedRecipe"
    );

    if (!importedRecipe) {
        return;
    }


    const servingsInput =
        document.getElementById("recipeServings");

    const ingredientsInput =
        document.getElementById("recipeIngredients");


    // Conserver les quantités de référence

    let referenceServings =
        Number(servingsInput.value);

    let referenceIngredients =
        ingredientsInput.value.split("\n");


    // ==========================================
    // CHANGEMENT DU NOMBRE DE PERSONNES
    // ==========================================

    servingsInput.addEventListener("input", function () {

        const newServings =
            Number(servingsInput.value);

        if (
            !Number.isInteger(newServings) ||
            newServings < 1 ||
            newServings > 50 ||
            !Number.isInteger(referenceServings) ||
            referenceServings < 1
        ) {
            return;
        }


        const updatedIngredients =
            referenceIngredients.map(function (ingredient) {

                return scaleIngredient(
                    ingredient,
                    referenceServings,
                    newServings
                );

            });


        ingredientsInput.value =
            updatedIngredients.join("\n");

    });


    // ==========================================
    // MODIFICATION MANUELLE DES INGRÉDIENTS
    // ==========================================

    ingredientsInput.addEventListener("input", function () {

        referenceIngredients =
            ingredientsInput.value.split("\n");

        referenceServings =
            Number(servingsInput.value);

    });

}


// ==========================================
// ACTIVER LE RECALCUL
// ==========================================

setupImportedRecipeQuantities();
