// ==========================================
// RECETTE PLUS
// SÉLECTION DES IMAGES PAR DÉFAUT
// ==========================================

function getRecipeDefaultImage(
    title,
    category,
    basePath = "../image/"
) {

    // ======================================
    // NORMALISATION DU TEXTE
    // ======================================

    const normalizeText = (text) =>
        String(text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[’']/g, " ")
            .replace(/[^a-z0-9\s-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();


    const normalizedTitle =
        normalizeText(title);

    const normalizedCategory =
        normalizeText(category);


    // ======================================
    // RECHERCHE DE MOTS / EXPRESSIONS
    // ======================================

    function containsAny(words) {

        return words.some(
            (word) =>
                normalizedTitle.includes(
                    normalizeText(word)
                )
        );
    }


    // ======================================
    // 1. SALADES
    // ======================================

    if (
        containsAny([
            "salade",
            "salade composee"
        ])
    ) {
        return `${basePath}default-salade.png`;
    }


    // ======================================
    // 2. SOUPES / POTAGES / VELOUTÉS
    // ======================================

    if (
        containsAny([
            "soupe",
            "potage",
            "veloute",
            "bouillon"
        ])
    ) {
        return `${basePath}default-soupe.png`;
    }


    // ======================================
    // 3. PÂTES
    // ======================================

    if (
        containsAny([
            "pates",
            "spaghetti",
            "tagliatelle",
            "tagliatelles",
            "macaroni",
            "penne",
            "linguine",
            "fusilli",
            "lasagne",
            "lasagnes"
        ])
    ) {
        return `${basePath}default-pates.png`;
    }


    // ======================================
    // 4. PIZZA / CALZONE
    // ======================================

    if (
        containsAny([
            "pizza",
            "calzone"
        ])
    ) {
        return `${basePath}default-pizza.png`;
    }


    // ======================================
    // 5. BURGER
    // ======================================

    if (
        containsAny([
            "burger",
            "hamburger"
        ])
    ) {
        return `${basePath}default-burger.png`;
    }


    // ======================================
    // 6. POULET / VOLAILLE
    // ======================================

    if (
        containsAny([
            "poulet",
            "volaille",
            "dinde"
        ])
    ) {
        return `${basePath}default-poulet.png`;
    }


    // ======================================
    // 7. VIANDE
    // ======================================

    if (
        containsAny([
            "boeuf",
            "bœuf",
            "porc",
            "veau",
            "agneau",
            "steak"
        ])
    ) {
        return `${basePath}default-viande.png`;
    }


    // ======================================
    // 8. POISSON
    // ======================================

    if (
        containsAny([
            "poisson",
            "saumon",
            "cabillaud",
            "dorade"
        ])
    ) {
        return `${basePath}default-poisson.png`;
    }


    // ======================================
    // 9. FRUITS DE MER
    // ======================================

    if (
        containsAny([
            "fruit de mer",
            "fruits de mer",
            "crevette",
            "crevettes",
            "moule",
            "moules",
            "calamar",
            "calamars",
            "encornet",
            "encornets"
        ])
    ) {
        return `${basePath}default-fruits-mer.png`;
    }


    // ======================================
    // 10. QUICHES / TARTES SALÉES
    // ======================================

    if (
        containsAny([
            "quiche",
            "tarte salee"
        ])
    ) {
        return `${basePath}default-quiche.png`;
    }


    // ======================================
    // 11. GRATINS / HACHIS
    // ======================================

    if (
        containsAny([
            "gratin",
            "hachis",
            "parmentier"
        ])
    ) {
        return `${basePath}default-gratin.png`;
    }


    // ======================================
    // 12. GÂTEAUX
    // ======================================

    if (
        containsAny([
            "gateau",
            "cake",
            "brownie",
            "brownies",
            "moelleux"
        ])
    ) {
        return `${basePath}default-gateau.png`;
    }


    // ======================================
    // 13. TARTES SUCRÉES
    // ======================================

    if (
        containsAny([
            "tarte",
            "tartelette",
            "tartelettes"
        ])
    ) {
        return `${basePath}default-tarte.png`;
    }


    // ======================================
    // 14. GLACES / SORBETS
    // ======================================

    if (
        containsAny([
            "glace",
            "sorbet"
        ])
    ) {
        return `${basePath}default-glace.png`;
    }


    // ======================================
    // 15. COCKTAILS / SMOOTHIES
    // ======================================

    if (
        containsAny([
            "cocktail",
            "smoothie"
        ])
    ) {
        return `${basePath}default-cocktail.png`;
    }


    // ======================================
    // SECOURS : CATÉGORIE GÉNÉRALE
    // ======================================

    if (
        normalizedCategory.includes("entree")
    ) {
        return `${basePath}default-entree.png`;
    }


    if (
        normalizedCategory.includes("aperitif") ||
        normalizedCategory.includes("apero")
    ) {
        return `${basePath}default-apperitif.png`;
    }


    if (
        normalizedCategory.includes("dessert")
    ) {
        return `${basePath}default-dessert.png`;
    }


    if (
        normalizedCategory.includes("boisson") ||
        normalizedCategory.includes("cocktail") ||
        normalizedCategory.includes("cafe") ||
        normalizedCategory.includes("the")
    ) {
        return `${basePath}default-boisson.png`;
    }


    // ======================================
    // DERNIER SECOURS : PLAT
    // ======================================

    return `${basePath}default-plat.png`;
}

// ==========================================
// URL PUBLIQUE SUPABASE
// POUR UNE IMAGE GÉNÉRIQUE
// ==========================================

function getRecipeDefaultPublicUrl(
    title,
    category
) {

    // On utilise le sélecteur existant
    // uniquement pour déterminer le nom
    // de l'image.

    const localImage =
        getRecipeDefaultImage(
            title,
            category,
            ""
        );


    // Exemple :
    // default-salade.png
    // default-poisson.png

    const fileName =
        localImage
            .split("/")
            .pop();


    // URL publique du fichier dans Storage

    const {
        data
    } =
        supabaseClient
            .storage
            .from("recipe-images")
            .getPublicUrl(
                `defaults/${fileName}`
            );


    if (
        !data ||
        !data.publicUrl
    ) {

        console.error(
            "Impossible de récupérer l'URL de l'image générique :",
            fileName
        );

        return null;
    }


    return data.publicUrl;
}