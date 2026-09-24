import dotenv from 'dotenv';

dotenv.config();

function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) return configuredOrigins;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN is required in production.');
  }

  return ['http://localhost:5173'];
}

export const config = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: getCorsOrigins(),
};

export default config;
