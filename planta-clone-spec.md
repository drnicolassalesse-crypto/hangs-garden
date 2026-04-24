# Planta Clone — Product Requirements & Developer Specification

> **Purpose:** This document is a complete product specification for building a Planta-inspired plant care mobile application. It covers all user-facing features, data models, business logic, UI/UX flows, and technical architecture needed to implement the app from scratch.
>
> **Excluded features (out of scope):** Care Share, Live Weather Integration, Community, Plant Hospital, Dr. Planta AI Diagnosis, and Plant Identification by camera.

---

## 1. Product Overview

### 1.1 What the App Does

This app allows users to manage a personal collection of individual plant pots, each with its own independent care schedule. A user can own two pots of the same species (e.g., two rose pots) where each pot tracks its own care timeline from the date it was first added. The app sends timely reminders to water, fertilize, mist, repot, prune, and clean each pot according to a schedule that is either auto-generated based on plant and pot parameters, or manually customized by the user.

### 1.2 Core Philosophy

- **Per-pot, not per-species:** Every physical pot is a unique entity in the system with its own timeline.
- **Action sequences, not just reminders:** Each plant has a set of recurring care tasks, each with its own frequency, and each task for each pot starts counting from the date it was last performed (or added).
- **User-in-control:** Auto-generated schedules are smart defaults, but users can override every interval.
- **No complexity bloat:** No weather APIs, no social features, no AI camera. The core is scheduling, reminders, and logging.

### 1.3 Target Platforms

- iOS (React Native or Flutter, targeting iOS 15+)
- Android (React Native or Flutter, targeting Android 8+)

---

## 2. User Roles & Authentication

### 2.1 User Account

- Email + password registration and login
- Optional: Sign in with Google / Apple
- Password reset via email
- Each user has their own private collection of plants; no data sharing between accounts
- User profile: display name, avatar (optional), skill level (Beginner / Intermediate / Expert), notification preferences

### 2.2 Skill Level

Set during onboarding and editable in Settings. Affects the verbosity of care instructions displayed in the UI:

| Level | Description |
|---|---|
| Beginner | Full step-by-step instructions shown for every care action |
| Intermediate | Summary instructions with tips |
| Expert | Minimal UI — just task name, plant name, and due date |

### 2.3 Notification Frequency

User-configurable in Settings:

| Setting | Behavior |
|---|---|
| Minimal | One reminder per task, day-of only |
| Moderate | Reminder the day before + day-of |
| Frequent | Reminder 2 days before + day-of + overdue alert after 1 day |

---

## 3. Core Data Models

### 3.1 `PlantSpecies`

A read-only database record representing a species of plant. This is the master reference that new plant pots are created from.

```
PlantSpecies {
  id: UUID
  common_name: string               // e.g., "Rose"
  scientific_name: string           // e.g., "Rosa"
  family: string
  description: string
  image_url: string
  care_defaults: CareDefaults       // default schedule intervals
  difficulty: enum(easy, moderate, hard)
  light_requirement: enum(low, medium, bright_indirect, direct)
  toxicity: enum(non_toxic, toxic_to_pets, toxic_to_humans, toxic_to_all)
  tags: string[]                    // e.g., ["flowering", "outdoor", "edible"]
}
```

### 3.2 `CareDefaults`

Default schedule intervals (in days) for each care action, used when a new pot is added. These are per-species baseline values that the scheduling engine adjusts based on pot parameters.

```
CareDefaults {
  watering_interval_days: number       // e.g., 7
  fertilizing_interval_days: number    // e.g., 14
  misting_interval_days: number        // e.g., 3
  repotting_interval_days: number      // e.g., 365
  pruning_interval_days: number        // e.g., 30
  cleaning_interval_days: number       // e.g., 30
}
```

### 3.3 `Pot` (the central entity)

Each physical pot owned by the user. Two pots of the same species are two separate `Pot` records.

