const searchForm =
    document.getElementById("recipeSearch");

const searchInput =
    document.getElementById("searchInput");

const results =
    document.getElementById("results");

const resultsTitle =
    document.getElementById("resultsTitle");


// ==========================================
// PARAMÈTRE DE RECHERCHE DANS L'URL
// ==========================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const initialSearch =
    urlParams
        .get("q")
        ?.trim() || "";

// ==========================================
// URL D'UNE RECETTE EXTERNE
// ==========================================

const initialRecipeUrl =
    urlParams
        .get("url")
        ?.trim() || "";


// ==========================================
// TRADUCTION ANGLAIS → FRANÇAIS
// ==========================================

async function translateText(text) {

    if (!text) {
        return "";
    }

    try {

        const response =
            await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
                    text
                )}&langpair=en|fr`
            );


        if (!response.ok) {
            return text;
        }


        const data =
            await response.json();


        return (
            data?.responseData?.translatedText ||
            text
        );


    } catch (error) {

        console.error(
            "Erreur traduction :",
            error
        );


        return text;
    }

}


// ==========================================
// TRADUCTION DES TEXTES LONGS
// Ancien système Recette Plus
// ==========================================

async function translateLongText(text) {
    if (!text) return "";

    // Nettoyage du texte original
    const cleanText = text
        .replace(/\r/g, " ")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Découpe uniquement à la fin des phrases
    const sentences =
        cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];

    const translatedSentences = [];

    for (const sentence of sentences) {
        const cleanSentence = sentence.trim();

        if (!cleanSentence) continue;

        const translated = await translateText(cleanSentence);

        translatedSentences.push(translated.trim());
    }

    return translatedSentences.join(" ");
}

// ==========================================
// CONSTRUCTION DES ÉTAPES THEMEALDB
// ==========================================

async function buildMealDbInstructions(meal) {

    const originalInstructions =
        meal.strInstructions || "";

    if (!originalInstructions.trim()) {
        return [];
    }


    // Normalise les retours à la ligne
    let cleanText =
        originalInstructions
            .replace(/\r/g, "\n")
            .replace(/\n{2,}/g, "\n")
            .trim();


    // Sépare les mentions du type :
    // STEP 1, Step 2, ÉTAPE 3, etc.
    cleanText =
        cleanText.replace(
            /\b(?:step|étape)\s*\d+\s*[:.-]?\s*/gi,
            "\n"
        );


    let steps =
        cleanText
            .split("\n")
            .map(function (step) {
                return step.trim();
            })
            .filter(function (step) {
                return step.length > 0;
            });


    // Si TheMealDB a fourni tout le texte
    // dans un seul paragraphe, on découpe
    // proprement à la fin des phrases.
    if (steps.length <= 1) {

        steps =
            cleanText.match(
                /[^.!?]+[.!?]+|[^.!?]+$/g
            ) || [cleanText];


        steps =
            steps
                .map(function (step) {
                    return step.trim();
                })
                .filter(function (step) {
                    return step.length > 0;
                });

    }


    // Traduction de chaque étape séparément
    const translatedSteps = [];


    for (const step of steps) {

        const translatedStep =
            await translateLongText(step);


        if (translatedStep.trim()) {

            translatedSteps.push(
                translatedStep.trim()
            );

        }

    }


    return translatedSteps
        .map(function (step, index) {
            return `Étape ${index + 1}\n${step}`;
        })
        .join("\n\n");
}

// ==========================================
// TITRES THEMEALDB
// ==========================================

function cleanMealDbTitle(title) {

    if (!title) return "Recette";

    const knownTitles = {
        "chocolate gateau": "Gâteau au chocolat"
    };

    const key =
        title
            .toLowerCase()
            .trim();

    if (knownTitles[key]) {
        return knownTitles[key];
    }

    // Supprime un numéro parasite :
    // "3. Soufflé au chocolat" -> "Soufflé au chocolat"
    return title
        .replace(/^\s*\d+\s*[.)-]\s*/, "")
        .trim();
}


// ==========================================
// PAYS / CUISINES THEMEALDB
// ==========================================

function getFrenchCuisine(area) {

    const cuisines = {
        "French": "française",
        "France": "française",
        "American": "américaine",
        "Australian": "australienne",
        "United States": "américaine",
        "British": "britannique",
        "Canadian": "canadienne",
        "Chinese": "chinoise",
        "Croatian": "croate",
        "Dutch": "néerlandaise",
        "Egyptian": "égyptienne",
        "Filipino": "philippine",
        "Greek": "grecque",
        "Indian": "indienne",
        "Irish": "irlandaise",
        "India": "indienne",
        "Italian": "italienne",
        "Jamaican": "jamaïcaine",
        "Japanese": "japonaise",
        "Kenyan": "kényane",
        "Malaysian": "malaisienne",
        "Mexican": "mexicaine",
        "Moroccan": "marocaine",
        "Norway": "norvégienne",
        "Polish": "polonaise",
        "Portuguese": "portugaise",
        "Russian": "russe",
        "Spanish": "espagnole",
        "Saudi Arabian": "saoudienne",
        "Thai": "thaïlandaise",
        "Tunisian": "tunisienne",
        "Turkish": "turque",
        "Uruguayan": "uruguayenne",
        "Vietnamese": "vietnamienne"
    };

    return cuisines[area] || area;
}


// ==========================================
// RECHERCHE THEMEALDB
// ==========================================

async function searchRecipes(search) {

    resultsTitle.textContent =
        `Résultats pour « ${search} »`;


    results.innerHTML = `
        <div class="recipe-search-loader">

            <img
                src="../image/toque-loader.png"
                alt=""
                class="recipe-search-loader-toque"
            >

            <p>
                Recherche des meilleures recettes...
            </p>

            <span>
                Cela peut prendre quelques secondes
            </span>

        </div>
    `;


    // ======================================
    // TRADUCTION RECHERCHE FR → EN
    // ======================================

    const mealDbTranslations = {

        // VIANDES
        "poulet": "chicken",
        "boeuf": "beef",
        "bœuf": "beef",
        "porc": "pork",
        "agneau": "lamb",
        "canard": "duck",
        "dinde": "turkey",

        // POISSONS / FRUITS DE MER
        "poisson": "fish",
        "saumon": "salmon",
        "thon": "tuna",
        "crevette": "prawn",
        "crevettes": "prawn",
        "fruits de mer": "seafood",

        // FÉCULENTS
        "pates": "pasta",
        "pâtes": "pasta",
        "riz": "rice",
        "nouilles": "noodles",
        "pomme de terre": "potato",
        "pommes de terre": "potato",

        // LÉGUMES
        "tomate": "tomato",
        "tomates": "tomato",
        "champignon": "mushroom",
        "champignons": "mushroom",
        "aubergine": "aubergine",
        "courgette": "courgette",

        // TYPES DE RECETTES
        "soupe": "soup",
        "salade": "salad",
        "pizza": "pizza",
        "burger": "burger",
        "curry": "curry",

        // DESSERTS
        "dessert": "dessert",
        "gateau": "cake",
        "gâteau": "cake",
        "tarte": "pie",
        "chocolat": "chocolate",
        "glace": "ice cream",
        "crêpe": "pancake",
        "crepe": "pancake",
        "crêpes": "pancake",
        "crepes": "pancake"

    };


    const mealDbSearch =
        mealDbTranslations[
        search
            .toLowerCase()
            .trim()
        ] || search;


    try {

        const response =
            await fetch(
                `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
                    mealDbSearch
                )}`
            );


        if (!response.ok) {

            throw new Error(
                "Erreur TheMealDB."
            );

        }


        const data =
            await response.json();


        const meals =
            Array.isArray(data.meals)
                ? data.meals
                : [];


        const recipes =
            meals.map(
                function (meal) {

                    return {

                        id:
                            meal.idMeal,

                        title:
                            meal.strMeal ||
                            "Recette",

                        source:
                            "TheMealDB",

                        url:
                            meal.strSource ||
                            meal.strYoutube ||
                            null,

                        image:
                            meal.strMealThumb ||
                            null,

                        category:
                            meal.strCategory ||
                            null,

                        area:
                            meal.strArea ||
                            null,

                        rating:
                            null,

                        review_count:
                            null,

                        time:
                            null,

                        summary:
                            meal.strArea
                                ? `Cuisine ${getFrenchCuisine(meal.strArea)}`
                                : null,

                        mealdb:
                            meal

                    };

                }
            );


        // ======================================
        // TRADUCTION DES TITRES
        // ======================================

        await Promise.all(

            recipes.map(

                async function (recipe) {

                    const translatedTitle =
                        await translateText(
                            recipe.title
                        );

                    recipe.title =
                        cleanMealDbTitle(
                            translatedTitle
                        );

                }

            )

        );

        const searchSourceText =
            document.getElementById(
                "searchSourceText"
            );


        if (searchSourceText) {

            const sources = [
                ...new Set(
                    recipes
                        .map(function (recipe) {
                            return recipe.source;
                        })
                        .filter(Boolean)
                )
            ];


            if (sources.length === 1) {

                searchSourceText.textContent =
                    `Découvrez les meilleures recettes de ${sources[0]}.`;

            } else if (sources.length > 1) {

                searchSourceText.textContent =
                    `Découvrez les meilleures recettes de ${sources.join(" et ")}.`;

            } else {

                searchSourceText.textContent =
                    "Découvrez les meilleures recettes disponibles.";

            }

        }


        displayRecipes(
            recipes,
            search
        );


    } catch (error) {

        console.error(
            "Erreur recherche TheMealDB :",
            error
        );


        results.innerHTML = `
            <p class="error">
                Impossible de récupérer les recettes.
            </p>
        `;

    }

}


// ==========================================
// AFFICHAGE DES RÉSULTATS
// ==========================================

function displayRecipes(
    recipes,
    search
) {

    results.innerHTML = "";


    if (
        !recipes ||
        recipes.length === 0
    ) {

        const noResults =
            document.createElement("p");


        noResults.className =
            "no-results";


        noResults.textContent =
            `Aucune recette trouvée pour « ${search} ».`;


        results.appendChild(
            noResults
        );


        return;
    }


    recipes.forEach(
        function (recipe) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "recipe-card";


            // ==================================
            // IMAGE THEMEALDB
            // ==================================

            const image =
                document.createElement(
                    "img"
                );


            image.className =
                "recipe-web-image";


            image.src =
                recipe.image ||
                "../image/logo.PNG";


            image.alt =
                recipe.title ||
                "Recette";


            image.loading =
                "lazy";


            card.appendChild(
                image
            );


            // ==================================
            // CONTENU
            // ==================================

            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "recipe-web-content";


            // ==================================
            // SOURCE
            // ==================================

            const source =
                document.createElement(
                    "div"
                );


            source.className =
                "recipe-web-source";


            source.textContent =
                recipe.source ||
                "TheMealDB";


            content.appendChild(
                source
            );


            // ==================================
            // TITRE
            // ==================================

            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                recipe.title ||
                "Recette";


            content.appendChild(
                title
            );


            // ==================================
            // INFORMATIONS
            // ==================================

            const meta =
                document.createElement(
                    "div"
                );


            meta.className =
                "recipe-web-meta";


            if (
                recipe.rating !== null &&
                recipe.rating !== undefined
            ) {

                const rating =
                    document.createElement(
                        "span"
                    );


                rating.className =
                    "recipe-rating";


                rating.textContent =
                    `⭐ ${recipe.rating}/5`;


                meta.appendChild(
                    rating
                );

            }


            if (
                recipe.review_count !== null &&
                recipe.review_count !== undefined
            ) {

                const reviewNumber =
                    Number(
                        recipe.review_count
                    );


                if (
                    Number.isFinite(
                        reviewNumber
                    )
                ) {

                    const reviews =
                        document.createElement(
                            "span"
                        );


                    reviews.className =
                        "recipe-reviews";


                    reviews.textContent =
                        `${reviewNumber.toLocaleString(
                            "fr-FR"
                        )} avis`;


                    meta.appendChild(
                        reviews
                    );

                }

            }


            if (recipe.time) {

                const time =
                    document.createElement(
                        "span"
                    );


                time.className =
                    "recipe-time";


                time.textContent =
                    `⏱ ${recipe.time}`;


                meta.appendChild(
                    time
                );

            }


            content.appendChild(
                meta
            );


            // ==================================
            // RÉSUMÉ
            // ==================================

            if (recipe.summary) {

                const summary =
                    document.createElement(
                        "p"
                    );


                summary.className =
                    "recipe-web-summary";


                summary.textContent =
                    recipe.summary;


                content.appendChild(
                    summary
                );

            }


            // ==================================
            // ACTIONS
            // ==================================

            const actions =
                document.createElement(
                    "div"
                );


            actions.className =
                "recipe-web-actions";


            // ==================================
            // VOIR LA SOURCE
            // ==================================

            if (recipe.url) {

                const sourceLink =
                    document.createElement(
                        "a"
                    );


                sourceLink.href =
                    recipe.url;


                sourceLink.target =
                    "_blank";


                sourceLink.rel =
                    "noopener noreferrer";


                sourceLink.className =
                    "recipe-source-link";


                sourceLink.textContent =
                    "Voir la recette";


                actions.appendChild(
                    sourceLink
                );

            }


            // ==================================
            // ENREGISTRER
            // ==================================
            // IMPORTANT :
            // on n'utilise plus import-web-recipe.
            // La recette vient directement
            // de TheMealDB.
            // ==================================

            if (recipe.mealdb) {

                const saveButton =
                    document.createElement(
                        "button"
                    );


                saveButton.type =
                    "button";


                saveButton.className =
                    "recipe-save-button";


                saveButton.textContent =
                    "Enregistrer";


                saveButton.addEventListener(
                    "click",
                    function () {

                        saveMealDbRecipe(
                            recipe,
                            saveButton
                        );

                    }
                );


                actions.appendChild(
                    saveButton
                );

            }


            content.appendChild(
                actions
            );


            card.appendChild(
                content
            );


            results.appendChild(
                card
            );

        }
    );

}


// ==========================================
// CONSTRUCTION DES INGRÉDIENTS THEMEALDB
// ==========================================

async function buildMealDbIngredients(meal) {
    const ingredients = [];

    const ingredientTranslations = {
        "single cream": "crème liquide",
        "double cream": "crème épaisse",
        "dark chocolate": "chocolat noir",
        "caster sugar": "sucre en poudre",
        "icing sugar": "sucre glace",
        "egg yolks": "jaunes d'œufs",
        "egg yolk": "jaune d'œuf",
        "egg whites": "blancs d'œufs",
        "egg white": "blanc d'œuf",
        "butter": "beurre"
    };

    function formatMeasure(measure) {
        if (!measure) return "";

        let value = measure.trim();

        // Espacement des unités
        value = value
            .replace(/(\d)\s*ml\b/gi, "$1 ml")
            .replace(/(\d)\s*g\b/gi, "$1 g")
            .replace(/(\d)\s*kg\b/gi, "$1 kg");

        // Unités anglaises courantes
        value = value
            .replace(/\btbs\b/gi, "c. à soupe")
            .replace(/\btbsp\b/gi, "c. à soupe")
            .replace(/\btablespoons?\b/gi, "c. à soupe")
            .replace(/\btsp\b/gi, "c. à café")
            .replace(/\bteaspoons?\b/gi, "c. à café")
            .replace(/\bcups?\b/gi, "tasse")
            .replace(/\bpinch\b/gi, "1 pincée")
            .replace(/\bdrizzle\b/gi, "un peu de");

        return value.trim();
    }

    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();

        if (!ingredient) continue;

        const ingredientKey = ingredient.toLowerCase();

        // Traduction connue = on évite complètement MyMemory
        let translatedIngredient =
            ingredientTranslations[ingredientKey];

        // Sinon on traduit uniquement le nom de l'ingrédient
        if (!translatedIngredient) {
            translatedIngredient = await translateText(ingredient);
        }

        const formattedMeasure = formatMeasure(measure);

        // Corrige quelques formulations anglaises restantes
        let finalIngredient = translatedIngredient;

        if (/^\d+\s/.test(formattedMeasure)) {
            const quantity = parseFloat(formattedMeasure);

            if (quantity > 1) {
                if (finalIngredient === "blanc d'œuf") {
                    finalIngredient = "blancs d'œufs";
                }

                if (finalIngredient === "jaune d'œuf") {
                    finalIngredient = "jaunes d'œufs";
                }
            }
        }

        let finalMeasure = formattedMeasure;

        if (/^to serve$/i.test(finalMeasure)) {
            finalMeasure = "";
            finalIngredient = `${finalIngredient}, pour servir`;
        }

        const line = `${finalMeasure} ${finalIngredient}`
            .replace(/\s+/g, " ")
            .trim();

        ingredients.push(line);
    }

    return ingredients;
}

// ==========================================
// CATÉGORIE RECETTE PLUS
// ==========================================

function getRecipePlusCategory(meal) {

    const text = `
        ${meal.strMeal || ""}
        ${meal.strCategory || ""}
    `.toLowerCase();


    // BOISSON
    if (
        text.includes("drink") ||
        text.includes("cocktail") ||
        text.includes("shake")
    ) {
        return "Boisson";
    }


    // DESSERT
    if (
        text.includes("dessert") ||
        text.includes("cake") ||
        text.includes("tart") ||
        text.includes("pie") ||
        text.includes("pudding") ||
        text.includes("cookie") ||
        text.includes("brownie") ||
        text.includes("ice cream")
    ) {
        return "Dessert";
    }


    // APÉRITIF
    if (
        text.includes("starter") ||
        text.includes("appetizer") ||
        text.includes("snack")
    ) {
        return "Apéritif";
    }


    // ENTRÉE
    if (
        text.includes("salad") ||
        text.includes("soup")
    ) {
        return "Entrée";
    }


    // PAR DÉFAUT
    // Une recette salée TheMealDB
    // est considérée comme un plat.

    return "Plat";
}


// ==========================================
// ENREGISTRER UNE RECETTE THEMEALDB
// ==========================================

async function saveMealDbRecipe(
    recipe,
    button
) {

    if (
        !recipe ||
        !recipe.mealdb
    ) {

        return;
    }


    const meal =
        recipe.mealdb;


    const originalText =
        button.textContent;


    button.disabled =
        true;


    button.textContent =
        "Préparation de la recette...";


    try {

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

            throw userError;
        }


        if (!user) {

            alert(
                "Connectez-vous pour enregistrer cette recette."
            );


            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop() +
                window.location.search;


            window.location.href =
                `./connexion.html?redirect=${encodeURIComponent(
                    currentPage
                )}`;


            return;
        }


        // ======================================
        // VÉRIFICATION DOUBLON
        // ======================================

        if (recipe.url) {

            const {
                data: existingRecipe,
                error: duplicateError
            } =
                await supabaseClient
                    .from("recipes")
                    .select("id")
                    .eq(
                        "user_id",
                        user.id
                    )
                    .eq(
                        "source_url",
                        recipe.url
                    )
                    .maybeSingle();


            if (duplicateError) {

                throw duplicateError;
            }


            if (existingRecipe) {

                button.textContent =
                    "✓ Déjà enregistrée";


                button.classList.add(
                    "is-saved"
                );


                return;
            }

        }


        // ======================================
        // TRADUCTION DU TITRE
        // ======================================

        button.textContent =
            "Traduction du titre...";


        const translatedTitle =
            recipe.title ||
            await translateText(
                meal.strMeal
            );


        // ======================================
        // TRADUCTION DES INGRÉDIENTS
        // ======================================

        button.textContent =
            "Traduction des ingrédients...";


        const translatedIngredients =
            await buildMealDbIngredients(
                meal
            );


        // ======================================
        // TRADUCTION DES INSTRUCTIONS
        // ======================================

        button.textContent =
            "Traduction de la préparation...";


        const translatedInstructions =
            await buildMealDbInstructions(
                meal
            );


        // ======================================
        // DESCRIPTION
        // ======================================

        let description =
            null;


        if (meal.strArea) {

            const translatedArea =
                await translateText(
                    meal.strArea
                );


            description =
                `Cuisine ${translatedArea}`;

        }


        // ======================================
        // CATÉGORIE
        // ======================================

        // ======================================
        // CATÉGORIE RECETTE PLUS
        // ======================================

        const category =
            getRecipePlusCategory(
                meal
            );


        // ======================================
        // PHOTO
        // ======================================
        // On conserve directement la vraie
        // photo de la recette TheMealDB.
        // Pas d'OpenAI.
        // Pas de recherche Openverse.
        // ======================================

        const recipeImage =
            meal.strMealThumb ||
            recipe.image ||
            null;


        // ======================================
        // SOURCE
        // ======================================

        const sourceUrl =
            meal.strSource ||
            meal.strYoutube ||
            recipe.url ||
            null;


        // ======================================
        // ENREGISTREMENT SUPABASE
        // ======================================

        button.textContent =
            "Enregistrement...";


        const {
            data: savedRecipe,
            error: saveError
        } =
            await supabaseClient
                .from("recipes")
                .insert({

                    title:
                        translatedTitle,

                    category:
                        category,

                    time:
                        null,

                    servings:
                        null,

                    description:
                        description,

                    ingredients:
                        translatedIngredients,

                    instructions:
                        translatedInstructions,

                    source:
                        "TheMealDB",

                    source_url:
                        sourceUrl,

                    image:
                        recipeImage,

                    image_source:
                        "TheMealDB",

                    image_author:
                        null,

                    image_license:
                        null,

                    image_license_url:
                        null,

                    image_source_url:
                        meal.strMealThumb ||
                        null,

                    user_id:
                        user.id,

                    is_public:
                        false

                })
                .select()
                .single();


        if (saveError) {

            throw saveError;
        }


        console.log(
            "Recette TheMealDB enregistrée :",
            savedRecipe
        );


        button.textContent =
            "✓ Enregistrée";


        button.classList.add(
            "is-saved"
        );


    } catch (error) {

        console.error(
            "Erreur enregistrement TheMealDB :",
            error
        );


        alert(
            "Impossible d'enregistrer cette recette."
        );


        button.disabled =
            false;


        button.textContent =
            originalText;

    }

}


// ==========================================
// NOUVELLE RECHERCHE DEPUIS CETTE PAGE
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
        // RECONNAÎTRE UNE URL EXTERNE
        // ==========================================

        const isRecipeUrl =
            /^https?:\/\//i.test(search);


        // ==========================================
        // CONSTRUIRE L'ADRESSE DE DESTINATION
        // ==========================================

        const parameter =
            isRecipeUrl ? "url" : "q";

        const newUrl =
            window.location.pathname +
            "?" +
            parameter +
            "=" +
            encodeURIComponent(search);


        // ==========================================
        // AFFICHER LA NOUVELLE RECHERCHE
        // ==========================================

        window.location.href = newUrl;

    }
);

// ==========================================
// IMPORTER UNE RECETTE DEPUIS UNE URL
// ==========================================

async function importRecipeFromUrl(recipeUrl) {

    resultsTitle.textContent =
        "Importation d'une recette";

    const loadingMessage = document.createElement("p");

    loadingMessage.className = "no-results";

    loadingMessage.textContent =
        "Récupération de la recette en cours...";

    results.replaceChildren(loadingMessage);


    try {

        const { data, error } =
            await supabaseClient.functions.invoke(
                "import-recipe-url",
                {
                    body: {
                        url: recipeUrl
                    }
                }
            );


        if (error || !data || data.error) {

            throw new Error(
                data?.error ||
                error?.message ||
                "Impossible d'importer cette recette."
            );

        }


        // ==========================================
        // TRANSMETTRE LA RECETTE AU FORMULAIRE
        // ==========================================

        const importedRecipe = {

            title: data.title,

            ingredients: data.ingredients,

            instructions: data.steps,

            servings: data.servings,

            preparation_time: data.preparation_time,

            cooking_time: data.cooking_time,

            total_time: data.total_time,

            source_url: data.source_url

        };


        // ==========================================
        // CONSERVER TEMPORAIREMENT LES DONNÉES
        // ==========================================

        sessionStorage.setItem(
            "recettePlusImportedRecipe",
            JSON.stringify(importedRecipe)
        );


        // ==========================================
        // OUVRIR DIRECTEMENT LE FORMULAIRE
        // ==========================================

        window.location.href = "./creer-recette.html";

        return;

    } catch (error) {

        const message = document.createElement("p");

        message.className = "no-results";

        message.textContent =
            error.message ||
            "Une erreur est survenue pendant l'importation.";

        results.replaceChildren(message);

        console.error("Importation recette :", error);

    }

}


// ==========================================
// RECHERCHE AUTOMATIQUE À L'OUVERTURE
// ==========================================

if (initialRecipeUrl) {

    // Importation depuis une URL externe

    searchInput.value = initialRecipeUrl;

    importRecipeFromUrl(initialRecipeUrl);


} else if (initialSearch) {

    // Recherche classique inchangée

    searchInput.value = initialSearch;

    searchRecipes(initialSearch);


} else {

    results.innerHTML = `
        <p class="no-results">
            Saisissez une recette dans la barre de recherche.
        </p>
    `;

}

