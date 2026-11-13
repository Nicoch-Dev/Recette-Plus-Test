// ==========================================
// LISTE DE COURSES - RECETTE PLUS
// V3
// ==========================================

const shoppingList =
    document.getElementById("shoppingList");

const shoppingSummary =
    document.getElementById("shoppingSummary");

const deleteCheckedButton =
    document.getElementById("deleteCheckedItems");

const toggleAllButton =
    document.getElementById("toggleAllShoppingItems");

let currentUser = null;


// ==========================================
// CHARGEMENT
// ==========================================

async function loadShoppingList() {

    try {

        const {
            data: { user },
            error: userError
        } =
            await supabaseClient
                .auth
                .getUser();


        if (userError || !user) {
            return;
        }


        currentUser = user;


        const {
            data,
            error
        } =
            await supabaseClient
                .from("shopping_list")
                .select("*")
                .eq("user_id", user.id)
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        displayShoppingList(
            data || []
        );


    } catch (error) {

        console.error(
            "Erreur liste de courses :",
            error
        );


        shoppingList.innerHTML = `

            <div class="shopping-empty">

                <span>⚠️</span>

                <h2>
                    Impossible de charger la liste
                </h2>

                <p>
                    Réessayez dans quelques instants.
                </p>

            </div>

        `;

    }

}


// ==========================================
// NORMALISER LE NOM
// ==========================================

function normalizeIngredientName(value) {

    let name =
        String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /œ/g,
                "oe"
            )
            .replace(
                /[’']/g,
                " "
            )
            .replace(
                /[-_,.;:()]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    // ======================================
    // SINGULIER SIMPLE
    // ======================================

    const words =
        name.split(" ");


    name =
        words
            .map(
                function (word) {

                    if (
                        word.length > 3 &&
                        word.endsWith("s")
                    ) {

                        return word.slice(
                            0,
                            -1
                        );

                    }


                    return word;

                }
            )
            .join(" ");


    return name.trim();

}


// ==========================================
// NETTOYER LE NOM DE L'INGRÉDIENT
// ==========================================

function cleanShoppingIngredientName(value) {

    let name =
        String(value || "")
            .trim();


    // ======================================
    // COMMENTAIRES ENTRE PARENTHÈSES
    //
    // oignon (ou échalote)
    // → oignon
    // ======================================

    name =
        name.replace(
            /\s*\([^)]*\)\s*/g,
            " "
        );


    // ======================================
    // CE QUI SUIT UNE VIRGULE
    //
    // carottes, coupées en rondelles
    // → carottes
    // ======================================

    name =
        name.split(",")[0];


    // ======================================
    // TAILLES
    // ======================================

    name =
        name.replace(
            /\b(petit|petite|petits|petites|moyen|moyenne|moyens|moyennes|gros|grosse|grosses|grand|grande|grands|grandes)\b/gi,
            " "
        );


    // ======================================
    // PRÉPARATIONS
    // ======================================

    name =
        name.replace(
            /\b(émincé|émincée|émincés|émincées|haché|hachée|hachés|hachées|coupé|coupée|coupés|coupées)\b/gi,
            " "
        );


    // ======================================
    // CAS PARTICULIER : ŒUFS ENTIERS
    //
    // 4 œufs entiers
    // → œufs
    //
    // MAIS :
    // lait entier reste lait entier.
    // ======================================

    // ======================================
// CAS PARTICULIER : ŒUFS ENTIERS
// ======================================

    const eggTest =
        name
            .toLowerCase()
            .replace(/œ/g, "oe");


    if (
        /\boeufs?\b/i.test(eggTest)
    ) {

        name =
            name.replace(
                /\b(entier|entière|entiers|entières)\b/gi,
                " "
            );

    }


    name =
        name
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    return name;

}


// ==========================================
// CONVERTIR UNE QUANTITÉ
// ==========================================

function parseShoppingNumber(value) {

    if (!value) {
        return null;
    }


    const text =
        String(value)
            .replace(",", ".")
            .trim();


    // 1 1/2

    const mixed =
        text.match(
            /^(\d+)\s+(\d+)\/(\d+)$/
        );


    if (mixed) {

        const denominator =
            Number(mixed[3]);


        if (denominator === 0) {
            return null;
        }


        return (
            Number(mixed[1]) +
            Number(mixed[2]) /
            denominator
        );

    }


    // 1/2

    const fraction =
        text.match(
            /^(\d+)\/(\d+)$/
        );


    if (fraction) {

        const denominator =
            Number(fraction[2]);


        if (denominator === 0) {
            return null;
        }


        return (
            Number(fraction[1]) /
            denominator
        );

    }


    const number =
        Number(text);


    return Number.isNaN(number)
        ? null
        : number;

}