```
Pot {
  id: UUID
  user_id: UUID
  species_id: UUID
  display_name: string               // user-defined, e.g., "Rose Pot 1"
  photo_url: string | null           // user-uploaded photo
  site_id: UUID | null               // location/room reference
  created_at: timestamp
  notes: string | null               // free-text notes

  // Pot physical parameters (affect schedule calculation)
  pot_size: enum(xs, s, m, l, xl)    // XS < 5cm, S 5-10cm, M 10-20cm, L 20-35cm, XL > 35cm
  pot_material: enum(plastic, terracotta, ceramic, fabric, glass, metal, wood)
  soil_type: enum(standard, succulent_cactus, orchid, moisture_retaining, peat_free)
  light_level: enum(low, medium, bright_indirect, direct_sunlight)
  location_type: enum(indoor, outdoor, greenhouse)

  // Schedule override flag
  use_custom_schedule: boolean        // if true, use custom_schedule instead of calculated
  custom_schedule: CustomSchedule | null

  // Care tasks (array of CareTask, one per action type)
  care_tasks: CareTask[]
}
```

### 3.4 `CareTask`

One scheduled care action within a pot. Each pot has multiple `CareTask` records (one per action type).

```
CareTask {
  id: UUID
  pot_id: UUID
  action_type: enum(watering, fertilizing, misting, repotting, pruning, cleaning)
  is_enabled: boolean                 // user can disable specific tasks per pot
  interval_days: number               // calculated or custom interval
  last_performed_at: timestamp | null // null = never performed (use pot.created_at as baseline)
  next_due_at: timestamp              // computed: last_performed_at + interval_days
  snooze_until: timestamp | null      // if snoozed, override next_due_at display
  notes: string | null                // per-task notes (e.g., "use diluted fertilizer")
}
```

### 3.5 `CareLog`

An immutable history record created each time a care task is completed or skipped.

```
CareLog {
  id: UUID
  pot_id: UUID
  care_task_id: UUID
  action_type: enum(...)
  action: enum(completed, skipped, snoozed)
  performed_at: timestamp
  notes: string | null
  photo_url: string | null           // optional photo taken at time of care
}
```

### 3.6 `Site`

A user-defined location/room where pots are grouped.

```
Site {
  id: UUID
  user_id: UUID
  name: string                       // e.g., "Balcony", "Living Room", "Kitchen"
  icon: string                       // emoji or icon key
  created_at: timestamp
}
```

### 3.7 `CustomSchedule`

Per-pot override for all care intervals. Active only when `Pot.use_custom_schedule = true`.

```
CustomSchedule {
  watering_interval_days: number | null
  fertilizing_interval_days: number | null
  misting_interval_days: number | null
  repotting_interval_days: number | null
  pruning_interval_days: number | null
  cleaning_interval_days: number | null
}
```

### 3.8 `JournalEntry`

A growth/care diary entry per pot.

```
JournalEntry {
  id: UUID
  pot_id: UUID
  created_at: timestamp
  content: string
  photo_urls: string[]
  tags: string[]                    // e.g., ["new_growth", "repotted", "pest_spotted"]
}
```

---

## 4. Schedule Calculation Engine

### 4.1 Overview

When a pot is created, the engine computes the initial `interval_days` for each `CareTask`. The base interval comes from `PlantSpecies.CareDefaults`, then a series of multipliers are applied based on the pot's physical parameters.

### 4.2 Adjustment Factors (Multipliers)

Each factor below is a multiplier applied to the base interval. A multiplier > 1 means the plant needs care **less often** (longer interval). A multiplier < 1 means care is needed **more often** (shorter interval).

#### Pot Size Multiplier (watering only)
| Pot Size | Multiplier |
|---|---|
| XS (< 5 cm) | 0.6 (dries out very fast) |
| S (5–10 cm) | 0.8 |
| M (10–20 cm) | 1.0 (baseline) |
| L (20–35 cm) | 1.3 |
| XL (> 35 cm) | 1.6 |

#### Pot Material Multiplier (watering only)
| Material | Multiplier |
|---|---|
| Terracotta | 0.7 (porous, dries fast) |
| Fabric | 0.75 |
| Wood | 0.85 |
| Plastic | 1.0 (baseline) |
| Ceramic (glazed) | 1.1 |
| Glass | 1.15 |
| Metal | 1.0 |

#### Soil Type Multiplier (watering only)
| Soil Type | Multiplier |
|---|---|
| Succulent/Cactus | 1.5 (very well-draining) |
| Orchid bark | 1.2 |
| Peat-free | 1.0 |
| Standard | 1.0 (baseline) |
| Moisture-retaining | 0.75 |

#### Light Level Multiplier (watering only)
| Light Level | Multiplier |
|---|---|
| Low light | 1.3 (plant grows slowly, uses less water) |
| Medium | 1.0 (baseline) |
| Bright indirect | 0.85 |
| Direct sunlight | 0.7 (high evaporation) |

