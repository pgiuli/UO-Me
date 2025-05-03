# DB Structure for UO-Me

## List of tables
- **users**: Stores user information.
- **friendships**: Stores information about user friendships.
- **payments**: Stores payment records.
- **shares**: Stores information about payment shares.

## Table Structures

### users
| Column Name      | Data Type | Description                                      |
|------------------|-----------|--------------------------------------------------|
| id               | INTEGER   | Primary key, auto-incremented.                   |
| username         | TEXT      | Unique username for the user, indexed.           |
| password         | TEXT      | Hashed password for the user.                    |
| email            | TEXT      | Unique email address for the user, indexed.      |
| created_at       | TEXT      | ISO datetime when the user was created.          |
| profile_picture  | TEXT      | URL/path to profile picture.                     |

- Profile pictures are stored as URLs/paths and served from `/static/profile_pics/`.

### friendships (Bi-directional)
| Column Name | Data Type | Description                                                         |
|-------------|-----------|---------------------------------------------------------------------|
| user_id     | INTEGER   | Foreign key referencing `users(id)`, part of composite primary key. |
| friend_id   | INTEGER   | Foreign key referencing `users(id)`, part of composite primary key. |
| status      | TEXT      | Status of the friendship ('pending', 'accepted').                   |
| created_at  | TEXT      | ISO datetime when the friendship was created.                       |

- Primary key is a composite of `user_id` and `friend_id`.

### payments
| Column Name   | Data Type | Description                                                    |
|---------------|-----------|----------------------------------------------------------------|
| id            | INTEGER   | Primary key, auto-incremented.                                 |
| payer_id      | INTEGER   | Foreign key referencing the user who made the payment.         |
| description   | TEXT      | Description of the payment.                                    |
| total_amount  | REAL      | Total amount of the payment.                                   |
| created_at    | TEXT      | ISO datetime when the payment was made.                        |
| expired       | INTEGER   | 0 = active, 1 = expired.                                       |

- Payments expire if not all shares are accepted within 24 hours (`expired` field).

### shares
| Column Name   | Data Type | Description                                                    |
|---------------|-----------|----------------------------------------------------------------|
| id            | INTEGER   | Primary key, auto-incremented.                                 |
| payment_id    | INTEGER   | Foreign key referencing `payments(id)`.                        |
| owed_by_id    | INTEGER   | Foreign key referencing `users(id)`.                           |
| amount        | REAL      | Amount owed by the user.                                       |
| fulfilled     | INTEGER   | 0 = not fulfilled, 1 = fulfilled.                              |
| accepted      | INTEGER   | 0 = pending, 1 = accepted.                                     |
| created_at    | TEXT      | ISO datetime when the share was created.                       |

- Shares must be accepted by each participant before they can be fulfilled.
- Only the payment owner can fulfill shares.

## Notes

- Payments expire if not all shares are accepted within 24 hours (`expired` field).
- Profile pictures are stored as URLs/paths in the `users` table and served from `/static/profile_pics/`.
- Shares must be accepted by each participant before they can be fulfilled.
- Only the payment owner can fulfill shares.