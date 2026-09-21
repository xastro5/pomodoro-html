# Minuteur Pomodoro

Un minuteur Pomodoro minimaliste avec un magnifique affichage d'horloge numérique à sept segments, un widget météo et des durées personnalisables pour la concentration et les pauses.

[English](README.md) · [Français](README_fr.md) · [中文](README_zh-CN.md)

![Theme](https://img.shields.io/badge/theme-light%2Fdark-cyan)
![License](https://img.shields.io/badge/license-MIT-blue)

## Fonctionnalités

- **Préréglages regroupés** : Focus — Long (60 min), Default (40 min) ; Break — Long (15 min), Short (5 min). Toutes les durées sont personnalisables.
- **Durée personnalisée** : ajustez la durée du minuteur directement (minimum 1 minute, sans maximum)
- **Deux styles d'horloge** : cliquez sur l'heure pour alterner discrètement entre les chiffres à sept segments et la police du décompte, avec la date en dessous
- **Suivi des sessions** : les points de progression indiquent les sessions de concentration terminées
- **Widget météo** : utilise les anciens émojis en couleur par défaut ; cliquez sur l'icône pour alterner entre émojis et contours colorés. Cliquez sur la température pour alterner entre ℃ et ℉. Ces choix ne sont jamais enregistrés : chaque ouverture ou rafraîchissement rétablit les émojis et ℃. Les données indisponibles sont masquées
- **Notifications sonores** : alertes audio à la fin du minuteur (Carillon, Cloche, Numérique)
- **Réveil** : alarme ponctuelle à une heure locale, avec rouleaux de sélection, choix et aperçu des sonneries, rappel réglable et arrêt
- **Thème sombre/clair** : commutation en un clic
- **Disposition adaptative** : vue verticale fluide, deux colonnes dans les fenêtres larges et peu hautes, et mini minuteur dans les très petites fenêtres
- **Garder éveillé** : empêcher l'écran de s'éteindre lorsque la page est visible, avec un message si le navigateur ne peut pas l'activer
- **Verrouillage de l'interface** : verrouiller l'interface pour éviter les clics accidentels
- **Réinitialisation de session** : tous les paramètres sont réinitialisés au rafraîchissement de la page

## Utilisation

Ouvrez simplement `index.html` dans n'importe quel navigateur moderne. Aucun serveur ni étape de construction requis.

### Contrôles du minuteur

- **Démarrer/Pause** : cliquez sur le bouton principal pour démarrer ou mettre en pause
- **Réinitialiser** : redémarrez la durée de session choisie, y compris une durée personnalisée
- **Verrouiller** : cliquez sur le bouton de verrouillage pour éviter les interactions accidentelles
- **Sélection du mode** : quatre boutons compacts, avec des libellés rouges pour la concentration et verts pour les pauses. Chaque bouton contient son propre symbole de concentration ou sa tasse, également cliquable ; le bouton sélectionné porte un fond légèrement teinté. Le survol indique le nom complet et la durée du préréglage ; Duration affiche la durée totale de la session.
- **Ajustement rapide** : utilisez +/− ou saisissez un nombre entier de minutes. Le temps écoulé est conservé : après 10 minutes d'une session de 40 minutes, + fait passer le temps restant de 30 à 31 minutes. La nouvelle durée totale doit dépasser le temps écoulé. Les sessions personnalisées affichent Custom Focus ou Custom Break.
- **Annuler un changement** : après un changement de préréglage, Undo restaure la session précédente et son état, en marche ou en pause. Une session en marche conserve son heure de fin initiale. Le message reste huit secondes, prolongées au survol ou au focus clavier ; une autre action sur le minuteur l'efface. Cliquer sur le préréglage déjà sélectionné ne réinitialise pas le décompte.
- **Heure de fin** : le minuteur en marche affiche l'heure de fin prévue ; en pause, il affiche Paused. Le décompte repose sur une heure de fin, évitant une dérive cumulative lorsque le navigateur retarde les mises à jour. La pause conserve le temps restant. Une session terminée reste à 00:00 jusqu'à ce que sa lueur soit acquittée.

Les modifications des préréglages s'appliquent aux prochaines sessions lorsqu'une session est en cours ou en pause. La session active conserve sa propre durée pour le décompte, le champ de durée et l'anneau. Modifier directement la durée conserve le temps écoulé ; Reset redémarre la durée totale choisie.

### Apparence de l'horloge et du décompte

Cliquez sur l'horloge pour alterner entre l'affichage à sept segments et les chiffres de la police système. Les deux montrent la même heure locale et occupent le même espace, avec un fondu discret, sans son ni menu. Entrée et Espace permettent aussi de changer de style lorsque l'horloge a le focus. Le décompte et le réveil restent inchangés ; un rafraîchissement rétablit les sept segments.

Cliquez sur les chiffres du décompte pour changer leur style indépendamment, avec les mêmes commandes au clavier et le même fondu discret. Les deux styles gardent la couleur du texte et la même taille visuelle. Le changement préserve l'échéance, la progression en pause et le réveil. Le style choisi reste actif après une remise à zéro ou une nouvelle session ; un rafraîchissement rétablit les chiffres de la police système. Les longues durées personnalisées s'adaptent à l'espace disponible dans les deux styles.

Les deux styles d'horloge conservent le rouge d'origine et la même taille visuelle. Les commandes de concentration et de pause conservent le rouge et le vert ; le préréglage actif porte un libellé plus gras. L'anneau est plus fin, son épaisseur est plafonnée sur grand écran et le pied de page reste petit, même en plein écran. En paysage ultralarge, les trois commandes du minuteur restent sous les réglages à gauche.

À la fin du minuteur ou au déclenchement du réveil, le halo et la lueur sur les bords pulsent ensemble toutes les 2 secondes pendant 10 secondes, puis toutes les 3 secondes jusqu'à un nouveau clic dans l'application ou un appui sur une touche. La commande utilisée garde son action habituelle. La couleur est rouge après la concentration, verte après la pause et ambrée pour le réveil. Arrêter les effets ne coupe pas la sonnerie : utilisez Snooze, Dismiss ou Échap. Le minuteur conserve la phase terminée, sa couleur, 00:00 et son message de fin jusqu'à l'acquittement. Il prépare ensuite la phase suivante sans la démarrer automatiquement. Start acquitte et démarre cette phase ; Reset la laisse à sa durée complète, les commandes de durée la modifient et le choix d'un préréglage sélectionne celui-ci. Les effets fonctionnent sans son, restent fixes jusqu'à une interaction en mode de mouvement réduit et attendent le retour à l'onglet s'ils démarrent en arrière-plan. Aucun état n'est enregistré entre les ouvertures.

### Disposition selon l'écran

La disposition privilégie une colonne centrée, y compris dans les fenêtres de bureau classiques au format 16:9. Lorsque la largeur et la hauteur le permettent, l'horloge, le décompte, les libellés, les commandes et les espacements grandissent ensemble, jusqu'à 1,5 fois leur taille habituelle. Le mode paysage pour écran ultralarge ne s'active qu'à partir de 1440 pixels CSS de largeur et d'un rapport largeur/hauteur d'au moins 2:1 : l'horloge et les préréglages se placent alors à côté du décompte, avec les mêmes proportions. Un grand écran ne suffit pas à déclencher ce mode. Lorsque la hauteur manque et que la largeur le permet, une disposition paysage compacte garde les commandes accessibles ; la date et les informations météo sont abrégées. Les fenêtres carrées restent en portrait lorsque les commandes tiennent.

Les très petites fenêtres affichent un mini minuteur qui privilégie le décompte, les commandes de lecture et l'accès au réveil. Les mêmes préréglages et réglages de durée passent dans Settings. Une fine barre de progression remplace l'anneau lorsque la hauteur devient très faible. L'horloge secondaire, la météo, les points de session et le pied de page sont omis dans cette vue ; l'apparence et Garder éveillé restent accessibles dans Settings si leurs icônes ne tiennent plus dans la barre d'outils.

Le redimensionnement conserve l'heure de fin, la progression en pause et le réveil. Les réglages prennent la forme d'un panneau compact dans une fenêtre étroite et d'un popover ancré lorsqu'il y a de la place, en laissant l'engrenage accessible pour fermer. Les boutons de validation et de fermeture du réveil restent au-dessus du contenu défilant. Les deux panneaux s'adaptent à la zone visible réduite par un clavier logiciel ; en dessous des tailles minimales pratiques, le contenu peut défiler plutôt que masquer des commandes.

### Réveil

L'application reste contenue dans un seul fichier autonome `index.html`, y compris les styles du réveil et la génération des sons.

- Cliquez sur l'icône de réveil en haut. Faites défiler les rouleaux des heures et minutes, cliquez sur un nombre visible ou utilisez les flèches du clavier pour choisir l'heure au format 24 heures, puis enregistrez avec la coche orange. Une heure déjà passée, y compris la minute actuelle, est programmée pour demain ; l'éditeur indique Today ou Tomorrow ainsi que le délai restant, par exemple « in 1 hr 30 min ».
- L'heure enregistrée apparaît directement à côté de l'icône, dans le même bouton compact. Cliquez pour modifier ; l'infobulle affiche la date complète et l'état du son. Le bouton de fermeture abandonne les modifications non enregistrées ; **Delete Alarm** supprime l'alarme.
- Le réveil possède son propre interrupteur **Sound** et son sélecteur **Tone** (Chime, Bell, Digital), indépendants de la sonnerie Pomodoro. Choisir une sonnerie lance un aperçu si le son est activé ; le bouton de lecture permet de la réécouter.
- Ouvrez **Tone** pour régler **Volume** (5–100 %, 70 % par défaut). L'aperçu utilise ce niveau. L'alarme démarre à 20 % du volume choisi et l'atteint progressivement en huit secondes ; un rappel recommence cette montée. Désactiver Sound coupe le son et désactive l'aperçu et le réglage du volume.
- Réglez **Snooze** entre 1 et 15 minutes, ou choisissez **Off** pour désactiver le rappel. La valeur par défaut est cinq minutes. L'alarme utilise la durée enregistrée.
- Cliquez sur la ligne **Tone** ou **Snooze** pour ouvrir un rouleau compact, avec une sélection mise en évidence et des bords estompés. Faites défiler, cliquez sur une option visible ou utilisez les flèches. Un seul sélecteur s'ouvre à la fois, sans menu déroulant natif. Entrée replie le rouleau ; Échap ferme d'abord le sélecteur ouvert, puis abandonne les modifications de l'éditeur au deuxième appui. Vous pouvez aussi faire défiler une ligne fermée pour changer sa valeur.
- À l'heure prévue, la boîte de dialogue s'affiche et la sonnerie se répète jusqu'à **Dismiss**, Échap ou un rappel. Les modifications de l'heure, du son, de la sonnerie, du volume et du rappel prennent effet uniquement après enregistrement.
- Le réveil fonctionne indépendamment du minuteur Pomodoro. Le verrouillage empêche de modifier l'alarme, mais permet toujours d'arrêter ou de reporter une alarme qui sonne.
- Gardez la page ouverte et l'appareil éveillé. Une suspension du navigateur peut retarder l'alerte ; une alarme arrivée à échéance est détectée à la reprise. Fermer la page arrête l'alarme et l'actualiser l'efface.

Utilisez un navigateur récent prenant en charge HTML dialog et Web Audio. Si le son est indisponible, l'application le signale et affiche tout de même l'alerte à l'écran.

### Paramètres

Cliquez sur l'engrenage pour ouvrir le panneau compact ; un deuxième clic, un clic à l'extérieur ou Échap le ferme. L'engrenage reste une icône, discrètement mise en évidence lorsque le panneau est ouvert. Les réglages sont accessibles au clavier et regroupés par durée, son du minuteur et options générales :
- Personnaliser la durée de chaque mode (sans limite maximale)
- Activer/désactiver le son
- Choisir le son de notification (Carillon, Cloche, Numérique) et l'écouter avec le bouton de lecture
- Activer/désactiver Garder éveillé : l'icône n'est mise en évidence que si le verrou de veille est réellement acquis ; le panneau explique les échecs ou interruptions
- Basculer le mode sombre

## Comment ça fonctionne

La technique Pomodoro utilise des intervalles de travail concentré (généralement 25-30 minutes) suivis de courtes pauses. Après avoir complété 4 sessions de concentration, une pause plus longue est automatiquement déclenchée.

```
Session de concentration → Pause courte → Session de concentration → Pause courte → Session de concentration → Pause courte → Session de concentration → Pause longue
```

## Compatibilité des navigateurs

Utilisez une version récente de Chrome, Edge, Firefox ou Safari prenant en charge HTML Popover, dialog et Web Audio. Garder éveillé nécessite aussi Screen Wake Lock et l'autorisation du navigateur ; le minuteur fonctionne sans cette option. L'application reste un seul fichier HTML, sans dépendances d'exécution.

## Vérification

Avec Node.js, Playwright et Microsoft Edge installés, exécutez `node --test tests/controls.test.cjs tests/layout.test.cjs`. Les tests couvrent les ajustements de durée, Undo, le clavier, les échecs de verrou de veille, l'aperçu sonore et l'indépendance du réveil. Les vérifications de disposition comprennent 18 tailles représentatives en clair et sombre, 168 tailles intermédiaires, le focus pendant le redimensionnement, le tactile, des tailles équivalentes à un zoom de 200 % et la simulation d'un clavier logiciel. `PLAYWRIGHT_PATH` permet d'indiquer une autre installation de Playwright, `BROWSER_CHANNEL` un autre navigateur Chromium et `TEST_ARTIFACTS` un dossier de captures. Ces outils ne sont nécessaires que pour les tests.

## Stack technique

- HTML, CSS, JavaScript pur (sans dépendances)
- API Web Audio pour la génération des sons
- API Wake Lock pour empêcher la mise en veille de l'écran
- API Open-Meteo pour les données météo

## Auteur

astrovyz

## Licence

MIT

---

*Ce README a été généré par IA*
