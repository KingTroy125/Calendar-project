# Tech Stack Selection

## Stack summary

| Layer | Technology | Purpose | Pros | Cons | Reason for choosing it |
| --- | --- | --- | --- | --- | --- |
| Frontend | Next.js | Next.js will be used to build the web application. | React-basedSupports TypeScriptComponent-based developmentProvides application routingSuitable for building the web application as it grows | More framework-specific concepts than basic React

Requires understanding of Next.js architecture and conventions | Used to build the web application and calendar interface |
| Language | TypeScript / Javascript | TypeScript will be used as the primary development language for the frontend. | Type safetyBetter developer toolingEasier to understand complex data structuresHelps identify errors during development | Additional syntax compared with JavaScriptTypes need to be maintained as the application changes | Provides type safety across the application  |
| Backend | Node.js | Node.js will run the backend application. | JavaScript ecosystemWorks well for API developmentCan use TypeScriptConsistent technology ecosystem with the frontend | Backend structure needs to be organised carefullyDevelopers need to manage asynchronous operations correctly | used to create the backend REST API |
| API Framework | Express.js | Express will provide the backend HTTP/API framework. | LightweightFlexibleWidely usedStraightforward REST API development | Provides fewer architectural conventionsProject structure must be defined by the development team |  |
| Database | PostgreSQL / Neon | PostgreSQL will be the primary database. | Relational databaseStrong data integritySupports relationshipsWell suited to structured application data | Requires database schema planningRequires migrations and database management |  |
| ORM/ODM | Prisma | Data access layer between Express and PostgreSQL. | • Type-safe queriesAuto-generated client from schemaBuilt-in migration toolingStrong TypeScript integration | • Schema changes require running migrationsAdds an abstraction layer to learnGenerated client adds a build step | Keeps database access type-safe and consistent with the rest of the TypeScript stack, and simplifies migrations as the schema evolves |
| Authentication | JWT |  |  |  |  |
| API Testing | Postman | Postman will be used to test the backend API independently from the frontend. | Easy API testingAllows backend testing before frontend integrationUseful for debugging requests and responses | Manual testing does not replace automated tests |  |
| Version Control | Git + Github |  |  |  |  |
| Deployment | Vercel | Vercel was selected as the hosting platform.The exact deployment arrangement for the Express backend still needs to be confirmed. | Simple deployment workflowWorks well with modern web applicationsCan integrate with Git-based development workflows | The final Express deployment architecture needs to be establishedHosting requirements need to be validated during implementation |  |
|  |  |  |  |  |  |

## Why this stack is industry relevant

- **TypeScript/JavaScript across the stack** (frontend) (backend in Javascript) is a widely adopted industry pattern that reduces bugs from type mismatches and improves maintainability as a codebase grows — increasingly the default for production web applications.
- **Next.js + Node.js/Express** is one of the most common full-stack JavaScript combinations in industry, backed by a large ecosystem, strong hiring pool, and extensive documentation/community support.
- **PostgreSQL** is a mature, battle-tested relational database used across startups and large enterprises alike, and pairing it with **Prisma** reflects current best practice for type-safe, maintainable data access in TypeScript projects.
- **JWT-based authentication** is a standard, stateless approach used broadly in REST APIs, particularly where multiple client types (web now, mobile later) need to share one backend.
- **Git + GitHub** is the de facto standard for version control and collaboration in professional software teams.
- **Vercel** reflects the modern trend toward managed, Git-integrated deployment platforms that reduce DevOps overhead for frontend-heavy applications.
- Overall, the stack favors well-supported, widely-taught technologies over niche alternatives — this lowers onboarding cost for new developers and aligns with what most employers and open-source communities currently use.