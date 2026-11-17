
// ==========================================
// RECETTE PLUS — SCANNER DE RECETTES
// ==========================================


// ==========================================
// VÉRIFICATION CAPACITÉ DU CARNET
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

        console.warn(
            "Pré-vérification du carnet indisponible",
            profile.error,
            billing.error,
            recipes.error
        );

        return null;
    }

    if (
        profile.data.is_test_account === true ||
        billing.data.plan === "premium"
    ) {
        return null;
    }

    const limit =
        billing.data.has_purchased_pack ? 30 : 10;

    return recipes.count >= limit ? limit : null;
}


function aiCarnetFullMessage(limit) {

    if (limit === 30) {

        return (
            "Votre carnet est plein (30 recettes sur 30). " +
            "Passez à Premium pour un carnet illimité " +
            "ou supprimez une recette pour libérer une place."
        );
    }

    if (limit === 10) {

        return (
            "Votre carnet est plein (10 recettes sur 10). " +
            "Achetez un pack de crédits pour passer à 30 recettes, " +
            "choisissez Premium ou supprimez une recette."
        );
    }

    return (
        "Votre carnet de recettes est plein. " +
        "Supprimez une recette pour libérer une place " +
        "ou consultez les offres disponibles."
    );
}


// ==========================================
// ÉLÉMENTS HTML
// ==========================================

const recipePhoto =
    document.getElementById("recipePhoto");

const recipeGallery =
    document.getElementById("recipeGallery");

const takeRecipePhoto =
    document.getElementById("takeRecipePhoto");

const chooseRecipePhoto =
    document.getElementById("chooseRecipePhoto");

const scannerCamera =
    document.getElementById("scannerCamera");

const scannerPreview =
    document.getElementById("scannerPreview");

const recipePhotoPreview =
    document.getElementById("recipePhotoPreview");

const changeRecipePhoto =
    document.getElementById("changeRecipePhoto");

const analyseRecipePhoto =
    document.getElementById("analyseRecipePhoto");

const scannerMessage =
    document.getElementById("scannerMessage");


// ==========================================
// PHOTO SÉLECTIONNÉE
// ==========================================

let selectedRecipePhoto = null;

let currentPreviewURL = null;


// ==========================================
// PROTECTION CONTRE LES DOUBLES SCANS
// ==========================================

const SCAN_REQUEST_STORAGE_KEY =
    "recetteplus_pending_scan_request";


function getScanPhotoSignature(file) {

    return JSON.stringify({

        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified

    });
}


function getOrCreateScanRequestId(file) {

    const signature =
        getScanPhotoSignature(file);

    try {

        const saved = JSON.parse(
            sessionStorage.getItem(
                SCAN_REQUEST_STORAGE_KEY
            ) || "null"
        );

        if (
            saved &&
            saved.signature === signature &&
            typeof saved.requestId === "string"
        ) {

            return saved.requestId;
        }

    } catch (error) {

        console.warn(
            "Ancienne demande de scan illisible :",
            error
        );
    }

    const requestId =
        crypto.randomUUID();

    sessionStorage.setItem(
        SCAN_REQUEST_STORAGE_KEY,
        JSON.stringify({

            requestId,
            signature

        })
    );

    return requestId;
}


function clearScanRequestId() {

    sessionStorage.removeItem(
        SCAN_REQUEST_STORAGE_KEY
    );
}


// ==========================================
// OUVRIR APPAREIL PHOTO
// ==========================================

takeRecipePhoto.addEventListener(
    "click",
    function () {

        recipePhoto.click();

    }
);


// ==========================================
// OUVRIR GALERIE
// ==========================================

chooseRecipePhoto.addEventListener(
    "click",
    function () {

        recipeGallery.click();

    }
);


// ==========================================
// PHOTO PRISE
// ==========================================

