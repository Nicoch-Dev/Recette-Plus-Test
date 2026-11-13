
const aiRecipeForm = document.getElementById("aiRecipeForm");
const aiResult = document.getElementById("aiResult");
const generateButton = aiRecipeForm.querySelector('button[type="submit"]');

let isGeneratingRecipe = false;

// ==========================================
// IDENTIFIANT UNIQUE DES DEMANDES IA
// ==========================================

const AI_REQUEST_STORAGE_KEY = "recetteplus_pending_ai_request";

function getAIRequestSignature(payload) {
    return JSON.stringify(payload);
}

function getOrCreateAIRequestId(payload) {
    const signature = getAIRequestSignature(payload);

    try {
        const saved = JSON.parse(
            sessionStorage.getItem(AI_REQUEST_STORAGE_KEY) || "null"
        );

        if (
            saved &&
            saved.signature === signature &&
            typeof saved.requestId === "string"
        ) {
            return saved.requestId;
        }
    } catch (error) {
        console.warn("Ancienne demande IA illisible :", error);
    }

    const requestId = crypto.randomUUID();

    sessionStorage.setItem(
        AI_REQUEST_STORAGE_KEY,
        JSON.stringify({
            requestId,
            signature
        })
    );

    return requestId;
}

function clearAIRequestId() {
    sessionStorage.removeItem(AI_REQUEST_STORAGE_KEY);
}

// ==========================================
// VÉRIFICATION DE LA CAPACITÉ DU CARNET
// ==========================================

async function checkAICarnetCapacity(userId) {
    const [profile, billing, recipes] = await Promise.all([
        supabaseClient
            .from("profiles")
            .select("is_test_account")
            .eq("id", userId)
            .single(),

        supabaseClient
            .from("user_billing")
            .select("plan, has_purchased_pack")
            .eq("user_id", userId)
            .single(),

        supabaseClient
            .from("recipes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
    ]);

    if (
        profile.error ||
        billing.error ||
        recipes.error ||
        recipes.count === null
    ) {
        console.warn("Vérification du carnet indisponible");
        return null;
    }

    if (
        profile.data.is_test_account === true ||
        billing.data.plan === "premium"
    ) {
        return null;
    }

    const limit = billing.data.has_purchased_pack ? 30 : 10;

    return recipes.count >= limit ? limit : null;
}

function aiCarnetFullMessage(limit) {
    if (limit === 30) {
        return "Votre carnet est plein : 30 recettes sur 30. " +
            "Passez à Premium pour un carnet illimité ou " +
            "supprimez une recette pour libérer une place.";
    }

    if (limit === 10) {
        return "Votre carnet est plein : 10 recettes sur 10. " +
            "Achetez un pack de crédits pour passer à 30 recettes, " +
            "choisissez Premium ou supprimez une recette.";
    }

    return "Votre carnet est plein. Supprimez une recette " +
        "pour libérer une place ou consultez les offres.";
}

// ==========================================
// CONVERSION BASE64 EN BLOB
// ==========================================

function base64ToBlob(base64, mimeType = "image/jpeg") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
}

// ==========================================
// GÉNÉRATION ET STOCKAGE DE LA PHOTO IA
// ==========================================

