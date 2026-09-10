import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/v1', routes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
