# Create RabbitMQ Container

```bash
docker run -d \
  --hostname rabbitmq-host \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

- local access
  http://localhost:15672
  user: guest
  password: guest

## Create MySQL Database

```bash
docker network create mysql-db
```

## Create MySQL Database Container

```bash
docker run -d \
    --name mysql-db \
    --network mysql-db \
    -e MYSQL_ROOT_PASSWORD=admin \
    -e MYSQL_DATABASE=mydb \
    -e MYSQL_USER=admin \
    -e MYSQL_PASSWORD=admin \
    -p 3306:3306 \
    mysql:8.0
```

- database: mydb
- user: admin
- password: admin
- port: 3306
- host: localhost
- container name: mysql-db

## Create PHPMyAdmin Container

```bash
docker run -d \
    --name phpmyadmin \
    --network mysql-db \
    -e PMA_HOST=mysql-db \
    -e PMA_PORT=3306 \
    -p 8080:80 \
    phpmyadmin/phpmyadmin
```

- local access
  http://localhost:8080
  user: admin
  password: admin
