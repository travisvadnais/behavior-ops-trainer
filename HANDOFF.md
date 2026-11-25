# Behavior Ops // Brain Installer — Project Handoff

> **For the next AI agent:** Read this file to get full context on the **Behavior Ops Trainer** app, how it was built, user preferences, and where all resources live.

---

## 1. Project Overview & Goal
The user wanted to turn Chase Hughes's 1,027-page book ***The Behavior Ops Manual*** into an interactive learning game—extracting the psychological tactics, models, cognitive biases, and tactical protocols, summarizing them without jargon, and building practical micro-games around each one to "install" them into memory.

- **App Directory (Workspace):** `C:\Users\travi\.gemini\antigravity\scratch\behavior-ops-trainer`
- **Live URL (when running):** `http://127.0.0.1:5173/`
- **Desktop Shortcut:** `C:\Users\travi\OneDrive\Desktop\Behavior Ops Trainer.lnk`
- **Google Drive Source File ID:** `1GVzxjTg94x85wO69rMopIep3CaNs8S5-` (`_OceanofPDF.com_The_Behavior_Ops_Manual...`)

---

## 2. User Preferences & Design Decisions
1. **Zero Jargon First:** The user prefers plain-English executive summaries and concrete, everyday real-world examples upfront (`plainSummary` + `quickExample`), with technical manual terminology (`overview`, `mechanism`, `fieldGuide`) tucked into a collapsible **Deep-Dive Manual Notes & Field Cues** section.
2. **Multiple Drills per Tactic:** One question per tactic wasn't enough to internalize the concept. Each tactic has **3 distinct interactive drills** (`Question 1 of 3`, `2 of 3`, `3 of 3`), and a tactic is only marked **Installed** when the user nails **3/3** in that module.
3. **One-Click Boot After Restarts:** The user wanted a Desktop shortcut with a custom icon that silently boots the lightweight production preview server (`vite preview --host 127.0.0.1 --port 5173`) if not already running and opens the browser.

---

## 3. Current Architecture & Key Files
- **`src/types.ts`**: TypeScript interfaces (`Tactic`, `TacticGame`, `ScenarioGame`, `SpotCueGame`, `SequenceGame`, `UserStats`, `MasteryStatus`).
- **`src/data/tactics.ts`**: **80 tactics** extracted from **Sections 01–08** of the manual, with **3 drills each (240 total drills)** across 6 categories:
  - `Frame & Pillars`
  - `Authority & Presence`
  - `Profiling & Detection`
  - `Linguistic & Covert Influence`
  - `Enhanced Influence & Biases`
  - `Tactical Protocols`
- **`src/components/TacticGameView.tsx`**: Multi-question drill engine supporting:
  - `scenario`: Realistic situation + 4 choices with instant explanation feedback
  - `spot_cue`: Transcript/behavior snippet + 4 diagnostic choices
  - `sequence`: Interactive step-ordering builder (`ArrowUp` / `ArrowDown`)
- **`src/components/GauntletMode.tsx`**: 7-round mixed **Rapid-Fire Gauntlet** pulling randomly from the 240-drill pool.
- **`src/App.tsx`**: Main Arsenal view (search, category chips, status filters, XP/Streak HUD), split-screen Field Brief + Drill workspace, and `localStorage` persistence under key `behavior_ops_trainer_stats_v1` (tied to `http://127.0.0.1:5173`).
- **`launch.bat` & `launch.vbs`**: Silent Windows launcher that checks if port `5173` is listening, starts `node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 5173` minimized if needed, and opens `http://127.0.0.1:5173/`.
- **`app-icon.ico`**: Custom cyan/emerald tactical neural-crosshair icon used by the Desktop shortcut.
- **`reference/`**:
  - `reference/behavior_ops_manual.pdf` (16 MB source PDF from Google Drive)
  - `reference/manual_text.txt` (full 1,027-page extracted text, ~42,002 lines, for adding more tactics/drills later)

---

## 4. Tech Stack & Build Commands
- **Stack:** Vite 6 (`^6.2.0`), React 19, TypeScript, `lucide-react`, custom dark tactical CSS (`src/index.css`). *(Note: Vite 6 is used intentionally because Vite 8 had a Windows rolldown native-binding issue.)*
- **Build:** `npm run build` (`tsc && vite build` — verified passing with 0 errors)
- **Serve (production preview):** `.\node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 5173`
  - **Important:** After editing `src/`, always run `npm run build` so `vite preview` (used by the Desktop shortcut) serves the updated `dist/` bundle!

---

## 5. Natural Next Ideas (If the User Wants to Expand)
- Extract additional tactics/drills from **Sections 09–11** (currently Sections 01–08 are covered in `src/data/tactics.ts`).
- Add **Export / Import JSON** for `localStorage` progress backup.
- Add **Spaced Repetition / "Review Installed"** mode or timed reflex challenges in Gauntlet Mode.
