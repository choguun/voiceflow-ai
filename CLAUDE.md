# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **VoiceFlow AI POC** repository for voice-to-invoice generation targeting Southeast Asian small businesses. The project is currently in the planning phase with only an implementation plan documented.

## Current State

The repository contains:
- `implementation-plan.md` - Comprehensive 12-day implementation roadmap
- No actual code has been implemented yet

## Planned Architecture

Based on the implementation plan, the project will follow this structure:

```
voiceflow-ai/
├── frontend/          # React with TypeScript web application
├── backend/           # Node.js/Express API server
├── ai-services/       # LLM integration layer (SEA-LION/GPT-4)
├── demo-data/         # Sample scenarios for 5 languages
└── docs/             # POC documentation
```

## Technology Stack (Planned)

- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express with CORS
- **AI Integration**: SEA-LION API with GPT-4 fallback
- **Voice Processing**: Browser MediaRecorder API
- **Payment Systems**: QR code generation for PromptPay, GCash, GoPay, OVO
- **Languages**: Indonesian, Thai, Vietnamese, Tagalog, English

## Key Features to Implement

1. **Voice Capture**: Browser-based voice recording with silence detection
2. **Multi-language Processing**: Natural language understanding for 5 Southeast Asian languages
3. **Invoice Generation**: Dynamic template system with business type adaptation
4. **Payment Integration**: Regional QR code generation
5. **Demo Scenarios**: Pre-built scenarios for different business types

## Development Commands (To Be Implemented)

Since no package.json exists yet, commands will need to be established during implementation:

Frontend (React):
```bash
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm run test         # Run tests
pnpm run lint         # Lint code
```

Backend (Node.js):
```bash
pnpm run dev          # Development server with nodemon
pnpm run start        # Production server
pnpm run test         # Run tests
```

## Implementation Priority

Follow the 12-day implementation plan phases:
1. Foundation Setup (Days 1-2)
2. AI Integration (Days 3-4) 
3. Invoice Generation (Days 5-6)
4. Demo Scenarios (Days 7-8)
5. Polish and Performance (Days 9-10)
6. Deployment and Testing (Days 11-12)

## Regional Considerations

- Support for multiple scripts (Thai, Vietnamese characters)
- Cultural color psychology (blue for trust, gold for prosperity)
- Regional payment method integration
- Informal business terms understanding ("bayar nanti", "hulugan")

## Performance Requirements

- Load time: Under 2 seconds
- Voice-to-invoice: Under 10 seconds
- Language accuracy: 90%+ for amounts and terms
- Mobile-responsive design required

## Deployment Strategy (Planned)

- Frontend: Vercel or Netlify
- Backend: Railway or Render  
- Edge caching: Cloudflare Workers
- Global CDN for optimal performance