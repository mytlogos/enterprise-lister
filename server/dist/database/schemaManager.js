"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tools_1 = require("../tools");
const logger_1 = tslib_1.__importDefault(require("../logger"));
class SchemaManager {
    constructor() {
        this.databaseName = "";
        this.dataBaseVersion = 0;
        this.tables = [];
        this.mainTable = null;
        this.trigger = [];
        this.migrations = [];
    }
    initTableSchema(database) {
        this.databaseName = database.name;
        this.dataBaseVersion = database.version;
        this.mainTable = database.mainTable;
        this.tables.push(...database.tables);
        this.trigger.push(...database.triggers);
        this.migrations.push(...database.migrations);
    }
    async checkTableSchema(context) {
        logger_1.default.info("Starting Check on Storage Schema");
        const canMigrate = await context.startMigration();
        if (!canMigrate) {
            await (async function wait(retry = 0) {
                if (retry > 9) {
                    throw Error("cannot start migration check, as migration flag is still set after 10 retries");
                }
                logger_1.default.error("waiting");
                await tools_1.delay();
                if (!await context.startMigration()) {
                    await wait(retry + 1);
                }
            }());
        }
        // display all current tables
        try {
            await this.checkSchema(context);
        }
        finally {
            await context.stopMigration();
        }
    }
    async checkSchema(context) {
        const tables = await context.getTables();
        const enterpriseTableProperty = `Tables_in_${this.databaseName}`;
        // create tables which do not exist
        await Promise.all(this.tables
            .filter((tableSchema) => !tables.find((table) => table[enterpriseTableProperty] === tableSchema.name))
            .map((tableSchema) => {
            const schema = tableSchema.getTableSchema();
            return context.createTable(schema.name, schema.columns);
        }));
        const dbTriggers = await context.getTriggers();
        let triggerCreated = 0;
        let triggerDeleted = 0;
        // create triggers which do not exist, and drops triggers which are not in schema
        await Promise.all(this.trigger
            .filter((trigger) => {
            for (let i = 0; i < dbTriggers.length; i++) {
                const dbTrigger = dbTriggers[i];
                if (tools_1.equalsIgnore(dbTrigger.Trigger, trigger.name)
                    && tools_1.equalsIgnore(dbTrigger.Event, trigger.event)
                    && tools_1.equalsIgnore(dbTrigger.Timing, trigger.timing)
                    && tools_1.equalsIgnore(dbTrigger.Table, trigger.table)) {
                    dbTriggers.splice(i, 1);
                    return false;
                }
            }
            return true;
        })
            .map((trigger) => context.createTrigger(trigger).then(() => triggerCreated++)));
        // every trigger that is left over, is not in schema and ready to be dropped
        await Promise.all(dbTriggers
            .filter((value) => this.tables.find((table) => table.name === value.Table))
            .map((value) => context.dropTrigger(value.Trigger).then(() => triggerDeleted++)));
        const versionResult = await context.getDatabaseVersion();
        let previousVersion = 0;
        if (versionResult && versionResult[0] && versionResult[0].version > 0) {
            previousVersion = versionResult[0].version;
        }
        logger_1.default.info(`Created ${triggerCreated} Triggers and dropped ${triggerDeleted} Triggers`);
        const currentVersion = this.dataBaseVersion;
        if (currentVersion === previousVersion) {
            logger_1.default.info("Storage Version is up-to-date");
            return;
        }
        else if (currentVersion < previousVersion) {
            throw Error("database version is smaller in code than in database");
        }
        const migrations = [];
        let lastMigrationVersion = previousVersion;
        let directMigration = null;
        while (lastMigrationVersion < currentVersion) {
            let foundMigration = false;
            for (const migration of this.migrations) {
                if (migration.fromVersion === previousVersion && migration.toVersion === currentVersion) {
                    directMigration = migration;
                    break;
                }
                else if (migration.fromVersion === lastMigrationVersion) {
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
        logger_1.default.info(`Starting Migration of Storage from ${previousVersion} to ${currentVersion}`);
        if (directMigration) {
            await directMigration.migrate(context);
        }
        else {
            for (const migration of migrations) {
                await migration.migrate(context);
            }
        }
        // FIXME: 10.08.2019 inserting new database version does not seem to work
        await context.updateDatabaseVersion(currentVersion);
        logger_1.default.info(`successfully migrated storage from version ${previousVersion} to ${currentVersion}`);
    }
    getShortest(previousVersion) {
        const root = {
            children: []
        };
        const fromVersionMap = new Map();
        for (const migration of this.migrations) {
            const fromMigrations = tools_1.getElseSet(fromVersionMap, migration.fromVersion, () => []);
            fromMigrations.push({ migration, children: [], parents: [] });
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
        const currentPathMap = new Map();
        const visited = [];
        const queue = [root];
        while (queue.length > 0) {
            const firstElement = queue[0];
            queue.splice(0, 1);
            if (isNode(firstElement)) {
                // TODO: 08.08.2019 implement this
            }
        }
    }
}
exports.SchemaManager = SchemaManager;
function isRoot(value) {
    return value.children && !value.migration;
}
function isNode(value) {
    return value.children && value.migration;
}
//# sourceMappingURL=schemaManager.js.map