#### Location Type Multiplier (watering only)
| Location | Multiplier |
|---|---|
| Indoor | 1.0 (baseline) |
| Outdoor | 0.75 (wind + sun increase drying) |
| Greenhouse | 1.1 |

### 4.3 Final Interval Formula

```
final_interval = base_interval
               × pot_size_multiplier
               × pot_material_multiplier
               × soil_type_multiplier
               × light_level_multiplier
               × location_type_multiplier

final_interval = max(1, round(final_interval))  // minimum 1 day
```

> **Note:** Fertilizing, pruning, misting, cleaning, and repotting intervals use only the base species defaults — they are not adjusted by pot/soil parameters unless the user overrides them manually.

### 4.4 `next_due_at` Computation

```
if last_performed_at is null:
    next_due_at = pot.created_at + interval_days

else:
    next_due_at = last_performed_at + interval_days
```

This ensures that two pots of the same species created/watered at different times will always have different `next_due_at` values — their timelines are fully independent.

### 4.5 Snooze Logic

When a user snoozes a task:
- `CareTask.snooze_until` is set to a future timestamp (user picks: +1 day, +2 days, +3 days, or custom date)
- The task is hidden from the Today list until `snooze_until` is reached
- `next_due_at` is NOT changed — snooze only affects UI visibility
- A `CareLog` entry with `action = snoozed` is written

### 4.6 Skip Logic

When a user skips a task:
- A `CareLog` entry with `action = skipped` is written
- `CareTask.last_performed_at` is updated to now (the interval resets from the skip date, same as completing)
- `next_due_at` is recalculated

### 4.7 Complete Logic

When a user marks a task as done:
- A `CareLog` entry with `action = completed` is written
- `CareTask.last_performed_at` is updated to now
- `CareTask.snooze_until` is cleared
- `next_due_at` is recalculated: `now + interval_days`

---

## 5. Application Screens & Navigation

### 5.1 Navigation Structure

The app uses a **bottom tab bar** with 4 tabs:

```
[ Today ] [ My Plants ] [ Sites ] [ Settings ]
```

There is also a global **+** (FAB) button accessible from the Today and My Plants tabs to add a new plant.

---

### 5.2 Screen: Onboarding (first launch only)

**Flow:** Shown once on first launch, skippable after screen 2.

| Step | Content |
|---|---|
| 1. Welcome | App name, tagline, hero illustration |
| 2. Skill Level | Pick Beginner / Intermediate / Expert with descriptions |
| 3. Notification Preference | Minimal / Moderate / Frequent |
| 4. Create Account | Email + password, or Sign in with Google/Apple |
| 5. Add First Plant | Shortcut to the Add Plant flow (skippable) |

---

### 5.3 Screen: Today (Home)

**Purpose:** Shows all care tasks due today and overdue across all pots.

**Sections:**
- **Overdue** (red banner): Tasks past their `next_due_at` date, sorted by most overdue first
- **Today** (green): Tasks due today
- **Upcoming** (grey, optional toggle): Tasks due in the next 3 days

**Each task card shows:**
- Plant photo (thumbnail)
- Plant display name + pot name
- Care action icon + label (e.g., 💧 Water)
- Due date / "Today" / "X days overdue"
- Site badge (if assigned)

**Actions per card:**
- Tap → expands inline with care instructions (skill-level-appropriate)
- ✅ Done button → marks task complete
- 💤 Snooze button → opens snooze duration picker (1 day / 2 days / 3 days / custom)
- ⏭ Skip button → skips with confirmation dialog

**Filter bar (top):**
- Filter by Site (dropdown)
- Filter by Action Type (chips: All / Water / Fertilize / Mist / Repot / Prune / Clean)

---

### 5.4 Screen: My Plants

**Purpose:** Grid or list view of all the user's pots.

**Default view:** 2-column grid of pot cards.

**Each pot card shows:**
- Pot photo (or species illustration fallback)
- Display name
- Species common name
- Next due action + days until (e.g., "💧 in 2 days")
- Overdue indicator (orange dot) if any task is overdue

**Controls:**
- Toggle between grid and list view
- Search bar (filter by name or species)
- Sort: by name / by next due date / by site
- Filter by Site

**Tap a card → navigates to Plant Detail screen**

---

### 5.5 Screen: Plant Detail

**Purpose:** Full view of a single pot with all its tasks and history.

