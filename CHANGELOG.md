# Changelog

All notable changes to open-aim. Newest first.

## [1.5.0] - 2026-11-12

**The whole app in Thai.** Your settings and training data are kept when you update.

### Added

- Thai interface by default: lobby, all top tabs, drill names and descriptions,
  settings, round HUD and results, the coach, Sens tools, Backups, Updates,
  VALORANT settings import and the Studio.
- **ENGLISH / ภาษาไทย** button in the top bar to switch language (the app reloads).
  The coach follows the same setting.
- Map, agent, weapon and drill names stay in English, as in Thai VALORANT.

### Changed

- The language button replaces the original Vietnamese toggle.

## [1.4.0] - 2026-11-12

**Aim coach: see why you miss and what to train next.** In Thai by default, with an
English switch. Your settings and training data are kept when you update.

### Added

- **Coach** button in the lobby bar, and a round summary card after every round with
  your main weak spot and an easier/harder drill to try next.
- **Why you missed**: every shot is sorted into headshot, hit, over-flick, under-flick,
  shot while moving, aimed too low or too high, with a tip for the most common ones.
- **Crosshair placement**: how far your crosshair was from the head when a target
  appeared, and how much of the time it sat at head level.
- **Counter-strafe**: the share of shots fired while still moving (aim for under 10%).
- **Progress** charts for accuracy, headshots, reaction time, crosshair placement and
  shots while stopped, for all drills or one drill.
- **Training plan**: about 15 minutes of drills picked from the weak spots in your last
  10 rounds, each with a Start button.
- **Difficulty**: over 85% accuracy suggests the harder drill, under 55% the easier one.
- **Spray**: where each bullet of a burst went, relative to the first one.
- **Shot review**: your crosshair's last 0.6 s before each shot, played back at 0.1×-1×.
- **Sensitivity lab**: your results per sensitivity, with a −15% / same / +15% A/B test.

Coach data stays on your computer (localStorage, `es-coach-history-v1`).

## [1.3.1] - 2026-11-12

### Changed