recipePhoto.addEventListener(
    "change",
    function () {

        const file =
            recipePhoto.files[0];

        if (!file) {
            return;
        }

        displayRecipePhoto(file);

    }
);


// ==========================================
// PHOTO GALERIE
// ==========================================

recipeGallery.addEventListener(
    "change",
    function () {

        const file =
            recipeGallery.files[0];

        if (!file) {
            return;
        }

        displayRecipePhoto(file);

    }
);


// ==========================================
// AFFICHER LA PHOTO
// ==========================================

function displayRecipePhoto(file) {

    selectedRecipePhoto = file;

    if (currentPreviewURL) {

        URL.revokeObjectURL(
            currentPreviewURL
        );
    }

    currentPreviewURL =
        URL.createObjectURL(file);

    recipePhotoPreview.src =
        currentPreviewURL;

    scannerCamera.hidden = true;

    scannerPreview.hidden = false;

    scannerMessage.innerHTML = "";
}


// ==========================================
// REPRENDRE UNE PHOTO
// ==========================================

changeRecipePhoto.addEventListener(
    "click",
    function () {

        selectedRecipePhoto = null;

        recipePhoto.value = "";

        recipeGallery.value = "";

        if (currentPreviewURL) {

            URL.revokeObjectURL(
                currentPreviewURL
            );

            currentPreviewURL = null;
        }

        recipePhotoPreview.src = "";

        scannerPreview.hidden = true;

        scannerCamera.hidden = false;

        scannerMessage.innerHTML = "";

    }
);


// ==========================================
// CONVERTIR PHOTO EN BASE64
// ==========================================

function fileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();

            reader.onload = function () {

                const result =
                    reader.result;

                if (typeof result !== "string") {

                    reject(
                        new Error(
                            "Impossible de lire la photo."
                        )
                    );

                    return;
                }

                const base64 =
                    result.split(",")[1];

                if (!base64) {

                    reject(
                        new Error(
                            "La photo n'a pas pu être convertie."
                        )
                    );

                    return;
                }

                resolve(base64);
            };

            reader.onerror = function () {

                reject(
                    new Error(
                        "Impossible de lire la photo."
                    )
                );
            };

            reader.readAsDataURL(file);

        }
    );
}


// ==========================================
// SÉCURITÉ AFFICHAGE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ==========================================
// NORMALISER LA RÉPONSE DU SCANNER
// ==========================================

function normalizeScannedRecipe(recipe) {

    if (
        !recipe ||
        typeof recipe !== "object" ||
        Array.isArray(recipe)
    ) {

        throw new Error(
            "La réponse de l'IA ne contient pas de recette valide."
        );
    }

    const normalized = {

        title:
            String(recipe.title ?? "").trim(),

        description:
            String(recipe.description ?? "").trim(),

        category:
            String(recipe.category ?? "Plat").trim(),

        time:
            String(recipe.time ?? "").trim(),

        servings:
            String(recipe.servings ?? "").trim(),

        ingredients:
            Array.isArray(recipe.ingredients)
                ? recipe.ingredients
                    .map(item => String(item).trim())
                    .filter(Boolean)
                : [],

        instructions:
            Array.isArray(recipe.instructions)
                ? recipe.instructions
                    .map(item => String(item).trim())
                    .filter(Boolean)
                : []

    };

    if (
        !normalized.title &&
        normalized.ingredients.length === 0 &&
        normalized.instructions.length === 0
    ) {

        console.error(
            "Recette reçue sans contenu exploitable :",
            recipe
        );

        throw new Error(
            "L'IA n'a renvoyé aucune information de recette. " +
            "Le formulaire ne peut pas être rempli."
        );
    }

    return normalized;
}


// ==========================================
// ANALYSER LA PHOTO
// ==========================================