**Tabs inside Plant Detail:**
1. **Care** — all care tasks for this pot
2. **Journal** — growth diary entries
3. **Info** — species info, pot parameters, notes

#### Tab 1: Care

- List of all enabled care tasks for this pot
- Each task shows: action icon, name, interval, last performed date, next due date
- Tap a task → opens Task Detail sheet (see 5.6)
- Toggle to enable/disable a specific task (e.g., disable Misting for drought-tolerant plants)
- **Edit Schedule** button → opens the custom schedule editor

#### Tab 2: Journal

- Chronological list of journal entries with photos
- Tap entry → full view
- **+ Add Entry** button → opens journal entry composer

#### Tab 3: Info

- Species name, family, description, difficulty, light requirements, toxicity
- Pot parameters: size, material, soil type, light level, location type
- Edit button → opens the pot parameter editor
- Calculated vs. custom schedule indicator

**Header of Plant Detail:**
- Large photo (tappable to change)
- Display name (tappable to rename)
- Site badge
- Species name

---

### 5.6 Sheet: Task Detail

Slide-up sheet triggered from the Care tab or a Today card.

**Shows:**
- Action name + icon
- Care instructions (based on skill level setting)
  - Beginner: detailed steps with tips
  - Intermediate: bullet summary
  - Expert: one-line note
- Current interval (calculated or custom)
- Last performed date + by whom (always user in this version)
- Next due date
- Full log of past completions, skips, and snoozes

**Actions:**
- ✅ Mark as Done
- 💤 Snooze
- ⏭ Skip
- 📝 Edit interval / notes

---

### 5.7 Screen: Add Plant Flow

Multi-step flow. Progress indicator shown at top.

**Step 1 — Find Species**
- Search field with real-time filtering of the species database
- Browse by category (Tropical / Succulent / Flowering / Herb / Tree / Outdoor)
- Each result shows: common name, scientific name, thumbnail, difficulty badge
- Select → advance to Step 2

**Step 2 — Name Your Pot**
- Text input: "Give your pot a name" (pre-filled with species common name, e.g., "Rose")
- Upload photo button (camera or gallery)
- Site selector (pick existing site or create new inline)

**Step 3 — Pot Details**
- Pot size picker (XS / S / M / L / XL) with visual size illustration
- Pot material picker (icons: Plastic / Terracotta / Ceramic / Fabric / Glass / Metal / Wood)
- Soil type picker (Standard / Succulent-Cactus / Orchid / Moisture-retaining / Peat-free)

**Step 4 — Light & Location**
- Light level picker (illustrated: Low / Medium / Bright Indirect / Direct Sun)
- Location type toggle: Indoor / Outdoor / Greenhouse
- Optional: Light Meter tool shortcut (see 5.12)

**Step 5 — Last Care Dates (optional)**
- "When did you last water this plant?" — date picker
- "When did you last fertilize?" — date picker (skip option)
- Skipping defaults `last_performed_at = null`, which uses `pot.created_at` as baseline

**Step 6 — Review**
- Summary card: photo, name, species, site, pot params
- Calculated schedule preview (e.g., "Water every 6 days · Fertilize every 14 days")
- **Save Plant** button → creates Pot and all CareTask records

---

### 5.8 Screen: Edit Pot

Accessible from Plant Detail → Info → Edit. Same fields as Add Plant Steps 3–5, pre-populated. Saving recalculates all CareTask intervals (if not on custom schedule).

---

### 5.9 Sheet: Custom Care Schedule Editor

Triggered from Plant Detail → Care → Edit Schedule.

- Toggle: **Use Custom Schedule** (on/off)
- When on: number input per task (in days) for each enabled task
- When off: shows auto-calculated intervals (read-only, re-derived from pot params)
- Save → updates all `CareTask.interval_days` and recalculates `next_due_at`

---

### 5.10 Screen: Sites

**Purpose:** Manage physical locations and browse plants by room.

**List of sites**, each showing:
- Site icon + name
- Number of pots in this site
- Tap → Site Detail: filtered plant list for that site, with Today tasks filtered to that site

**Actions:**
- **+ New Site** → name + icon picker (emoji or preset icons)
- Swipe to delete / rename

---

### 5.11 Screen: Settings

Sections:

**Account**
- Display name, avatar, email
- Change password
- Sign out
- Delete account

