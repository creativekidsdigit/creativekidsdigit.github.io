---
name: html-accessibility-fixes
description: Appliquer des corrections d'accessibilité HTML (liens "Skip to main content", IDs de balises `<main>`, attributs `aria-hidden` et `role` pour les SVG)
source: auto-skill
extracted_at: '2026-07-10T15:44:03.687Z'
---

# Correction d'accessibilité HTML

## Contexte
Ce projet contenait plusieurs problèmes d'accessibilité courants dans les sites web :
- Liens "Skip to main content" manquants ou pointant vers des ancres incorrectes
- Balises `<main>` sans identifiants uniques
- SVG décoratifs sans attributs `aria-hidden="true"` ou `role="img"`
- Styles en ligne réduisant la maintenabilité

## Approche utilisée

### 1. Ajout du lien "Skip to main content"
**Problème** : Les utilisateurs de lecteurs d'écran ne pouvaient pas sauter directement au contenu principal.

**Solution** : Ajouter ce lien en haut de chaque page, juste après `<body>` :
```html
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <!-- reste du contenu -->
```

**Fichiers corrigés** :
- `index.html`
- `404.html`
- `teachers.html`
- `thank-you.html`
- `products/index.html`

### 2. Identifiants uniques pour `<main>`
**Problème** : Les balises `<main>` utilisaient des IDs non standard comme `id="top"`.

**Solution** : Standardiser avec `id="main-content"` :
```html
<main id="main-content">
```

**Fichiers corrigés** :
- `index.html`
- `404.html`
- `teachers.html`
- `thank-you.html`
- `products/index.html` (partiellement)

### 3. Accessibilité des SVG
**Problème** : Les SVG décoratifs (logos, icônes) n'avaient pas d'attributs d'accessibilité.

**Solution** :
- Pour les SVG **décoratifs** : `aria-hidden="true" role="img"`
- Pour les SVG **informatifs** : `role="img" aria-label="description"`

Exemple pour le logo :
```html
<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true" role="img">
  <!-- contenu SVG -->
</svg>
```

**Fichiers corrigés** :
- `index.html`
- `404.html`
- `teachers.html`
- `thank-you.html`
- `products/index.html`
- `products/1as-getting-through-reading.html` (partiellement)

### 4. Centralisation des styles
**Problème** : Des styles CSS en ligne réduisaient la maintenabilité.

**Solution** : Déplacer les styles en ligne vers des fichiers CSS dédiés.

**Styles déplacés** :
- `.announcement-launch` → `home.css`
- `.countdown-display` → `home.css`
- `.lead-magnet-section` (et ses enfants) → `home.css`
- `.err-wrap` (et ses enfants) → `home.css`
- `.thankyou-wrap` (et ses enfants) → `home.css`

## Vérification
Pour vérifier que les corrections sont appliquées :
1. **Lien "Skip to main content"** : Doit être présent juste après `<body>`
2. **ID de `<main>`** : Doit être `id="main-content"`
3. **SVG accessibles** : Doivent avoir `aria-hidden="true" role="img"` ou `role="img" aria-label="..."`
4. **Pas de styles en ligne** : Les balises `<style>` ne doivent pas être dans le `<body>`

## Impact
- ✅ **Accessibilité améliorée** : Conforme aux standards WCAG pour la navigation au clavier
- ✅ **SEO optimisé** : Meilleure structure sémantique pour les moteurs de recherche
- ✅ **Maintenabilité** : Code plus propre et plus facile à mettre à jour
- ⚠️ **À compléter** : Certains fichiers produits nécessitent encore ces corrections

## Fichiers restants à corriger
Les fichiers suivants dans `products/` nécessitent encore ces corrections :
- `2as-make-peace-grammar.html`
- `2as-schools-oral-expression.html`
- `3as-ancient-civilizations-written-expression.html`
- `3as-ethics-in-business-listening.html`
- `bac-reading-writing-mock-paper-1.html`
- `adhd-after-school-reset-toolkit.html`
- `adhd-emotional-regulation-toolkit.html`
- `adhd-homework-toolkit.html`
- `adhd-morning-routine-toolkit.html`

Pour chacun :
1. Ajouter `<a class="skip-link" href="#main-content">Skip to main content</a>` après `<body>`
2. Ajouter `id="main-content"` à `<main>`
3. Ajouter `role="img" aria-hidden="true"` aux SVG décoratifs