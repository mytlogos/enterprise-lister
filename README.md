# enterprise-other

## Software Requirements

- NodeJs 16.x
- MariaDB 10 (or 10.6) or Mysql 8 Server
  - after installation, initialize the mysql server with `sudo mysql_secure_installation`
    - this also ensures the correct user authentication method, via password
  - this project requires access to the root user from localhost, or a user with similar privileges of root, the password and user needs to be declared in the env.env file
  - a `enterprise` database and all privileges on it
  - the server needs to be able to have indices of length up to 3000 bytes, to achieve this one can use the following options for the server:
    - innodb_file_format = Barracuda
    - innodb_default_row_format = dynamic
    - innodb_large_prefix = ON
    - mariadb >= 10.3 does not need these options

## Hardware Requirements

Example Hardware requirements for the magnitude:

| Application | CPU-Cores (1Ghz) | RAM |
| ----------- | --------- | --- |
| Web-Server  | 1 Core | ~100 MB |
| Crawler | 1-2 Cores | 100-200 MB |

## Configuration

The variables can be defined in a env.env file or via Environment Variables (takes precedence).
The file `test.env` can be taken as an template.

default < env.env < environment variable

```plain
port=80                 # the server port, a valid number - web-server
NODE_ENV=test           # test, development or production - both
dbHost=localhost        # hostname or ip address for the sql database - both
dbUser=                 # database user name - both
dbPassword=             # database user password - both
dbPort=3306             # database port - both
dbConLimit=50           # maximum of database connections - both
crawlerHost=localhost   # hostname or ip adress for the host on which the crawler is running - web-server
crawlerPort=3000        # port on which the crawler listens - both
crawlerWSPort=3001      # port on which the crawler listens for Websocket - both
```

## Testing

## Docker

Requires a `database.env` file to be available in current working directory.
`database.env` has the same properties as `test-database.env`.

### Windows

On Windows use the `docker-compose -f Dockerfil_win up` command.

### Linux

On Linux, the current work directory is used as the fully setup code base. Any code changes are immediately available after starting (anew).

## Notes

@vue/babel-preset-app is only listed as a devDependency because @vue/cli-plugin-babel, which it is originally a dependecy of, could not find the package in its own node_module folder.

## Project setup

```bash
npm install
```

### Start Server

```bash
npm run start:server
```

### Start Crawler

```bash
npm run start:crawler
```

### Compiles Code

```bash
npm run build -ws
```

### Run your tests

```bash
npm run test -ws
```

### Lints files

```bash
npm run lint -ws
```