**Preferences**
- Skill level (Beginner / Intermediate / Expert)
- Notification frequency (Minimal / Moderate / Frequent)
- Default reminder time (e.g., 8:00 AM)

**Data**
- Export care history (CSV)

**About**
- App version, terms of service, privacy policy, open-source licenses

---

### 5.12 Tool: Light Meter

Accessed from Add Plant Step 4 or from Plant Detail.

**How it works:**
- Uses the phone's camera ambient light sensor (via `react-native-camera` / platform sensor APIs) to measure the approximate lux level in front of the camera
- Displays a real-time reading in lux
- Maps the lux range to the 4 light categories used in the app:

| Lux Range | Category |
|---|---|
| 0 – 500 lux | Low Light |
| 500 – 2,500 lux | Medium |
| 2,500 – 10,000 lux | Bright Indirect |
| 10,000+ lux | Direct Sunlight |

- Shows an animated gauge with color zones
- "Use this reading" button auto-fills the light level on the Add/Edit Plant form

> **Implementation note:** Mobile camera light sensors vary in accuracy. Encourage users to point the camera toward the plant's typical light source (window) for best results.

---

### 5.13 Screen: Journal Entry Composer

- Rich text input (bold, bullet list, basic formatting)
- Photo attachment (up to 5 images per entry)
- Tag selector (checkboxes: New Growth / Repotted / Pest Spotted / Pruned / Blooming / Wilting / Other)
- Date picker (defaults to today, editable for backdating)
- Save / Discard

---

## 6. Notification System

### 6.1 Notification Types

| Type | Trigger | Example |
|---|---|---|
| Care Due | `next_due_at` reached | "💧 Time to water Rose Pot 1" |
| Care Overdue | 1 day after `next_due_at` (if not completed) | "⚠️ Rose Pot 1 is overdue for watering" |
| Pre-Reminder | Based on notification frequency setting | "💧 Rose Pot 1 needs water tomorrow" |
| Snooze Expiry | `snooze_until` reached | "💤 Snooze ended: time to water Rose Pot 1" |

### 6.2 Scheduling Logic

- Notifications are scheduled locally on the device (no push notification server required for MVP)
- Use platform local notification APIs: `expo-notifications` (Expo/RN) or `flutter_local_notifications` (Flutter)
- On app open, re-sync all scheduled notifications by:
  1. Cancelling all pending local notifications
  2. Re-scheduling from current `CareTask.next_due_at` values for all enabled tasks
- Notification payload contains `pot_id` and `care_task_id` for deep-linking into Plant Detail

### 6.3 Deep Linking

Tapping a notification should:
1. Open the app
2. Navigate directly to the Plant Detail → Care tab for the specific pot
3. Highlight the relevant care task

---

## 7. Plant Species Database

### 7.1 Structure

A static or server-synced read-only database of plant species. Can be bundled as a local JSON/SQLite file for offline support or fetched from a backend API.

**Minimum viable database:** 100–200 common species covering:
- Popular houseplants (Monstera, Pothos, Peace Lily, Snake Plant, Spider Plant, Fiddle Leaf Fig, etc.)
- Succulents & cacti (Echeveria, Aloe Vera, Jade Plant, etc.)
- Flowering plants (Rose, Orchid, African Violet, etc.)
- Herbs (Basil, Mint, Rosemary, Lavender, etc.)
- Outdoor / garden plants

Each species record includes all fields from `PlantSpecies` (Section 3.1) plus detailed care instructions per skill level per action.

### 7.2 Care Instructions (per action, per skill level)

Example for Watering — Rose — Beginner:
> "Check the top 2–3 cm of soil by pushing your finger in. If it feels dry, water thoroughly until water drains from the bottom holes. Empty the saucer after 30 minutes to prevent root rot. Avoid wetting the leaves."

Example for Watering — Rose — Expert:
> "Water when top 2 cm dry. Drench and drain. No wet foliage."

These instruction strings are stored per `(species_id, action_type, skill_level)`.

---

## 8. Business Logic Rules

### 8.1 Multiple Pots of the Same Species

- No restriction on how many pots of the same species a user can create
- Each pot is entirely independent — no shared state
- The species only provides default intervals; all actual scheduling lives on the Pot/CareTask level

### 8.2 Task Enablement

- All 6 care tasks are created for every pot by default
- User can toggle individual tasks on/off per pot (e.g., disable Misting for a succulent)
- Disabled tasks do not generate notifications and are hidden from the Today screen

