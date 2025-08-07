# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
ユーザーへの応対は日本語で

## Project Overview

MagPic is a SvelteKit application configured for deployment on Cloudflare Workers. It uses Svelte 5, TypeScript, TailwindCSS, and Vite.

## Essential Commands

### Development
- `npm run dev` - Start development server
- `npm run dev -- --open` - Start dev server and open browser

### Build & Preview
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run preview:cf` - Preview with Wrangler (Cloudflare Workers local)

### Deployment
- `npm run deploy` - Deploy to Cloudflare Workers (production)
- `npm run deploy:dev` - Deploy to development environment

### Code Quality
- `npm run check` - Type-check with svelte-check
- `npm run lint` - Run Prettier check and ESLint
- `npm run format` - Format code with Prettier

### Testing
- `npm run test` - Run all tests (unit + e2e)
- `npm run test:unit` - Run Vitest unit tests
- `npm run test:unit -- --watch` - Run unit tests in watch mode
- `npm run test:e2e` - Run Playwright e2e tests

## Architecture

This is a standard SvelteKit application with:

- **Routes** in `src/routes/` - File-based routing where `+page.svelte` files define pages
- **Components** - Svelte 5 components with `.svelte` extension
- **Testing** - Dual testing setup:
  - Unit tests: Vitest with browser mode for Svelte components (`*.svelte.spec.ts`)
  - E2E tests: Playwright tests in `e2e/` directory
- **Styling** - TailwindCSS v4 integrated via Vite plugin
- **Deployment** - Configured for Cloudflare Workers via adapter-cloudflare