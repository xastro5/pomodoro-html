# Minuteur Pomodoro

Un minuteur Pomodoro minimaliste avec un magnifique affichage d'horloge numérique à sept segments, un widget météo et des durées personnalisables pour la concentration et les pauses.

[English](README.md) · [Français](README_fr.md) · [中文](README_zh-CN.md)

![Theme](https://img.shields.io/badge/theme-light%2Fdark-cyan)
![License](https://img.shields.io/badge/license-MIT-blue)

## Fonctionnalités

- **Modes de minuteur multiples** : préréglages 60 min, 40 min (par défaut), 15 min et 5 min (tous personnalisables)
- **Durée personnalisée** : ajustez la durée du minuteur directement (minimum 1 minute, sans maximum)
- **Horloge numérique à sept segments** : horloge en temps réel au style LED classique avec affichage de la date
- **Suivi des sessions** : les points de progression indiquent les sessions de concentration terminées
- **Widget météo** : détecte automatiquement votre position et affiche la température actuelle
- **Notifications sonores** : alertes audio à la fin du minuteur (Carillon, Cloche, Numérique)
- **Réveil** : alarme ponctuelle à une heure locale, avec rouleaux de sélection, choix et aperçu des sonneries, rappel réglable et arrêt
- **Thème sombre/clair** : commutation en un clic
- **Garder éveillé** : empêcher l'écran de s'éteindre pendant le minuteur
- **Verrouillage de l'interface** : verrouiller l'interface pour éviter les clics accidentels
- **Réinitialisation de session** : tous les paramètres sont réinitialisés au rafraîchissement de la page

## Utilisation

Ouvrez simplement `index.html` dans n'importe quel navigateur moderne. Aucun serveur ni étape de construction requis.

### Contrôles du minuteur

- **Démarrer/Pause** : cliquez sur le bouton principal pour démarrer ou mettre en pause
- **Réinitialiser** : cliquez sur le bouton de réinitialisation pour redémarrer la session actuelle
- **Verrouiller** : cliquez sur le bouton de verrouillage pour éviter les interactions accidentelles
- **Sélection du mode** : choisissez parmi les préréglages 60m, 40m, 15m ou 5m
- **Ajustement rapide** : utilisez les boutons +/− ou saisissez directement une durée personnalisée

### Réveil

L'application reste contenue dans un seul fichier autonome `index.html`, y compris les styles du réveil et la génération des sons.

- Cliquez sur l'icône de réveil en haut. Faites défiler les rouleaux des heures et minutes, cliquez sur un nombre visible ou utilisez les flèches du clavier pour choisir l'heure au format 24 heures, puis enregistrez avec la coche orange. Une heure déjà passée, y compris la minute actuelle, est programmée pour demain ; l'éditeur indique Today ou Tomorrow.
- L'heure enregistrée apparaît directement à côté de l'icône, dans le même bouton compact. Cliquez pour modifier ; l'infobulle affiche la date complète et l'état du son. Le bouton de fermeture abandonne les modifications non enregistrées ; **Delete Alarm** supprime l'alarme.
- Le réveil possède son propre interrupteur **Sound** et son sélecteur **Tone** (Chime, Bell, Digital), indépendants de la sonnerie Pomodoro. Choisir une sonnerie lance un aperçu si le son est activé ; le bouton de lecture permet de la réécouter.
- Réglez **Snooze** entre 1 et 15 minutes, ou choisissez **Off** pour désactiver le rappel. La valeur par défaut est cinq minutes. L'alarme utilise la durée enregistrée.
- Cliquez sur la ligne **Tone** ou **Snooze** pour ouvrir un rouleau compact, avec une sélection mise en évidence et des bords estompés. Faites défiler, cliquez sur une option visible ou utilisez les flèches. Un seul sélecteur s'ouvre à la fois, sans menu déroulant natif. Entrée replie le rouleau ; Échap ferme d'abord le sélecteur ouvert, puis abandonne les modifications de l'éditeur au deuxième appui. Vous pouvez aussi faire défiler une ligne fermée pour changer sa valeur.
- À l'heure prévue, la boîte de dialogue s'affiche et la sonnerie se répète jusqu'à **Dismiss**, Échap ou un rappel. Les modifications de l'heure, du son, de la sonnerie et du rappel prennent effet uniquement après enregistrement.
- Le réveil fonctionne indépendamment du minuteur Pomodoro. Le verrouillage empêche de modifier l'alarme, mais permet toujours d'arrêter ou de reporter une alarme qui sonne.
- Gardez la page ouverte et l'appareil éveillé. Une suspension du navigateur peut retarder l'alerte ; une alarme arrivée à échéance est détectée à la reprise. Fermer la page arrête l'alarme et l'actualiser l'efface.

Utilisez un navigateur récent prenant en charge HTML dialog et Web Audio. Si le son est indisponible, l'application le signale et affiche tout de même l'alerte à l'écran.

### Paramètres

Cliquez sur l'icône engrenage pour accéder à :
- Personnaliser la durée de chaque mode (sans limite maximale)
- Activer/désactiver le son
- Choisir le son de notification (Carillon, Cloche, Numérique)
- Activer/désactiver Garder éveillé (empêcher l'écran de s'éteindre)
- Basculer le mode sombre

## Comment ça fonctionne

La technique Pomodoro utilise des intervalles de travail concentré (généralement 25-30 minutes) suivis de courtes pauses. Après avoir complété 4 sessions de concentration, une pause plus longue est automatiquement déclenchée.

```
Session de concentration → Pause courte → Session de concentration → Pause courte → Session de concentration → Pause courte → Session de concentration → Pause longue
```

## Compatibilité des navigateurs

Fonctionne mieux avec les navigateurs modernes supportant ES6+ :
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

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
