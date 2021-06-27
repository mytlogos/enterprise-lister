# enterprise-other

## Requirements

- NodeJs 13.x
- MariaDB 10 or Mysql 8 Server process on host.
  - after installation, initialize the mysql server with `sudo mysql_secure_installation`
    - this also ensures the correct user authentication method, via password
  - this project requires access to the root user from localhost, or a user with similar privileges of root, the password and user needs to be declared in the env.env file
  - a `enterprise` database and all privileges on it
  - the server needs to be able to have indices of length up to 3000 bytes, to achieve this one can use the following options for the server:
    - innodb_file_format = Barracuda
    - innodb_default_row_format = dynamic
    - innodb_large_prefix = ON
    - mariadb >= 10.3 does not need these options
- A `env.env` file, similar to the available `test.env` file

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
