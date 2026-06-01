# NestJS Task Management API

A RESTful task management API built with [NestJS](https://nestjs.com/) for learning purposes.

## Features

- **Auth** — User signup/signin with JWT tokens
- **Task CRUD** — Create, read, update, delete tasks
- **Ownership** — Users can only see/manage their own tasks
- **Validation** — Request validation with `class-validator` + Joi schema for env vars
- **PostgreSQL** — TypeORM with a PostgreSQL database

## Stack

- **Framework:** NestJS 11
- **Language:** TypeScript
- **Database:** PostgreSQL via TypeORM
- **Auth:** Passport + JWT + bcrypt
- **Validation:** class-validator, @hapi/joi
- **Testing:** Jest + supertest (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Docker)

### Setup

```bash
# Install dependencies
yarn install

# Set up environment
cp .env.stage.dev .env.stage.dev  # already exists, edit as needed

# Create the database
createdb task-management          # or: docker exec postgres-nest psql -U postgres -c "CREATE DATABASE \"task-management\";"

# Start the server
STAGE=dev yarn start
```

### Environment Variables

See `.env.stage.dev` for all required vars:
- `PORT` — Server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` — PostgreSQL config
- `JWT_SECRET`, `JWT_EXPIRES_IN` — JWT config

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | No | Create a user |
| POST | `/auth/signin` | No | Sign in, returns JWT |
| GET | `/tasks` | Yes | List own tasks |
| GET | `/tasks/:id` | Yes | Get task by ID |
| POST | `/tasks` | Yes | Create a task |
| PATCH | `/tasks/:id/status` | Yes | Update task status |
| DELETE | `/tasks/:id` | Yes | Delete a task |

### Auth Credentials

- `username`: 4-20 characters
- `password`: 8-32 characters, must contain uppercase, lowercase, and a number or special character

### Task Statuses

`OPEN` → `IN_PROGRESS` → `DONE`

## Testing

```bash
# Create test database (one time)
createdb task-management-test

# Run E2E tests
STAGE=test yarn test:e2e
```

## Project Structure

```
src/
├── auth/          Auth module (signup, signin, JWT strategy)
├── tasks/         Tasks module (CRUD, filtering, ownership)
├── app.module.ts  Root module
├── config.schema.ts  Joi env validation
├── main.ts        App bootstrap
└── transform.interceptor.ts  Response transform
test/
└── app.e2e-spec.ts  E2E tests
```
