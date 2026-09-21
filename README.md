# Pomodoro Timer

A minimalist Pomodoro timer with a beautiful 7-segment digital clock display, weather widget, and customizable focus/break durations.

[English](README.md) · [Français](README_fr.md) · [中文](README_zh-CN.md)

![Theme](https://img.shields.io/badge/theme-light%2Fdark-cyan)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Grouped Timer Presets**: Focus — Long (60 min), Default (40 min); Break — Long (15 min), Short (5 min). All durations are customizable.
- **Custom Duration**: Adjust timer length directly (minimum 1 minute, no maximum)
- **Two Clock Styles**: Click the real-time clock to switch quietly between classic seven-segment digits and numerals matching the countdown, with the date below
- **Session Tracking**: Visual progress dots show completed focus sessions
- **Weather Widget**: Automatically detects your location and shows current temperature with a colored weather symbol; click the temperature to switch between ℃ and ℉. Unavailable readings are hidden
- **Sound Notifications**: Audio alerts when timer completes (Chime, Bell, Digital)
- **Alarm Clock**: Set a one-time local alarm with time wheels, selectable tones, sound preview, adjustable snooze, and dismiss controls
- **Dark/Light Theme**: One-click theme toggle
- **Adaptive Layout**: Fluid portrait and desktop views, two columns in wide shallow windows, and a mini timer for very small windows
- **Keep Awake**: Prevent screen from sleeping while the page is visible, with feedback if the browser cannot enable it
- **UI Lock**: Lock the interface to prevent accidental clicks
- **Session Reset**: All settings reset on page refresh

## Usage

Simply open `index.html` in any modern browser. No server or build step required.

### Timer Controls

- **Start/Pause**: Click the main button to start or pause the timer
- **Reset**: Restart the selected session duration, including a custom duration
- **Lock**: Click the lock button to prevent accidental interactions
- **Mode Selection**: Four compact buttons with red focus labels and green break labels. Each button contains its own focus symbol or cup, including within its clickable area; the selected button has a soft tinted pill and a bolder label. Hover to see each preset's full name and duration; the Duration field shows the active session's total.
- **Quick Adjust**: Use +/− or enter a whole number of minutes. Adjustments preserve elapsed progress: after 10 minutes of a 40-minute session, + changes the remaining time from 30 to 31 minutes. A new total must exceed time already elapsed. Custom sessions display Custom Focus or Custom Break.
- **Undo**: After changing presets, Undo restores the previous session, including its paused or running state. A running session retains its original deadline. Undo is available for eight seconds, extended while hovering or focusing the message; another timer action clears it. Selecting the already active preset leaves its countdown untouched.
- **Finish Time**: A running timer shows its planned finish time; a paused timer shows Paused. The countdown uses an end timestamp, so delayed browser callbacks do not accumulate drift. Pause preserves the remaining time, and Reset or a manual mode change cancels a pending automatic transition.

Changes to preset settings apply to future sessions while a session is running or paused. The active session keeps its own duration for the countdown, duration field, and progress ring. Direct duration changes preserve elapsed time in both running and paused sessions. Reset starts the full selected duration again.

### Clock and Timer Appearance

Click the clock itself to alternate between seven-segment and system-font numerals. Both show the same local time and occupy the same space, with a brief fade and no sound or menu. You can also focus the clock and press Enter or Space. Switching styles leaves the countdown and alarm untouched; refreshing restores the seven-segment default.

Click the countdown digits to switch their style independently, with the same keyboard support and quiet fade. Both countdown styles keep the current text color and match in visible size. Changing appearance preserves the running deadline, paused progress, and alarm. The chosen timer style continues through resets and new sessions; refreshing restores the numeral default. Long custom durations fit within the available space in either style.

Both clock styles use the original red and match in visible size; red and green continue to identify focus and break controls. The progress ring has a thinner stroke capped on large screens, and the footer stays small even in fullscreen.

### Screen Layout

The layout responds to available width and height, including intermediate window sizes:

- **Portrait first:** a centered vertical composition is the default, including ordinary 16:9 desktop windows. When there is enough height and width, the clock, countdown, labels, controls, and spacing grow together, up to 1.5 times their regular size. The clock keeps its proportions relative to the ring.
- **Extra-wide:** landscape activates at widths of at least 1440 CSS pixels and an aspect ratio of at least 2:1. The clock, presets, and playback controls sit on the left, beside the countdown and session indicator. A large screen alone does not trigger landscape.
- **Shallow:** when height is limited and width permits, a compact landscape layout keeps the countdown and playback controls accessible. Short dates and reduced weather detail make room for essential controls. Square windows retain portrait when the controls fit.
- **Mini:** very narrow or short windows prioritize the countdown, playback controls, and alarm access. The same preset and duration controls move into Settings. Very shallow windows replace the ring with a thin progress bar. The secondary clock, weather, session dots, and footer are omitted in this view; appearance and Keep Awake remain available in Settings when their toolbar icons no longer fit.

Resizing preserves the running deadline, paused progress, current preset, and alarm. Settings opens as a compact sheet in narrow windows and an anchored popover when there is room; the gear remains accessible for closing it. The alarm editor keeps Save and Cancel above a scrolling body. Both panels fit the visual viewport when a software keyboard reduces the visible area. Below practical minimum sizes, content can scroll rather than clipping controls.

### Alarm Clock

The app remains one self-contained `index.html` file, including alarm styles and generated sounds.

- Click the alarm icon in the top bar. Scroll the hour and minute wheels, click a visible number, or use the arrow keys to choose a time in 24-hour format, then save with the orange checkmark. A time already passed, including the current minute, is scheduled for tomorrow; the editor shows Today or Tomorrow and the time until the alarm, such as “in 1 hr 30 min.”
- The saved time appears directly beside the icon in the same compact button. Click either to edit. Its tooltip includes the full date and sound status. The close button discards unsaved edits; **Delete Alarm** clears the saved alarm.
- The alarm has its own **Sound** switch and **Tone** picker (Chime, Bell, Digital), independent of the Pomodoro tone. Selecting a tone previews it when sound is enabled; the separate play button previews it again.
- Expand **Tone** to adjust **Volume** (5–100%, default 70%). The preview uses that level. A ringing alarm starts at 20% of the chosen level and rises to it over eight seconds; snoozing starts the rise again. Sound off mutes the alarm and disables preview and volume adjustment.
- Choose **Snooze** from 1–15 minutes, or **Off** to remove the snooze action. The default is five minutes. The selected duration is used when the alarm rings.
- Click the **Tone** or **Snooze** row to reveal a compact wheel with a highlighted selection and fading edges. Scroll, click a visible option, or use the arrow keys. Only one picker opens at a time, with no native dropdown menus. Enter folds the wheel away; Escape closes the open picker first, then discards the editor's unsaved changes on a second press. You can also hover over a closed row and scroll to change its value.
- When due, the alarm shows a dialog and repeats its sound until you choose **Dismiss**, press Escape, or snooze. Time, tone, volume, sound, and snooze edits take effect only when saved.
- Alarms run independently of the Pomodoro countdown. UI Lock prevents changing the alarm, but a ringing alarm can still be dismissed or snoozed.
- Keep the page open and the device awake. Browser suspension can delay alerts; a due alarm is detected when execution resumes. Closing the page stops the alarm, and refreshing clears it.

Use a current browser with HTML dialog and Web Audio support for the alarm. If audio is unavailable, the app reports it and still shows the alarm on screen.

### Settings

Click the gear icon to open the compact settings panel; click it again, click outside, or press Escape to close. Controls support keyboard navigation, and the gear indicates whether its panel is open. Settings are grouped into Durations, Timer Sound, and General:
- Customize each mode's duration (no maximum limit)
- Toggle sound on/off
- Choose notification sound (Chime, Bell, Digital) and preview it with the play button
- Toggle Keep Awake (prevent screen from sleeping). Its toolbar highlight reflects an acquired wake lock, and the panel explains failures or interruptions.
- Toggle dark mode

## How It Works

The Pomodoro Technique uses focused work intervals (typically 25-30 minutes) followed by short breaks. After completing 4 focus sessions, a longer break is triggered automatically.

```
Work Session → Short Break → Work Session → Short Break → Work Session → Short Break → Work Session → Long Break
```

## Browser Compatibility

Use a current Chrome, Edge, Firefox, or Safari with HTML Popover, dialog, and Web Audio support. Keep Awake also needs the Screen Wake Lock API and browser permission; if unavailable, the timer still works. The application itself has no dependencies and remains a single HTML file.

## Verification

The optional browser tests cover preset controls, exact elapsed-time adjustments, Undo, keyboard interactions, wake-lock failures, audio preview, and alarm independence. Layout checks include 18 representative sizes in light/dark mode, a sweep through 168 intermediate sizes, focused edits during resizing, touch controls, 200% zoom-equivalent viewport sizes, and simulated software-keyboard viewport changes. With Node.js, Playwright, and Microsoft Edge available, run:

```sh
node --test tests/controls.test.cjs tests/layout.test.cjs
```

Set `PLAYWRIGHT_PATH` if Playwright is installed elsewhere, `BROWSER_CHANNEL` to use another installed Chromium channel, and `TEST_ARTIFACTS` to save layout screenshots. These tools are only needed to run the tests.

## Tech Stack

- Pure HTML, CSS, JavaScript (no dependencies)
- Web Audio API for sound generation
- Wake Lock API for preventing screen sleep
- Open-Meteo API for weather data

## Author

astrovyz

## License

MIT

---

*This README was generated by AI*
