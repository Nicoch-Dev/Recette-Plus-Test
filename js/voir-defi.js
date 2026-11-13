
/* Le Défi du Frigo — interface de test uniquement.
   La fonction Supabase conserve sa restriction aux comptes de test. */

(() => {
  'use strict';

  const status = document.getElementById('fridgeStatus');
  const result = document.getElementById('fridgeResult');

  if (!status || !result) return;

  const savedRecipes = new WeakSet();

  const node = (tag, text, className) => {
    const element = document.createElement(tag);

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    if (className) element.className = className;
    return element;
  };

  const appendList = (parent, title, items, ordered = false) => {
    if (!Array.isArray(items) || !items.length) return;

    parent.appendChild(node('h4', title));

    const list = document.createElement(ordered ? 'ol' : 'ul');

    for (const item of items) {
      list.appendChild(node('li', item));
    }

    parent.appendChild(list);
  };

  const carnetFullMessage = (limit) =>
    limit === 30
      ? 'Votre carnet contient déjà 30 recettes. Passez à Premium ou libérez une place.'
      : 'Votre carnet contient déjà 10 recettes. Achetez un premier pack, passez à Premium ou libérez une place.';

  async function checkCarnetCapacity(userId) {
    const [profile, billing, count] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('is_test_account')
        .eq('id', userId)
        .single(),

      supabaseClient
        .from('user_billing')
        .select('plan, has_purchased_pack')
        .eq('user_id', userId)
        .single(),

      supabaseClient
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);

    if (
      profile.error ||
      billing.error ||
      count.error ||
      count.count === null
    ) {
      throw new Error(
        'Impossible de vérifier la capacité du carnet. Réessayez.'
      );
    }

    if (
      profile.data.is_test_account === true ||
      billing.data.plan === 'premium'
    ) {
      return null;
    }

    const limit = billing.data.has_purchased_pack ? 30 : 10;

    return count.count >= limit ? limit : null;
  }

  function addSaveButton(card, recipe) {
    const saveButton = node(
      'button',
      '♡ Enregistrer dans Mes recettes',
      'save-ai-recipe'
    );

    saveButton.type = 'button';
    saveButton.style.marginTop = '14px';
    card.appendChild(saveButton);

    const feedback = node('p', '');
    feedback.setAttribute('role', 'status');
    card.appendChild(feedback);

    saveButton.addEventListener('click', async () => {
      if (saveButton.disabled || savedRecipes.has(recipe)) return;

      saveButton.disabled = true;
      saveButton.textContent = 'Vérification du carnet…';

      try {
        const { data: authData, error: authError } =
          await supabaseClient.auth.getUser();

        if (authError || !authData?.user) {
          throw new Error(
            'Connectez-vous pour enregistrer cette recette.'
          );
        }

        const user = authData.user;
        const limit = await checkCarnetCapacity(user.id);

        if (limit !== null) {
          throw new Error(carnetFullMessage(limit));
        }

        saveButton.textContent = 'Enregistrement…';

        const newRecipe = {
          title: String(
            recipe.title || 'Recette du Défi du Frigo'
          ),
          category: String(recipe.category || 'Plat'),
          time: String(recipe.time || ''),
          servings: String(recipe.servings || ''),
          description: String(recipe.description || ''),
          ingredients: Array.isArray(recipe.ingredients)
            ? recipe.ingredients
            : [],
          instructions: Array.isArray(recipe.instructions)
            ? recipe.instructions.join('\n')
            : String(recipe.instructions || ''),
          image: '',
          source: 'ai',
          user_id: user.id
        };

        const { data, error } = await supabaseClient
          .from('recipes')
          .insert(newRecipe)
          .select('id')
          .single();

        if (error) {
          if (error.message?.includes('RECIPE_LIMIT_REACHED')) {
            const currentLimit =
              await checkCarnetCapacity(user.id);

            throw new Error(
              currentLimit !== null
                ? carnetFullMessage(currentLimit)
                : 'La limite du carnet a été atteinte.'
            );
          }

          throw error;
        }

        savedRecipes.add(recipe);

        saveButton.textContent = '✓ Recette enregistrée';
        feedback.textContent =
          'Votre recette est dans Mes recettes.';

        const link = node(
          'a',
          'Voir la recette et choisir sa photo →',
          'recipe-button'
        );

        link.href =
          `./ma-recette.html?id=${encodeURIComponent(data.id)}`;

        link.style.display = 'inline-block';
        link.style.marginTop = '8px';

        card.appendChild(link);

      } catch (error) {
        console.error(
          'Sauvegarde du Défi du Frigo :',
          error
        );

        feedback.textContent =
          error.message ||
          'Impossible d’enregistrer cette recette.';

        saveButton.disabled = false;
        saveButton.textContent =
          '♡ Enregistrer dans Mes recettes';
      }
    });
  }

  const showChallenge = (challenge) => {
    result.replaceChildren();

    result.appendChild(
      node('h2', '🧊 Votre Défi du Frigo')
    );

    const days = Array.isArray(challenge.days)
      ? challenge.days
      : [];

    for (const day of days.slice(0, 2)) {
      const dayBlock = node(
        'section',
        undefined,
        'fridge-result-day'
      );

      dayBlock.style.marginTop = '24px';

      dayBlock.appendChild(
        node('h3', `Jour ${day.day ?? ''}`)
      );

      const recipes = Array.isArray(day.recipes)
        ? day.recipes
        : [];

      for (const recipe of recipes.slice(0, 2)) {
        const card = node(
          'article',
          undefined,
          'fridge-result-recipe'
        );

        card.style.cssText =
          'margin:16px 0;padding:20px;background:#fff;' +
          'border:1px solid #e5e5e5;border-radius:14px';

        card.appendChild(
          node('h3', recipe.title || 'Recette')
        );

        if (recipe.description) {
          card.appendChild(
            node('p', recipe.description)
          );
        }

        const details = [
          recipe.time,
          recipe.servings
            ? `${recipe.servings} personne(s)`
            : null
        ]
          .filter(Boolean)
          .join(' · ');

        if (details) {
          card.appendChild(node('p', details));
        }

        appendList(
          card,
          'Ingrédients',
          recipe.ingredients
        );

        appendList(
          card,
          'Préparation',
          recipe.instructions,
          true
        );

        addSaveButton(card, recipe);
        dayBlock.appendChild(card);
      }

      result.appendChild(dayBlock);
    }

    if (
      Array.isArray(challenge.shoppingList) &&
      challenge.shoppingList.length
    ) {
      const shopping = node(
        'section',
        undefined,
        'fridge-result-shopping'
      );

      shopping.style.marginTop = '24px';

      appendList(
        shopping,
        '🛒 Liste de courses',
        challenge.shoppingList
      );

      result.appendChild(shopping);
    }

    if (challenge.notes) {
      result.appendChild(
        node('p', challenge.notes)
      );
    }
  };

  async function loadSelectedChallenge() {
    const id = new URLSearchParams(window.location.search).get('challenge');
    if (!id) {
      status.textContent = 'Aucun défi sélectionné.';
      return;
    }
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authData?.user) throw new Error('Connectez-vous pour consulter ce défi.');
      const { data, error } = await supabaseClient
        .from('fridge_challenges')
        .select('challenge')
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .gt('expires_at', new Date().toISOString())
        .single();
      if (error || !data?.challenge) throw new Error('Ce défi est introuvable ou a expiré.');
      showChallenge(data.challenge);
      status.textContent = 'Défi retrouvé — aucun crédit IA utilisé.';
    } catch (error) {
      console.error('Consultation du défi :', error);
      status.textContent = error.message || 'Impossible de charger le défi.';
    }
  }
  loadSelectedChallenge();
})();