// ==========================================
// FORMAT QUANTITÉ
// ==========================================

function formatShoppingNumber(value) {

    const rounded =
        Math.round(
            value * 100
        ) / 100;


    return String(rounded)
        .replace(".", ",");

}


// ==========================================
// ANALYSER UN INGRÉDIENT
// ==========================================

function parseShoppingIngredient(ingredient) {

    const original =
        String(ingredient || "")
            .trim();


    if (!original) {
        return null;
    }


    let text = original;


    // ======================================
    // NOTATIONS CUISINE
    //
    // 1kg500 → 1,5 kg
    // 2kg250 → 2,25 kg
    // ======================================

    text =
        text.replace(
            /(\d+)\s*kg\s*(\d{1,3})\b/gi,
            function (
                match,
                kilos,
                grams
            ) {

                const total =
                    Number(kilos) +
                    Number(grams) / 1000;


                return (
                    String(total)
                        .replace(".", ",") +
                    " kg"
                );

            }
        );


    // 1L500 → 1,5 L

    text =
        text.replace(
            /(\d+)\s*l\s*(\d{1,3})\b/gi,
            function (
                match,
                litres,
                millilitres
            ) {

                const total =
                    Number(litres) +
                    Number(millilitres) / 1000;


                return (
                    String(total)
                        .replace(".", ",") +
                    " L"
                );

            }
        );


    const quantityPattern =
        "(\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|\\d+\\s+\\d+\\/\\d+)";


    const unitPattern =
        "(" +

        "kg|" +
        "g|" +
        "mg|" +

        "l|" +
        "cl|" +
        "ml|" +

        "c\\.\\s*à\\s*soupe|" +
        "c\\.\\s*à\\s*café|" +

        "cuillère\\s+à\\s+soupe|" +
        "cuillères\\s+à\\s+soupe|" +

        "cuillere\\s+à\\s+soupe|" +
        "cuilleres\\s+à\\s+soupe|" +

        "cuillère\\s+à\\s+café|" +
        "cuillères\\s+à\\s+café|" +

        "cuillere\\s+à\\s+café|" +
        "cuilleres\\s+à\\s+café" +

        ")?";


    let quantityText = null;
    let unit = null;
    let name = null;


    // ======================================
    // QUANTITÉ AU DÉBUT
    // ======================================

    const startRegex =
        new RegExp(
            "^" +
            quantityPattern +
            "\\s*" +
            unitPattern +
            "\\s+(?:de\\s+|d['’])?\\s*(.+)$",
            "i"
        );


    const startMatch =
        text.match(startRegex);


    if (startMatch) {

        quantityText =
            startMatch[1];

        unit =
            startMatch[2] || null;

        name =
            startMatch[3];

    }


    // ======================================
    // QUANTITÉ À LA FIN
    //
    // tomates 200 g
    // pommes de terre 1kg500
    // ======================================

    if (!quantityText) {

        const endRegex =
            new RegExp(
                "^(.+?)\\s+" +
                quantityPattern +
                "\\s*" +
                unitPattern +
                "$",
                "i"
            );


        const endMatch =
            text.match(endRegex);


        if (endMatch) {

            name =
                endMatch[1];

            quantityText =
                endMatch[2];

            unit =
                endMatch[3] || null;

        }

    }


    // ======================================
    // AUCUNE QUANTITÉ RECONNUE
    // ======================================

    if (
        !quantityText ||
        !name
    ) {

        return {

            original: original,

            quantity: null,

            unit: null,

            baseUnit: null,

            baseQuantity: null,

            name: original,

            normalizedName:
                normalizeIngredientName(
                    original
                ),

            canMergeQuantity: false

        };

    }


    const quantity =
        parseShoppingNumber(
            quantityText
        );


    if (quantity === null) {
        return null;
    }


    // ======================================
    // UNITÉ
    // ======================================

    if (unit) {

        unit =
            unit
                .toLowerCase()
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

    }


    let baseUnit = unit;

    let baseQuantity =
        quantity;


    // ======================================
    // POIDS → GRAMMES
    // ======================================

    if (unit === "kg") {

        baseUnit = "g";

        baseQuantity =
            quantity * 1000;

    }


    if (unit === "mg") {

        baseUnit = "g";

        baseQuantity =
            quantity / 1000;

    }


    // ======================================
    // VOLUMES → MILLILITRES
    // ======================================

    if (unit === "l") {

        baseUnit = "ml";

        baseQuantity =
            quantity * 1000;

    }


    if (unit === "cl") {

        baseUnit = "ml";

        baseQuantity =
            quantity * 10;

    }


    // ======================================
    // CUILLÈRE À SOUPE
    // ======================================

    if (
        unit &&
        unit.includes("soupe")
    ) {

        baseUnit =
            "cuillere_soupe";

    }


    // ======================================
    // CUILLÈRE À CAFÉ
    // ======================================

    if (
        unit &&
        (
            unit.includes("café") ||
            unit.includes("cafe")
        )
    ) {

        baseUnit =
            "cuillere_cafe";

    }


    // ======================================
    // SANS UNITÉ = PIÈCES
    // ======================================

    if (!unit) {

        baseUnit =
            "piece";

    }


    // ======================================
    // NETTOYER LE PRODUIT
    // ======================================

    name =
        cleanShoppingIngredientName(
            name
        );


    return {

        original: original,

        quantity: quantity,

        unit: unit,

        baseUnit: baseUnit,

        baseQuantity: baseQuantity,

        name: name,

        normalizedName:
            normalizeIngredientName(
                name
            ),

        canMergeQuantity: true

    };

}


