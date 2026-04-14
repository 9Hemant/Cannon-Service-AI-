# Canon Delay AI Pro - Deployment Guide

This application is built with **React (Vite)** and an **Express** backend. To take this application "Live" on GitHub and Vercel, follow these steps:

## 1. Export to GitHub
The easiest way to get your code onto GitHub is using the built-in export feature in AI Studio:
1. Click on the **Settings** (gear icon) in the top right corner of the AI Studio interface.
2. Select **Export to GitHub**.
3. Follow the prompts to authorize your GitHub account and create a new repository.

## 2. Deploy to Vercel
Once your code is on GitHub, you can deploy it to Vercel:
1. Go to [Vercel.com](https://vercel.com) and log in.
2. Click **Add New** > **Project**.
3. Import the repository you just created on GitHub.
4. **Environment Variables**: This is CRITICAL.
   - In the "Environment Variables" section of the Vercel setup, add:
     - `GEMINI_API_KEY`: Your Google Gemini API Key.
5. **Build Settings**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**.

## 3. Note on Full-Stack Deployment
This app uses a custom Express server (`server.ts`). 
- **Static Hosting (Easiest)**: Vercel will host the frontend perfectly. However, the Express-specific API routes (like `/api/health`) will not work by default on Vercel's static hosting.
- **Full-Stack Hosting**: To run the Express server on Vercel, you would typically need to move your API logic to a `/api` directory using Vercel Serverless Functions. 

For the best "Live" experience with the full-stack features, we recommend using the **Deploy to Cloud Run** option in the AI Studio settings menu, which is designed to handle this specific full-stack architecture.

---
*Created for Canon Service Engineers*
