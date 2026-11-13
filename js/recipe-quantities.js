
// ==========================================
// RECETTE PLUS
// CALCUL DES QUANTITÉS D'INGRÉDIENTS
// ==========================================


// ==========================================
// NOMBRE DE PERSONNES
// ==========================================

function getServingsNumber(servings) {

    if (
        servings === null ||
        servings === undefined
    ) {
        return 1;
    }

    const match =
        String(servings)
            .replace(",", ".")
            .match(/\d+(?:\.\d+)?/);

    if (!match) {
        return 1;
    }

    const number =
        Number(match[0]);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return 1;
    }

    return number;
}


// ==========================================
// CONVERSION D'UNE QUANTITÉ
// ==========================================

function parseQuantity(text) {

    const value =
        String(text || "").trim();

    // --------------------------------------
    // NOMBRE MIXTE : 1 1/2
    // --------------------------------------

    let match =
        value.match(
            /^(\d+)\s+(\d+)\s*\/\s*(\d+)/
        );

    if (match) {

        const whole =
            Number(match[1]);

        const numerator =
            Number(match[2]);

        const denominator =
            Number(match[3]);

        if (denominator !== 0) {

            return {
                quantity:
                    whole +
                    numerator /
                    denominator,

                length:
                    match[0].length
            };
        }
    }


    // --------------------------------------
    // FRACTION : 1/2
    // --------------------------------------

    match =
        value.match(
            /^(\d+)\s*\/\s*(\d+)/
        );

    if (match) {

        const numerator =
            Number(match[1]);

        const denominator =
            Number(match[2]);

        if (denominator !== 0) {

            return {
                quantity:
                    numerator /
                    denominator,

                length:
                    match[0].length
            };
        }
    }


    // --------------------------------------
    // NOMBRE NORMAL : 500 / 1,5 / 2.5
    // --------------------------------------

    match =
        value.match(
            /^(\d+(?:[.,]\d+)?)/
        );

    if (match) {

        return {
            quantity:
                Number(
                    match[1]
                        .replace(",", ".")
                ),

            length:
                match[0].length
        };
    }

    return null;
}


// ==========================================
// FORMATAGE D'UNE QUANTITÉ
// ==========================================

function formatQuantity(number) {

    if (!Number.isFinite(number)) {
        return "";
    }

    const rounded =
        Math.round(
            number * 100
        ) / 100;

    if (
        Number.isInteger(rounded)
    ) {
        return String(rounded);
    }

    return String(rounded)
        .replace(".", ",");
}


// ==========================================
// RECALCUL D'UN INGRÉDIENT
// ==========================================

function scaleIngredient(
    ingredient,
    originalServings,
    newServings
) {

    const text =
        String(ingredient || "");

    const parsed =
        parseQuantity(text);

    if (!parsed) {
        return text;
    }

    const ratio =
        newServings /
        originalServings;

    const newQuantity =
        parsed.quantity *
        ratio;

    const formattedQuantity =
        formatQuantity(
            newQuantity
        );

    const rest =
        text
            .slice(parsed.length);

    return (
        formattedQuantity +
        rest
    );
}