analyseRecipePhoto.addEventListener(
    "click",
    async function () {

        if (!selectedRecipePhoto) {

            scannerMessage.innerHTML = `
                <div class="scanner-error">
                    Sélectionnez d'abord une photo.
                </div>
            `;

            return;
        }

        try {

            analyseRecipePhoto.disabled = true;

            analyseRecipePhoto.textContent =
                "✨ Lecture de la recette...";

            scannerMessage.innerHTML = `
                <div class="scanner-ready">
                    L'IA analyse votre recette...
                </div>
            `;

            // ==================================
            // CONVERSION PHOTO
            // ==================================

            const imageBase64 =
                await fileToBase64(
                    selectedRecipePhoto
                );

            // ==================================
            // APPEL EDGE FUNCTION
            // ==================================

            const {
                data,
                error
            } =
                await supabaseClient
                    .functions
                    .invoke(
                        "scan-recipe",
                        {
                            body: {

                                image:
                                    imageBase64,

                                mimeType:
                                    selectedRecipePhoto.type ||
                                    "image/jpeg",

                                requestId:
                                    getOrCreateScanRequestId(
                                        selectedRecipePhoto
                                    )

                            }
                        }
                    );

            // ==================================
            // ERREUR SUPABASE
            // ==================================

            if (error) {

                console.error(
                    "Erreur scan-recipe :",
                    error
                );

                if (error.context?.status === 409) {

                    try {

                        const details =
                            await error.context
                                .clone()
                                .json();

                        if (
                            details.requestStatus === "failed" ||
                            details.requestStatus === "request_expired"
                        ) {

                            clearScanRequestId();
                        }

                    } catch (readError) {

                        console.warn(
                            "Détails de l'erreur indisponibles :",
                            readError
                        );
                    }
                }

                throw new Error(
                    "Impossible d'analyser cette photo."
                );
            }

            // ==================================
            // VÉRIFIER LA RÉPONSE
            // ==================================

            if (!data || !data.recipe) {

                console.error(
                    "Réponse scan-recipe :",
                    data
                );

                throw new Error(
                    "Aucune recette n'a été reconnue."
                );
            }

            // ==================================
            // PRÉPARER ET AFFICHER LA RECETTE
            // ==================================

            const scannedRecipe =
                normalizeScannedRecipe(
                    data.recipe
                );

            displayScannedRecipe(
                scannedRecipe
            );

            clearScanRequestId();

        } catch (error) {

            console.error(
                "Erreur analyse recette :",
                error
            );

            scannerMessage.innerHTML = `
                <div class="scanner-error">

                    <strong>
                        Impossible de lire la recette.
                    </strong>

                    <p>
                        ${escapeHTML(error.message)}
                    </p>

                </div>
            `;

        } finally {

            analyseRecipePhoto.disabled = false;

            analyseRecipePhoto.textContent =
                "✨ Lire cette recette avec l'IA";

        }

    }
);


// ==========================================
// IMAGE PAR DÉFAUT SELON CATÉGORIE
// ==========================================

function getDefaultScannedRecipeImage(category) {

    const normalizedCategory =
        String(category || "")
            .toLowerCase()
            .trim();

    switch (normalizedCategory) {

        case "entrée":
            return "../image/default-entree.png";

        case "plat":
            return "../image/default-plat.png";

        case "dessert":
            return "../image/default-dessert.png";

        case "apéritif":
            return "../image/default-apperitif.png";

        case "boisson":
            return "../image/default-boisson.png";

        default:
            return "../image/default-plat.png";
    }
}


// ==========================================
// BASE64 VERS BLOB
// ==========================================

function base64ToBlob(base64, mimeType) {

    const byteCharacters =
        atob(base64);

    const byteNumbers =
        new Array(byteCharacters.length);

    for (
        let i = 0;
        i < byteCharacters.length;
        i++
    ) {

        byteNumbers[i] =
            byteCharacters.charCodeAt(i);
    }

    const byteArray =
        new Uint8Array(byteNumbers);

    return new Blob(
        [byteArray],
        {
            type: mimeType || "image/jpeg"
        }
    );
}


