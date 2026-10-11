# Null's Hub

A little collection of browser games I put together in one place. Play it at **csproject.org**.

Most of it was made with AI, but the layout, the ideas, and a lot of the code are mine.

## What's here

16 games you can play right in your browser. No installs, no sign-ups.

- Cluster Rush
- Doge Miner
- Flappy Bird
- FNAF
- FNF
- Geometry Dash
- PolyTrack
- Ragdoll Archers
- Sandbox Galore
- SCP-096
- Space Invaders
- Stack
- Super Mario Bros.
- Tetris
- Time Shooter 3
- Zombie Survival

Geometry Dash is the biggest one. It has its own level editor, custom songs, click sounds, and icons, and it saves your progress through Supabase.

## The sneaky stuff

**Panic key** — pick a key in the settings and pressing it instantly sends you to Google, so you can hide the site the second someone walks by.

**Disguise button** — changes the tab icon and title so the page looks like Google Classroom, Schoology, or Clever instead of a game hub.

## How it's built

Just HTML, CSS, and JavaScript. Tailwind (from a CDN) handles most of the styling, and Supabase stores the Geometry Dash saves. There's no build step — everything is static files, so you can host it anywhere.

## Running it yourself

Open `index.html` in a browser, or serve the folder if you want saving to work:

```
python3 -m http.server 8000
```

Then go to http://localhost:8000.

## Credits

Made by Everett Moon, with help from Copilot/AI (VS Code)

Please don't just rip this site. If you borrow anything, give me credit.