- The app checks for updates and downloads installers from
  [zcloudstudio0/open-aim](https://github.com/zcloudstudio0/open-aim) instead of
  unkwsr/open-aim. Download and clone links in the README and site point here too.
  The game itself is the same as 1.3.0.
- If you have 1.3.0 or older installed, install 1.3.1 or newer once by hand; after that
  the app updates itself from this repository.

## [1.3.0] - 2026-10-29

**The biggest update yet: a new map, 15 skins, new aiming and effects, a much bigger Studio and smoother performance.**

Your settings and training data are kept when you update.

### New map
- **Sunset**, with six pre-aim drills: A Short, A Tube and B Main, each in **Easy** (bots don't shoot) and **Hard** (bots shoot back).
- Sunset has its own map art on drill cards, favorites and the loading screen.

### Aiming and weapons
- **New aim down sights (ADS)** for the Vandal, Phantom and Guardian: real first-person animations, the gun rises to your eye, a folding reflex sight flips open, and the gun and sight sway and kick together.
- **The same ADS on more guns:** Odin, Ares, Spectre, Stinger and Bulldog now aim like the rifles, with the holo sight.
- **Sniper scopes** for the Marshal, Outlaw and Operator, with a smoother opening.
- Recoil shows on the gun while aiming, even in perfect-accuracy drills.
- Skins keep their own look while aiming: the sight's housing is hidden and the holo dot stays.
- Aim speed, zoom, sensitivity, spread and accuracy are all unchanged; only the look and feel are new.
- The gun and hands move together while strafing.
- Aiming right after pulling out a gun no longer shows the sight off to the side.
- **No more first-shot freezes:** the worst frame while firing dropped from up to 150 ms to under 4 ms.
- Every weapon and skin is prepared before a drill starts, so switching weapons doesn't stutter.
- Phantom, Spectre and Ghost tracers use the same orange as the Vandal.

### Studio
- **3D** and **Detailed** views: Detailed shows the real game map, and 3D shows clean maps.
- **Copycat bots:** record a run, and a bot repeats it and shoots at you. Saved runs are kept in a **Runs** library.
- Bot options: **Unpredictable** movement, **jumps** (0.2–2 m), **occasional crouching** and **slows when hit**.
- Bots jump with the same gravity as you, with a 1.15 m default jump height.
- **Arenas** from 12 to 200 m, with walls up to 40 m; walls up to 200 m long.
- Quiet **Dark** and **Light** looks with **Flat** or **Grid** surfaces; target dots are white in Dark mode and black in Light mode.
- Simpler editing: drag a wall's ends, white circles to resize, one arrow to rotate. Pieces snap to 0.1 m and 5° (hold Alt for free), with undo and redo.
- Dragging pieces in the editor is much smoother.
- Bots face the way you set them, and respawn at their own spawn point.
- Drills started from the Studio return to the Studio when you leave them.

### New skins
- **Vandal:** RGX Yellow, Gaia Orange, Gaia White
- **Phantom:** BlastX
- **Guardian:** Prime
- **Sheriff:** Singularity
- **Ghost:** Smite
- **Operator:** Araxys, Rogue
- **Melee:** Black Market Butterfly, Orange Butterfly, Karambit Damascus Steel, Prime Axe, Silkleaf Fan, Half Life Crowbar
- Several skins have their own firing sounds, kill sounds and kill effects.
- Melee skins have their own equip, attack and **inspect (Y)** animations.
- Pick skins in **Settings**. New defaults: RGX Vandal, BlastX Phantom, Singularity Sheriff, Rogue Operator and Black Market Butterfly.

### Effects and sound
- **New headshot effect:** sharp, quick splashes on bots.
- Hitting a dot (Grid Shooting and other target drills) plays a new hit sound, without the impact burst.
- **Advanced bullet tracers** (Settings > Visuals), with their own look per skin.
- Bots use the original weapon sounds.

### HUD and settings
- **Shooting error graph rebuilt** (Settings > Video > Stats): smaller and more precise, with a thin bar per shot, yellow for spray error and blue for movement error, and lighter on performance.
- **Frame mode** in Video: Unlimited, Match display or Custom (30–1000 FPS, presets 120 / 144 / 165 / 240 / 360).
- The FPS counter sits under the minimap, only while you play.
- The **Interface** setting is back (Video > Smoothness): Enhanced, or Performance with no glass blur.
- Crosshair settings in a match have a bigger preview with the map behind it, the RGX sight and the sniper scope.
- Crosshair changes apply right away in a drill, without leaving it.
- **Import VALORANT settings**, the update panel, Backups and Sens tools all have the square esports look. The update panel shows what's new before you install.
- **Updates** button in the lobby bar, with a red dot when a new version is out.

### Lobby and app
- Opens in **fullscreen** like a real game. F11 switches to a window, and the app remembers your choice.
- Startup screen while the game loads, and a loading card when a drill needs a moment.
- Restarting a drill skips the full loading screen.
- Smooth mouse-wheel scrolling in the lobby and menus.
- A calmer lobby: no glossy sweeps or zooming images, and quick page changes.
- Cleaner card corners, and the filter bar fits on one line while scrolling.
- Favorites work offline.
- The VALORANT import prompt waits until loading is done.
- Difficulty labels are always in English.

### Performance
- Smoother frames on Sunset, Corrode and drills with many bots.
- Maps and bots draw with less work, without bots popping in late when you peek.
- Smoother frames with no FPS limit.
- Faster drills with jumping and crouching bots.

### Fixes
- Corrode: invisible walls no longer stop bullets in arches and doorways.
- The game no longer tries to load online pages that aren't there.
- Fixed an error in the lobby bar that repeated on every page change.

## [1.2.0] - 2026-10-25

### Added

- Update notice in the lobby when a new release is out, with Update now, Remind me in
  7 days and Skip this version. Check for updates in Settings. Updating downloads the
  installer from the official GitHub release, checks it and restarts the app; settings
  and training data are kept. Thanks to @edu-boni.
- Import VALORANT settings (Settings > Import VALORANT settings): sensitivity, ADS and
  scope multipliers, crosshair, keybinds and more, with a preview, a backup and Undo.
  Thanks to @edu-boni.
- Bigger, clearer headshot effect. Thanks to @edu-boni.
- The installer lets you choose the install folder. Uninstalling asks whether to keep
  or delete your settings and training data (kept by default).

### Changed

- The original site's community links (KOOK, QQ), WeChat QR sign-in and language
  button are hidden, and the app uses the open-aim icon everywhere.

## [1.1.1] - 2026-10-24

Back to the stable build from before map culling: uncapped FPS, the accurate FPS meter
and the esports start screen stay.

### Removed

- Map culling, the Interface setting and the CPU line on the FPS meter. Map culling
  lowered performance on some PCs; they may come back once they are tested further.

## [1.1.0] - 2026-10-24

### Added

- Desktop frame settings in Video: Frame mode (No frame limit), an FPS cap up to 1000
  and a VSync toggle with a restart button.
- Map culling (Video > Smoothness, off by default): maps are batched in 32 m chunks so
  only the parts in view are drawn. Same picture, 50-80% fewer triangles. Turn it on
  for laptops and integrated graphics; on strong graphics cards it can lower FPS.
- FPS meter shows the game's CPU time per frame in rounds.
- Interface setting (Video > Smoothness): Enhanced (default) or Performance, with solid
  panels instead of glass blur.

### Fixed

- FPS meter counts the frames the game draws, so it shows the real frame rate with No
  frame limit instead of the monitor's refresh rate.
- Round start screen ("Click anywhere to start") uses the esports look again.
- Shader warm-up no longer throws and stalls when a map's materials are replaced.

## [1.0.0] - 2026-10-23

First version as a repository.

### Added

- Desktop app with a local game server, offline mode and file overrides.
- Esports theme, top bar, FPS meter, sensitivity tools and backups.
- Studio: build drills on a 2D map with bots, smoke and cover, preview them in 3D, and play them.
- 25 extra scenarios, one file each in `scenarios/`.
- Clear English names and descriptions for all 99 drills.
- `scripts/build-scenarios.mjs` to check scenarios and build the training list.
- Contribution guide, issue and pull request templates, and a CI check for scenarios.
- `examples/starter-drill.json`, Discussion forms, a release guide and a GitHub Pages site.