// ==========================================
// GÉNÉRER LA PHOTO IA DE LA RECETTE
// ==========================================

async function generateScannedRecipeImage(
    recipe,
    user
) {

    try {

        // ==================================
        // APPEL EDGE FUNCTION IMAGE
        // ==================================

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "generate-recipe-image",
                    {
                        body: {

                            title:
                                recipe.title,

                            description:
                                recipe.description,

                            category:
                                recipe.category,

                            ingredients:
                                recipe.ingredients

                        }
                    }
                );

        if (error) {

            console.error(
                "Erreur generate-recipe-image :",
                error
            );

            throw error;
        }

        if (!data || !data.image) {

            console.error(
                "Aucune image IA reçue :",
                data
            );

            throw new Error(
                "Aucune image IA reçue."
            );
        }

        // ==================================
        // BASE64 VERS IMAGE
        // ==================================

        const imageBlob =
            base64ToBlob(
                data.image,
                data.mimeType || "image/jpeg"
            );

        const filePath =
            `${user.id}/scan-${Date.now()}.jpg`;

        // ==================================
        // UPLOAD STORAGE
        // ==================================

        const {
            error: uploadError
        } =
            await supabaseClient
                .storage
                .from("recipe-images")
                .upload(
                    filePath,
                    imageBlob,
                    {
                        contentType: "image/jpeg",
                        upsert: false
                    }
                );

        if (uploadError) {

            console.error(
                "Erreur upload photo :",
                uploadError
            );

            throw uploadError;
        }

        // ==================================
        // URL PUBLIQUE
        // ==================================

        const {
            data: publicURLData
        } =
            supabaseClient
                .storage
                .from("recipe-images")
                .getPublicUrl(
                    filePath
                );

        if (
            !publicURLData ||
            !publicURLData.publicUrl
        ) {

            throw new Error(
                "Impossible de récupérer l'URL de la photo."
            );
        }

        return publicURLData.publicUrl;

    } catch (error) {

        console.error(
            "Photo IA impossible :",
            error
        );

        return getDefaultScannedRecipeImage(
            recipe.category
        );
    }
}


// ==========================================
// AFFICHER LA RECETTE RECONNUE
// ==========================================

