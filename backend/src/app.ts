import express, { Express } from 'express';
import cors from 'cors';
import { audioRoutes } from './modules/audio/index.js';
import { healthRoutes } from './modules/health/index.js';
import { learnerRoutes } from './modules/learner/index.js';
import { settingsRoutes } from './modules/settings/index.js';
import { contentRoutes } from './modules/content/index.js';
import { progressRoutes } from './modules/progress/index.js';
import { framesRoutes } from './modules/frames/index.js';
import { characterRouter, characterService } from './modules/character/index.js';
import { AuthService, AuthController, createAuthRouter } from './modules/auth/index.js';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize auth service and controller
const authService = new AuthService();
const authController = new AuthController(authService);

// Routes
app.use('/api/auth', createAuthRouter(authController));
app.use('/api/audio', audioRoutes);
app.use('/health', healthRoutes);
app.use('/api/learner', learnerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/frames', framesRoutes);
app.use('/api/characters', characterRouter);

// Initialize default characters
await characterService.initializeDefaultCharacters();

export default app;
