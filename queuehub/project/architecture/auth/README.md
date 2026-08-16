# Authentication & Authorization Architecture

## Consumer
Anonymous-first. Consumer queue tracking must work without mandatory login.

## Staff
Supabase Auth/JWT with QueueHub staff-role lookup and server-side authorization.

## RBAC target
- Owner
- Venue Admin
- Restaurant Manager
- Staff
- Viewer
- Developer/API role

## Device Auth target
Tablet/Gateway devices need scoped device identity, credential rotation, revoke and restaurant/venue scope.

## Rules
- Authentication is not authorization.
- Production queue writes require server-side role verification.
- Anonymous users cannot call production staff commands.
- Browser clients never hold service-role credentials.

## Current completion
Staff auth/RBAC backend ~90%; consumer anonymous session ~85%; device authorization ~20%; role-management UI incomplete.
