This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## LLM Smoke Test

TrickHunt can use an OpenAI-compatible LLM to add semantic signals. To check that your provider settings work:

1. Copy `.env.example` to `.env` and fill in your own values (key, model, base URL). Never commit `.env`.
2. Run the smoke script:

```bash
npx tsx --env-file=.env scripts/smoke-llm.ts
```

**Warning:** this makes one real request to the configured provider. The request uses a fixed, harmless sample text, not user content. It may use a small amount of your provider quota.

The script prints only a status, an optional reason and signal ids. It never prints the sample, the raw response or your key.

If the key, model or base URL is missing or invalid, the app runs rules-only, without an LLM. In that case the script prints `rules-only (no LLM configured)`. This is a normal state, not an error.

To switch provider, change the environment variables in `.env` (`LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`). No code changes are needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