function displayScannedRecipe(recipe) {

    const ingredients =
        Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [];

    const instructions =
        Array.isArray(recipe.instructions)
            ? recipe.instructions
            : [];

    const ingredientsText =
        ingredients.join("\n");

    const instructionsText =
        instructions.join("\n");

    // ==================================
    // FORMULAIRE DE CORRECTION
    // ==================================

    scannerMessage.innerHTML = `

        <section class="scanner-edit">

            <div class="scanner-edit-header">

                <span class="generated-badge">
                    📷 Recette numérisée
                </span>

                <h2>
                    Vérifiez votre recette
                </h2>

                <p>
                    L'IA a lu votre recette.
                    Vous pouvez tout corriger avant de l'enregistrer.
                </p>

            </div>


            <!-- TITRE -->

            <div class="scanner-field">

                <label for="scannedTitle">
                    Nom de la recette
                </label>

                <input
                    type="text"
                    id="scannedTitle"
                    value="${escapeHTML(recipe.title || "")}"
                >

            </div>


            <!-- DESCRIPTION -->

            <div class="scanner-field">

                <label for="scannedDescription">
                    Description
                </label>

                <textarea
                    id="scannedDescription"
                    rows="3"
                >${escapeHTML(recipe.description || "")}</textarea>

            </div>


            <!-- INFORMATIONS -->

            <div class="scanner-info-grid">

                <div class="scanner-field">

                    <label for="scannedCategory">
                        Catégorie
                    </label>

                    <select id="scannedCategory">

                        <option
                            value="Entrée"
                            ${recipe.category === "Entrée" ? "selected" : ""}
                        >
                            Entrée
                        </option>

                        <option
                            value="Plat"
                            ${recipe.category === "Plat" ? "selected" : ""}
                        >
                            Plat
                        </option>

                        <option
                            value="Dessert"
                            ${recipe.category === "Dessert" ? "selected" : ""}
                        >
                            Dessert
                        </option>

                        <option
                            value="Apéritif"
                            ${recipe.category === "Apéritif" ? "selected" : ""}
                        >
                            Apéritif
                        </option>

                        <option
                            value="Boisson"
                            ${recipe.category === "Boisson" ? "selected" : ""}
                        >
                            Boisson
                        </option>

                    </select>

                </div>


                <div class="scanner-field">

                    <label for="scannedTime">
                        Temps
                    </label>

                    <input
                        type="text"
                        id="scannedTime"
                        value="${escapeHTML(recipe.time || "")}"
                        placeholder="Ex. 45 min"
                    >

                </div>


                <div class="scanner-field">

                    <label for="scannedServings">
                        Nombre de personnes
                    </label>

                    <input
                        type="text"
                        id="scannedServings"
                        value="${escapeHTML(recipe.servings || "")}"
                        placeholder="Ex. 6"
                    >

                </div>

            </div>


            <!-- INGRÉDIENTS -->

            <div class="scanner-field">

                <label for="scannedIngredients">
                    Ingrédients
                </label>

                <p class="scanner-field-help">
                    Un ingrédient par ligne.
                </p>

                <textarea
                    id="scannedIngredients"
                    rows="10"
                >${escapeHTML(ingredientsText)}</textarea>

            </div>


            <!-- PRÉPARATION -->

            <div class="scanner-field">

                <label for="scannedInstructions">
                    Préparation
                </label>

                <p class="scanner-field-help">
                    Une étape par ligne.
                </p>

                <textarea
                    id="scannedInstructions"
                    rows="14"
                >${escapeHTML(instructionsText)}</textarea>

            </div>


            <!-- BOUTONS -->

            <div class="scanner-edit-actions">

                <button
                    type="button"
                    class="scanner-change-button"
                    id="cancelScannedRecipe"
                >
                    ← Reprendre la photo
                </button>

                <button
                    type="button"
                    class="scanner-save-button"
                    id="saveScannedRecipe"
                >
                    💾 Enregistrer dans mon carnet
                </button>

            </div>

        </section>
    `;


    // ==========================================
    // BOUTON : REPRENDRE LA PHOTO
    // ==========================================

    const cancelButton =
        document.getElementById(
            "cancelScannedRecipe"
        );

    cancelButton.addEventListener(
        "click",
        function () {

            selectedRecipePhoto = null;

            recipePhoto.value = "";

            recipeGallery.value = "";

            if (currentPreviewURL) {

                URL.revokeObjectURL(
                    currentPreviewURL
                );

                currentPreviewURL = null;
            }

            recipePhotoPreview.src = "";

            scannerPreview.hidden = true;

            scannerCamera.hidden = false;

            scannerMessage.innerHTML = "";

        }
    );


    // ==========================================
    // BOUTON : ENREGISTRER LA RECETTE
    // ==========================================

    const saveButton =
        document.getElementById(
            "saveScannedRecipe"
        );



    saveButton.addEventListener(
        "click",
        async function () {

            if (saveButton.disabled) {
                return;
            }

            // ==================================
            // RÉCUPÉRER LES CHAMPS
            // ==================================

            const title =
                document
                    .getElementById("scannedTitle")
                    .value
                    .trim();

            const description =
                document
                    .getElementById("scannedDescription")
                    .value
                    .trim();

            const category =
                document
                    .getElementById("scannedCategory")
                    .value;

            const time =
                document
                    .getElementById("scannedTime")
                    .value
                    .trim();

            const servings =
                document
                    .getElementById("scannedServings")
                    .value
                    .trim();

            const ingredients =
                document
                    .getElementById("scannedIngredients")
                    .value
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean);

            const instructions =
                document
                    .getElementById("scannedInstructions")
                    .value
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean);


            // ==================================
            // VALIDATION
            // ==================================

            if (
                !title ||
                ingredients.length === 0 ||
                instructions.length === 0
            ) {

                alert(
                    "Merci de renseigner le titre, les ingrédients " +
                    "et la préparation."
                );

                return;
            }

            saveButton.disabled = true;

            saveButton.textContent =
                "Vérification du carnet...";


            try {

                // ==================================
                // UTILISATEUR CONNECTÉ
                // ==================================

                const {
                    data: authData,
                    error: authError
                } =
                    await supabaseClient
                        .auth
                        .getUser();

                if (
                    authError ||
                    !authData?.user
                ) {

                    alert(
                        "Vous devez être connecté pour enregistrer cette recette."
                    );

                    return;
                }

                const user =
                    authData.user;


                // ==================================
                // VÉRIFIER CAPACITÉ DU CARNET
                // ==================================

                const carnetLimit =
                    await checkAICarnetCapacity(
                        user.id
                    );

                if (carnetLimit !== null) {

                    alert(
                        aiCarnetFullMessage(
                            carnetLimit
                        )
                    );

                    return;
                }


                // ==================================
                // PRÉPARER LA RECETTE
                // ==================================

                const scannedRecipe = {

                    title,
                    description,
                    category,
                    time,
                    servings,
                    ingredients,
                    instructions

                };



                // ==================================
                // IMAGE PAR DÉFAUT
                // ==================================

                // Aucune génération de photo IA
                // lors de l'enregistrement.

                const imageURL =
                    getDefaultScannedRecipeImage(
                        category
                    );



                // ==================================
                // ENREGISTRER DANS SUPABASE
                // ==================================

                saveButton.textContent =
                    "Enregistrement...";

                const newRecipe = {

                    title,
                    description,
                    category,
                    time,
                    servings,

                    ingredients,

                    instructions:
                        instructions.join("\n"),

                    image:
                        imageURL,

                    source:
                        "scan",

                    user_id:
                        user.id

                };


                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .from("recipes")
                        .insert(newRecipe)
                        .select()
                        .single();


                // ==================================
                // GESTION DES ERREURS
                // ==================================

                if (error) {

                    console.error(
                        "Erreur enregistrement scanner :",
                        error
                    );

                    if (
                        error.message &&
                        error.message.includes(
                            "RECIPE_LIMIT_REACHED"
                        )
                    ) {

                        const limit =
                            await checkAICarnetCapacity(
                                user.id
                            );

                        alert(
                            aiCarnetFullMessage(limit)
                        );

                    } else {

                        alert(
                            "Impossible d'enregistrer la recette : " +
                            error.message
                        );
                    }

                    return;
                }


                // ==================================
                // ENREGISTREMENT RÉUSSI
                // ==================================

                saveButton.textContent =
                    "✓ Recette enregistrée";

                scannerMessage.innerHTML = `
                    <div class="scanner-ready">
                        Votre recette a bien été enregistrée !
                    </div>
                `;


                // ==================================
                // REDIRECTION VERS LA RECETTE
                // ==================================

                setTimeout(
                    function () {

                        window.location.href =
                            `./ma-recette.html?id=${data.id}`;

                    },
                    800
                );

            } catch (error) {

                console.error(
                    "Erreur sauvegarde scanner :",
                    error
                );

                alert(
                    "Une erreur est survenue pendant l'enregistrement."
                );

            } finally {

                if (
                    saveButton.textContent !==
                    "✓ Recette enregistrée"
                ) {

                    saveButton.disabled = false;

                    saveButton.textContent =
                        "💾 Enregistrer dans mon carnet";
                }
            }

        }
    );

}

// FIN DE scanner-recette.js
