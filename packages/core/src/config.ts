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

// TODO: implement alternative config mechanism?
const config: CoreConfig = {} as any;
export default config;
