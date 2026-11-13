
/* Recette Plus — Reconnaissance photo des ingrédients */

(() => {
  const camera = document.getElementById('fridgeCameraInput');
  const fileInput = document.getElementById('fridgeFileInput');
  const preview = document.getElementById('fridgePhotoPreview');
  const status = document.getElementById('fridgePhotoStatus');
  const ingredientsField = document.getElementById('fridgeIngredients');

  if (!camera || !fileInput || !preview || !status || !ingredientsField) {
    console.error('Éléments du scanner photo introuvables.');
    return;
  }

  const photos = [];
  const MAX_PHOTOS = 5;
  const MAX_BYTES = 10 * 1024 * 1024;
  let busy = false;

  // Bouton d'analyse IA
  const analyzeButton = document.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.className = 'ai-submit-button';
  analyzeButton.textContent = '🔎 Analyser mes photos avec l’IA';
  analyzeButton.disabled = true;
  analyzeButton.style.marginTop = '14px';

  preview.insertAdjacentElement('afterend', analyzeButton);

  // Zone de vérification des ingrédients
  const review = document.createElement('section');
  review.setAttribute(
    'aria-label',
    'Ingrédients reconnus à vérifier'
  );
  review.style.marginTop = '20px';

  analyzeButton.insertAdjacentElement('afterend', review);

  function setStatus(message) {
    status.textContent = message;
  }

  function clearReview() {
    review.replaceChildren();
  }

  // Affichage des photos
  function render() {
    preview.replaceChildren();

    photos.forEach((photo, index) => {
      const item = document.createElement('div');
      item.className = 'fridge-photo-item';

      const img = document.createElement('img');
      img.src = photo.url;
      img.alt = `Photo ${index + 1}`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Retirer';
      remove.disabled = busy;

      remove.addEventListener('click', () => {
        URL.revokeObjectURL(photo.url);
        photos.splice(index, 1);
        clearReview();
        render();
      });

      item.append(img, remove);
      preview.append(item);
    });

    analyzeButton.disabled = busy || photos.length === 0;
    camera.disabled = busy;
    fileInput.disabled = busy;

    if (!busy) {
      setStatus(
        photos.length
          ? `${photos.length} photo(s) sélectionnée(s). Vous pouvez lancer l'analyse.`
          : 'Ajoutez une photo pour reconnaître vos ingrédients.'
      );
    }
  }

  // Ajout des photos
  function addPhotos(input) {
    let warning = '';

    for (const file of input.files || []) {
      if (photos.length >= MAX_PHOTOS) {
        warning = 'Maximum 5 photos.';
        break;
      }

      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > MAX_BYTES ||
        file.size === 0
      ) {
        warning =
          'Formats acceptés : JPG, PNG, WebP (10 Mo maximum).';
        continue;
      }

      photos.push({
        file,
        url: URL.createObjectURL(file)
      });
    }

    input.value = '';
    clearReview();
    render();

    if (warning) setStatus(warning);
  }

  camera.addEventListener('change', () => addPhotos(camera));
  fileInput.addEventListener('change', () => addPhotos(fileInput));

  // Conversion de l'image pour Supabase
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error('Impossible de lire la photo.'));

      reader.readAsDataURL(file);
    });
  }

  // Création d'un champ modifiable
  function createInput(value, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder;

    input.style.cssText = `
      width: 100%;
      min-width: 0;
      padding: 10px;
      border: 1px solid #dcebdd;
      border-radius: 8px;
      box-sizing: border-box;
    `;

    return input;
  }

  // Vérification des ingrédients reconnus
  function showReview(ingredients, notes) {
    clearReview();

    const title = document.createElement('h3');
    title.textContent = '🥕 Ingrédients détectés';

    const info = document.createElement('p');
    info.textContent =
      'Vérifiez les ingrédients et leurs quantités avant de confirmer.';

    const rows = document.createElement('div');
    rows.style.cssText = `
      display: grid;
      gap: 10px;
      margin: 15px 0;
    `;

    function addRow(name = '', quantity = '') {
      const row = document.createElement('div');

      row.style.cssText = `
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      `;

      const nameInput = createInput(name, 'Ingrédient');
      nameInput.setAttribute('aria-label', 'Nom de l’ingrédient');

      const quantityInput = createInput(
        quantity,
        'Quantité'
      );
      quantityInput.setAttribute('aria-label', 'Quantité');

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '✕';
      remove.setAttribute(
        'aria-label',
        'Supprimer cet ingrédient'
      );

      remove.addEventListener('click', () => row.remove());

      row.append(nameInput, quantityInput, remove);
      rows.append(row);
    }

    ingredients.forEach(item => {
      addRow(item.name, item.quantity || '');
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = '+ Ajouter un ingrédient';

    addButton.addEventListener('click', () => addRow());

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'ai-submit-button';
    confirmButton.textContent =
      '✓ Ajouter les ingrédients à mon défi';
    confirmButton.style.marginTop = '14px';

    confirmButton.addEventListener('click', () => {
      const lines = Array.from(rows.children)
        .map(row => {
          const inputs = row.querySelectorAll('input');
          const name = inputs[0].value.trim();
          const quantity = inputs[1].value.trim();

          if (!name) return '';

          return quantity
            ? `${quantity} de ${name}`
            : name;
        })
        .filter(Boolean);

      if (!lines.length) {
        setStatus('Ajoutez au moins un ingrédient.');
        return;
      }

      const existing = ingredientsField.value.trim();

      ingredientsField.value = [existing, ...lines]
        .filter(Boolean)
        .join('\n');

      ingredientsField.dispatchEvent(
        new Event('input', { bubbles: true })
      );

      clearReview();

      setStatus(
        `${lines.length} ingrédient(s) ajouté(s). Vérifiez votre liste avant de lancer le défi.`
      );

      ingredientsField.focus();
    });

    review.append(title, info, rows, addButton);

    if (notes) {
      const note = document.createElement('p');
      note.textContent = `Remarque de l'IA : ${notes}`;
      review.append(note);
    }

    review.append(confirmButton);
  }

  // Appel de la fonction Supabase
  analyzeButton.addEventListener('click', async () => {
    if (busy || !photos.length) return;

    if (typeof supabaseClient === 'undefined') {
      setStatus('Connexion Supabase indisponible.');
      return;
    }

    busy = true;
    clearReview();
    render();

    setStatus('🔎 Analyse des photos en cours…');

    try {
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError || !sessionData?.session) {
        throw new Error(
          'Vous devez être connecté pour analyser vos photos.'
        );
      }

      const images = await Promise.all(
        photos.map(photo => fileToDataURL(photo.file))
      );

      const { data, error } =
        await supabaseClient.functions.invoke(
          'analyze-fridge-photos',
          {
            body: { images }
          }
        );

      if (error) {
        let message = 'Impossible de contacter la reconnaissance IA.';

        if (
          error.context &&
          typeof error.context.json === 'function'
        ) {
          try {
            const details = await error.context.json();
            message = details.error || message;
          } catch (_) {}
        }

        throw new Error(message);
      }

      if (!data?.success || !Array.isArray(data.ingredients)) {
        throw new Error(
          data?.error || 'Réponse IA invalide.'
        );
      }

      if (!data.ingredients.length) {
        setStatus(
          'Aucun ingrédient reconnu. Essayez une photo plus nette.'
        );
      } else {
        showReview(data.ingredients, data.notes);

        setStatus(
          `${data.ingredients.length} ingrédient(s) détecté(s). Vérifiez la liste avant de confirmer.`
        );
      }

    } catch (error) {
      console.error('Reconnaissance photo :', error);

      setStatus(
        error instanceof Error
          ? error.message
          : 'Erreur pendant l’analyse.'
      );

    } finally {
      busy = false;
      render();

      preview.querySelectorAll('button').forEach(button => {
        button.disabled = false;
      });
    }
  });

  // Nettoyage des aperçus
  window.addEventListener('pagehide', () => {
    photos.forEach(photo => URL.revokeObjectURL(photo.url));
  });

  render();
})();
