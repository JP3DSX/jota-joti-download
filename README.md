# Jota-Joti Download
日本語版 README は [README.ja.md](README.ja.md) をご覧ください。

This repository contains the source code for a small web app and supporting scripts used during JOTA-JOTI events. Users can enter a secret *aikotoba* (keyword) to download a digital stamp image. Keywords and their corresponding images are stored in Firestore.

## Packages

- **jota-joti-downloadv1** – Tailwind based HTML/CSS/JS implementation.
- **jota-joti-downloadv2** – TypeScript + Vite version of the same site.
- **aikotoba-import** – Node.js script for importing keywords from `aikotoba.csv` into Firestore.

## Development

Each package contains its own `package.json`. Typical commands include:

```bash
npm install       # install dependencies
npm run dev       # start local development
npm run build     # build for production
```

Some packages also include a `deploy` script for Firebase Hosting.

## License

This project is distributed without a specific license file. All rights belong to the original author.

