# CDW Sales Research Brief Generator

A Node.js web application for generating comprehensive sales research briefs with CDW branding.

## Features

- **Company Research Form**: Input company name, technology stack, and competing vendors
- **Comprehensive Briefs**: Generates detailed research briefs including:
  - Company overview
  - Recent developments
  - Competitive analysis
  - Pain points and opportunities
  - Executive leadership engagement strategies
  - Recommended next steps
- **CDW Branding**: Professional red (#CC0000) color scheme
- **Copy to Clipboard**: One-click copying of generated briefs
- **Responsive Design**: Works on desktop and mobile devices

## Local Development

### Prerequisites

- Node.js 18.x or higher
- npm

### Installation

1. Navigate to the project directory:
   ```bash
   cd research-brief-site
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Deployment to Render

### Steps:

1. **Create a Render account** at https://render.com

2. **Create a new Web Service**:
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository

3. **Configure the service**:
   - **Name**: `cdw-research-brief-generator` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or paid tier

4. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

5. **Access your app**:
   - Once deployed, Render provides a URL (e.g., `https://your-app.onrender.com`)

## Environment Variables

No environment variables are required for basic operation. The app uses `PORT` environment variable (provided automatically by Render) or defaults to 3000 for local development.

## Project Structure

```
research-brief-site/
├── public/
│   ├── index.html      # Main HTML page
│   ├── styles.css      # CDW-branded styles
│   └── script.js       # Client-side JavaScript
├── server.js           # Express server
├── package.json        # Dependencies and scripts
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Render-ready configuration

## License

© 2026 CDW LLC. All rights reserved.