async function generateAndUploadRecipeImage(recipe, user) {
    try {
        const { data, error } = await supabaseClient.functions.invoke(
            "generate-recipe-image",
            {
                body: {
                    title: recipe.title || "",
                    description: recipe.description || "",
                    category: recipe.category || "",
                    ingredients: Array.isArray(recipe.ingredients)
                        ? recipe.ingredients
                        : []
                }
            }
        );

        if (error) throw error;

        // Nouveau fonctionnement :
        // l'image est déjà enregistrée par Supabase.
        if (data?.imageUrl) {
            return data.imageUrl;
        }

        // Fonctionnement actuel :
        // l'image est reçue en Base64.
        if (!data?.image) {
            throw new Error("Aucune image générée.");
        }

        const mimeType = data.mimeType || "image/jpeg";
        const blob = base64ToBlob(data.image, mimeType);

        const extension = mimeType === "image/png" ? "png" : "jpg";
        const fileName = `${user.id}/ai-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabaseClient.storage
            .from("recipe-images")
            .upload(fileName, blob, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabaseClient.storage
            .from("recipe-images")
            .getPublicUrl(fileName);

        if (!publicURLData?.publicUrl) {
            throw new Error("Impossible de récupérer l'image.");
        }

        return publicURLData.publicUrl;

    } catch (error) {
        console.error("Erreur photo IA :", error);

        // Une erreur de photo ne bloque pas la recette.
        return getRecipeDefaultImage(
            recipe.title,
            recipe.category
        );
    }
}

// ==========================================
// LECTURE DES ERREURS EDGE FUNCTION
// ==========================================

async function readFunctionError(error) {
    try {
        if (error?.context) {
            const response = error.context;

            if (typeof response.clone === "function") {
                return await response.clone().json();
            }

            if (typeof response.json === "function") {
                return await response.json();
            }
        }
    } catch (readError) {
        console.error("Erreur lecture réponse :", readError);
    }

    return null;
}

// ==========================================
// PROTECTION DE L'AFFICHAGE HTML
// ==========================================

function escapeAIHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

// ==========================================
// FORMULAIRE DE GÉNÉRATION IA
// ==========================================

aiRecipeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (isGeneratingRecipe) return;

    const ingredients = document
        .getElementById("ingredients").value.trim();

    const servings = document
        .getElementById("servings").value;

    const mealType = document
        .getElementById("mealType").value;

    const maxTime = document
        .getElementById("maxTime").value;

    const preferences = document
        .getElementById("preferences").value.trim();

    if (!ingredients) {
        aiResult.innerHTML =
            '<div class="ai-error">Merci d’indiquer au moins un ingrédient.</div>';
        return;
    }

    isGeneratingRecipe = true;
    generateButton.disabled = true;
    generateButton.textContent = "Création en cours...";

    aiResult.innerHTML =
        '<div class="ai-loading">✨ L’IA prépare votre recette...</div>';

    try {
        const requestPayload = {
            ingredients,
            servings,
            mealType,
            maxTime,
            preferences
        };

        const requestId = getOrCreateAIRequestId(requestPayload);

        const { data, error } = await supabaseClient.functions.invoke(
            "generate-recipe",
            {
                body: {
                    ...requestPayload,
                    requestId
                }
            }
        );

        if (error) {
            const errorData = await readFunctionError(error);

            if (errorData?.quotaReached === true) {
                aiResult.innerHTML = `
                    <div class="ai-error">
                        <strong>Vous n'avez plus de crédits IA disponibles.</strong>
                        <p>
                            Vous pouvez acheter des crédits supplémentaires
                            pour continuer à générer des recettes.
                        </p>
                        <a href="./credits.html">
                            Découvrir les packs de crédits
                        </a>
                    </div>
                `;
                return;
            }

            throw new Error(
                errorData?.error || "Impossible de générer la recette."
            );
        }

        if (!data?.recipe) {
            throw new Error("Aucune recette reçue.");
        }

        displayAIRecipe(data.recipe);

        clearAIRequestId();

    } catch (error) {
        console.error("Erreur génération IA :", error);

        aiResult.replaceChildren();

        const message = document.createElement("div");
        message.className = "ai-error";
        message.textContent =
            "Une erreur est survenue : " + error.message;

        aiResult.appendChild(message);

    } finally {
        isGeneratingRecipe = false;
        generateButton.disabled = false;
        generateButton.textContent = "✨ Créer ma recette";
    }
});

// ==========================================
// AFFICHAGE DE LA RECETTE GÉNÉRÉE
// ==========================================

function displayAIRecipe(recipe) {
    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const instructions = Array.isArray(recipe.instructions)
        ? recipe.instructions
        : [];

    const ingredientsHTML = ingredients
        .map(item => `<li>${escapeAIHTML(item)}</li>`)
        .join("");

    const instructionsHTML = instructions
        .map(step => `
        <li>
            <p>${escapeAIHTML(step)}</p>
        </li>
    `)
        .join("");

    aiResult.innerHTML = `
        <article class="generated-recipe">

            <div class="generated-recipe-header">
                <span class="generated-badge">
                    ✨ Recette créée par l'IA
                </span>

                <h2>${escapeAIHTML(recipe.title || "Recette sans nom")}</h2>

                <p class="generated-description">
                    ${escapeAIHTML(recipe.description || "")}
                </p>
            </div>

            <div class="generated-info">
                <span>👥 ${escapeAIHTML(recipe.servings || "")} personnes</span>
                <span>⏱ ${escapeAIHTML(recipe.time || "")}</span>
                <span>🍴 ${escapeAIHTML(recipe.category || "")}</span>
            </div>

            <div class="generated-recipe-content">
                <div>
                    <h3>Ingrédients</h3>
                    <ul class="generated-ingredients">
                        ${ingredientsHTML}
                    </ul>
                </div>

                <div>
                    <h3>Préparation</h3>
                    <ol class="generated-instructions">
                        ${instructionsHTML}
                    </ol>
                </div>
            </div>

            <button
                type="button"
                class="save-ai-recipe"
                id="saveAIRecipe"
            >
                ♡ Sauvegarder cette recette
            </button>

        </article>
    `;

    setupSaveAIRecipe(recipe);
}

// ==========================================
// SAUVEGARDE DE LA RECETTE IA
// ==========================================

function setupSaveAIRecipe(recipe) {
    const saveButton = document.getElementById("saveAIRecipe");

    saveButton.addEventListener("click", async function () {
        if (saveButton.disabled) return;

        saveButton.disabled = true;
        saveButton.textContent = "Vérification du carnet...";

        try {
            const { data: authData, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError || !authData?.user) {
                alert("Vous devez être connecté pour sauvegarder cette recette.");
                return;
            }

            const user = authData.user;

            // Vérifier la capacité avant de générer la photo.
            const carnetLimit = await checkAICarnetCapacity(user.id);

            if (carnetLimit !== null) {
                alert(aiCarnetFullMessage(carnetLimit));
                return;
            }

            // ==========================================
            // IMAGE DE CATÉGORIE GRATUITE
            // ==========================================

            const imageURL = getRecipeDefaultImage(
                recipe.title,
                recipe.category
            );

            saveButton.textContent = "Enregistrement...";

            const newRecipe = {
                title: recipe.title || "",
                category: recipe.category || "",
                time: recipe.time || "",
                image: imageURL,
                ingredients: Array.isArray(recipe.ingredients)
                    ? recipe.ingredients
                    : [],
                instructions: Array.isArray(recipe.instructions)
                    ? recipe.instructions.join("\n")
                    : recipe.instructions || "",
                description: recipe.description || "",
                servings: String(recipe.servings || ""),
                source: "ai",
                user_id: user.id
            };

            const { data, error } = await supabaseClient
                .from("recipes")
                .insert(newRecipe)
                .select()
                .single();

            if (error) {
                console.error("Erreur sauvegarde IA :", error);

                if (
                    error.message &&
                    error.message.includes("RECIPE_LIMIT_REACHED")
                ) {
                    const limit = await checkAICarnetCapacity(user.id);
                    alert(aiCarnetFullMessage(limit));
                } else {
                    alert("Impossible de sauvegarder la recette.");
                }

                return;
            }

            saveButton.textContent = "✓ Recette sauvegardée";

            setTimeout(function () {
                window.location.href =
                    `./ma-recette.html?id=${data.id}`;
            }, 800);

        } catch (error) {
            console.error("Erreur sauvegarde :", error);
            alert("Une erreur est survenue pendant la sauvegarde.");

        } finally {
            if (saveButton.textContent !== "✓ Recette sauvegardée") {
                saveButton.disabled = false;
                saveButton.textContent = "♡ Sauvegarder cette recette";
            }
        }
    });
}
