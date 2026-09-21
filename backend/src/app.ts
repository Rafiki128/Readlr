import express, { Express } from 'express';
import cors from 'cors';
import { audioRoutes } from './modules/audio/index.js';
import { healthRoutes } from './modules/health/index.js';
import { learnerRoutes } from './modules/learner/index.js';
import { contentRoutes } from './modules/content/index.js';
import { progressRoutes } from './modules/progress/index.js';
import { characterRouter, characterService } from './modules/character/index.js';
import { AuthService, AuthController, createAuthRouter } from './modules/auth/index.js';
import { config } from './config/env.js';
import { adminRoutes } from './modules/admin/index.js';

const app: Express = express();

// Middleware
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize auth service and controller
const authService = new AuthService();
const authController = new AuthController(authService);

// Routes
app.use('/api/auth', createAuthRouter(authController));
app.use('/api/admin', adminRoutes);
app.use('/api/audio', audioRoutes);
app.use('/health', healthRoutes);
app.use('/api/learner', learnerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/characters', characterRouter);

// Initialize default characters
await characterService.initializeDefaultCharacters();

export default app;
