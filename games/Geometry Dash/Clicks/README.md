# Click sounds

Put the audio files you want to use for button and editor click sounds in this
folder. Supported formats are MP3, WAV, OGG, OGA, OPUS, M4A, AAC, FLAC, WEBA,
and WEBM.

Add each filename to `sounds.json`. The game loads that manifest from
`/games/Geometry Dash/Clicks/sounds.json`, fetches the listed audio from this
folder, and shows each filename without its extension under **Settings →
Click sounds**. Select **Off** to mute click sounds.

The website host does not provide a browser-readable listing of files in a
folder, so the manifest is how the game discovers which sounds are present.