// ==========================================
// CLÉ DE REGROUPEMENT
// ==========================================

function getIngredientGroupKey(parsed) {

    if (
        !parsed ||
        !parsed.normalizedName
    ) {
        return null;
    }


    if (
        parsed.canMergeQuantity
    ) {

        return (
            parsed.normalizedName +
            "|" +
            parsed.baseUnit
        );

    }


    return (
        parsed.normalizedName +
        "|text"
    );

}


// ==========================================
// FORMAT INGRÉDIENT REGROUPÉ
// ==========================================

function formatMergedIngredient(group) {

    const quantity =
        group.totalQuantity;

    const name =
        group.displayName;


    // ======================================
    // GRAMMES / KG
    // ======================================

    if (group.baseUnit === "g") {

        if (quantity >= 1000) {

            return (
                formatShoppingNumber(
                    quantity / 1000
                ) +
                " kg " +
                name
            );

        }


        return (
            formatShoppingNumber(quantity) +
            " g " +
            name
        );

    }


    // ======================================
    // ML / L
    // ======================================

    if (group.baseUnit === "ml") {

        if (quantity >= 1000) {

            return (
                formatShoppingNumber(
                    quantity / 1000
                ) +
                " L " +
                name
            );

        }


        return (
            formatShoppingNumber(quantity) +
            " ml " +
            name
        );

    }


    // ======================================
    // PIÈCES
    // ======================================

    if (group.baseUnit === "piece") {

        return (
            formatShoppingNumber(quantity) +
            " " +
            name
        );

    }


    // ======================================
    // CUILLÈRES À SOUPE
    // ======================================

    if (
        group.baseUnit ===
        "cuillere_soupe"
    ) {

        return (
            formatShoppingNumber(quantity) +
            " c. à soupe de " +
            name
        );

    }


    // ======================================
    // CUILLÈRES À CAFÉ
    // ======================================

    if (
        group.baseUnit ===
        "cuillere_cafe"
    ) {

        return (
            formatShoppingNumber(quantity) +
            " c. à café de " +
            name
        );

    }


    return group.originalText;

}


// ==========================================
// REGROUPER LES ARTICLES
// ==========================================

function mergeShoppingItems(items) {

    const groups =
        new Map();


    items.forEach(
        function (item) {

            const parsed =
                parseShoppingIngredient(
                    item.ingredient
                );


            if (!parsed) {

                groups.set(
                    "unique-" + item.id,
                    {

                        ids: [item.id],

                        items: [item],

                        text:
                            item.ingredient,

                        checked:
                            item.checked,

                        merged:
                            false

                    }
                );


                return;

            }


            const key =
                getIngredientGroupKey(
                    parsed
                );


            if (!key) {

                groups.set(
                    "unique-" + item.id,
                    {

                        ids: [item.id],

                        items: [item],

                        text:
                            item.ingredient,

                        checked:
                            item.checked,

                        merged:
                            false

                    }
                );


                return;

            }


            // On sépare les cochés
            // et les non cochés.

            const stateKey =
                key +
                "|" +
                (
                    item.checked
                        ? "checked"
                        : "open"
                );


            if (!groups.has(stateKey)) {

                groups.set(
                    stateKey,
                    {

                        ids: [],

                        items: [],

                        parsed: parsed,

                        baseUnit:
                            parsed.baseUnit,

                        totalQuantity: 0,

                        displayName:
                            parsed.name,

                        originalText:
                            item.ingredient,

                        checked:
                            item.checked,

                        merged: false

                    }
                );

            }


            const group =
                groups.get(stateKey);


            group.ids.push(
                item.id
            );


            group.items.push(
                item
            );


            if (
                parsed.canMergeQuantity
            ) {

                group.totalQuantity +=
                    parsed.baseQuantity;

            }


            group.merged =
                group.items.length > 1;

        }
    );


    return Array
        .from(
            groups.values()
        )
        .map(
            function (group) {

                if (
                    group.parsed &&
                    group.parsed
                        .canMergeQuantity
                ) {

                    group.text =
                        formatMergedIngredient(
                            group
                        );

                } else {

                    group.text =
                        group.originalText;

                }


                return group;

            }
        );

}


