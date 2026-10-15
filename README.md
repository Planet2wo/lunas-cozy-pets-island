# Luna's Cozy Pets – The Island (v24)

This folder holds the whole playable game in the smallest form that runs in **Google AI Studio (Build)**, in Vite, or on any static web host.
Claude and Gemini both edit these same files.

```
index.html            page markup: HUD, dock buttons, closets, market, controller pad
public/style.css      every style (dock, closets/market, controller layout, launch film)
public/game.js        the whole game: world, pets, Luna's and Lady Moon's AI, weather, market, camera, controls
public/audio/         launch-theme.mp3: the launch-film soundtrack (55 s of the song, starting at 3:01)
public/icons/         favicon, home-screen icons and the link-preview image (made from Sprites/)
public/manifest.webmanifest   lets phones "Add to Home Screen" as a full-screen app
public/vendor/        three.js r128 + bloom add-ons, copied here by `npm install` (offline play; CDN is the fallback)
tools/vendor-three.cjs  the small script `npm install` runs to fill public/vendor
Sprites/              reference art (Luna, the dogs, the cover, the folder icon); not shipped with the game
metadata.json         AI Studio app name/description
package.json          `npm run dev` / `npm run build` (Vite) + three.js r128
vite.config.js        dev server on port 3000 (AI Studio's preview port), relative build paths
RUN.bat               double-click launcher: local server or the standalone file
play/Luna's Cozy Pets Island.html   the same game as one file: double-click to play
```

three.js r128 and its bloom add-ons load from `public/vendor/` (filled by `npm install`), with the CDN as an automatic fallback. `game.js` uses the global `THREE` (aliased to `T`).
Nothing needs installing to play: without `public/vendor` the game simply loads three.js from the CDN.

## Run it

| Where | How |
|---|---|
| Google AI Studio | Use the import steps below. |
| Locally | `npm install`, then `npm run dev`, then open http://localhost:3000 |
| On your computer, no setup | Double-click `play/Luna's Cozy Pets Island.html` |
| Any static host | `npm run build` and upload `dist/`, or upload `index.html` with `style.css` and `game.js` placed beside it. |

## Import into Google AI Studio

**Option A: GitHub (the official route, and it keeps Claude and Gemini in sync)**
1. Create a GitHub repo and upload the contents of this folder (not the folder itself) to its root.
2. In AI Studio, open **Build**, click the **+** in the prompt box, choose **Import from GitHub**, and pick the repo.
3. In the app's **Settings → GitHub**, link the repo for two-way sync. Gemini's edits get committed there, and Claude can work from the same repo.

**Option B: Zip upload**
1. In AI Studio **Build**, start any new app (for example, type "blank app") and let it finish.
2. Open the **Code** view and delete every file the agent created.
3. Click **+ → Upload file** and choose a zip of this folder's contents (the files must sit at the zip's root; leave out `node_modules`).
4. Click **Save**, then let the preview reload. If AI Studio wraps the app in React, tell Gemini:
   "Keep index.html as the entry point. This is a plain three.js app, so do not convert it to React."

## Rules for any AI editing this project (Claude or Gemini)

1. **Keep three files of code.** Edit `index.html`, `public/style.css`, and `public/game.js` in place. Don't split the game into modules or convert it to React/TypeScript. `game.js` is a single closure where everything shares scope.
2. **Keep three.js at r128** (CDN tags in `index.html`). Newer versions renamed APIs that the game uses.
3. **Place ground objects with `meshH(x,z)`** (the visible faceted terrain), not `hAt(x,z)`. Use `groundStone(x,z,s,sz,col)` for path stones.
4. **Controller layout:** stick at bottom-left (`#stickBase`), buttons at bottom-right (`#padBtns`). Sizes come from the CSS variables on `#pad` (`--stick`, `--pb`, `--edge`), so tune those rather than hard-coding pixels.
5. **Saves** live in `localStorage` (coins, items, outfits). Keep the existing keys so players keep their progress.
6. **Bump the version** in the header comment of `game.js` and add a line to the changelog below for every change.

