import { app } from './app.js';
import { env, validateEnvironment } from './config/env.js';

try {
  validateEnvironment();
  app.listen(env.port, () => {
    console.log(`Lux Car API disponible en http://localhost:${env.port}`);
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
