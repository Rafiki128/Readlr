
# Readlr - Interactive Reading Learning Platform

Readlr is an interactive web-based learning platform designed to help young learners develop reading skills through engaging games, interactive components, and personalized learning paths. Built with modern web technologies, it provides a gamified learning experience with visual progress tracking, achievements, and character companions.

## Features

- **Profile Setup** - Learners create personalized profiles with custom avatars and names
- **Level Progression** - Structured learning levels with visual level maps and progress dashboards
- **Phoneme Bank** - Comprehensive phoneme learning and practice system
- **Story Scenes** - Interactive story-based learning content
- **Games & Challenges** - Gamified learning activities with difficulty levels
- **Achievements & Stickers** - Reward system with achievements and sticker collections
- **Character Companions** - Personalized learning buddies to guide the learning journey
- **Teacher Dashboard** - Tools for educators to track and manage learner progress
- **Fluency Tracking** - Visual heatmaps showing fluency progression
- **Session Summaries** - Detailed feedback after each learning session
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme Support** - Customizable theme options via next-themes

## Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite 6.3.5 (build tool)
- Tailwind CSS 4.1.12 (styling)
- shadcn/ui (accessible component library based on Radix UI)

**UI & Components:**
- Material UI icons and components
- Lucide React (icon library)
- Motion (animations)
- React Hook Form (form handling)

**Data Visualization:**
- Recharts (charts and graphs)
- Mermaid (diagrams)
- Canvas Confetti (effects)

**Interactions:**
- React Router 7.13.0 (routing)
- React DnD (drag and drop)
- Embla Carousel (carousels)
- react-resizable-panels (layout panels)

**Utilities:**
- date-fns (date manipulation)
- Sonner (toast notifications)
- class-variance-authority (component variants)

**Backend:**
- Express.js 4.18.2 (web framework)
- TypeScript 5.3.3
- tsx (TypeScript executor)
- OpenAI API (Whisper for audio processing)
- Multer (file uploads)
- Supabase (hosted PostgreSQL database)
- CORS (cross-origin requests)

**Package Manager:**
- npm/pnpm (monorepo support via pnpm-workspace.yaml)


## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm
- OpenAI API key (for audio processing)
- A Supabase project and its server-side service-role key

### Installation

From the root directory:

```bash
npm install
```

Or with pnpm:
```bash
pnpm install
```

### Development

### Configure Supabase

1. Create a Supabase project.
2. Run [the initial schema migration](backend/supabase/migrations/202609160001_initial_schema.sql) in its SQL Editor.
3. Copy `backend/.env.example` to `backend/.env`, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key must remain on the backend and must never be added to the frontend environment.
4. Seed the learning stages and levels once with `npm -w backend run seed`.

The backend does not create tables at startup. This keeps schema changes explicit and deployable through Supabase migrations.

#### Run Both Frontend & Backend

From the root directory:

```bash
npm run dev
```

This starts both the frontend (port 5173) and backend (port 3000) simultaneously.

#### Run Frontend Only

```bash
npm run frontend:dev
```

The application will be available at `http://localhost:5173`

#### Run Backend Only

```bash
npm run backend:dev
```

The server will be available at `http://localhost:3000`

### Building for Production

Build all workspaces:
```bash
npm run build
```

Or individual workspaces:
```bash
npm run frontend:build  # Build frontend
npm run backend:build   # Build backend
```


## Project Structure

### Monorepo Architecture

This is a monorepo containing both frontend and backend applications:

```
readlr/
├── frontend/           # React application
├── backend/            # Express.js server
├── guidelines/         # Project guidelines
├── package.json        # Root monorepo config
├── pnpm-workspace.yaml # Workspace definition
└── README.md           # This file
```

### Frontend Structure

The frontend follows a feature-based modular architecture:

```
frontend/src/
├── modules/                 # Feature modules
│   ├── auth/               # Authentication & onboarding
│   │   ├── components/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   └── LearnerProfile.tsx
│   │   └── index.ts
│   ├── game/               # Game & learning features
│   │   ├── components/
│   │   │   ├── GameLevel.tsx
│   │   │   ├── StageSelection.tsx
│   │   │   ├── LevelMap.tsx
│   │   │   ├── StoryScene.tsx
│   │   │   ├── PhonemeBank.tsx
│   │   │   └── MouthShapeGuide.tsx
│   │   ├── hooks/          # Game-specific hooks
│   │   └── index.ts
│   ├── progress/           # Progress tracking
│   │   ├── components/
│   │   │   ├── ProgressDashboard.tsx
│   │   │   ├── LevelComplete.tsx
│   │   │   ├── SessionSummary.tsx
│   │   │   ├── Achievements.tsx
│   │   │   └── StickerBook.tsx
│   │   └── index.ts
│   ├── teacher/            # Teacher features
│   │   ├── components/
│   │   │   └── TeacherDashboard.tsx
│   │   └── index.ts
│   ├── shared/             # Shared components
│   │   ├── components/
│   │   │   ├── NavigationHeader.tsx
│   │   │   ├── CharacterCompanion.tsx
│   │   │   ├── Help.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Diagrams.tsx
│   │   │   └── FluencyHeatmap.tsx
│   │   ├── utils/
│   │   └── index.ts
│   └── ui/                 # shadcn/ui components
├── layouts/                # Page layouts
│   ├── MainLayout.tsx
│   └── AuthLayout.tsx
├── hooks/                  # Global custom hooks
│   └── useMediaQuery.ts
├── types/                  # Global TypeScript types
│   └── index.ts
├── utils/                  # Shared utilities
├── styles/                 # Global styles
├── main.tsx               # Entry point
└── App.tsx                # Root component
```

