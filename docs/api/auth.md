# Auth

JWT (HS256) over in-memory users. Shared credentials for web-slices, web-analytics, and (later) extension.

## Routes

| Method | Path          | Auth | Body / notes                                 |
| ------ | ------------- | ---- | -------------------------------------------- |
| `POST` | `/auth/login` | no   | `{ username, password }` → `{ token, user }` |
| `GET`  | `/auth/me`    | JWT  | `{ username }`                               |

## Config (process env)

- `JWT_SECRET` (default `balloons-dev-secret`)
- `AUTH_USERNAME` / `AUTH_PASSWORD` (default `admin` / `admin`)

Bearer header: `Authorization: Bearer <token>`.