### 8.3 Custom Schedule Behaviour

- When `use_custom_schedule` is toggled ON: intervals from `CustomSchedule` override the calculated ones
- When toggled OFF: calculated intervals are restored from the pot parameters + species defaults
- Editing pot parameters while `use_custom_schedule = true` does NOT recalculate intervals (user-set values are preserved)

### 8.4 Last Performed Date

- If the user enters a historical date for "last watered" during setup, `next_due_at` may already be in the past, creating an immediate overdue task — this is intentional and correct
- The user should be informed during setup if their entered date would result in an overdue task ("This plant will appear overdue immediately. Is that correct?")

### 8.5 Repotting Task

- The repotting interval defaults to 365 days (annual)
- After a repotting is logged, the next repotting interval resets to 365 days
- Optionally: update pot size and soil type in the same flow (a dialog asks "Did you change the pot size or soil when repotting?")

---

## 9. Technical Architecture

### 9.1 Recommended Stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native (Expo) or Flutter |
| Local database | SQLite via `expo-sqlite` or `sqflite` (Flutter) |
| State management | Zustand (RN) or Riverpod (Flutter) |
| Backend (optional MVP) | Supabase (auth + Postgres) or Firebase (auth + Firestore) |
| Push notifications | `expo-notifications` or `flutter_local_notifications` |
| Image storage | Supabase Storage or Firebase Storage |
| Camera (light meter) | `expo-camera` or `camera_awesome` (Flutter) |
| Navigation | React Navigation (RN) or GoRouter (Flutter) |

### 9.2 Offline-First Design

- All care data (pots, tasks, logs) is stored locally in SQLite
- Backend sync is optional for backup and multi-device support
- App is fully functional with no internet connection
- Sync queue: local changes are queued and pushed to backend when connectivity is restored

### 9.3 Local Notification Architecture

```
On app resume / foreground:
  1. Fetch all active CareTasks where is_enabled = true
  2. Cancel all scheduled local notifications
  3. For each CareTask:
       a. If snooze_until is set and in future: schedule notification at snooze_until
       b. Else: schedule notification at next_due_at
       c. If notification_frequency = Moderate or Frequent:
            schedule pre-reminder at next_due_at - 1 day
       d. If notification_frequency = Frequent:
            schedule pre-reminder at next_due_at - 2 days
  4. Limit to platform max (iOS: 64 notifications, Android: unlimited)
     Priority queue: sort by next_due_at ascending; fill up to 64
```

### 9.4 Database Schema (SQLite)

```sql
CREATE TABLE plant_species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  family TEXT,
  description TEXT,
  image_url TEXT,
  difficulty TEXT,
  light_requirement TEXT,
  toxicity TEXT,
  watering_base_days INTEGER,
  fertilizing_base_days INTEGER,
  misting_base_days INTEGER,
  repotting_base_days INTEGER,
  pruning_base_days INTEGER,
  cleaning_base_days INTEGER
);

CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  created_at INTEGER
);

CREATE TABLE pots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  site_id TEXT,
  created_at INTEGER NOT NULL,
  notes TEXT,
  pot_size TEXT NOT NULL,
  pot_material TEXT NOT NULL,
  soil_type TEXT NOT NULL,
  light_level TEXT NOT NULL,
  location_type TEXT NOT NULL,
  use_custom_schedule INTEGER DEFAULT 0,
  FOREIGN KEY (species_id) REFERENCES plant_species(id),
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE TABLE care_tasks (
  id TEXT PRIMARY KEY,
  pot_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  interval_days INTEGER NOT NULL,
  last_performed_at INTEGER,
  next_due_at INTEGER NOT NULL,
  snooze_until INTEGER,
  notes TEXT,
  FOREIGN KEY (pot_id) REFERENCES pots(id) ON DELETE CASCADE
);

CREATE TABLE custom_schedules (
  pot_id TEXT PRIMARY KEY,
  watering_interval_days INTEGER,
  fertilizing_interval_days INTEGER,
  misting_interval_days INTEGER,
  repotting_interval_days INTEGER,
  pruning_interval_days INTEGER,
  cleaning_interval_days INTEGER,
  FOREIGN KEY (pot_id) REFERENCES pots(id) ON DELETE CASCADE
);

CREATE TABLE care_logs (
  id TEXT PRIMARY KEY,
  pot_id TEXT NOT NULL,
  care_task_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_at INTEGER NOT NULL,
  notes TEXT,
  photo_url TEXT,
  FOREIGN KEY (pot_id) REFERENCES pots(id) ON DELETE CASCADE,
  FOREIGN KEY (care_task_id) REFERENCES care_tasks(id) ON DELETE CASCADE
);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  pot_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  content TEXT,
  photo_urls TEXT,   -- JSON array string
  tags TEXT,         -- JSON array string
  FOREIGN KEY (pot_id) REFERENCES pots(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  skill_level TEXT DEFAULT 'beginner',
  notification_frequency TEXT DEFAULT 'moderate',
  reminder_time TEXT DEFAULT '08:00'
);
```

