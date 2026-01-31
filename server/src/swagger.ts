import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load port from server config (or fall back to env / default).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = path.join(__dirname, "..", "config", "server.json");
let config: { port?: number } = {};
try {
    // Use require so this works in both tsx/ts-node and compiled JS runs.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    config = require(configPath) as { port?: number };
} catch (e) {
    // ignore: missing config file will be handled by fallback port below
}
const port = process.env.PORT || config.port || 31000;
const host = `http://localhost:${port}`;

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "ChatLayer API",
            version: "1.0.0",
            description: "Simple human-in-the-loop chat middleware API",
        },
        servers: [
            {
                url: host,
            },
        ],
    },
    // Resolve a glob that points to the server's source files so swagger-jsdoc
    // finds the JSDoc @openapi annotations. Using a path relative to __dirname
    // avoids issues when the process cwd is the project root.
    apis: [`${__dirname}/../**/*.ts`],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