// ==========================================
// AFFICHAGE
// ==========================================

function displayShoppingList(items) {

    shoppingList.innerHTML = "";


    const checkedCount =
        items.filter(
            function (item) {

                return item.checked;

            }
        ).length;


    shoppingSummary.textContent =
        `${checkedCount} sur ${items.length} article${items.length > 1 ? "s" : ""} coché${checkedCount > 1 ? "s" : ""}`;


    deleteCheckedButton.disabled =
        checkedCount === 0;


    // ======================================
    // TOUT COCHER / TOUT DÉCOCHER
    // ======================================

    if (toggleAllButton) {

        if (items.length === 0) {

            toggleAllButton.disabled =
                true;

            toggleAllButton.textContent =
                "✓ Tout cocher";

        } else {

            toggleAllButton.disabled =
                false;


            const allChecked =
                checkedCount ===
                items.length;


            toggleAllButton.textContent =
                allChecked
                    ? "↩ Tout décocher"
                    : "✓ Tout cocher";

        }

    }


    // ======================================
    // VIDE
    // ======================================

    if (items.length === 0) {

        shoppingList.innerHTML = `

            <div class="shopping-empty">

                <span
                    class="shopping-empty-icon"
                >
                    🛒
                </span>

                <h2>
                    Votre liste est vide
                </h2>

                <p>
                    Ouvrez une recette et utilisez
                    « Ajouter à ma liste ».
                </p>

                <a
                    href="./mes-recettes.html"
                    class="shopping-empty-link"
                >
                    Voir mes recettes →
                </a>

            </div>

        `;


        return;

    }


    const mergedItems =
        mergeShoppingItems(
            items
        );


    const group =
        document.createElement(
            "section"
        );


    group.className =
        "shopping-group";


    const heading =
        document.createElement(
            "h2"
        );


    heading.className =
        "shopping-group-title";


    heading.textContent =
        "Mes courses";


    group.appendChild(
        heading
    );


    const list =
        document.createElement(
            "div"
        );


    list.className =
        "shopping-items";


    mergedItems.forEach(
        function (item) {

            list.appendChild(
                createMergedShoppingItem(
                    item
                )
            );

        }
    );


    group.appendChild(list);

    shoppingList.appendChild(group);

}


// ==========================================
// CRÉER UNE LIGNE
// ==========================================

function createMergedShoppingItem(group) {

    const row =
        document.createElement("div");


    row.className =
        "shopping-item";


    if (group.checked) {

        row.classList.add(
            "is-checked"
        );

    }


    const label =
        document.createElement(
            "label"
        );


    label.className =
        "shopping-check";


    const checkbox =
        document.createElement(
            "input"
        );


    checkbox.type =
        "checkbox";

    checkbox.checked =
        group.checked;


    const customCheck =
        document.createElement(
            "span"
        );


    customCheck.className =
        "shopping-custom-check";


    const ingredient =
        document.createElement(
            "span"
        );


    ingredient.className =
        "shopping-ingredient";

    ingredient.textContent =
        group.text;


    // ======================================
    // RECETTES D'ORIGINE
    // ======================================

    const recipeNames =
        [
            ...new Set(
                group.items
                    .map(
                        function (item) {

                            return (
                                item.recipe_title ||
                                ""
                            );

                        }
                    )
                    .filter(Boolean)
            )
        ];


    if (recipeNames.length > 0) {

        const source =
            document.createElement(
                "small"
            );


        source.className =
            "shopping-item-source";


        source.textContent =
            recipeNames.join(" • ");


        ingredient.appendChild(
            document.createElement(
                "br"
            )
        );


        ingredient.appendChild(
            source
        );

    }


    label.appendChild(checkbox);

    label.appendChild(customCheck);

    label.appendChild(ingredient);


    // ======================================
    // SUPPRESSION
    // ======================================

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";

    deleteButton.className =
        "shopping-delete-item";

    deleteButton.setAttribute(
        "aria-label",
        "Supprimer cet article"
    );

    deleteButton.textContent =
        "✕";


    // ======================================
    // COCHER LE GROUPE
    // ======================================

    checkbox.addEventListener(
        "change",
        async function () {

            await updateShoppingGroup(
                group.ids,
                checkbox.checked
            );

        }
    );


    // ======================================
    // SUPPRIMER LE GROUPE
    // ======================================

    deleteButton.addEventListener(
        "click",
        async function () {

            await deleteShoppingGroup(
                group.ids
            );

        }
    );


    row.appendChild(label);

    row.appendChild(deleteButton);


    return row;

}