---

## 10. UX & Design Guidelines

### 10.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2D6A4F` | Primary buttons, active tabs, CTA |
| `--color-primary-light` | `#52B788` | Highlights, badges, icons |
| `--color-surface` | `#F8F9F3` | Main background |
| `--color-card` | `#FFFFFF` | Card backgrounds |
| `--color-overdue` | `#E63946` | Overdue task indicators |
| `--color-warning` | `#F4A261` | Upcoming soon / snooze |
| `--color-success` | `#40916C` | Completed task confirmation |
| `--color-text-primary` | `#1B1B1B` | Body text |
| `--color-text-secondary` | `#6B7280` | Subtitles, metadata |

### 10.2 Typography

- **Display / headers:** Rounded sans-serif (e.g., Nunito, DM Rounded)
- **Body / labels:** Clean sans-serif (e.g., Inter, DM Sans)
- Font scale: 12 / 14 / 16 / 18 / 22 / 28 px

### 10.3 Icons

- Use a consistent icon set throughout (e.g., Phosphor Icons or Lucide)
- Care action icons:
  - 💧 Watering → water-drop icon
  - 🌿 Fertilizing → seedling / leaf icon
  - 🌫️ Misting → spray bottle icon
  - 🪴 Repotting → pot icon
  - ✂️ Pruning → scissors icon
  - 🧹 Cleaning → sparkle / cloth icon

### 10.4 Animation & Feedback

- Completing a care task triggers a satisfying checkmark animation (lottie or CSS spring)
- Swipe-to-complete gesture on Today task cards
- Skeleton loading screens (not spinners) during data loads
- Haptic feedback on task completion (success vibration)

### 10.5 Empty States

Every empty state should include:
- An illustration (friendly, plant-themed)
- A short message explaining what's empty
- A clear CTA button

Examples:
- My Plants empty: "No plants yet. Add your first pot!" → [+ Add Plant]
- Today empty: "All caught up! 🎉 Your plants are happy." (no CTA needed)
- Sites empty: "No rooms yet. Organize your plants by location." → [+ New Site]

---

## 11. MVP Feature Scope

Use this checklist to prioritize build order:

### Phase 1 — Core (MVP)
- [ ] User authentication (email/password)
- [ ] Plant species database (bundled, 100 species minimum)
- [ ] Add / edit / delete Pot
- [ ] Care tasks with auto-calculated schedules
- [ ] Custom schedule override per pot
- [ ] Today screen with task cards (Complete / Snooze / Skip)
- [ ] My Plants grid/list view
- [ ] Local push notifications
- [ ] Care log history

### Phase 2 — Enhanced UX
- [ ] Sites / location management
- [ ] Journal with photo entries
- [ ] Light Meter tool
- [ ] Per-task enable/disable
- [ ] Export care history (CSV)
- [ ] Onboarding flow

### Phase 3 — Polish & Growth
- [ ] Cloud sync / multi-device (Supabase or Firebase)
- [ ] Plant search & expanded species database (500+)
- [ ] Repotting flow with pot parameter update
- [ ] Premium tier gating (Phase 1+2 = free; Phase 3 features = paid)
- [ ] Offline-first sync queue

---

## 12. Out of Scope (Excluded Features)

The following features from the original Planta app are **explicitly excluded** from this build:

- ~~🤝 Care Share (multi-user shared plant collections)~~
- ~~🌦️ Live Weather Integration (automatic schedule adjustment based on weather API)~~
- ~~🌐 Community (social feed, tips, shared photos)~~
- ~~📊 Plant Hospital (aggregated health dashboard)~~
- ~~🔬 Dr. Planta / AI Plant Disease Diagnosis~~
- ~~📸 Plant Identification by camera (AI species recognition)~~

These can be added in a future version if needed.
