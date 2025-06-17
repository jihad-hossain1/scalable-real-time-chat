Docker Compose Fullstack

```bash
podman-compose up --build
```


run containers:

```bash
podman-compose up
```

show running containers:

```bash
podman-compose ps
```

Stop containers when done:

```bash
podman-compose down
```

To check logs of a specific service:

```bash
podman-compose logs backend
```

To run detached (in background):

```bash
podman-compose up --build -d
```

To rebuild only backend or frontend:

```bash
podman-compose build backend
```

Database:
run on browser

```bash
http://localhost:8081
user: user
password: password

```

Here is the **port and URL list** for each service in your fullstack Podman Compose setup:

---

### ✅ **Frontend (React)**

- **URL:** [http://localhost:3000](http://localhost:3000)
- **Port:** `3000`
- **Description:** React frontend served via Node; connects to backend API at `http://localhost:3001`

---

### ✅ **Backend (Node.js + Express)**

- **URL (API base):** [http://localhost:3001](http://localhost:3001)
- **Port:** `3001`
- **Description:** Express API server, connected to MySQL and RabbitMQ

---

### ✅ **MySQL Database**

- **Host (internal):** `db` (inside containers)
- **Host (external/optional):** `localhost`
- **Port:** `3306`
- **URL format for connection:**

```
mysql://user:password@localhost:3306/mydb
```

- **Credentials:**

  - User: `user`
  - Password: `password`
  - Database: `mydb`

---

### ✅ **RabbitMQ**

- **AMQP Port (for backend to connect):** `5672`
- **Management UI Port:** `15672`
- **URL (Management UI):** [http://localhost:15672](http://localhost:15672)
- **URL (AMQP for backend connection):**

```
amqp://guest:guest@localhost:5672
```

- **Credentials:**

  - User: `guest`
  - Password: `guest`

---

## 🔁 Internal Container Hostnames

| Service  | Hostname in Compose Network |
| -------- | --------------------------- |
| Backend  | `backend`                   |
| Frontend | `frontend`                  |
| MySQL    | `db`                        |
| RabbitMQ | `rabbitmq`                  |

So for example, your backend connects to MySQL using:

```js
host: 'db', port: 3306
```

And to RabbitMQ using:

```js
hostname: 'rabbitmq', port: 5672
```

---
