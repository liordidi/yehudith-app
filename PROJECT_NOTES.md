# Project Notes

## Project structure
- Frontend folder: `frontend`
- Backend folder: `backend`

## Deployment
- Frontend is deployed on Vercel
- Backend is deployed on Render
- Database is Supabase

## Working rules
- Only make UI/frontend changes unless explicitly requested otherwise
- Do not modify backend files
- Do not modify API routes
- Do not modify database logic
- Do not modify environment variables unless explicitly requested
- Keep RTL support
- Keep Hebrew content working correctly
- Prefer small, targeted changes
- Do not refactor unrelated code
- Do not rename files unless explicitly requested
- Preserve existing functionality

## Frontend scope
Allowed:
- React component UI changes
- CSS / styling changes
- layout changes
- spacing / colors / typography / responsiveness
- image presentation
- text presentation

Not allowed:
- backend changes
- auth logic changes
- Supabase changes
- API changes
- deployment config changes