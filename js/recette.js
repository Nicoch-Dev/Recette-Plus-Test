const recipeDetails =
    document.getElementById("recipeDetails");

const params =
    new URLSearchParams(window.location.search);

const mealId =
    params.get("id");

if (!mealId) {

    recipeDetails.innerHTML = `
        <p class="error">
            Recette introuvable.
        </p>
    `;

} else {

    loadRecipe(mealId);

}

async function loadRecipe(id) {

    try {

        const response = await fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
        );

        if (!response.ok) {
            throw new Error("Erreur API");
        }

        const data = await response.json();

        if (!data.meals) {
            throw new Error("Recette inexistante");
        }

        const meal = data.meals[0];

        displayRecipe(meal);

    } catch (error) {

        console.error(error);

        recipeDetails.innerHTML = `
            <p class="error">
                Impossible de charger cette recette.
            </p>
        `;
    }
}

async function translateText(text) {

    if (!text) return "";

    try {

        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`
        );

        const data = await response.json();

        return (
            data.responseData.translatedText || text
        );

    } catch (error) {

        console.error(
            "Erreur traduction :",
            error
        );

        return text;
    }
}

async function translateLongText(text) {

    if (!text) return "";

    const maxLength = 450;
    const parts = [];

    for (
        let i = 0;
        i < text.length;
        i += maxLength
    ) {

        parts.push(
            text.substring(
                i,
                i + maxLength
            )
        );

    }

    const translatedParts = [];

    for (const part of parts) {

        const translated =
            await translateText(part);

        translatedParts.push(translated);
    }

    return translatedParts.join(" ");
}

async function displayRecipe(meal) {

    recipeDetails.innerHTML = `
        <p class="loading">
            Traduction de la recette...
        </p>
    `;

    const title =
        await translateText(meal.strMeal);

    const instructions =
        await translateLongText(
            meal.strInstructions
        );

    let ingredients = "";

    for (let i = 1; i <= 20; i++) {

        const ingredient =
            meal[`strIngredient${i}`];

        const measure =
            meal[`strMeasure${i}`];

        if (
            ingredient &&
            ingredient.trim() !== ""
        ) {

            const translatedIngredient =
                await translateText(ingredient);

            ingredients += `
                <li>
                    <span>
                        ${measure || ""}
                    </span>

                    ${translatedIngredient}
                </li>
            `;
        }
    }

    recipeDetails.innerHTML = `

        <article class="recipe-full">

            <div class="recipe-image">

                <img
                    src="${meal.strMealThumb}"
                    alt="${title}"
                >

            </div>

            <div class="recipe-full-content">

                <span class="recipe-category">
                    ${meal.strCategory || "Recette"}
                </span>

                <h1>${title}</h1>

                <p class="recipe-origin">
                    Cuisine :
                    ${meal.strArea || "internationale"}
                </p>

                <h2>Ingrédients</h2>

                <ul class="ingredients-list">
                    ${ingredients}
                </ul>

                <h2>Préparation</h2>

                <p class="instructions">
                    ${instructions}
                </p>

            </div>

        </article>

    `;

    document.title =
        `${title} | Recette Plus`;

    const isFavorite = getFavorites().includes(meal.idMeal);

recipeDetails.innerHTML = `
    <article class="recipe-full">

        <div class="recipe-image">
            <img
                src="${meal.strMealThumb}"
                alt="${title}"
            >
        </div>

        <div class="recipe-full-content">

            <span class="recipe-category">
                ${meal.strCategory || "Recette"}
            </span>

            <h1>${title}</h1>

            <button
                class="favorite-button"
                id="favoriteButton"
                data-id="${meal.idMeal}"
            >
                ${isFavorite ? "♥ Retirer des favoris" : "♡ Ajouter aux favoris"}
            </button>

            <p class="recipe-origin">
                Cuisine :
                ${meal.strArea || "internationale"}
            </p>

            <h2>Ingrédients</h2>

            <ul class="ingredients-list">
                ${ingredients}
            </ul>

            <h2>Préparation</h2>

            <p class="instructions">
                ${instructions}
            </p>

        </div>

    </article>
`;

document.title = `${title} | Recette Plus`;

setupFavoriteButton();
}

function getFavorites() {
    const favorites =
        localStorage.getItem("recettePlusFavorites");

    return favorites
        ? JSON.parse(favorites)
        : [];
}

function saveFavorites(favorites) {
    localStorage.setItem(
        "recettePlusFavorites",
        JSON.stringify(favorites)
    );
}

function toggleFavorite(id) {

    let favorites = getFavorites();

    if (favorites.includes(id)) {

        favorites =
            favorites.filter(
                favoriteId => favoriteId !== id
            );

    } else {

        favorites.push(id);

    }

    saveFavorites(favorites);

    return favorites.includes(id);
}

function setupFavoriteButton() {

    const favoriteButton =
        document.getElementById("favoriteButton");

    if (!favoriteButton) return;

    favoriteButton.addEventListener(
        "click",
        function () {

            const id =
                favoriteButton.dataset.id;

            const isFavorite =
                toggleFavorite(id);

            favoriteButton.textContent =
                isFavorite
                    ? "♥ Retirer des favoris"
                    : "♡ Ajouter aux favoris";
        }
    );
}