// ==========================================
// COCHER / DÉCOCHER UN GROUPE
// ==========================================

async function updateShoppingGroup(
    ids,
    checked
) {

    if (
        !currentUser ||
        !ids ||
        ids.length === 0
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("shopping_list")
                .update({
                    checked: checked
                })
                .eq(
                    "user_id",
                    currentUser.id
                )
                .in(
                    "id",
                    ids
                );


        if (error) {
            throw error;
        }


        await refreshShoppingPage();


    } catch (error) {

        console.error(
            "Erreur modification :",
            error
        );


        await loadShoppingList();

    }

}


// ==========================================
// SUPPRIMER UN GROUPE
// ==========================================

async function deleteShoppingGroup(ids) {

    if (
        !currentUser ||
        !ids ||
        ids.length === 0
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("shopping_list")
                .delete()
                .eq(
                    "user_id",
                    currentUser.id
                )
                .in(
                    "id",
                    ids
                );


        if (error) {
            throw error;
        }


        await refreshShoppingPage();


    } catch (error) {

        console.error(
            "Erreur suppression :",
            error
        );

    }

}


// ==========================================
// RAFRAÎCHIR LISTE + BADGE
// ==========================================

async function refreshShoppingPage() {

    await loadShoppingList();


    if (
        typeof updateShoppingBadge ===
        "function"
    ) {

        await updateShoppingBadge();

    }

}


// ==========================================
// TOUT COCHER / TOUT DÉCOCHER
// ==========================================

if (toggleAllButton) {

    toggleAllButton.addEventListener(
        "click",
        async function () {

            if (!currentUser) {
                return;
            }


            toggleAllButton.disabled =
                true;


            try {

                const {
                    data,
                    error: readError
                } =
                    await supabaseClient
                        .from("shopping_list")
                        .select("id, checked")
                        .eq(
                            "user_id",
                            currentUser.id
                        );


                if (readError) {
                    throw readError;
                }


                if (
                    !data ||
                    data.length === 0
                ) {

                    await refreshShoppingPage();

                    return;

                }


                const allChecked =
                    data.every(
                        function (item) {

                            return item.checked;

                        }
                    );


                const newCheckedState =
                    !allChecked;


                const {
                    error: updateError
                } =
                    await supabaseClient
                        .from("shopping_list")
                        .update({
                            checked:
                                newCheckedState
                        })
                        .eq(
                            "user_id",
                            currentUser.id
                        );


                if (updateError) {
                    throw updateError;
                }


                await refreshShoppingPage();


            } catch (error) {

                console.error(
                    "Erreur tout cocher / décocher :",
                    error
                );


                toggleAllButton.disabled =
                    false;

            }

        }
    );

}


// ==========================================
// SUPPRIMER LES ARTICLES COCHÉS
// ==========================================

deleteCheckedButton.addEventListener(
    "click",
    async function () {

        if (!currentUser) {
            return;
        }


        const confirmed =
            window.confirm(
                "Supprimer tous les articles cochés ?"
            );


        if (!confirmed) {
            return;
        }


        deleteCheckedButton.disabled =
            true;


        try {

            const {
                error
            } =
                await supabaseClient
                    .from("shopping_list")
                    .delete()
                    .eq(
                        "user_id",
                        currentUser.id
                    )
                    .eq(
                        "checked",
                        true
                    );


            if (error) {
                throw error;
            }


            await refreshShoppingPage();


        } catch (error) {

            console.error(
                "Erreur suppression :",
                error
            );


            deleteCheckedButton.disabled =
                false;

        }

    }
);


// ==========================================
// LANCEMENT
// ==========================================

loadShoppingList();