# Video Spreekcoach

Een eerste lokaal prototype van een AI-achtige spreekcoach die video gebruikt als leerbron.

## Wat werkt nu

- Een eigen video laden in de browser.
- Transcript of tekst plakken.
- De tekst automatisch knippen in kleine oefenstukjes.
- Een fragment vertraagd afspelen.
- Een fragment loopen.
- Zelf start- en eindpunten markeren.
- Je stem laten herkennen en vergelijken met de doelzin.
- Oefenen in stappen: luisteren, traag nadoen, herhalen, vergelijken.

## Starten

Open `index.html` in je browser. Chrome of Edge werkt het best voor spraakherkenning.

## Echte AI-uitbreiding

Voor een volledig automatische versie voeg je serverkant drie modules toe:

1. Transcriptie: audio uit de video halen en omzetten naar tekst met tijdcodes.
2. Visuele analyse: frames uit de video nemen en laten beschrijven wat mond, houding, emotie en gebaren doen.
3. Lesgenerator: transcript en visuele analyse omzetten naar oefenstukjes, feedback en herhaalopdrachten.

De huidige app is bewust zonder API-sleutel gemaakt, zodat je meteen kunt oefenen zonder installatie of kosten.
