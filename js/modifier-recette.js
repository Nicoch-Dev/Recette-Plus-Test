const form =
    document.getElementById("editRecipeForm");

const imageInput =
    document.getElementById("recipeImage");

const params =
    new URLSearchParams(
        window.location.search
    );

const recipeId =
    Number(params.get("id"));

let currentImageUrl = "";


// ==========================================
// CHARGEMENT DE LA RECETTE
// ==========================================

async function loadRecipe() {

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
    // CHARGEMENT DE SA PROPRE RECETTE
    // ======================================

    const {
        data: recipe,
        error
    } =
        await supabaseClient
            .from("recipes")
            .select("*")
            .eq("id", recipeId)
            .eq("user_id", user.id)
            .maybeSingle();


    if (
        error ||
        !recipe
    ) {

        if (error) {

            console.error(
                "Erreur chargement :",
                error
            );

        }

        alert(
            "Cette recette est introuvable ou ne vous appartient pas."
        );

        window.location.href =
            "./mes-recettes.html";

        return;
    }


    currentImageUrl =
        recipe.image || "";


    document
        .getElementById("recipeTitle")
        .value =
        recipe.title || "";


    // ==========================================
    // MÉMORISER LA CATÉGORIE DE LA RECETTE
    // ==========================================

    const categorySelect = document.getElementById(
        "recipeCategory"
    );

    if (categorySelect) {

        // Conserver la catégorie pendant le chargement

        categorySelect.dataset.pendingCategory =
            recipe.category || "";

        // Sélectionner la catégorie si elle existe déjà

        categorySelect.value =
            recipe.category || "";

    }


    document
        .getElementById("recipeTime")
        .value =
        recipe.time || "";


    if (
        Array.isArray(
            recipe.ingredients
        )
    ) {

        document
            .getElementById(
                "recipeIngredients"
            )
            .value =
            recipe.ingredients.join("\n");

    } else {

        document
            .getElementById(
                "recipeIngredients"
            )
            .value =
            recipe.ingredients || "";

    }


    document
        .getElementById(
            "recipeInstructions"
        )
        .value =
        recipe.instructions || "";

}


// ==========================================
// ENREGISTREMENT
// ==========================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


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


        const ingredients =
            document
                .getElementById("recipeIngredients")
                .value
                .split("\n")
                .map(function (ingredient) {

                    return ingredient.trim();

                })
                .filter(function (ingredient) {

                    return ingredient !== "";

                });


        const instructions =
            document
                .getElementById("recipeInstructions")
                .value
                .trim();


        // ======================================
        // PHOTO
        // ======================================

        let imageUrl =
            currentImageUrl;

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

                alert(
                    "Impossible d'envoyer la nouvelle photo."
                );

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
        // MISE À JOUR DE LA RECETTE
        // ======================================

        const {
            data,
            error
        } =
            await supabaseClient
                .from("recipes")
                .update({

                    title: title,

                    category: category,

                    time: time,

                    image: imageUrl,

                    ingredients: ingredients,

                    instructions: instructions,

                    updated_at:
                        new Date().toISOString()

                })
                .eq("id", recipeId)
                .select()
                .single();


        if (error) {

            console.error(
                "Erreur modification :",
                error
            );

            alert(
                "Impossible de modifier la recette."
            );

            return;
        }


        console.log(
            "Recette modifiée :",
            data
        );


        window.location.href =
            `./ma-recette.html?id=${recipeId}`;

    }
);


// ==========================================
// LANCEMENT
// ==========================================

loadRecipe();

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

    // Charger les catégories personnelles

    const categories = await loadCustomRecipeCategories(
        user.id
    );

    // Les afficher dans le menu déroulant

    displayCustomRecipeCategories(categories);

    // ==========================================
    // RESTAURER LA CATÉGORIE SÉLECTIONNÉE
    // ==========================================

    const categorySelect = document.getElementById(
        "recipeCategory"
    );

    if (categorySelect && categorySelect.dataset.pendingCategory) {

        categorySelect.value =
            categorySelect.dataset.pendingCategory;

    }

}


// Lancer le chargement des catégories

initializeCustomRecipeCategories();

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