### Backend Structure

The backend follows a clean modular architecture:

```
backend/src/
├── modules/               # Feature modules
│   ├── audio/             # Audio processing
│   │   ├── audio.types.ts      # Type definitions
│   │   ├── audio.service.ts    # Business logic
│   │   ├── audio.controller.ts # Request handlers
│   │   ├── audio.route.ts      # Routes
│   │   └── index.ts
│   └── health/            # Health checks
│       ├── health.controller.ts
│       ├── health.route.ts
│       └── index.ts
├── config/                # Configuration
│   └── env.ts
├── middleware/            # Express middleware
├── database/              # Database connection (future)
├── utils/                 # Utilities
├── app.ts                 # Express app setup
└── server.ts             # Entry point
```


## Key Components

### Auth Module
- **WelcomeScreen** - Landing page for new users
- **LearnerProfile** - Initial setup screen for learner customization

### Game Module
- **GameLevel** - Interactive game components for learning
- **StageSelection** - Stage/chapter selection interface
- **LevelMap** - Visual representation of learning levels and progress
- **StoryScene** - Story-based learning content
- **PhonemeBank** - Phoneme learning and practice interface
- **MouthShapeGuide** - Visual guide for pronunciation

### Progress Module
- **ProgressDashboard** - Dashboard showing learner progress and analytics
- **LevelComplete** - Completion screen after finishing a level
- **SessionSummary** - Post-session feedback and statistics
- **Achievements** - Achievement and reward system
- **StickerBook** - Sticker collection display

### Teacher Module
- **TeacherDashboard** - Administrative dashboard for educators

### Shared Components
- **NavigationHeader** - Top navigation bar
- **CharacterCompanion** - Animated learning buddy
- **Help** - Help and tutorial system
- **Settings** - User and application settings
- **Diagrams** - UML and architecture diagrams
- **FluencyHeatmap** - Visual fluency progression tracking

### Backend API

**Audio Processing Module**
- `POST /api/audio/process` - Process audio and analyze phoneme pronunciation
  - Input: Audio file, target phoneme, optional child ID
  - Output: Transcription, detected phoneme, score, feedback

**Health Check**
- `GET /health` - API health status endpoint


## Architecture

### Frontend Architecture

The frontend uses a **feature-based modular architecture** where related components, hooks, and utilities are grouped into logical modules (auth, game, progress, teacher, shared).

**Benefits:**
- Clear separation of concerns
- Easy to locate feature-related code
- Scalable for adding new features
- Reduced dependency coupling
- Better code organization and maintainability

Each module has:
- `components/` - React components for the feature
- `hooks/` - Custom React hooks (if module-specific)
- `utils/` - Utility functions (if module-specific)
- `index.ts` - Public API exports

### Backend Architecture

The backend uses a **modular layered architecture** with clear separation between routes, controllers, services, and data models.

**Module Structure:**
```
module/
├── module.types.ts      # TypeScript interfaces and types
├── module.service.ts    # Business logic
├── module.controller.ts # Request handlers
├── module.route.ts      # Express routes
└── index.ts            # Module exports
```

**Benefits:**
- **Separation of Concerns** - Clear responsibility layers
- **Type Safety** - Centralized type definitions per module
- **Testability** - Easy to unit test service logic independently
- **Reusability** - Services can be called from multiple controllers
- **Scalability** - Easy to add new features following the pattern

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

Guidelines for contributing are available in `guidelines/Guidelines.md`

## License

See LICENSE file for details.

## Prototype & Design

The prototype and design specifications are available in:
- `PROTOTYPE_GUIDE.md` - Prototype documentation
- `UI_IMPROVEMENTS.md` - UI enhancement guidelines
- Original Figma design: https://www.figma.com/design/UzOHZ5B43uJwJXRwHTRAK2/Visualize-Capstone-Project

## Acknowledgments

See `ATTRIBUTIONS.md` for third-party libraries and attributions.
