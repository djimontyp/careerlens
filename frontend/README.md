# CareerLens Frontend (Release)

Clean-room frontend foundation for CareerLens.

## Tech Stack

- **UI:** React 19, TypeScript
- **Build Tool:** Vite
- **UI Workspace & Docs:** Storybook 10 (`@storybook/react-vite`)
- **Addons:** A11y (`@storybook/addon-a11y`), Docs (`@storybook/addon-docs`), Vitest (`@storybook/addon-vitest`)
- **Testing:** Vitest + Playwright Browser (`@vitest/browser-playwright`)
- **Linter:** Oxlint

## Scripts

```bash
# Start development server
npm run dev

# Typecheck and build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview

# Start Storybook
npm run storybook

# Build static Storybook
npm run build-storybook

# Run component and story tests
npm test

# Open Playwright Test UI for application-flow development and debugging
npm run test:ui
```

## Project Structure

```text
frontend/
├── .storybook/       # Storybook configuration (addons: a11y, docs, vitest)
├── e2e/              # Playwright application-flow tests
├── src/
│   ├── features/     # Product features and colocated Storybook stories
│   ├── App.tsx       # Root component
│   └── main.tsx      # Application entry point
├── .oxlintrc.json    # Oxlint configuration
├── tsconfig.json     # TypeScript configuration
└── vite.config.ts    # Vite and Vitest configuration
```
