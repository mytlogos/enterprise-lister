import {DatabaseSchema, Migration} from "./databaseTypes";
import {QueryContext} from "./queryContext";
import {TableSchema} from "./tableSchema";
import {Trigger} from "./trigger";
import {equalsIgnore, getElseSet} from "../tools";

export class SchemaManager {
    private databaseName = "";
    private dataBaseVersion = 0;
    private tables: TableSchema[] = [];
    private mainTable: TableSchema | null = null;
    private trigger: Trigger[] = [];
    private migrations: Migration[] = [];

    public initTableSchema(database: DatabaseSchema): void {
        this.databaseName = database.name;
        this.dataBaseVersion = database.version;
        this.mainTable = database.mainTable;
        this.tables.push(...database.tables);
        this.trigger.push(...database.triggers);
        this.migrations.push(...database.migrations);
    }

    public async checkTableSchema(context: QueryContext): Promise<void> {
        // display all current tables
        const tables: any[] = await context.getTables();

        const enterpriseTableProperty = `Tables_in_${this.databaseName}`;

        // create tables which do not exist
        await Promise.all(this.tables
            .filter((tableSchema) => !tables.find((table: any) => table[enterpriseTableProperty] === tableSchema.name))
            .map((tableSchema) => {
                const schema = tableSchema.getTableSchema();
                return context.createTable(schema.name, schema.columns);
            }));

        const dbTriggers = await context.getTriggers();

        // create triggers which do not exist, and drops triggers which are not in schema
        await Promise.all(this.trigger
            .filter((trigger) => {
                for (let i = 0; i < dbTriggers.length; i++) {
                    const dbTrigger = dbTriggers[i];

                    if (equalsIgnore(dbTrigger.Trigger, trigger.name)
                        && equalsIgnore(dbTrigger.Event, trigger.event)
                        && equalsIgnore(dbTrigger.Timing, trigger.timing)
                        && equalsIgnore(dbTrigger.Table, trigger.table)) {

                        dbTriggers.splice(i, 1);
                        return false;
                    }
                }
                return true;
            })
            .map((trigger) => context.createTrigger(trigger)));

        // every trigger that is left over, is not in schema and ready to be dropped
        await Promise.all(dbTriggers
            .filter((value) => this.tables.find((table) => table.name === value.Table))
            .map((value) => context.dropTrigger(value.Trigger))
        );

        const versionResult = await context.getDatabaseVersion();
        let previousVersion = 0;

        if (versionResult && versionResult[0] && versionResult[0].version > 0) {
            previousVersion = versionResult[0].version;
        }

        const currentVersion = this.dataBaseVersion;
        if (currentVersion === previousVersion) {
            return;
        } else if (currentVersion < previousVersion) {
            throw Error("database version is smaller in code than in database");
        }

        const migrations: Migration[] = [];
        let lastMigrationVersion = previousVersion;
        let directMigration = null;

        while (lastMigrationVersion < currentVersion) {
            let foundMigration = false;
            for (const migration of this.migrations) {
                if (migration.fromVersion === previousVersion && migration.toVersion === currentVersion) {
                    directMigration = migration;
                    break;
                } else if (migration.fromVersion === lastMigrationVersion) {
                    lastMigrationVersion = migration.toVersion;
                    migrations.push(migration);
                    foundMigration = true;
                }
            }
            if (directMigration) {
                break;
            }
            if (!foundMigration) {
                throw Error(`no migration plan found from '${previousVersion}' to '${currentVersion}'`);
            }
        }
        if (directMigration == null && (!migrations.length || lastMigrationVersion !== currentVersion)) {
            throw Error(`no migration plan found from '${previousVersion}' to '${currentVersion}'`);
        }
        if (directMigration) {
            await directMigration.migrate(context);
        } else {
            for (const migration of migrations) {
                await migration.migrate(context);
            }
        }
        // FIXME: 10.08.2019 inserting new database version does not seem to work
        await context.updateDatabaseVersion(currentVersion);
        console.log(`successfully migrated storage from version ${previousVersion} to ${currentVersion}`);
    }

    private getShortest(previousVersion: number) {
        const root: Root = {
            children: []
        };
        const fromVersionMap: Map<number, Node[]> = new Map();

        for (const migration of this.migrations) {
            const fromMigrations = getElseSet(fromVersionMap, migration.fromVersion, () => []);
            fromMigrations.push({migration, children: [], parents: []});
        }
        for (const [from, value] of fromVersionMap.entries()) {
            if (from === previousVersion) {
                root.children.push(...value);

                for (const node of value) {
                    node.parents.push(root);
                }
            }
            if (from <= previousVersion) {
                continue;
            }
            for (const node of value) {
                const nodes = fromVersionMap.get(node.migration.toVersion);

                if (nodes == null) {
                    continue;
                }
                node.children.push(...nodes);

                for (const child of nodes) {
                    child.parents.push(node);
                }
            }
        }
        const currentPathMap: Map<Migration, Migration[]> = new Map();
        const visited = [];
        const queue: Array<Root | Node> = [root];

        while (queue.length > 0) {
            const firstElement: Root | Node = queue[0];
            queue.splice(0, 1);

            if (isNode(firstElement)) {
                // TODO: 08.08.2019 implement this
            }
        }
    }
}

function isRoot(value: any): value is Root {
    return value.children && !value.migration;
}

function isNode(value: any): value is Node {
    return value.children && value.migration;
}

interface Root {
    children: Node[];
}

interface Node extends Root {
    migration: Migration;
    parents: Array<Node | Root>;
    children: Node[];
}
