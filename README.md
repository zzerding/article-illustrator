# Article Illustrator

An AI-powered article illustration tool built with React and deployed on Cloudflare Pages, powered by [Pollinations.ai](https://pollinations.ai).

## Features

- **AI Image Generation** — Generate custom illustrations for your articles using multiple AI models via [Pollinations.ai](https://pollinations.ai)
- **Text-to-Image** — Describe what you want and get high-quality images instantly
- **Multiple Styles** — Choose from photo, illustration, painting, or free-form styles
- **Model Selection** — Switch between different text and image generation models
- **Customizable Output** — Control image dimensions, seed, and enhancement options
- **Reference Images** — Upload reference images to guide generation
- **i18n Support** — Internationalized UI with language detection
- **OAuth Authentication** — Secure login via [Pollinations Auth](https://enter.pollinations.ai)
- **Account Status** — Track account balance and profile information

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **UI Components**: Lucide React icons, clsx, tailwind-merge
- **i18n**: i18next, react-i18next
- **Deployment**: Cloudflare Pages (via Wrangler)
- **AI Backend**: [Pollinations.ai](https://pollinations.ai) API

## Quick Start

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (or npm/yarn)
- A [Pollinations.ai](https://pollinations.ai) account for API access

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

### Deploy to Cloudflare Pages

```bash
pnpm deploy
```

## Configuration

Edit `src/config.js` to customize:

- `CLIENT_ID` — Your Pollinations app key (get one at [enter.pollinations.ai](https://enter.pollinations.ai))
- `REDIRECT_URI` — Your app's URL for OAuth redirect
- Default models, image dimensions, and style prompts

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React context (Auth)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Page views (Landing, Editor, About)
│   ├── locales/        # i18n translation files
│   ├── config.js       # App configuration & API endpoints
│   ├── i18n.js         # i18n setup
│   └── imageSettings.js # Image generation settings
├── public/             # Static assets
├── wrangler.toml       # Cloudflare Pages config
└── vite.config.js      # Vite configuration
```

## API Integration

This project uses the [Pollinations.ai](https://pollinations.ai) API for:

- **Authentication**: OAuth via [enter.pollinations.ai](https://enter.pollinations.ai/authorize)
- **Image Generation**: `/v1/images/generations` and `/image` endpoints
- **Chat Completions**: `/v1/chat/completions` for prompt enhancement
- **Model Discovery**: `/v1/models` and `/image/models`
- **Media Upload**: `media.pollinations.ai/upload` for reference images
- **Account Management**: Profile and balance tracking

## License

Private
