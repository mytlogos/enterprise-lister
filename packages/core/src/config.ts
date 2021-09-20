export interface CoreGeneralConfig {
  core: CoreConfig;
}

export interface CoreConfig {
  storage: {
    backend: "mariadb";
    host: string;
    database: string;
    user: string;
    password: string;
    connectionLimit: number;
  };
}

export default {} as CoreConfig;