## Changelog
- **v24 (Jam button):** A new 🎵 Jam button in the controls (or press J) sends Lady Moon straight to the deck radio to put on a song and dance, and Luna always comes over to join in. Press it again while the music's playing and Lady Moon switches it off. The button stays lit while a jam is on.
- **v23 (deck radio + camera):** A little table with a teal retro radio now sits on the deck beside the front door. Every few minutes Lady Moon walks over, switches it on and dances to one of her favourite songs (Boy Harsher – “Pain” or The Stranglers – “Golden Brown”, in `public/audio/radio-*.mp3`), then switches it off. Often Luna comes over and dances with her. The music plays from the radio: it's louder near the deck, quieter and softer far away, muffled indoors, and paused during the launch film. Camera: all smoothing is now frame-rate independent. Slow Orbit eases in and out, pauses while you steer with the controller, and makes the Auto Cam close-ups drift gently around the characters. Auto Cam now also films Lady Moon (switching with M keeps it on), adds wide island shots every half-minute or so while she walks, waits a moment before cutting to a close-up, glides on a damped spring with a top speed instead of jumping, and travels around the subject when it changes angle. The controller's “forward” stays fixed while you hold the stick, so Auto Cam can't make you walk in circles.
- **v22 (walking fix):** Luna's and Lady Moon's walk cycles ran in reverse: each foot was lifted while it swung backward and dragged forward along the ground. Each foot now lifts as it swings forward and stays planted as it pushes back, so they walk heel-to-toe in the direction they're heading. Their soles also stay flat on the ground through the stride, with a slight toe-up as each foot swings through.
- **v21 (Lady Moon's hair):** Her blue hair now looks like real hair: a hand-drawn strand texture (darker roots, lighter ends, a soft glossy shine band near the crown) adds colour and bump detail, and 32 wavy, tapered locks of hair layer over the sides and back, with two pieces framing her face. All the locks are one mesh (one extra draw call), and the hair still shows under every hat.
- **v20 (release cleanup):** Removed the old backups, rescued copies, loose zips and build caches from the project folder. `Sprites/` moved back beside the project, where the folder's custom icon expects it, so its 9 MB of reference art no longer ships inside every build. three.js r128 now installs with `npm install` and is copied into `public/vendor`, so the game runs offline and doesn't depend on a CDN, with the CDN kept as an automatic fallback. Added a real favicon, home-screen icons, a web app manifest (Add to Home Screen opens full-screen) and a link-preview image, all made from the game's own cover art.
- **v19 (smarter characters, Lady Moon controller):**
  - **Shared island awareness** (`ISLAND` in game.js). Leaf litter builds up around the veranda, front steps, pet corner, market, pier and shrine path, faster in autumn and rain and where the pets hang out, and you can see it on the ground. Food bowls empty as the pets eat. Every pet and dog has hunger and loneliness. Jobs are claimed, so Luna and Lady Moon never do the same chore or cuddle the same pet at once.
  - **Luna** has new jobs: sweeping, chase games with the pups (zoomies), grooming a dog, and going to chat with Lady Moon. Feeding is driven by real hunger and empty bowls, and cuddles go to the loneliest pet rather than the nearest. She remembers jobs that failed (a blocked path) and avoids them for a while. If she gets stuck repeatedly she steps back onto open ground and re-plans. She gives up outdoor jobs when rain starts, and drops minor tasks to feed a pet that is begging when the bowls are empty.
  - **Lady Moon** has a needs-driven brain (social, craft, pets, garden, tidy, snack, play, explore, rest). She helps in the garden (weeding, picking off bugs, deadheading, sometimes bringing back herbs to sell), sweeps, cuddles the loneliest pet, plays yarn games with the cats, starts zoomies with the pups, visits Luna to chat (Luna stops and chats back), cheers Luna on during fun activities, shelters on the veranda in rain and at night, and dances in the snow. She recovers when stuck.
  - **Pets** walk to their bowls to eat when hungry. When the bowls are empty they come and ask Luna or Lady Moon for food. They seek out company with whichever human is nearer, cats curl up somewhere cozy at night or in the rain, and lightning startles them home.
  - **Controller fix:** with the camera on Lady Moon (M), the stick and buttons now steer Lady Moon: walk/run, jump, wave, cuddle, and zoomies with a pup. Press M to switch back to Luna. Whoever isn't being controlled carries on with her own life.
  - **Polish:** a version tag in the controls panel, cache-busting so browsers always load the newest files, and the Halloween banner skips its redraw and texture upload when it's invisible or far away. Falling leaves look up the ground height a few times per second instead of every frame.
  - **Tested** with a headless run of the real game logic: 15 simulated minutes through day, night, rain and snow, plus a sweep of every feature. No errors and no stuck characters.
- **v18 (film soundtrack):** The launch film now has music (`FILM_MUSIC` in game.js). The song fades in as the first shot starts and fades out over 3 seconds when the scene ends or is skipped, then stops and rewinds for next time. It pauses in background tabs. Fades use Web Audio where available (so they also work on iPhone) and fall back to the audio element's volume when the game is opened straight from disk. The file is `public/audio/launch-theme.mp3`, cut to the 55 seconds the film uses, starting 3:01 into the song (1.3 MB instead of 7 MB). The single-file `play/` version loads it from `../public/audio/`.
- **v17 (launch film):** Pressing 🚀 Launch Rocket now plays a 46-second cinematic (`CINE` in game.js). It has six shots cut like a movie trailer: an establishing shot low over the water at lift-off, a low angle over Luna's shoulder, a long-lens tracking shot of the climb, a rising crane over the island as the jellyfish blooms, a reaction close-up of Luna (with Lady Moon when she's nearby), and a slow pull-back reveal. It adds letterbox bars, a vignette, a "Luna's Island · Twilight Launch" title card, quick dips to black on each cut, slight handheld drift and stronger bloom. The game's interface hides while it plays. Skip it with the Skip button or Escape. It brings Luna out of the house first if she's inside, keeps her watching the sky, and hands the camera back smoothly. Only the button plays the film; the automatic first-dusk launch stays a normal view.
- **v16 (launch camera fix):** Pressing Launch could sink the camera into the ocean. The launch view tilted the camera to look up from below Luna's eye-line, which at wide zoom put it under the sea, and the camera floor only checked the ground, never the water. Now the camera stays at its normal height and only turns its gaze up toward the show, and it can never go below sea level. The launch also used to happen behind the ring of backdrop mountains (radius 340 to 880), which hid most of it. The pad is now out at sea inside that ring and the flight climbs well above the skyline, with the plume scaled for the closer distance.
- **v15 (rocket launch):** Rebuilt the twilight rocket launch as a "space jellyfish", modelled on real twilight launch photos. A glowing orange ascent arc rises from the sea and curves across the sky. A white-hot engine light has a halo that turns from orange to blue as it climbs. Around the engine grows a huge translucent blue-white bell with a bright rim and rays fanning back from the engine, with a soft atmospheric halo. A billowing sunlit exhaust cloud with warm sunset tints trails behind. After engine cut-off the jellyfish keeps spreading and slowly fades (about 50 seconds in all). It's one instanced draw call plus the bell, with no scene lights. During the launch the camera tilts up to frame the sky (drag or scroll to take it back), and Luna stops to watch, which the auto camera frames as a "Look up!" shot.
- **v14 (characters & closets):** Fixed Luna's bald spot: both heads were built wide and then turned 90°, which made them deeper than wide, so the back of Luna's head poked through her hair (and her nose and masks, and Lady Moon's nose and glasses, sank into their faces). The heads now have the intended proportions, and the hair builder keeps every strand a small gap above the scalp. Lady Moon has new hair: a cobalt-blue wavy bob with a full crown, side-swept bangs and her red-orange streak, built with the same shared builder as Luna's (`hairShape()` with `HAIR_LUNA` / `HAIR_MOON`). Her crocheted hats are now sized to sit on top of her hair with the brim just above her glasses, so her blue hair always shows. "No hat" leaves her hair as it is. "Luna's Closet" is now **Clothing Closets**. Every outfit and mask in the shop can be worn by both characters: Lady Moon gets skirts, shorts and pants, outfit accessories (a crochet hat replaces caps, beanies and bows) and all masks (her glasses rest on the mask, and mask ears hide under a hat). Choosing a mask on Lady Moon's tab used to change Luna's mask instead. Lady Moon's mask is saved.
- **v13 (release polish):** Faster rendering on desktop: when bloom runs through its multisampled WebGL2 buffer, the canvas no longer allocates its own anti-aliasing buffer, which saves a full-screen MSAA buffer and its per-frame resolve. Blinking and facial expressions for Luna and Lady Moon now swap pre-drawn textures instead of repainting and re-uploading a 512px canvas several times a second. The rocket launch no longer adds a scene-wide point light that every lit shader evaluated all session. The auto camera now pulls back to keep both Luna and Lady Moon in frame when they're together (before, it aimed between them from close-up distance and cut Luna out). The status line no longer shows raw `<small>` tags (for example after a catch), and it only touches the page when the text changes. The rocket toast's stray "[cite: 16]" text was removed. "Start over" now also clears Lady Moon's outfit, the market tab and the one-time rocket launch. Rain audio pauses in background tabs. If the device drops the graphics context, a Reload button appears. The R/N hotkeys ignore key-repeat and the time slider. Builds use relative paths (`base: './'`), so `dist/` works from any folder or sub-path. Added page metadata, a no-JavaScript message, and a rebuilt `play/` single-file version. The old v12 zip was removed from `public/`, where it was being shipped inside every build.
- **v12:** Path stones set into the ground on both islands. The controller has an anchored stick at bottom-left and buttons at bottom-right, working in portrait and landscape. The camera avoids roofs. A three.js CDN fallback was added. The game was split into index.html, style.css and game.js for AI Studio.
