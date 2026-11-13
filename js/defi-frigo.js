
/*
 * Recette Plus — Défi du Frigo
 *
 * Accessible à tous les utilisateurs connectés.
 *
 * Génération :
 * - Compte normal : 2 crédits IA
 * - Compte de test : gratuit
 *
 * Carnet :
 * - Gratuit : 10 recettes
 * - Après premier pack : 30 recettes
 * - Premium : illimité
 *
 * La facturation des crédits est effectuée
 * exclusivement côté Supabase.
 */

(() => {
  'use strict';

  const form = document.getElementById('fridgeChallengeForm');
  const button = document.getElementById('fridgeGenerateButton');
  const status = document.getElementById('fridgeStatus');
  const result = document.getElementById('fridgeResult');

  if (!form || !button || !status || !result) return;

  let allowed = false;
  let busy = false;
  let isTestAccount = false;

  const savedRecipes = new WeakSet();

  const historyList = document.getElementById('fridgeHistoryList');
  const historyStatus = document.getElementById('fridgeHistoryStatus');

  function node(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    if (className) {
      element.className = className;
    }

    return element;
  }

  function appendList(parent, title, items, ordered = false) {
    if (!Array.isArray(items) || !items.length) return;

    parent.appendChild(node('h4', title));

    const list = document.createElement(
      ordered ? 'ol' : 'ul'
    );

    for (const item of items) {
      list.appendChild(node('li', item));
    }

    parent.appendChild(list);
  }

  function carnetFullMessage(limit) {
    return limit === 30
      ? 'Votre carnet contient déjà 30 recettes. Passez à Premium ou libérez une place.'
      : 'Votre carnet contient déjà 10 recettes. Achetez un premier pack, passez à Premium ou libérez une place.';
  }

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
        .select('id', {
          count: 'exact',
          head: true
        })
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

    // Règle validée : 10 ou 30 recettes.
    const limit = billing.data.has_purchased_pack
      ? 30
      : 10;

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
      if (
        saveButton.disabled ||
        savedRecipes.has(recipe)
      ) {
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent =
        'Vérification du carnet…';

      try {
        const {
          data: authData,
          error: authError
        } = await supabaseClient.auth.getUser();

        if (
          authError ||
          !authData?.user
        ) {
          throw new Error(
            'Connectez-vous pour enregistrer cette recette.'
          );
        }

        const user = authData.user;

        const limit = await checkCarnetCapacity(
          user.id
        );

        if (limit !== null) {
          throw new Error(
            carnetFullMessage(limit)
          );
        }

        saveButton.textContent =
          'Enregistrement…';

        const newRecipe = {
          title: String(
            recipe.title ||
            'Recette du Défi du Frigo'
          ),

          category: String(
            recipe.category || 'Plat'
          ),

          time: String(
            recipe.time || ''
          ),

          servings: String(
            recipe.servings || ''
          ),

          description: String(
            recipe.description || ''
          ),

          ingredients: Array.isArray(
            recipe.ingredients
          )
            ? recipe.ingredients
            : [],

          instructions: Array.isArray(
            recipe.instructions
          )
            ? recipe.instructions.join('\n')
            : String(
                recipe.instructions || ''
              ),

          image: '',
          source: 'ai',
          user_id: user.id
        };

        const {
          data,
          error
        } = await supabaseClient
          .from('recipes')
          .insert(newRecipe)
          .select('id')
          .single();

        if (error) {
          if (
            error.message?.includes(
              'RECIPE_LIMIT_REACHED'
            )
          ) {
            const currentLimit =
              await checkCarnetCapacity(
                user.id
              );

            throw new Error(
              currentLimit !== null
                ? carnetFullMessage(
                    currentLimit
                  )
                : 'La limite du carnet a été atteinte.'
            );
          }

          throw error;
        }

        savedRecipes.add(recipe);

        saveButton.textContent =
          '✓ Recette enregistrée';

        feedback.textContent =
          'Votre recette est dans Mes recettes.';

        const link = node(
          'a',
          'Voir la recette et choisir sa photo →',
          'recipe-button'
        );

        link.href =
          `./ma-recette.html?id=${encodeURIComponent(data.id)}`;

        link.style.display =
          'inline-block';

        link.style.marginTop =
          '8px';

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

  function showChallenge(challenge) {
    result.replaceChildren();

    result.appendChild(
      node(
        'h2',
        '🧊 Votre Défi du Frigo'
      )
    );

    const days = Array.isArray(
      challenge.days
    )
      ? challenge.days
      : [];

    for (
      const day of days.slice(0, 2)
    ) {
      const dayBlock = node(
        'section',
        undefined,
        'fridge-result-day'
      );

      dayBlock.style.marginTop =
        '24px';

      dayBlock.appendChild(
        node(
          'h3',
          `Jour ${day.day ?? ''}`
        )
      );

      const recipes = Array.isArray(
        day.recipes
      )
        ? day.recipes
        : [];

      for (
        const recipe of recipes.slice(0, 2)
      ) {
        const card = node(
          'article',
          undefined,
          'fridge-result-recipe'
        );

        card.style.cssText =
          'margin:16px 0;padding:20px;background:#fff;' +
          'border:1px solid #e5e5e5;border-radius:14px';

        card.appendChild(
          node(
            'h3',
            recipe.title || 'Recette'
          )
        );

        if (
          recipe.description
        ) {
          card.appendChild(
            node(
              'p',
              recipe.description
            )
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
          card.appendChild(
            node(
              'p',
              details
            )
          );
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

        addSaveButton(
          card,
          recipe
        );

        dayBlock.appendChild(
          card
        );
      }

      result.appendChild(
        dayBlock
      );
    }

    if (
      Array.isArray(
        challenge.shoppingList
      ) &&
      challenge.shoppingList.length
    ) {
      const shopping = node(
        'section',
        undefined,
        'fridge-result-shopping'
      );

      shopping.style.marginTop =
        '24px';

      appendList(
        shopping,
        '🛒 Liste de courses',
        challenge.shoppingList
      );

      result.appendChild(
        shopping
      );
    }

    if (
      challenge.notes
    ) {
      result.appendChild(
        node(
          'p',
          challenge.notes
        )
      );
    }
  }

  function historyDate(date) {
    return new Date(
      date
    ).toLocaleString(
      'fr-FR',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    );
  }

  async function loadRecentChallenges() {
    if (
      !historyList ||
      !historyStatus
    ) {
      return;
    }

    historyStatus.textContent =
      'Chargement de vos défis…';

    historyList.replaceChildren();

    try {
      const {
        data: authData,
        error: authError
      } = await supabaseClient.auth.getUser();

      if (
        authError ||
        !authData?.user
      ) {
        throw new Error(
          'Connectez-vous pour retrouver vos défis.'
        );
      }

      const {
        data,
        error
      } = await supabaseClient
        .from('fridge_challenges')
        .select(
          'id,challenge,created_at,expires_at'
        )
        .eq(
          'user_id',
          authData.user.id
        )
        .gt(
          'expires_at',
          new Date().toISOString()
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(30);

      if (error) {
        throw error;
      }

      historyStatus.textContent =
        data.length
          ? `${data.length} défi(s) encore disponible(s).`
          : 'Aucun défi enregistré au cours des 7 derniers jours.';

      for (
        const entry of data
      ) {
        const card = node(
          'article',
          undefined,
          'fridge-history-item'
        );

        card.style.cssText =
          'padding:16px;margin:12px 0;' +
          'border:1px solid #ddd;border-radius:12px';

        card.appendChild(
          node(
            'h3',
            `Défi du ${historyDate(entry.created_at)}`
          )
        );

        card.appendChild(
          node(
            'p',
            `Disponible jusqu’au ${historyDate(entry.expires_at)}`
          )
        );

        const titles = (
          entry.challenge?.days || []
        )
          .flatMap(
            day =>
              Array.isArray(
                day.recipes
              )
                ? day.recipes
                : []
          )
          .map(
            recipe => recipe.title
          )
          .filter(Boolean);

        if (
          titles.length
        ) {
          card.appendChild(
            node(
              'p',
              titles.join(' · ')
            )
          );
        }

        const openButton = node(
          'button',
          'Voir ce défi',
          'recipe-button'
        );

        openButton.type =
          'button';

        openButton.addEventListener(
          'click',
          () => {
            if (
              !entry.challenge ||
              !Array.isArray(
                entry.challenge.days
              )
            ) {
              historyStatus.textContent =
                'Ce défi ne peut pas être affiché.';

              return;
            }

            showChallenge(
              entry.challenge
            );

            result.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        );

        card.appendChild(
          openButton
        );

        historyList.appendChild(
          card
        );
      }

    } catch (error) {
      console.error(
        'Historique du Défi du Frigo :',
        error
      );

      historyStatus.textContent =
        'Impossible de charger les défis récents : ' +
        (
          error.message ||
          'erreur inconnue'
        );
    }
  }

  /*
   * Vérification de connexion.
   * Tous les comptes connectés sont autorisés.
   */

  async function checkAccount() {
    button.disabled = true;
    allowed = false;

    status.textContent =
      'Vérification de votre connexion…';

    try {
      if (
        typeof supabaseClient ===
          'undefined' ||
        !supabaseClient?.auth
      ) {
        throw new Error(
          'Client Supabase indisponible.'
        );
      }

      const {
        data: { user },
        error: authError
      } = await supabaseClient
        .auth
        .getUser();

      if (
        authError ||
        !user
      ) {
        throw new Error(
          'Connectez-vous pour lancer le Défi du Frigo.'
        );
      }

      const {
        data: profile,
        error: profileError
      } = await supabaseClient
        .from('profiles')
        .select(
          'is_test_account'
        )
        .eq(
          'id',
          user.id
        )
        .maybeSingle();

      if (
        profileError
      ) {
        throw new Error(
          'Impossible de vérifier votre compte.'
        );
      }

      isTestAccount =
        profile?.is_test_account === true;

      allowed = true;
      button.disabled = false;

      status.textContent =
        isTestAccount
          ? 'Compte de test : génération gratuite.'
          : 'Génération du Défi du Frigo : 2 crédits IA par défi réussi.';

    } catch (error) {
      allowed = false;
      button.disabled = true;

      status.textContent =
        error.message ||
        'Impossible de vérifier votre connexion.';
    }
  }

  /*
   * Génération du Défi du Frigo.
   */

  button.addEventListener(
    'click',
    async event => {
      event.preventDefault();

      if (
        !allowed ||
        busy ||
        !form.reportValidity()
      ) {
        return;
      }

      const ingredientsField =
        document.getElementById(
          'fridgeIngredients'
        );

      const servingsField =
        document.getElementById(
          'fridgeServings'
        );

      const preferencesField =
        document.getElementById(
          'fridgePreferences'
        );

      if (
        !ingredientsField ||
        !servingsField ||
        !preferencesField
      ) {
        status.textContent =
          'Le formulaire du défi est incomplet.';

        return;
      }

      const ingredients =
        ingredientsField.value.trim();

      const servings =
        Number(
          servingsField.value
        );

      const preferences =
        preferencesField.value.trim();

      const mode =
        form.querySelector(
          'input[name="fridgeMode"]:checked'
        )?.value;

      if (
        !ingredients ||
        ingredients.length > 2000 ||
        preferences.length > 1000 ||
        !Number.isInteger(servings) ||
        servings < 1 ||
        servings > 12 ||
        ![
          'zero_achat',
          'courses_minimales'
        ].includes(mode)
      ) {
        status.textContent =
          'Vérifiez les ingrédients (2 000 caractères maximum), ' +
          'les préférences (1 000 maximum) et le nombre de personnes (1 à 12).';

        return;
      }

      busy = true;
      button.disabled = true;

      result.replaceChildren();

      status.textContent =
        'Génération du programme en cours…';

      try {
        const {
          data,
          error
        } = await supabaseClient
          .functions
          .invoke(
            'generate-fridge-challenge',
            {
              body: {
                requestId:
                  crypto.randomUUID(),

                ingredients,
                servings,
                mode,
                preferences
              }
            }
          );

        if (error) {
          let message =
            'La génération a échoué.';

          try {
            const details =
              await error.context?.json();

            if (
              details?.error
            ) {
              message =
                details.error;
            }

          } catch (_) {
            // Message générique
          }

          throw new Error(
            message
          );
        }

        if (
          !data?.success ||
          !data.challenge
        ) {
          throw new Error(
            'Réponse du défi invalide.'
          );
        }

        /*
         * Vérification de la facturation.
         * Compte normal : 2 crédits.
         * Compte de test : 0 crédit.
         */

        const creditsCharged =
          Number(
            data.creditsCharged
          );

        if (
          !Number.isFinite(
            creditsCharged
          ) ||
          ![0, 2].includes(
            creditsCharged
          )
        ) {
          throw new Error(
            'Réponse de facturation inattendue.'
          );
        }

        if (
          data.testMode === true &&
          creditsCharged !== 0
        ) {
          throw new Error(
            'Un compte de test ne doit pas être facturé.'
          );
        }

        if (
          data.testMode !== true &&
          creditsCharged !== 2
        ) {
          throw new Error(
            'Facturation du défi incohérente.'
          );
        }

        showChallenge(
          data.challenge
        );

        await loadRecentChallenges();

        status.textContent =
          creditsCharged === 0
            ? 'Programme généré avec succès — compte de test, aucun crédit prélevé.'
            : 'Programme généré avec succès — 2 crédits IA utilisés.';

        result.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

      } catch (error) {
        console.error(
          'Défi du Frigo :',
          error
        );

        status.textContent =
          error.message ||
          'Une erreur est survenue.';

      } finally {
        busy = false;
        button.disabled = !allowed;
      }
    }
  );

  /*
   * Ouverture d'un ancien défi.
   */

  async function openSelectedChallenge() {
    const challengeId =
      new URLSearchParams(
        window.location.search
      ).get('challenge');

    if (
      !challengeId
    ) {
      return;
    }

    try {
      status.textContent =
        'Chargement de votre ancien défi…';

      const {
        data: authData,
        error: authError
      } = await supabaseClient
        .auth
        .getUser();

      if (
        authError ||
        !authData?.user
      ) {
        throw new Error(
          'Connectez-vous pour consulter ce défi.'
        );
      }

      const {
        data,
        error
      } = await supabaseClient
        .from('fridge_challenges')
        .select('challenge')
        .eq(
          'id',
          challengeId
        )
        .eq(
          'user_id',
          authData.user.id
        )
        .gt(
          'expires_at',
          new Date().toISOString()
        )
        .single();

      if (
        error ||
        !data?.challenge
      ) {
        throw new Error(
          'Ce défi est introuvable ou a expiré.'
        );
      }

      showChallenge(
        data.challenge
      );

      status.textContent =
        'Voici votre défi enregistré. Aucun crédit IA utilisé.';

      result.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    } catch (error) {
      console.error(
        'Ouverture ancien défi :',
        error
      );

      status.textContent =
        error.message ||
        'Impossible de retrouver ce défi.';
    }
  }

  // Initialisation
  checkAccount();
  openSelectedChallenge();
  loadRecentChallenges();

})();
