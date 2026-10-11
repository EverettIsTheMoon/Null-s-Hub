# Null's Hub

A little collection of browser games I put together in one place. Play it at **https://nullshub.chto-on-delaet.ru/**.

Most of it was made with AI, but the layout, the ideas, and a lot of the code are mine.

## What's here

35 games you can play right in your browser. No installs, no sign-ups.

- 2048
- Bad Time Simulator
- Baldi's Basics
- Basketball Stars
- Bank Robbery 2
- BitLife
- Cluster Rush
- Doge Miner
- Drift Boss
- Flappy Bird
- FNAF
- FNaF 2
- FNaF 3
- FNaF 4
- FNF
- Funny Shooter 2
- Geometry Dash
- Johnny Trigger
- Level Devil
- PolyTrack
- Ragdoll Archers
- Ragdoll Hit
- Retro Bowl
- Rocket Soccer Derby
- Sandbox City
- Sandbox Galore
- SCP-096
- Slope
- Space Invaders
- Stack
- Stickman Hook
- Superhot
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
