# Gym Bro portfolio prototype

The page at `/gym-bro-demo/` replays the Gym Log Figma design without a Figma
iframe, account, application database, service worker or external API. Screen
images and links were exported from the connected Desktop Bridge on 2026-11-05.
The source design is preserved. Temporary export copies are removed after use.

`screens.json` retains the source node IDs, geometry and supported transitions.
Images live in `public/gym-bro-demo/` and load on demand. Do not preload the whole
collection. The page has its own entry in `vite.config.js`.

Six starting scenarios expose the workout, Bro, plan, history, profile and first
launch flows. Bro has direct entries for invitations, progress, live status and
the kick. Double tap and long press on Bro workout cards run locally; reactions
use the original Figma icons. Restart clears the current scenario's state.

The page uses the same night-sky renderer and background as the portfolio.
Action controls use the portfolio's glass pill buttons and purple accent.
Scenario and variant choices use plain rows with circle markers, without glass
fills or selection glow. The app inside the phone keeps its own green design.
The main home image omits the sample Bro fire reaction on the latest workout;
its separate filename avoids reusing the previous image from a browser cache.

On mobile, the phone and controls fill a stable small viewport from the first
render. The scenario selector opens in a native dialog above the phone; opening,
closing and selecting a scenario do not resize or scroll the player. On desktop,
the title, scenario grid and phone occupy fixed areas; only the details below the
scenario grid scroll if needed. The external back button returns to the previous
screen, or is explicitly labelled as a return to the case when there is no screen
history. Internal back arrows without history lead to the demo home screen.

Sending a kick animates the original paw and avatar layers, then leaves the
disabled sent button. There is no cancellation toast or undo transition.
Returning to the kick within the scenario preserves its sent state; only
restarting the demo resets it. Reduced motion shows the confirmation directly.

This is a click-through prototype: names, weights, search, dates, account and
sharing flows are prepared examples. It does not send messages, authenticate,
install an app, create workouts or change anyone's data. Static controls without
source links stay visual. The highlight control identifies available actions.

The player adds a keyboard Done transition, local gesture reactions and a
remaining-set transition; corrects the swapped template/delete sample links;
and chooses the returning-user summary outside the first-launch scenario.
These adaptations are confined to the web player, not the Figma source.

Validation: `npm run build` includes the existing site page-weight checks. Browser
checks cover the workout through summary, Bro acceptance, double-tap and held
reactions, kick animation and sent-state persistence, scenario reset, long-page scrolling, mobile layout and the
link from the case. Browser-size checks do not establish real-device behavior.

Mobile-player regression checks use 390×844 and 320×568 viewports: the initial
menu is closed, the document does not scroll, dialog open/close/selection leaves
the phone bounds unchanged, internal scroll survives the dialog, root and step
back actions work, and resizing an open mobile menu restores the desktop guide.
Desktop checks compare title, subtitle, scenario grid and phone bounds across all
six scenario selections; their positions and sizes remain unchanged.

Opening the menu focuses its static title rather than a scenario button.
Pointer input does not draw a focus ring on external controls; Tab navigation
retains an inset indicator that stays within the row/button bounds.
