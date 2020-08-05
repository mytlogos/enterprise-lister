"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This is generated from https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
 */
var MysqlServerError;
(function (MysqlServerError) {
    /**
     * Message: NO
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO"] = 1002] = "ER_NO";
    /**
     * Message: YES
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_YES"] = 1003] = "ER_YES";
    /**
     * Message: Can't create file '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_FILE"] = 1004] = "ER_CANT_CREATE_FILE";
    /**
     * Message: Can't create table '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_TABLE"] = 1005] = "ER_CANT_CREATE_TABLE";
    /**
     * Message: Can't create database '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_DB"] = 1006] = "ER_CANT_CREATE_DB";
    /**
     * Message: Can't create database '%s'; database exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DB_CREATE_EXISTS"] = 1007] = "ER_DB_CREATE_EXISTS";
    /**
     * Message: Can't drop database '%s'; database doesn't exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DB_DROP_EXISTS"] = 1008] = "ER_DB_DROP_EXISTS";
    /**
     * Message: Error dropping database (can't rmdir '%s', errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DB_DROP_RMDIR"] = 1010] = "ER_DB_DROP_RMDIR";
    /**
     * Message: Can't read record in system table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_FIND_SYSTEM_REC"] = 1012] = "ER_CANT_FIND_SYSTEM_REC";
    /**
     * Message: Can't get status of '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_GET_STAT"] = 1013] = "ER_CANT_GET_STAT";
    /**
     * Message: Can't lock file (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_LOCK"] = 1015] = "ER_CANT_LOCK";
    /**
     * Message: Can't open file: '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_OPEN_FILE"] = 1016] = "ER_CANT_OPEN_FILE";
    /**
     * Message: Can't find file: '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILE_NOT_FOUND"] = 1017] = "ER_FILE_NOT_FOUND";
    /**
     * Message: Can't read dir of '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_READ_DIR"] = 1018] = "ER_CANT_READ_DIR";
    /**
     * Message: Record has changed since last read in table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECKREAD"] = 1020] = "ER_CHECKREAD";
    /**
     * Message: Can't write; duplicate key in table '%s'
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_DUP_KEY"] = 1022] = "ER_DUP_KEY";
    /**
     * Message: Error reading file '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_ON_READ"] = 1024] = "ER_ERROR_ON_READ";
    /**
     * Message: Error on rename of '%s' to '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_ON_RENAME"] = 1025] = "ER_ERROR_ON_RENAME";
    /**
     * Message: Error writing file '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_ON_WRITE"] = 1026] = "ER_ERROR_ON_WRITE";
    /**
     * Message: '%s' is locked against change
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILE_USED"] = 1027] = "ER_FILE_USED";
    /**
     * Message: Sort aborted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILSORT_ABORT"] = 1028] = "ER_FILSORT_ABORT";
    /**
     * Message: Got error %d - '%s' from storage engine
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GET_ERRNO"] = 1030] = "ER_GET_ERRNO";
    /**
     * Message: Table storage engine for '%s' doesn't have this option
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_HA"] = 1031] = "ER_ILLEGAL_HA";
    /**
     * Message: Can't find record in '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEY_NOT_FOUND"] = 1032] = "ER_KEY_NOT_FOUND";
    /**
     * Message: Incorrect information in file: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NOT_FORM_FILE"] = 1033] = "ER_NOT_FORM_FILE";
    /**
     * Message: Incorrect key file for table '%s'; try to repair it
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NOT_KEYFILE"] = 1034] = "ER_NOT_KEYFILE";
    /**
     * Message: Old key file for table '%s'; repair it!
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OLD_KEYFILE"] = 1035] = "ER_OLD_KEYFILE";
    /**
     * Message: Table '%s' is read only
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OPEN_AS_READONLY"] = 1036] = "ER_OPEN_AS_READONLY";
    /**
     * Message: Out of memory; restart server and try again (needed %d bytes)
     * SQLState: HY001
     */
    MysqlServerError[MysqlServerError["ER_OUTOFMEMORY"] = 1037] = "ER_OUTOFMEMORY";
    /**
     * Message: Out of sort memory, consider increasing server sort buffer size
     * SQLState: HY001
     */
    MysqlServerError[MysqlServerError["ER_OUT_OF_SORTMEMORY"] = 1038] = "ER_OUT_OF_SORTMEMORY";
    /**
     * Message: Too many connections
     * SQLState: 08004
     */
    MysqlServerError[MysqlServerError["ER_CON_COUNT_ERROR"] = 1040] = "ER_CON_COUNT_ERROR";
    /**
     * Message: Out of memory; check if mysqld or some other process uses all available memory; if not, you may have to use 'ulimit' to allow mysqld to use more memory or you can add more swap space
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OUT_OF_RESOURCES"] = 1041] = "ER_OUT_OF_RESOURCES";
    /**
     * Message: Can't get hostname for your address
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_BAD_HOST_ERROR"] = 1042] = "ER_BAD_HOST_ERROR";
    /**
     * Message: Bad handshake
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_HANDSHAKE_ERROR"] = 1043] = "ER_HANDSHAKE_ERROR";
    /**
     * Message: Access denied for user '%s'@'%s' to database '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_DBACCESS_DENIED_ERROR"] = 1044] = "ER_DBACCESS_DENIED_ERROR";
    /**
     * Message: Access denied for user '%s'@'%s' (using password: %s)
     * SQLState: 28000
     */
    MysqlServerError[MysqlServerError["ER_ACCESS_DENIED_ERROR"] = 1045] = "ER_ACCESS_DENIED_ERROR";
    /**
     * Message: No database selected
     * SQLState: 3D000
     */
    MysqlServerError[MysqlServerError["ER_NO_DB_ERROR"] = 1046] = "ER_NO_DB_ERROR";
    /**
     * Message: Unknown command
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_COM_ERROR"] = 1047] = "ER_UNKNOWN_COM_ERROR";
    /**
     * Message: Column '%s' cannot be null
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_BAD_NULL_ERROR"] = 1048] = "ER_BAD_NULL_ERROR";
    /**
     * Message: Unknown database '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_BAD_DB_ERROR"] = 1049] = "ER_BAD_DB_ERROR";
    /**
     * Message: Table '%s' already exists
     * SQLState: 42S01
     */
    MysqlServerError[MysqlServerError["ER_TABLE_EXISTS_ERROR"] = 1050] = "ER_TABLE_EXISTS_ERROR";
    /**
     * Message: Unknown table '%s'
     * SQLState: 42S02
     */
    MysqlServerError[MysqlServerError["ER_BAD_TABLE_ERROR"] = 1051] = "ER_BAD_TABLE_ERROR";
    /**
     * Message: Column '%s' in %s is ambiguous
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_NON_UNIQ_ERROR"] = 1052] = "ER_NON_UNIQ_ERROR";
    /**
     * Message: Server shutdown in progress
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_SERVER_SHUTDOWN"] = 1053] = "ER_SERVER_SHUTDOWN";
    /**
     * Message: Unknown column '%s' in '%s'
     * SQLState: 42S22
     */
    MysqlServerError[MysqlServerError["ER_BAD_FIELD_ERROR"] = 1054] = "ER_BAD_FIELD_ERROR";
    /**
     * Message: '%s' isn't in GROUP BY
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FIELD_WITH_GROUP"] = 1055] = "ER_WRONG_FIELD_WITH_GROUP";
    /**
     * Message: Can't group on '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_GROUP_FIELD"] = 1056] = "ER_WRONG_GROUP_FIELD";
    /**
     * Message: Statement has sum functions and columns in same statement
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_SUM_SELECT"] = 1057] = "ER_WRONG_SUM_SELECT";
    /**
     * Message: Column count doesn't match value count
     * SQLState: 21S01
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE_COUNT"] = 1058] = "ER_WRONG_VALUE_COUNT";
    /**
     * Message: Identifier name '%s' is too long
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_IDENT"] = 1059] = "ER_TOO_LONG_IDENT";
    /**
     * Message: Duplicate column name '%s'
     * SQLState: 42S21
     */
    MysqlServerError[MysqlServerError["ER_DUP_FIELDNAME"] = 1060] = "ER_DUP_FIELDNAME";
    /**
     * Message: Duplicate key name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_DUP_KEYNAME"] = 1061] = "ER_DUP_KEYNAME";
    /**
     * Message: Duplicate entry '%s' for key %d
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_DUP_ENTRY"] = 1062] = "ER_DUP_ENTRY";
    /**
     * Message: Incorrect column specifier for column '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FIELD_SPEC"] = 1063] = "ER_WRONG_FIELD_SPEC";
    /**
     * Message: %s near '%s' at line %d
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PARSE_ERROR"] = 1064] = "ER_PARSE_ERROR";
    /**
     * Message: Query was empty
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_EMPTY_QUERY"] = 1065] = "ER_EMPTY_QUERY";
    /**
     * Message: Not unique table/alias: '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NONUNIQ_TABLE"] = 1066] = "ER_NONUNIQ_TABLE";
    /**
     * Message: Invalid default value for '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_DEFAULT"] = 1067] = "ER_INVALID_DEFAULT";
    /**
     * Message: Multiple primary key defined
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_MULTIPLE_PRI_KEY"] = 1068] = "ER_MULTIPLE_PRI_KEY";
    /**
     * Message: Too many keys specified; max %d keys allowed
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_KEYS"] = 1069] = "ER_TOO_MANY_KEYS";
    /**
     * Message: Too many key parts specified; max %d parts allowed
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_KEY_PARTS"] = 1070] = "ER_TOO_MANY_KEY_PARTS";
    /**
     * Message: Specified key was too long; max key length is %d bytes
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_KEY"] = 1071] = "ER_TOO_LONG_KEY";
    /**
     * Message: Key column '%s' doesn't exist in table
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_KEY_COLUMN_DOES_NOT_EXITS"] = 1072] = "ER_KEY_COLUMN_DOES_NOT_EXITS";
    /**
     * Message: BLOB column '%s' can't be used in key specification with the used table type
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_BLOB_USED_AS_KEY"] = 1073] = "ER_BLOB_USED_AS_KEY";
    /**
     * Message: Column length too big for column '%s' (max = %lu); use BLOB or TEXT instead
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_FIELDLENGTH"] = 1074] = "ER_TOO_BIG_FIELDLENGTH";
    /**
     * Message: Incorrect table definition; there can be only one auto column and it must be defined as a key
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_AUTO_KEY"] = 1075] = "ER_WRONG_AUTO_KEY";
    /**
     * Message: %s: ready for connections. Version: '%s' socket: '%s' port: %d
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_READY"] = 1076] = "ER_READY";
    /**
     * Message: %s: Normal shutdown
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NORMAL_SHUTDOWN"] = 1077] = "ER_NORMAL_SHUTDOWN";
    /**
     * Message: %s: Shutdown complete
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SHUTDOWN_COMPLETE"] = 1079] = "ER_SHUTDOWN_COMPLETE";
    /**
     * Message: %s: Forcing close of thread %ld user: '%s'
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_FORCING_CLOSE"] = 1080] = "ER_FORCING_CLOSE";
    /**
     * Message: Can't create IP socket
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_IPSOCK_ERROR"] = 1081] = "ER_IPSOCK_ERROR";
    /**
     * Message: Table '%s' has no index like the one used in CREATE INDEX; recreate the table
     * SQLState: 42S12
     */
    MysqlServerError[MysqlServerError["ER_NO_SUCH_INDEX"] = 1082] = "ER_NO_SUCH_INDEX";
    /**
     * Message: Field separator argument is not what is expected; check the manual
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FIELD_TERMINATORS"] = 1083] = "ER_WRONG_FIELD_TERMINATORS";
    /**
     * Message: You can't use fixed rowlength with BLOBs; please use 'fields terminated by'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_BLOBS_AND_NO_TERMINATED"] = 1084] = "ER_BLOBS_AND_NO_TERMINATED";
    /**
     * Message: The file '%s' must be in the database directory or be readable by all
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEXTFILE_NOT_READABLE"] = 1085] = "ER_TEXTFILE_NOT_READABLE";
    /**
     * Message: File '%s' already exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILE_EXISTS_ERROR"] = 1086] = "ER_FILE_EXISTS_ERROR";
    /**
     * Message: Records: %ld Deleted: %ld Skipped: %ld Warnings: %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOAD_INFO"] = 1087] = "ER_LOAD_INFO";
    /**
     * Message: Records: %ld Duplicates: %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_INFO"] = 1088] = "ER_ALTER_INFO";
    /**
     * Message: Incorrect prefix key; the used key part isn't a string, the used length is longer than the key part, or the storage engine doesn't support unique prefix keys
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_SUB_KEY"] = 1089] = "ER_WRONG_SUB_KEY";
    /**
     * Message: You can't delete all columns with ALTER TABLE; use DROP TABLE instead
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CANT_REMOVE_ALL_FIELDS"] = 1090] = "ER_CANT_REMOVE_ALL_FIELDS";
    /**
     * Message: Can't DROP '%s'; check that column/key exists
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CANT_DROP_FIELD_OR_KEY"] = 1091] = "ER_CANT_DROP_FIELD_OR_KEY";
    /**
     * Message: Records: %ld Duplicates: %ld Warnings: %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSERT_INFO"] = 1092] = "ER_INSERT_INFO";
    /**
     * Message: You can't specify target table '%s' for update in FROM clause
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_TABLE_USED"] = 1093] = "ER_UPDATE_TABLE_USED";
    /**
     * Message: Unknown thread id: %lu
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SUCH_THREAD"] = 1094] = "ER_NO_SUCH_THREAD";
    /**
     * Message: You are not owner of thread %lu
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KILL_DENIED_ERROR"] = 1095] = "ER_KILL_DENIED_ERROR";
    /**
     * Message: No tables used
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_TABLES_USED"] = 1096] = "ER_NO_TABLES_USED";
    /**
     * Message: Too many strings for column %s and SET
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_SET"] = 1097] = "ER_TOO_BIG_SET";
    /**
     * Message: Can't generate a unique log-filename %s.(1-999)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_UNIQUE_LOGFILE"] = 1098] = "ER_NO_UNIQUE_LOGFILE";
    /**
     * Message: Table '%s' was locked with a READ lock and can't be updated
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NOT_LOCKED_FOR_WRITE"] = 1099] = "ER_TABLE_NOT_LOCKED_FOR_WRITE";
    /**
     * Message: Table '%s' was not locked with LOCK TABLES
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NOT_LOCKED"] = 1100] = "ER_TABLE_NOT_LOCKED";
    /**
     * Message: BLOB, TEXT, GEOMETRY or JSON column '%s' can't have a default value
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_BLOB_CANT_HAVE_DEFAULT"] = 1101] = "ER_BLOB_CANT_HAVE_DEFAULT";
    /**
     * Message: Incorrect database name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_DB_NAME"] = 1102] = "ER_WRONG_DB_NAME";
    /**
     * Message: Incorrect table name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_TABLE_NAME"] = 1103] = "ER_WRONG_TABLE_NAME";
    /**
     * Message: The SELECT would examine more than MAX_JOIN_SIZE rows; check your WHERE and use SET SQL_BIG_SELECTS=1 or SET MAX_JOIN_SIZE=# if the SELECT is okay
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_SELECT"] = 1104] = "ER_TOO_BIG_SELECT";
    /**
     * Message: Unknown error
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_ERROR"] = 1105] = "ER_UNKNOWN_ERROR";
    /**
     * Message: Unknown procedure '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_PROCEDURE"] = 1106] = "ER_UNKNOWN_PROCEDURE";
    /**
     * Message: Incorrect parameter count to procedure '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARAMCOUNT_TO_PROCEDURE"] = 1107] = "ER_WRONG_PARAMCOUNT_TO_PROCEDURE";
    /**
     * Message: Incorrect parameters to procedure '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARAMETERS_TO_PROCEDURE"] = 1108] = "ER_WRONG_PARAMETERS_TO_PROCEDURE";
    /**
     * Message: Unknown table '%s' in %s
     * SQLState: 42S02
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_TABLE"] = 1109] = "ER_UNKNOWN_TABLE";
    /**
     * Message: Column '%s' specified twice
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_FIELD_SPECIFIED_TWICE"] = 1110] = "ER_FIELD_SPECIFIED_TWICE";
    /**
     * Message: Invalid use of group function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_GROUP_FUNC_USE"] = 1111] = "ER_INVALID_GROUP_FUNC_USE";
    /**
     * Message: Table '%s' uses an extension that doesn't exist in this MySQL version
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_EXTENSION"] = 1112] = "ER_UNSUPPORTED_EXTENSION";
    /**
     * Message: A table must have at least 1 column
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_MUST_HAVE_COLUMNS"] = 1113] = "ER_TABLE_MUST_HAVE_COLUMNS";
    /**
     * Message: The table '%s' is full
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RECORD_FILE_FULL"] = 1114] = "ER_RECORD_FILE_FULL";
    /**
     * Message: Unknown character set: '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_CHARACTER_SET"] = 1115] = "ER_UNKNOWN_CHARACTER_SET";
    /**
     * Message: Too many tables; MySQL can only use %d tables in a join
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_TABLES"] = 1116] = "ER_TOO_MANY_TABLES";
    /**
     * Message: Too many columns
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_FIELDS"] = 1117] = "ER_TOO_MANY_FIELDS";
    /**
     * Message: Row size too large. The maximum row size for the used table type, not counting BLOBs, is %ld. This includes storage overhead, check the manual. You have to change some columns to TEXT or BLOBs
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_ROWSIZE"] = 1118] = "ER_TOO_BIG_ROWSIZE";
    /**
     * Message: Thread stack overrun: Used: %ld of a %ld stack. Use 'mysqld --thread_stack=#' to specify a bigger stack if needed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STACK_OVERRUN"] = 1119] = "ER_STACK_OVERRUN";
    /**
     * Message: Cross dependency found in OUTER JOIN; examine your ON conditions
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_OUTER_JOIN"] = 1120] = "ER_WRONG_OUTER_JOIN";
    /**
     * Message: Cross dependency found in OUTER JOIN; examine your ON conditions
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_OUTER_JOIN_UNUSED"] = 1120] = "ER_WRONG_OUTER_JOIN_UNUSED";
    /**
     * Message: Table handler doesn't support NULL in given index. Please change column '%s' to be NOT NULL or use another handler
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NULL_COLUMN_IN_INDEX"] = 1121] = "ER_NULL_COLUMN_IN_INDEX";
    /**
     * Message: Can't load function '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_FIND_UDF"] = 1122] = "ER_CANT_FIND_UDF";
    /**
     * Message: Can't initialize function '%s'; %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_INITIALIZE_UDF"] = 1123] = "ER_CANT_INITIALIZE_UDF";
    /**
     * Message: No paths allowed for shared library
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UDF_NO_PATHS"] = 1124] = "ER_UDF_NO_PATHS";
    /**
     * Message: Function '%s' already exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UDF_EXISTS"] = 1125] = "ER_UDF_EXISTS";
    /**
     * Message: Can't open shared library '%s' (errno: %d %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_OPEN_LIBRARY"] = 1126] = "ER_CANT_OPEN_LIBRARY";
    /**
     * Message: Can't find symbol '%s' in library
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_FIND_DL_ENTRY"] = 1127] = "ER_CANT_FIND_DL_ENTRY";
    /**
     * Message: Function '%s' is not defined
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTION_NOT_DEFINED"] = 1128] = "ER_FUNCTION_NOT_DEFINED";
    /**
     * Message: Host '%s' is blocked because of many connection errors; unblock with 'mysqladmin flush-hosts'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_HOST_IS_BLOCKED"] = 1129] = "ER_HOST_IS_BLOCKED";
    /**
     * Message: Host '%s' is not allowed to connect to this MySQL server
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_HOST_NOT_PRIVILEGED"] = 1130] = "ER_HOST_NOT_PRIVILEGED";
    /**
     * Message: You are using MySQL as an anonymous user and anonymous users are not allowed to change passwords
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_ANONYMOUS_USER"] = 1131] = "ER_PASSWORD_ANONYMOUS_USER";
    /**
     * Message: You must have privileges to update tables in the mysql database to be able to change passwords for others
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_NOT_ALLOWED"] = 1132] = "ER_PASSWORD_NOT_ALLOWED";
    /**
     * Message: Can't find any matching row in the user table
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_NO_MATCH"] = 1133] = "ER_PASSWORD_NO_MATCH";
    /**
     * Message: Rows matched: %ld Changed: %ld Warnings: %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_INFO"] = 1134] = "ER_UPDATE_INFO";
    /**
     * Message: Can't create a new thread (errno %d); if you are not out of available memory, you can consult the manual for a possible OS-dependent bug
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_THREAD"] = 1135] = "ER_CANT_CREATE_THREAD";
    /**
     * Message: Column count doesn't match value count at row %ld
     * SQLState: 21S01
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE_COUNT_ON_ROW"] = 1136] = "ER_WRONG_VALUE_COUNT_ON_ROW";
    /**
     * Message: Can't reopen table: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_REOPEN_TABLE"] = 1137] = "ER_CANT_REOPEN_TABLE";
    /**
     * Message: Invalid use of NULL value
     * SQLState: 22004
     */
    MysqlServerError[MysqlServerError["ER_INVALID_USE_OF_NULL"] = 1138] = "ER_INVALID_USE_OF_NULL";
    /**
     * Message: Got error '%s' from regexp
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_ERROR"] = 1139] = "ER_REGEXP_ERROR";
    /**
     * Message: Mixing of GROUP columns (MIN(),MAX(),COUNT(),...) with no GROUP columns is illegal if there is no GROUP BY clause
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_MIX_OF_GROUP_FUNC_AND_FIELDS"] = 1140] = "ER_MIX_OF_GROUP_FUNC_AND_FIELDS";
    /**
     * Message: There is no such grant defined for user '%s' on host '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NONEXISTING_GRANT"] = 1141] = "ER_NONEXISTING_GRANT";
    /**
     * Message: %s command denied to user '%s'@'%s' for table '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TABLEACCESS_DENIED_ERROR"] = 1142] = "ER_TABLEACCESS_DENIED_ERROR";
    /**
     * Message: %s command denied to user '%s'@'%s' for column '%s' in table '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_COLUMNACCESS_DENIED_ERROR"] = 1143] = "ER_COLUMNACCESS_DENIED_ERROR";
    /**
     * Message: Illegal GRANT/REVOKE command; please consult the manual to see which privileges can be used
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_GRANT_FOR_TABLE"] = 1144] = "ER_ILLEGAL_GRANT_FOR_TABLE";
    /**
     * Message: The host or user argument to GRANT is too long
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_GRANT_WRONG_HOST_OR_USER"] = 1145] = "ER_GRANT_WRONG_HOST_OR_USER";
    /**
     * Message: Table '%s.%s' doesn't exist
     * SQLState: 42S02
     */
    MysqlServerError[MysqlServerError["ER_NO_SUCH_TABLE"] = 1146] = "ER_NO_SUCH_TABLE";
    /**
     * Message: There is no such grant defined for user '%s' on host '%s' on table '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NONEXISTING_TABLE_GRANT"] = 1147] = "ER_NONEXISTING_TABLE_GRANT";
    /**
     * Message: The used command is not allowed with this MySQL version
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NOT_ALLOWED_COMMAND"] = 1148] = "ER_NOT_ALLOWED_COMMAND";
    /**
     * Message: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SYNTAX_ERROR"] = 1149] = "ER_SYNTAX_ERROR";
    /**
     * Message: Aborted connection %ld to db: '%s' user: '%s' (%s)
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_ABORTING_CONNECTION"] = 1152] = "ER_ABORTING_CONNECTION";
    /**
     * Message: Got a packet bigger than 'max_allowed_packet' bytes
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_PACKET_TOO_LARGE"] = 1153] = "ER_NET_PACKET_TOO_LARGE";
    /**
     * Message: Got a read error from the connection pipe
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_READ_ERROR_FROM_PIPE"] = 1154] = "ER_NET_READ_ERROR_FROM_PIPE";
    /**
     * Message: Got an error from fcntl()
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_FCNTL_ERROR"] = 1155] = "ER_NET_FCNTL_ERROR";
    /**
     * Message: Got packets out of order
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_PACKETS_OUT_OF_ORDER"] = 1156] = "ER_NET_PACKETS_OUT_OF_ORDER";
    /**
     * Message: Couldn't uncompress communication packet
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_UNCOMPRESS_ERROR"] = 1157] = "ER_NET_UNCOMPRESS_ERROR";
    /**
     * Message: Got an error reading communication packets
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_READ_ERROR"] = 1158] = "ER_NET_READ_ERROR";
    /**
     * Message: Got timeout reading communication packets
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_READ_INTERRUPTED"] = 1159] = "ER_NET_READ_INTERRUPTED";
    /**
     * Message: Got an error writing communication packets
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_ERROR_ON_WRITE"] = 1160] = "ER_NET_ERROR_ON_WRITE";
    /**
     * Message: Got timeout writing communication packets
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_WRITE_INTERRUPTED"] = 1161] = "ER_NET_WRITE_INTERRUPTED";
    /**
     * Message: Result string is longer than 'max_allowed_packet' bytes
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_STRING"] = 1162] = "ER_TOO_LONG_STRING";
    /**
     * Message: The used table type doesn't support BLOB/TEXT columns
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_CANT_HANDLE_BLOB"] = 1163] = "ER_TABLE_CANT_HANDLE_BLOB";
    /**
     * Message: The used table type doesn't support AUTO_INCREMENT columns
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_CANT_HANDLE_AUTO_INCREMENT"] = 1164] = "ER_TABLE_CANT_HANDLE_AUTO_INCREMENT";
    /**
     * Message: Incorrect column name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_COLUMN_NAME"] = 1166] = "ER_WRONG_COLUMN_NAME";
    /**
     * Message: The used storage engine can't index column '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_KEY_COLUMN"] = 1167] = "ER_WRONG_KEY_COLUMN";
    /**
     * Message: Unable to open underlying table which is differently defined or of non-MyISAM type or doesn't exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_MRG_TABLE"] = 1168] = "ER_WRONG_MRG_TABLE";
    /**
     * Message: Can't write, because of unique constraint, to table '%s'
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_DUP_UNIQUE"] = 1169] = "ER_DUP_UNIQUE";
    /**
     * Message: BLOB/TEXT column '%s' used in key specification without a key length
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_BLOB_KEY_WITHOUT_LENGTH"] = 1170] = "ER_BLOB_KEY_WITHOUT_LENGTH";
    /**
     * Message: All parts of a PRIMARY KEY must be NOT NULL; if you need NULL in a key, use UNIQUE instead
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PRIMARY_CANT_HAVE_NULL"] = 1171] = "ER_PRIMARY_CANT_HAVE_NULL";
    /**
     * Message: Result consisted of more than one row
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_ROWS"] = 1172] = "ER_TOO_MANY_ROWS";
    /**
     * Message: This table type requires a primary key
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_REQUIRES_PRIMARY_KEY"] = 1173] = "ER_REQUIRES_PRIMARY_KEY";
    /**
     * Message: You are using safe update mode and you tried to update a table without a WHERE that uses a KEY column. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE"] = 1175] = "ER_UPDATE_WITHOUT_KEY_IN_SAFE_MODE";
    /**
     * Message: Key '%s' doesn't exist in table '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_KEY_DOES_NOT_EXITS"] = 1176] = "ER_KEY_DOES_NOT_EXITS";
    /**
     * Message: Can't open table
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_NO_SUCH_TABLE"] = 1177] = "ER_CHECK_NO_SUCH_TABLE";
    /**
     * Message: The storage engine for the table doesn't support %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_NOT_IMPLEMENTED"] = 1178] = "ER_CHECK_NOT_IMPLEMENTED";
    /**
     * Message: You are not allowed to execute this command in a transaction
     * SQLState: 25000
     */
    MysqlServerError[MysqlServerError["ER_CANT_DO_THIS_DURING_AN_TRANSACTION"] = 1179] = "ER_CANT_DO_THIS_DURING_AN_TRANSACTION";
    /**
     * Message: Got error %d - '%s' during COMMIT
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_DURING_COMMIT"] = 1180] = "ER_ERROR_DURING_COMMIT";
    /**
     * Message: Got error %d - '%s' during ROLLBACK
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_DURING_ROLLBACK"] = 1181] = "ER_ERROR_DURING_ROLLBACK";
    /**
     * Message: Got error %d during FLUSH_LOGS
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_DURING_FLUSH_LOGS"] = 1182] = "ER_ERROR_DURING_FLUSH_LOGS";
    /**
     * Message: Aborted connection %u to db: '%s' user: '%s' host: '%s' (%s)
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NEW_ABORTING_CONNECTION"] = 1184] = "ER_NEW_ABORTING_CONNECTION";
    /**
     * Message: Error from master: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER"] = 1188] = "ER_MASTER";
    /**
     * Message: Net error reading from master
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_MASTER_NET_READ"] = 1189] = "ER_MASTER_NET_READ";
    /**
     * Message: Net error writing to master
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_MASTER_NET_WRITE"] = 1190] = "ER_MASTER_NET_WRITE";
    /**
     * Message: Can't find FULLTEXT index matching the column list
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FT_MATCHING_KEY_NOT_FOUND"] = 1191] = "ER_FT_MATCHING_KEY_NOT_FOUND";
    /**
     * Message: Can't execute the given command because you have active locked tables or an active transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_OR_ACTIVE_TRANSACTION"] = 1192] = "ER_LOCK_OR_ACTIVE_TRANSACTION";
    /**
     * Message: Unknown system variable '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_SYSTEM_VARIABLE"] = 1193] = "ER_UNKNOWN_SYSTEM_VARIABLE";
    /**
     * Message: Table '%s' is marked as crashed and should be repaired
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CRASHED_ON_USAGE"] = 1194] = "ER_CRASHED_ON_USAGE";
    /**
     * Message: Table '%s' is marked as crashed and last (automatic?) repair failed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CRASHED_ON_REPAIR"] = 1195] = "ER_CRASHED_ON_REPAIR";
    /**
     * Message: Some non-transactional changed tables couldn't be rolled back
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARNING_NOT_COMPLETE_ROLLBACK"] = 1196] = "ER_WARNING_NOT_COMPLETE_ROLLBACK";
    /**
     * Message: Multi-statement transaction required more than 'max_binlog_cache_size' bytes of storage; increase this mysqld variable and try again
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRANS_CACHE_FULL"] = 1197] = "ER_TRANS_CACHE_FULL";
    /**
     * Message: This operation requires a running slave; configure slave and do START SLAVE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_NOT_RUNNING"] = 1199] = "ER_SLAVE_NOT_RUNNING";
    /**
     * Message: The server is not configured as slave; fix in config file or with CHANGE MASTER TO
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BAD_SLAVE"] = 1200] = "ER_BAD_SLAVE";
    /**
     * Message: Could not initialize master info structure; more error messages can be found in the MySQL error log
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_INFO"] = 1201] = "ER_MASTER_INFO";
    /**
     * Message: Could not create slave thread; check system resources
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_THREAD"] = 1202] = "ER_SLAVE_THREAD";
    /**
     * Message: User %s already has more than 'max_user_connections' active connections
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_USER_CONNECTIONS"] = 1203] = "ER_TOO_MANY_USER_CONNECTIONS";
    /**
     * Message: You may only use constant expressions with SET
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SET_CONSTANTS_ONLY"] = 1204] = "ER_SET_CONSTANTS_ONLY";
    /**
     * Message: Lock wait timeout exceeded; try restarting transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_WAIT_TIMEOUT"] = 1205] = "ER_LOCK_WAIT_TIMEOUT";
    /**
     * Message: The total number of locks exceeds the lock table size
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_TABLE_FULL"] = 1206] = "ER_LOCK_TABLE_FULL";
    /**
     * Message: Update locks cannot be acquired during a READ UNCOMMITTED transaction
     * SQLState: 25000
     */
    MysqlServerError[MysqlServerError["ER_READ_ONLY_TRANSACTION"] = 1207] = "ER_READ_ONLY_TRANSACTION";
    /**
     * Message: Incorrect arguments to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_ARGUMENTS"] = 1210] = "ER_WRONG_ARGUMENTS";
    /**
     * Message: '%s'@'%s' is not allowed to create new users
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NO_PERMISSION_TO_CREATE_USER"] = 1211] = "ER_NO_PERMISSION_TO_CREATE_USER";
    /**
     * Message: Deadlock found when trying to get lock; try restarting transaction
     * SQLState: 40001
     */
    MysqlServerError[MysqlServerError["ER_LOCK_DEADLOCK"] = 1213] = "ER_LOCK_DEADLOCK";
    /**
     * Message: The used table type doesn't support FULLTEXT indexes
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_CANT_HANDLE_FT"] = 1214] = "ER_TABLE_CANT_HANDLE_FT";
    /**
     * Message: Cannot add foreign key constraint
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_ADD_FOREIGN"] = 1215] = "ER_CANNOT_ADD_FOREIGN";
    /**
     * Message: Cannot add or update a child row: a foreign key constraint fails
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_NO_REFERENCED_ROW"] = 1216] = "ER_NO_REFERENCED_ROW";
    /**
     * Message: Cannot delete or update a parent row: a foreign key constraint fails
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_ROW_IS_REFERENCED"] = 1217] = "ER_ROW_IS_REFERENCED";
    /**
     * Message: Error connecting to master: %s
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_CONNECT_TO_MASTER"] = 1218] = "ER_CONNECT_TO_MASTER";
    /**
     * Message: Error when executing command %s: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_WHEN_EXECUTING_COMMAND"] = 1220] = "ER_ERROR_WHEN_EXECUTING_COMMAND";
    /**
     * Message: Incorrect usage of %s and %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_USAGE"] = 1221] = "ER_WRONG_USAGE";
    /**
     * Message: The used SELECT statements have a different number of columns
     * SQLState: 21000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT"] = 1222] = "ER_WRONG_NUMBER_OF_COLUMNS_IN_SELECT";
    /**
     * Message: Can't execute the query because you have a conflicting read lock
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_UPDATE_WITH_READLOCK"] = 1223] = "ER_CANT_UPDATE_WITH_READLOCK";
    /**
     * Message: Mixing of transactional and non-transactional tables is disabled
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MIXING_NOT_ALLOWED"] = 1224] = "ER_MIXING_NOT_ALLOWED";
    /**
     * Message: Option '%s' used twice in statement
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUP_ARGUMENT"] = 1225] = "ER_DUP_ARGUMENT";
    /**
     * Message: User '%s' has exceeded the '%s' resource (current value: %ld)
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_USER_LIMIT_REACHED"] = 1226] = "ER_USER_LIMIT_REACHED";
    /**
     * Message: Access denied; you need (at least one of) the %s privilege(s) for this operation
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SPECIFIC_ACCESS_DENIED_ERROR"] = 1227] = "ER_SPECIFIC_ACCESS_DENIED_ERROR";
    /**
     * Message: Variable '%s' is a SESSION variable and can't be used with SET GLOBAL
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCAL_VARIABLE"] = 1228] = "ER_LOCAL_VARIABLE";
    /**
     * Message: Variable '%s' is a GLOBAL variable and should be set with SET GLOBAL
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GLOBAL_VARIABLE"] = 1229] = "ER_GLOBAL_VARIABLE";
    /**
     * Message: Variable '%s' doesn't have a default value
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NO_DEFAULT"] = 1230] = "ER_NO_DEFAULT";
    /**
     * Message: Variable '%s' can't be set to the value of '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE_FOR_VAR"] = 1231] = "ER_WRONG_VALUE_FOR_VAR";
    /**
     * Message: Incorrect argument type to variable '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_TYPE_FOR_VAR"] = 1232] = "ER_WRONG_TYPE_FOR_VAR";
    /**
     * Message: Variable '%s' can only be set, not read
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VAR_CANT_BE_READ"] = 1233] = "ER_VAR_CANT_BE_READ";
    /**
     * Message: Incorrect usage/placement of '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CANT_USE_OPTION_HERE"] = 1234] = "ER_CANT_USE_OPTION_HERE";
    /**
     * Message: This version of MySQL doesn't yet support '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NOT_SUPPORTED_YET"] = 1235] = "ER_NOT_SUPPORTED_YET";
    /**
     * Message: Got fatal error %d from master when reading data from binary log: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_FATAL_ERROR_READING_BINLOG"] = 1236] = "ER_MASTER_FATAL_ERROR_READING_BINLOG";
    /**
     * Message: Slave SQL thread ignored the query because of replicate-*-table rules
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_IGNORED_TABLE"] = 1237] = "ER_SLAVE_IGNORED_TABLE";
    /**
     * Message: Variable '%s' is a %s variable
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INCORRECT_GLOBAL_LOCAL_VAR"] = 1238] = "ER_INCORRECT_GLOBAL_LOCAL_VAR";
    /**
     * Message: Incorrect foreign key definition for '%s': %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FK_DEF"] = 1239] = "ER_WRONG_FK_DEF";
    /**
     * Message: Key reference and table reference don't match
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEY_REF_DO_NOT_MATCH_TABLE_REF"] = 1240] = "ER_KEY_REF_DO_NOT_MATCH_TABLE_REF";
    /**
     * Message: Operand should contain %d column(s)
     * SQLState: 21000
     */
    MysqlServerError[MysqlServerError["ER_OPERAND_COLUMNS"] = 1241] = "ER_OPERAND_COLUMNS";
    /**
     * Message: Subquery returns more than 1 row
     * SQLState: 21000
     */
    MysqlServerError[MysqlServerError["ER_SUBQUERY_NO_1_ROW"] = 1242] = "ER_SUBQUERY_NO_1_ROW";
    /**
     * Message: Unknown prepared statement handler (%.*s) given to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_STMT_HANDLER"] = 1243] = "ER_UNKNOWN_STMT_HANDLER";
    /**
     * Message: Help database is corrupt or does not exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CORRUPT_HELP_DB"] = 1244] = "ER_CORRUPT_HELP_DB";
    /**
     * Message: Converting column '%s' from %s to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUTO_CONVERT"] = 1246] = "ER_AUTO_CONVERT";
    /**
     * Message: Reference '%s' not supported (%s)
     * SQLState: 42S22
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_REFERENCE"] = 1247] = "ER_ILLEGAL_REFERENCE";
    /**
     * Message: Every derived table must have its own alias
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_DERIVED_MUST_HAVE_ALIAS"] = 1248] = "ER_DERIVED_MUST_HAVE_ALIAS";
    /**
     * Message: Select %u was reduced during optimization
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_SELECT_REDUCED"] = 1249] = "ER_SELECT_REDUCED";
    /**
     * Message: Table '%s' from one of the SELECTs cannot be used in %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TABLENAME_NOT_ALLOWED_HERE"] = 1250] = "ER_TABLENAME_NOT_ALLOWED_HERE";
    /**
     * Message: Client does not support authentication protocol requested by server; consider upgrading MySQL client
     * SQLState: 08004
     */
    MysqlServerError[MysqlServerError["ER_NOT_SUPPORTED_AUTH_MODE"] = 1251] = "ER_NOT_SUPPORTED_AUTH_MODE";
    /**
     * Message: All parts of a SPATIAL index must be NOT NULL
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SPATIAL_CANT_HAVE_NULL"] = 1252] = "ER_SPATIAL_CANT_HAVE_NULL";
    /**
     * Message: COLLATION '%s' is not valid for CHARACTER SET '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_COLLATION_CHARSET_MISMATCH"] = 1253] = "ER_COLLATION_CHARSET_MISMATCH";
    /**
     * Message: Uncompressed data size too large; the maximum size is %d (probably, length of uncompressed data was corrupted)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_FOR_UNCOMPRESS"] = 1256] = "ER_TOO_BIG_FOR_UNCOMPRESS";
    /**
     * Message: ZLIB: Not enough memory
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ZLIB_Z_MEM_ERROR"] = 1257] = "ER_ZLIB_Z_MEM_ERROR";
    /**
     * Message: ZLIB: Not enough room in the output buffer (probably, length of uncompressed data was corrupted)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ZLIB_Z_BUF_ERROR"] = 1258] = "ER_ZLIB_Z_BUF_ERROR";
    /**
     * Message: ZLIB: Input data corrupted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ZLIB_Z_DATA_ERROR"] = 1259] = "ER_ZLIB_Z_DATA_ERROR";
    /**
     * Message: Row %u was cut by GROUP_CONCAT()
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CUT_VALUE_GROUP_CONCAT"] = 1260] = "ER_CUT_VALUE_GROUP_CONCAT";
    /**
     * Message: Row %ld doesn't contain data for all columns
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_WARN_TOO_FEW_RECORDS"] = 1261] = "ER_WARN_TOO_FEW_RECORDS";
    /**
     * Message: Row %ld was truncated; it contained more data than there were input columns
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_WARN_TOO_MANY_RECORDS"] = 1262] = "ER_WARN_TOO_MANY_RECORDS";
    /**
     * Message: Column set to default value; NULL supplied to NOT NULL column '%s' at row %ld
     * SQLState: 22004
     */
    MysqlServerError[MysqlServerError["ER_WARN_NULL_TO_NOTNULL"] = 1263] = "ER_WARN_NULL_TO_NOTNULL";
    /**
     * Message: Out of range value for column '%s' at row %ld
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_WARN_DATA_OUT_OF_RANGE"] = 1264] = "ER_WARN_DATA_OUT_OF_RANGE";
    /**
     * Message: Data truncated for column '%s' at row %ld
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["WARN_DATA_TRUNCATED"] = 1265] = "WARN_DATA_TRUNCATED";
    /**
     * Message: Using storage engine %s for table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_USING_OTHER_HANDLER"] = 1266] = "ER_WARN_USING_OTHER_HANDLER";
    /**
     * Message: Illegal mix of collations (%s,%s) and (%s,%s) for operation '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_AGGREGATE_2COLLATIONS"] = 1267] = "ER_CANT_AGGREGATE_2COLLATIONS";
    /**
     * Message: Can't revoke all privileges for one or more of the requested users
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REVOKE_GRANTS"] = 1269] = "ER_REVOKE_GRANTS";
    /**
     * Message: Illegal mix of collations (%s,%s), (%s,%s), (%s,%s) for operation '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_AGGREGATE_3COLLATIONS"] = 1270] = "ER_CANT_AGGREGATE_3COLLATIONS";
    /**
     * Message: Illegal mix of collations for operation '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_AGGREGATE_NCOLLATIONS"] = 1271] = "ER_CANT_AGGREGATE_NCOLLATIONS";
    /**
     * Message: Variable '%s' is not a variable component (can't be used as XXXX.variable_name)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_IS_NOT_STRUCT"] = 1272] = "ER_VARIABLE_IS_NOT_STRUCT";
    /**
     * Message: Unknown collation: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_COLLATION"] = 1273] = "ER_UNKNOWN_COLLATION";
    /**
     * Message: SSL parameters in CHANGE MASTER are ignored because this MySQL slave was compiled without SSL support; they can be used later if MySQL slave with SSL is started
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_IGNORED_SSL_PARAMS"] = 1274] = "ER_SLAVE_IGNORED_SSL_PARAMS";
    /**
     * Message: Server is running in --secure-auth mode, but '%s'@'%s' has a password in the old format; please change the password to the new format
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SERVER_IS_IN_SECURE_AUTH_MODE"] = 1275] = "ER_SERVER_IS_IN_SECURE_AUTH_MODE";
    /**
     * Message: Field or reference '%s%s%s%s%s' of SELECT #%d was resolved in SELECT #%d
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_FIELD_RESOLVED"] = 1276] = "ER_WARN_FIELD_RESOLVED";
    /**
     * Message: Incorrect parameter or combination of parameters for START SLAVE UNTIL
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BAD_SLAVE_UNTIL_COND"] = 1277] = "ER_BAD_SLAVE_UNTIL_COND";
    /**
     * Message: It is recommended to use --skip-slave-start when doing step-by-step replication with START SLAVE UNTIL; otherwise, you will get problems if you get an unexpected slave's mysqld restart
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISSING_SKIP_SLAVE"] = 1278] = "ER_MISSING_SKIP_SLAVE";
    /**
     * Message: SQL thread is not to be started so UNTIL options are ignored
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNTIL_COND_IGNORED"] = 1279] = "ER_UNTIL_COND_IGNORED";
    /**
     * Message: Incorrect index name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_NAME_FOR_INDEX"] = 1280] = "ER_WRONG_NAME_FOR_INDEX";
    /**
     * Message: Incorrect catalog name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_NAME_FOR_CATALOG"] = 1281] = "ER_WRONG_NAME_FOR_CATALOG";
    /**
     * Message: Query cache failed to set size %lu; new query cache size is %lu
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_QC_RESIZE"] = 1282] = "ER_WARN_QC_RESIZE";
    /**
     * Message: Column '%s' cannot be part of FULLTEXT index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BAD_FT_COLUMN"] = 1283] = "ER_BAD_FT_COLUMN";
    /**
     * Message: Unknown key cache '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_KEY_CACHE"] = 1284] = "ER_UNKNOWN_KEY_CACHE";
    /**
     * Message: MySQL is started in --skip-name-resolve mode; you must restart it without this switch for this grant to work
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_HOSTNAME_WONT_WORK"] = 1285] = "ER_WARN_HOSTNAME_WONT_WORK";
    /**
     * Message: Unknown storage engine '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_STORAGE_ENGINE"] = 1286] = "ER_UNKNOWN_STORAGE_ENGINE";
    /**
     * Message: '%s' is deprecated and will be removed in a future release. Please use %s instead
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SYNTAX"] = 1287] = "ER_WARN_DEPRECATED_SYNTAX";
    /**
     * Message: The target table %s of the %s is not updatable
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NON_UPDATABLE_TABLE"] = 1288] = "ER_NON_UPDATABLE_TABLE";
    /**
     * Message: The '%s' feature is disabled; you need MySQL built with '%s' to have it working
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FEATURE_DISABLED"] = 1289] = "ER_FEATURE_DISABLED";
    /**
     * Message: The MySQL server is running with the %s option so it cannot execute this statement
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OPTION_PREVENTS_STATEMENT"] = 1290] = "ER_OPTION_PREVENTS_STATEMENT";
    /**
     * Message: Column '%s' has duplicated value '%s' in %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUPLICATED_VALUE_IN_TYPE"] = 1291] = "ER_DUPLICATED_VALUE_IN_TYPE";
    /**
     * Message: Truncated incorrect %s value: '%s'
     * SQLState: 22007
     */
    MysqlServerError[MysqlServerError["ER_TRUNCATED_WRONG_VALUE"] = 1292] = "ER_TRUNCATED_WRONG_VALUE";
    /**
     * Message: Invalid ON UPDATE clause for '%s' column
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_ON_UPDATE"] = 1294] = "ER_INVALID_ON_UPDATE";
    /**
     * Message: This command is not supported in the prepared statement protocol yet
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_PS"] = 1295] = "ER_UNSUPPORTED_PS";
    /**
     * Message: Got error %d '%s' from %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GET_ERRMSG"] = 1296] = "ER_GET_ERRMSG";
    /**
     * Message: Got temporary error %d '%s' from %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GET_TEMPORARY_ERRMSG"] = 1297] = "ER_GET_TEMPORARY_ERRMSG";
    /**
     * Message: Unknown or incorrect time zone: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_TIME_ZONE"] = 1298] = "ER_UNKNOWN_TIME_ZONE";
    /**
     * Message: Invalid TIMESTAMP value in column '%s' at row %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_INVALID_TIMESTAMP"] = 1299] = "ER_WARN_INVALID_TIMESTAMP";
    /**
     * Message: Invalid %s character string: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_CHARACTER_STRING"] = 1300] = "ER_INVALID_CHARACTER_STRING";
    /**
     * Message: Result of %s() was larger than max_allowed_packet (%ld) - truncated
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_ALLOWED_PACKET_OVERFLOWED"] = 1301] = "ER_WARN_ALLOWED_PACKET_OVERFLOWED";
    /**
     * Message: Conflicting declarations: '%s%s' and '%s%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CONFLICTING_DECLARATIONS"] = 1302] = "ER_CONFLICTING_DECLARATIONS";
    /**
     * Message: Can't create a %s from within another stored routine
     * SQLState: 2F003
     */
    MysqlServerError[MysqlServerError["ER_SP_NO_RECURSIVE_CREATE"] = 1303] = "ER_SP_NO_RECURSIVE_CREATE";
    /**
     * Message: %s %s already exists
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_ALREADY_EXISTS"] = 1304] = "ER_SP_ALREADY_EXISTS";
    /**
     * Message: %s %s does not exist
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DOES_NOT_EXIST"] = 1305] = "ER_SP_DOES_NOT_EXIST";
    /**
     * Message: Failed to DROP %s %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_DROP_FAILED"] = 1306] = "ER_SP_DROP_FAILED";
    /**
     * Message: Failed to CREATE %s %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_STORE_FAILED"] = 1307] = "ER_SP_STORE_FAILED";
    /**
     * Message: %s with no matching label: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_LILABEL_MISMATCH"] = 1308] = "ER_SP_LILABEL_MISMATCH";
    /**
     * Message: Redefining label %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_LABEL_REDEFINE"] = 1309] = "ER_SP_LABEL_REDEFINE";
    /**
     * Message: End-label %s without match
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_LABEL_MISMATCH"] = 1310] = "ER_SP_LABEL_MISMATCH";
    /**
     * Message: Referring to uninitialized variable %s
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_SP_UNINIT_VAR"] = 1311] = "ER_SP_UNINIT_VAR";
    /**
     * Message: PROCEDURE %s can't return a result set in the given context
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_SP_BADSELECT"] = 1312] = "ER_SP_BADSELECT";
    /**
     * Message: RETURN is only allowed in a FUNCTION
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_BADRETURN"] = 1313] = "ER_SP_BADRETURN";
    /**
     * Message: %s is not allowed in stored procedures
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_SP_BADSTATEMENT"] = 1314] = "ER_SP_BADSTATEMENT";
    /**
     * Message: The update log is deprecated and replaced by the binary log; SET SQL_LOG_UPDATE has been ignored.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_LOG_DEPRECATED_IGNORED"] = 1315] = "ER_UPDATE_LOG_DEPRECATED_IGNORED";
    /**
     * Message: The update log is deprecated and replaced by the binary log; SET SQL_LOG_UPDATE has been translated to SET SQL_LOG_BIN.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_LOG_DEPRECATED_TRANSLATED"] = 1316] = "ER_UPDATE_LOG_DEPRECATED_TRANSLATED";
    /**
     * Message: Query execution was interrupted
     * SQLState: 70100
     */
    MysqlServerError[MysqlServerError["ER_QUERY_INTERRUPTED"] = 1317] = "ER_QUERY_INTERRUPTED";
    /**
     * Message: Incorrect number of arguments for %s %s; expected %u, got %u
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_WRONG_NO_OF_ARGS"] = 1318] = "ER_SP_WRONG_NO_OF_ARGS";
    /**
     * Message: Undefined CONDITION: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_COND_MISMATCH"] = 1319] = "ER_SP_COND_MISMATCH";
    /**
     * Message: No RETURN found in FUNCTION %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_NORETURN"] = 1320] = "ER_SP_NORETURN";
    /**
     * Message: FUNCTION %s ended without RETURN
     * SQLState: 2F005
     */
    MysqlServerError[MysqlServerError["ER_SP_NORETURNEND"] = 1321] = "ER_SP_NORETURNEND";
    /**
     * Message: Cursor statement must be a SELECT
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_BAD_CURSOR_QUERY"] = 1322] = "ER_SP_BAD_CURSOR_QUERY";
    /**
     * Message: Cursor SELECT must not have INTO
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_BAD_CURSOR_SELECT"] = 1323] = "ER_SP_BAD_CURSOR_SELECT";
    /**
     * Message: Undefined CURSOR: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_CURSOR_MISMATCH"] = 1324] = "ER_SP_CURSOR_MISMATCH";
    /**
     * Message: Cursor is already open
     * SQLState: 24000
     */
    MysqlServerError[MysqlServerError["ER_SP_CURSOR_ALREADY_OPEN"] = 1325] = "ER_SP_CURSOR_ALREADY_OPEN";
    /**
     * Message: Cursor is not open
     * SQLState: 24000
     */
    MysqlServerError[MysqlServerError["ER_SP_CURSOR_NOT_OPEN"] = 1326] = "ER_SP_CURSOR_NOT_OPEN";
    /**
     * Message: Undeclared variable: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_UNDECLARED_VAR"] = 1327] = "ER_SP_UNDECLARED_VAR";
    /**
     * Message: Incorrect number of FETCH variables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_WRONG_NO_OF_FETCH_ARGS"] = 1328] = "ER_SP_WRONG_NO_OF_FETCH_ARGS";
    /**
     * Message: No data - zero rows fetched, selected, or processed
     * SQLState: 02000
     */
    MysqlServerError[MysqlServerError["ER_SP_FETCH_NO_DATA"] = 1329] = "ER_SP_FETCH_NO_DATA";
    /**
     * Message: Duplicate parameter: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DUP_PARAM"] = 1330] = "ER_SP_DUP_PARAM";
    /**
     * Message: Duplicate variable: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DUP_VAR"] = 1331] = "ER_SP_DUP_VAR";
    /**
     * Message: Duplicate condition: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DUP_COND"] = 1332] = "ER_SP_DUP_COND";
    /**
     * Message: Duplicate cursor: %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DUP_CURS"] = 1333] = "ER_SP_DUP_CURS";
    /**
     * Message: Failed to ALTER %s %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_CANT_ALTER"] = 1334] = "ER_SP_CANT_ALTER";
    /**
     * Message: Subquery value not supported
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_SP_SUBSELECT_NYI"] = 1335] = "ER_SP_SUBSELECT_NYI";
    /**
     * Message: %s is not allowed in stored function or trigger
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG"] = 1336] = "ER_STMT_NOT_ALLOWED_IN_SF_OR_TRG";
    /**
     * Message: Variable or condition declaration after cursor or handler declaration
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_VARCOND_AFTER_CURSHNDLR"] = 1337] = "ER_SP_VARCOND_AFTER_CURSHNDLR";
    /**
     * Message: Cursor declaration after handler declaration
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_CURSOR_AFTER_HANDLER"] = 1338] = "ER_SP_CURSOR_AFTER_HANDLER";
    /**
     * Message: Case not found for CASE statement
     * SQLState: 20000
     */
    MysqlServerError[MysqlServerError["ER_SP_CASE_NOT_FOUND"] = 1339] = "ER_SP_CASE_NOT_FOUND";
    /**
     * Message: Configuration file '%s' is too big
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FPARSER_TOO_BIG_FILE"] = 1340] = "ER_FPARSER_TOO_BIG_FILE";
    /**
     * Message: Malformed file type header in file '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FPARSER_BAD_HEADER"] = 1341] = "ER_FPARSER_BAD_HEADER";
    /**
     * Message: Unexpected end of file while parsing comment '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FPARSER_EOF_IN_COMMENT"] = 1342] = "ER_FPARSER_EOF_IN_COMMENT";
    /**
     * Message: Error while parsing parameter '%s' (line: '%s')
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FPARSER_ERROR_IN_PARAMETER"] = 1343] = "ER_FPARSER_ERROR_IN_PARAMETER";
    /**
     * Message: Unexpected end of file while skipping unknown parameter '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER"] = 1344] = "ER_FPARSER_EOF_IN_UNKNOWN_PARAMETER";
    /**
     * Message: EXPLAIN/SHOW can not be issued; lacking privileges for underlying table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_NO_EXPLAIN"] = 1345] = "ER_VIEW_NO_EXPLAIN";
    /**
     * Message: '%s.%s' is not %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_OBJECT"] = 1347] = "ER_WRONG_OBJECT";
    /**
     * Message: Column '%s' is not updatable
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NONUPDATEABLE_COLUMN"] = 1348] = "ER_NONUPDATEABLE_COLUMN";
    /**
     * Message: View's SELECT contains a '%s' clause
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_SELECT_CLAUSE"] = 1350] = "ER_VIEW_SELECT_CLAUSE";
    /**
     * Message: View's SELECT contains a variable or parameter
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_SELECT_VARIABLE"] = 1351] = "ER_VIEW_SELECT_VARIABLE";
    /**
     * Message: View's SELECT refers to a temporary table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_SELECT_TMPTABLE"] = 1352] = "ER_VIEW_SELECT_TMPTABLE";
    /**
     * Message: In definition of view, derived table or common table expression, SELECT list and column names list have different column counts
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_WRONG_LIST"] = 1353] = "ER_VIEW_WRONG_LIST";
    /**
     * Message: View merge algorithm can't be used here for now (assumed undefined algorithm)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_VIEW_MERGE"] = 1354] = "ER_WARN_VIEW_MERGE";
    /**
     * Message: View being updated does not have complete key of underlying table in it
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_VIEW_WITHOUT_KEY"] = 1355] = "ER_WARN_VIEW_WITHOUT_KEY";
    /**
     * Message: View '%s.%s' references invalid table(s) or column(s) or function(s) or definer/invoker of view lack rights to use them
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_INVALID"] = 1356] = "ER_VIEW_INVALID";
    /**
     * Message: Can't drop or alter a %s from within another stored routine
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_NO_DROP_SP"] = 1357] = "ER_SP_NO_DROP_SP";
    /**
     * Message: Trigger already exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_ALREADY_EXISTS"] = 1359] = "ER_TRG_ALREADY_EXISTS";
    /**
     * Message: Trigger does not exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_DOES_NOT_EXIST"] = 1360] = "ER_TRG_DOES_NOT_EXIST";
    /**
     * Message: Trigger's '%s' is view or temporary table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_ON_VIEW_OR_TEMP_TABLE"] = 1361] = "ER_TRG_ON_VIEW_OR_TEMP_TABLE";
    /**
     * Message: Updating of %s row is not allowed in %strigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_CANT_CHANGE_ROW"] = 1362] = "ER_TRG_CANT_CHANGE_ROW";
    /**
     * Message: There is no %s row in %s trigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_NO_SUCH_ROW_IN_TRG"] = 1363] = "ER_TRG_NO_SUCH_ROW_IN_TRG";
    /**
     * Message: Field '%s' doesn't have a default value
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_DEFAULT_FOR_FIELD"] = 1364] = "ER_NO_DEFAULT_FOR_FIELD";
    /**
     * Message: Division by 0
     * SQLState: 22012
     */
    MysqlServerError[MysqlServerError["ER_DIVISION_BY_ZERO"] = 1365] = "ER_DIVISION_BY_ZERO";
    /**
     * Message: Incorrect %s value: '%s' for column '%s' at row %ld
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRUNCATED_WRONG_VALUE_FOR_FIELD"] = 1366] = "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD";
    /**
     * Message: Illegal %s '%s' value found during parsing
     * SQLState: 22007
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_VALUE_FOR_TYPE"] = 1367] = "ER_ILLEGAL_VALUE_FOR_TYPE";
    /**
     * Message: CHECK OPTION on non-updatable view '%s.%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_NONUPD_CHECK"] = 1368] = "ER_VIEW_NONUPD_CHECK";
    /**
     * Message: CHECK OPTION failed '%s.%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_CHECK_FAILED"] = 1369] = "ER_VIEW_CHECK_FAILED";
    /**
     * Message: %s command denied to user '%s'@'%s' for routine '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PROCACCESS_DENIED_ERROR"] = 1370] = "ER_PROCACCESS_DENIED_ERROR";
    /**
     * Message: Failed purging old relay logs: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RELAY_LOG_FAIL"] = 1371] = "ER_RELAY_LOG_FAIL";
    /**
     * Message: Target log not found in binlog index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_TARGET_BINLOG"] = 1373] = "ER_UNKNOWN_TARGET_BINLOG";
    /**
     * Message: I/O error reading log index file
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IO_ERR_LOG_INDEX_READ"] = 1374] = "ER_IO_ERR_LOG_INDEX_READ";
    /**
     * Message: Server configuration does not permit binlog purge
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_PURGE_PROHIBITED"] = 1375] = "ER_BINLOG_PURGE_PROHIBITED";
    /**
     * Message: Failed on fseek()
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FSEEK_FAIL"] = 1376] = "ER_FSEEK_FAIL";
    /**
     * Message: Fatal error during log purge
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_PURGE_FATAL_ERR"] = 1377] = "ER_BINLOG_PURGE_FATAL_ERR";
    /**
     * Message: A purgeable log is in use, will not purge
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOG_IN_USE"] = 1378] = "ER_LOG_IN_USE";
    /**
     * Message: Unknown error during log purge
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOG_PURGE_UNKNOWN_ERR"] = 1379] = "ER_LOG_PURGE_UNKNOWN_ERR";
    /**
     * Message: Failed initializing relay log position: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RELAY_LOG_INIT"] = 1380] = "ER_RELAY_LOG_INIT";
    /**
     * Message: You are not using binary logging
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_BINARY_LOGGING"] = 1381] = "ER_NO_BINARY_LOGGING";
    /**
     * Message: The '%s' syntax is reserved for purposes internal to the MySQL server
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESERVED_SYNTAX"] = 1382] = "ER_RESERVED_SYNTAX";
    /**
     * Message: Prepared statement contains too many placeholders
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PS_MANY_PARAM"] = 1390] = "ER_PS_MANY_PARAM";
    /**
     * Message: Key part '%s' length cannot be 0
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEY_PART_0"] = 1391] = "ER_KEY_PART_0";
    /**
     * Message: View text checksum failed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_CHECKSUM"] = 1392] = "ER_VIEW_CHECKSUM";
    /**
     * Message: Can not modify more than one base table through a join view '%s.%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_MULTIUPDATE"] = 1393] = "ER_VIEW_MULTIUPDATE";
    /**
     * Message: Can not insert into join view '%s.%s' without fields list
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_NO_INSERT_FIELD_LIST"] = 1394] = "ER_VIEW_NO_INSERT_FIELD_LIST";
    /**
     * Message: Can not delete from join view '%s.%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_DELETE_MERGE_VIEW"] = 1395] = "ER_VIEW_DELETE_MERGE_VIEW";
    /**
     * Message: Operation %s failed for %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_USER"] = 1396] = "ER_CANNOT_USER";
    /**
     * Message: XAER_NOTA: Unknown XID
     * SQLState: XAE04
     */
    MysqlServerError[MysqlServerError["ER_XAER_NOTA"] = 1397] = "ER_XAER_NOTA";
    /**
     * Message: XAER_INVAL: Invalid arguments (or unsupported command)
     * SQLState: XAE05
     */
    MysqlServerError[MysqlServerError["ER_XAER_INVAL"] = 1398] = "ER_XAER_INVAL";
    /**
     * Message: XAER_RMFAIL: The command cannot be executed when global transaction is in the %s state
     * SQLState: XAE07
     */
    MysqlServerError[MysqlServerError["ER_XAER_RMFAIL"] = 1399] = "ER_XAER_RMFAIL";
    /**
     * Message: XAER_OUTSIDE: Some work is done outside global transaction
     * SQLState: XAE09
     */
    MysqlServerError[MysqlServerError["ER_XAER_OUTSIDE"] = 1400] = "ER_XAER_OUTSIDE";
    /**
     * Message: XAER_RMERR: Fatal error occurred in the transaction branch - check your data for consistency
     * SQLState: XAE03
     */
    MysqlServerError[MysqlServerError["ER_XAER_RMERR"] = 1401] = "ER_XAER_RMERR";
    /**
     * Message: XA_RBROLLBACK: Transaction branch was rolled back
     * SQLState: XA100
     */
    MysqlServerError[MysqlServerError["ER_XA_RBROLLBACK"] = 1402] = "ER_XA_RBROLLBACK";
    /**
     * Message: There is no such grant defined for user '%s' on host '%s' on routine '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NONEXISTING_PROC_GRANT"] = 1403] = "ER_NONEXISTING_PROC_GRANT";
    /**
     * Message: Failed to grant EXECUTE and ALTER ROUTINE privileges
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PROC_AUTO_GRANT_FAIL"] = 1404] = "ER_PROC_AUTO_GRANT_FAIL";
    /**
     * Message: Failed to revoke all privileges to dropped routine
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PROC_AUTO_REVOKE_FAIL"] = 1405] = "ER_PROC_AUTO_REVOKE_FAIL";
    /**
     * Message: Data too long for column '%s' at row %ld
     * SQLState: 22001
     */
    MysqlServerError[MysqlServerError["ER_DATA_TOO_LONG"] = 1406] = "ER_DATA_TOO_LONG";
    /**
     * Message: Bad SQLSTATE: '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_BAD_SQLSTATE"] = 1407] = "ER_SP_BAD_SQLSTATE";
    /**
     * Message: %s: ready for connections. Version: '%s' socket: '%s' port: %d %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STARTUP"] = 1408] = "ER_STARTUP";
    /**
     * Message: Can't load value from file with fixed size rows to variable
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR"] = 1409] = "ER_LOAD_FROM_FIXED_SIZE_ROWS_TO_VAR";
    /**
     * Message: You are not allowed to create a user with GRANT
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_USER_WITH_GRANT"] = 1410] = "ER_CANT_CREATE_USER_WITH_GRANT";
    /**
     * Message: Incorrect %s value: '%s' for function %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE_FOR_TYPE"] = 1411] = "ER_WRONG_VALUE_FOR_TYPE";
    /**
     * Message: Table definition has changed, please retry transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_DEF_CHANGED"] = 1412] = "ER_TABLE_DEF_CHANGED";
    /**
     * Message: Duplicate handler declared in the same block
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_DUP_HANDLER"] = 1413] = "ER_SP_DUP_HANDLER";
    /**
     * Message: OUT or INOUT argument %d for routine %s is not a variable or NEW pseudo-variable in BEFORE trigger
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_NOT_VAR_ARG"] = 1414] = "ER_SP_NOT_VAR_ARG";
    /**
     * Message: Not allowed to return a result set from a %s
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_SP_NO_RETSET"] = 1415] = "ER_SP_NO_RETSET";
    /**
     * Message: Cannot get geometry object from data you send to the GEOMETRY field
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_GEOMETRY_OBJECT"] = 1416] = "ER_CANT_CREATE_GEOMETRY_OBJECT";
    /**
     * Message: This function has none of DETERMINISTIC, NO SQL, or READS SQL DATA in its declaration and binary logging is enabled (you *might* want to use the less safe log_bin_trust_function_creators variable)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_ROUTINE"] = 1418] = "ER_BINLOG_UNSAFE_ROUTINE";
    /**
     * Message: You do not have the SUPER privilege and binary logging is enabled (you *might* want to use the less safe log_bin_trust_function_creators variable)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_CREATE_ROUTINE_NEED_SUPER"] = 1419] = "ER_BINLOG_CREATE_ROUTINE_NEED_SUPER";
    /**
     * Message: The statement (%lu) has no open cursor.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STMT_HAS_NO_OPEN_CURSOR"] = 1421] = "ER_STMT_HAS_NO_OPEN_CURSOR";
    /**
     * Message: Explicit or implicit commit is not allowed in stored function or trigger.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG"] = 1422] = "ER_COMMIT_NOT_ALLOWED_IN_SF_OR_TRG";
    /**
     * Message: Field of view '%s.%s' underlying table doesn't have a default value
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_DEFAULT_FOR_VIEW_FIELD"] = 1423] = "ER_NO_DEFAULT_FOR_VIEW_FIELD";
    /**
     * Message: Recursive stored functions and triggers are not allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_NO_RECURSION"] = 1424] = "ER_SP_NO_RECURSION";
    /**
     * Message: Too big scale %d specified for column '%s'. Maximum is %lu.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_SCALE"] = 1425] = "ER_TOO_BIG_SCALE";
    /**
     * Message: Too-big precision %d specified for '%s'. Maximum is %lu.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_PRECISION"] = 1426] = "ER_TOO_BIG_PRECISION";
    /**
     * Message: For float(M,D), double(M,D) or decimal(M,D), M must be >= D (column '%s').
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_M_BIGGER_THAN_D"] = 1427] = "ER_M_BIGGER_THAN_D";
    /**
     * Message: You can't combine write-locking of system tables with other tables or lock types
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_LOCK_OF_SYSTEM_TABLE"] = 1428] = "ER_WRONG_LOCK_OF_SYSTEM_TABLE";
    /**
     * Message: Unable to connect to foreign data source: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CONNECT_TO_FOREIGN_DATA_SOURCE"] = 1429] = "ER_CONNECT_TO_FOREIGN_DATA_SOURCE";
    /**
     * Message: There was a problem processing the query on the foreign data source. Data source error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_QUERY_ON_FOREIGN_DATA_SOURCE"] = 1430] = "ER_QUERY_ON_FOREIGN_DATA_SOURCE";
    /**
     * Message: The foreign data source you are trying to reference does not exist. Data source error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST"] = 1431] = "ER_FOREIGN_DATA_SOURCE_DOESNT_EXIST";
    /**
     * Message: Can't create federated table. The data source connection string '%s' is not in the correct format
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE"] = 1432] = "ER_FOREIGN_DATA_STRING_INVALID_CANT_CREATE";
    /**
     * Message: The data source connection string '%s' is not in the correct format
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DATA_STRING_INVALID"] = 1433] = "ER_FOREIGN_DATA_STRING_INVALID";
    /**
     * Message: Trigger in wrong schema
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_IN_WRONG_SCHEMA"] = 1435] = "ER_TRG_IN_WRONG_SCHEMA";
    /**
     * Message: Thread stack overrun: %ld bytes used of a %ld byte stack, and %ld bytes needed. Use 'mysqld --thread_stack=#' to specify a bigger stack.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STACK_OVERRUN_NEED_MORE"] = 1436] = "ER_STACK_OVERRUN_NEED_MORE";
    /**
     * Message: Routine body for '%s' is too long
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_BODY"] = 1437] = "ER_TOO_LONG_BODY";
    /**
     * Message: Cannot drop default keycache
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_CANT_DROP_DEFAULT_KEYCACHE"] = 1438] = "ER_WARN_CANT_DROP_DEFAULT_KEYCACHE";
    /**
     * Message: Display width out of range for column '%s' (max = %lu)
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_DISPLAYWIDTH"] = 1439] = "ER_TOO_BIG_DISPLAYWIDTH";
    /**
     * Message: XAER_DUPID: The XID already exists
     * SQLState: XAE08
     */
    MysqlServerError[MysqlServerError["ER_XAER_DUPID"] = 1440] = "ER_XAER_DUPID";
    /**
     * Message: Datetime function: %s field overflow
     * SQLState: 22008
     */
    MysqlServerError[MysqlServerError["ER_DATETIME_FUNCTION_OVERFLOW"] = 1441] = "ER_DATETIME_FUNCTION_OVERFLOW";
    /**
     * Message: Can't update table '%s' in stored function/trigger because it is already used by statement which invoked this stored function/trigger.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG"] = 1442] = "ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG";
    /**
     * Message: The definition of table '%s' prevents operation %s on table '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_PREVENT_UPDATE"] = 1443] = "ER_VIEW_PREVENT_UPDATE";
    /**
     * Message: The prepared statement contains a stored routine call that refers to that same statement. It's not allowed to execute a prepared statement in such a recursive manner
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PS_NO_RECURSION"] = 1444] = "ER_PS_NO_RECURSION";
    /**
     * Message: Not allowed to set autocommit from a stored function or trigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_CANT_SET_AUTOCOMMIT"] = 1445] = "ER_SP_CANT_SET_AUTOCOMMIT";
    /**
     * Message: View '%s'.'%s' has no definer information (old table format). Current user is used as definer. Please recreate the view!
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_FRM_NO_USER"] = 1447] = "ER_VIEW_FRM_NO_USER";
    /**
     * Message: You need the SUPER privilege for creation view with '%s'@'%s' definer
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_OTHER_USER"] = 1448] = "ER_VIEW_OTHER_USER";
    /**
     * Message: The user specified as a definer ('%s'@'%s') does not exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SUCH_USER"] = 1449] = "ER_NO_SUCH_USER";
    /**
     * Message: Changing schema from '%s' to '%s' is not allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FORBID_SCHEMA_CHANGE"] = 1450] = "ER_FORBID_SCHEMA_CHANGE";
    /**
     * Message: Cannot delete or update a parent row: a foreign key constraint fails (%s)
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_ROW_IS_REFERENCED_2"] = 1451] = "ER_ROW_IS_REFERENCED_2";
    /**
     * Message: Cannot add or update a child row: a foreign key constraint fails (%s)
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_NO_REFERENCED_ROW_2"] = 1452] = "ER_NO_REFERENCED_ROW_2";
    /**
     * Message: Variable '%s' must be quoted with `...`, or renamed
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_BAD_VAR_SHADOW"] = 1453] = "ER_SP_BAD_VAR_SHADOW";
    /**
     * Message: No definer attribute for trigger '%s'.'%s'. It's disallowed to create trigger without definer.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_NO_DEFINER"] = 1454] = "ER_TRG_NO_DEFINER";
    /**
     * Message: '%s' has an old format, you should re-create the '%s' object(s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OLD_FILE_FORMAT"] = 1455] = "ER_OLD_FILE_FORMAT";
    /**
     * Message: Recursive limit %d (as set by the max_sp_recursion_depth variable) was exceeded for routine %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_RECURSION_LIMIT"] = 1456] = "ER_SP_RECURSION_LIMIT";
    /**
     * Message: Incorrect routine name '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_WRONG_NAME"] = 1458] = "ER_SP_WRONG_NAME";
    /**
     * Message: Table upgrade required. Please do "REPAIR TABLE `%s`" or dump/reload to fix it!
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NEEDS_UPGRADE"] = 1459] = "ER_TABLE_NEEDS_UPGRADE";
    /**
     * Message: AGGREGATE is not supported for stored functions
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SP_NO_AGGREGATE"] = 1460] = "ER_SP_NO_AGGREGATE";
    /**
     * Message: Can't create more than max_prepared_stmt_count statements (current value: %lu)
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_MAX_PREPARED_STMT_COUNT_REACHED"] = 1461] = "ER_MAX_PREPARED_STMT_COUNT_REACHED";
    /**
     * Message: `%s`.`%s` contains view recursion
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_RECURSIVE"] = 1462] = "ER_VIEW_RECURSIVE";
    /**
     * Message: Non-grouping field '%s' is used in %s clause
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_NON_GROUPING_FIELD_USED"] = 1463] = "ER_NON_GROUPING_FIELD_USED";
    /**
     * Message: The used table type doesn't support SPATIAL indexes
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_CANT_HANDLE_SPKEYS"] = 1464] = "ER_TABLE_CANT_HANDLE_SPKEYS";
    /**
     * Message: Triggers can not be created on system tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA"] = 1465] = "ER_NO_TRIGGERS_ON_SYSTEM_SCHEMA";
    /**
     * Message: Leading spaces are removed from name '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REMOVED_SPACES"] = 1466] = "ER_REMOVED_SPACES";
    /**
     * Message: Failed to read auto-increment value from storage engine
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUTOINC_READ_FAILED"] = 1467] = "ER_AUTOINC_READ_FAILED";
    /**
     * Message: user name
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USERNAME"] = 1468] = "ER_USERNAME";
    /**
     * Message: host name
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_HOSTNAME"] = 1469] = "ER_HOSTNAME";
    /**
     * Message: String '%s' is too long for %s (should be no longer than %d)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_STRING_LENGTH"] = 1470] = "ER_WRONG_STRING_LENGTH";
    /**
     * Message: The target table %s of the %s is not insertable-into
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NON_INSERTABLE_TABLE"] = 1471] = "ER_NON_INSERTABLE_TABLE";
    /**
     * Message: Table '%s' is differently defined or of non-MyISAM type or doesn't exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ADMIN_WRONG_MRG_TABLE"] = 1472] = "ER_ADMIN_WRONG_MRG_TABLE";
    /**
     * Message: Too high level of nesting for select
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT"] = 1473] = "ER_TOO_HIGH_LEVEL_OF_NESTING_FOR_SELECT";
    /**
     * Message: Name '%s' has become ''
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NAME_BECOMES_EMPTY"] = 1474] = "ER_NAME_BECOMES_EMPTY";
    /**
     * Message: First character of the FIELDS TERMINATED string is ambiguous; please use non-optional and non-empty FIELDS ENCLOSED BY
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AMBIGUOUS_FIELD_TERM"] = 1475] = "ER_AMBIGUOUS_FIELD_TERM";
    /**
     * Message: The foreign server, %s, you are trying to create already exists.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_SERVER_EXISTS"] = 1476] = "ER_FOREIGN_SERVER_EXISTS";
    /**
     * Message: The foreign server name you are trying to reference does not exist. Data source error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_SERVER_DOESNT_EXIST"] = 1477] = "ER_FOREIGN_SERVER_DOESNT_EXIST";
    /**
     * Message: Table storage engine '%s' does not support the create option '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_HA_CREATE_OPTION"] = 1478] = "ER_ILLEGAL_HA_CREATE_OPTION";
    /**
     * Message: Syntax error: %s PARTITIONING requires definition of VALUES %s for each partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_REQUIRES_VALUES_ERROR"] = 1479] = "ER_PARTITION_REQUIRES_VALUES_ERROR";
    /**
     * Message: Only %s PARTITIONING can use VALUES %s in partition definition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_WRONG_VALUES_ERROR"] = 1480] = "ER_PARTITION_WRONG_VALUES_ERROR";
    /**
     * Message: MAXVALUE can only be used in last partition definition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_MAXVALUE_ERROR"] = 1481] = "ER_PARTITION_MAXVALUE_ERROR";
    /**
     * Message: Wrong number of partitions defined, mismatch with previous setting
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_WRONG_NO_PART_ERROR"] = 1484] = "ER_PARTITION_WRONG_NO_PART_ERROR";
    /**
     * Message: Wrong number of subpartitions defined, mismatch with previous setting
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_WRONG_NO_SUBPART_ERROR"] = 1485] = "ER_PARTITION_WRONG_NO_SUBPART_ERROR";
    /**
     * Message: Constant, random or timezone-dependent expressions in (sub)partitioning function are not allowed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR"] = 1486] = "ER_WRONG_EXPR_IN_PARTITION_FUNC_ERROR";
    /**
     * Message: Field in list of fields for partition function not found in table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FIELD_NOT_FOUND_PART_ERROR"] = 1488] = "ER_FIELD_NOT_FOUND_PART_ERROR";
    /**
     * Message: The partition info in the frm file is not consistent with what can be written into the frm file
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INCONSISTENT_PARTITION_INFO_ERROR"] = 1490] = "ER_INCONSISTENT_PARTITION_INFO_ERROR";
    /**
     * Message: The %s function returns the wrong type
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_FUNC_NOT_ALLOWED_ERROR"] = 1491] = "ER_PARTITION_FUNC_NOT_ALLOWED_ERROR";
    /**
     * Message: For %s partitions each partition must be defined
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITIONS_MUST_BE_DEFINED_ERROR"] = 1492] = "ER_PARTITIONS_MUST_BE_DEFINED_ERROR";
    /**
     * Message: VALUES LESS THAN value must be strictly increasing for each partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RANGE_NOT_INCREASING_ERROR"] = 1493] = "ER_RANGE_NOT_INCREASING_ERROR";
    /**
     * Message: VALUES value must be of same type as partition function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR"] = 1494] = "ER_INCONSISTENT_TYPE_OF_FUNCTIONS_ERROR";
    /**
     * Message: Multiple definition of same constant in list partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR"] = 1495] = "ER_MULTIPLE_DEF_CONST_IN_LIST_PART_ERROR";
    /**
     * Message: Partitioning can not be used stand-alone in query
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_ENTRY_ERROR"] = 1496] = "ER_PARTITION_ENTRY_ERROR";
    /**
     * Message: The mix of handlers in the partitions is not allowed in this version of MySQL
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MIX_HANDLER_ERROR"] = 1497] = "ER_MIX_HANDLER_ERROR";
    /**
     * Message: For the partitioned engine it is necessary to define all %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_NOT_DEFINED_ERROR"] = 1498] = "ER_PARTITION_NOT_DEFINED_ERROR";
    /**
     * Message: Too many partitions (including subpartitions) were defined
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_PARTITIONS_ERROR"] = 1499] = "ER_TOO_MANY_PARTITIONS_ERROR";
    /**
     * Message: It is only possible to mix RANGE/LIST partitioning with HASH/KEY partitioning for subpartitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SUBPARTITION_ERROR"] = 1500] = "ER_SUBPARTITION_ERROR";
    /**
     * Message: Failed to create specific handler file
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_CREATE_HANDLER_FILE"] = 1501] = "ER_CANT_CREATE_HANDLER_FILE";
    /**
     * Message: A BLOB field is not allowed in partition function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BLOB_FIELD_IN_PART_FUNC_ERROR"] = 1502] = "ER_BLOB_FIELD_IN_PART_FUNC_ERROR";
    /**
     * Message: A %s must include all columns in the table's partitioning function (prefixed columns are not considered).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF"] = 1503] = "ER_UNIQUE_KEY_NEED_ALL_FIELDS_IN_PF";
    /**
     * Message: Number of %s = 0 is not an allowed value
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_PARTS_ERROR"] = 1504] = "ER_NO_PARTS_ERROR";
    /**
     * Message: Partition management on a not partitioned table is not possible
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_MGMT_ON_NONPARTITIONED"] = 1505] = "ER_PARTITION_MGMT_ON_NONPARTITIONED";
    /**
     * Message: Foreign keys are not yet supported in conjunction with partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_KEY_ON_PARTITIONED"] = 1506] = "ER_FOREIGN_KEY_ON_PARTITIONED";
    /**
     * Message: Error in list of partitions to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DROP_PARTITION_NON_EXISTENT"] = 1507] = "ER_DROP_PARTITION_NON_EXISTENT";
    /**
     * Message: Cannot remove all partitions, use DROP TABLE instead
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DROP_LAST_PARTITION"] = 1508] = "ER_DROP_LAST_PARTITION";
    /**
     * Message: COALESCE PARTITION can only be used on HASH/KEY partitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COALESCE_ONLY_ON_HASH_PARTITION"] = 1509] = "ER_COALESCE_ONLY_ON_HASH_PARTITION";
    /**
     * Message: REORGANIZE PARTITION can only be used to reorganize partitions not to change their numbers
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REORG_HASH_ONLY_ON_SAME_NO"] = 1510] = "ER_REORG_HASH_ONLY_ON_SAME_NO";
    /**
     * Message: REORGANIZE PARTITION without parameters can only be used on auto-partitioned tables using HASH PARTITIONs
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REORG_NO_PARAM_ERROR"] = 1511] = "ER_REORG_NO_PARAM_ERROR";
    /**
     * Message: %s PARTITION can only be used on RANGE/LIST partitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ONLY_ON_RANGE_LIST_PARTITION"] = 1512] = "ER_ONLY_ON_RANGE_LIST_PARTITION";
    /**
     * Message: Trying to Add partition(s) with wrong number of subpartitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ADD_PARTITION_SUBPART_ERROR"] = 1513] = "ER_ADD_PARTITION_SUBPART_ERROR";
    /**
     * Message: At least one partition must be added
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ADD_PARTITION_NO_NEW_PARTITION"] = 1514] = "ER_ADD_PARTITION_NO_NEW_PARTITION";
    /**
     * Message: At least one partition must be coalesced
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COALESCE_PARTITION_NO_PARTITION"] = 1515] = "ER_COALESCE_PARTITION_NO_PARTITION";
    /**
     * Message: More partitions to reorganize than there are partitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REORG_PARTITION_NOT_EXIST"] = 1516] = "ER_REORG_PARTITION_NOT_EXIST";
    /**
     * Message: Duplicate partition name %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SAME_NAME_PARTITION"] = 1517] = "ER_SAME_NAME_PARTITION";
    /**
     * Message: It is not allowed to shut off binlog on this command
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_BINLOG_ERROR"] = 1518] = "ER_NO_BINLOG_ERROR";
    /**
     * Message: When reorganizing a set of partitions they must be in consecutive order
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CONSECUTIVE_REORG_PARTITIONS"] = 1519] = "ER_CONSECUTIVE_REORG_PARTITIONS";
    /**
     * Message: Reorganize of range partitions cannot change total ranges except for last partition where it can extend the range
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REORG_OUTSIDE_RANGE"] = 1520] = "ER_REORG_OUTSIDE_RANGE";
    /**
     * Message: Partition function not supported in this version for this handler
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_FUNCTION_FAILURE"] = 1521] = "ER_PARTITION_FUNCTION_FAILURE";
    /**
     * Message: The %s handler only supports 32 bit integers in VALUES
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LIMITED_PART_RANGE"] = 1523] = "ER_LIMITED_PART_RANGE";
    /**
     * Message: Plugin '%s' is not loaded
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_IS_NOT_LOADED"] = 1524] = "ER_PLUGIN_IS_NOT_LOADED";
    /**
     * Message: Incorrect %s value: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE"] = 1525] = "ER_WRONG_VALUE";
    /**
     * Message: Table has no partition for value %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_PARTITION_FOR_GIVEN_VALUE"] = 1526] = "ER_NO_PARTITION_FOR_GIVEN_VALUE";
    /**
     * Message: It is not allowed to specify %s more than once
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILEGROUP_OPTION_ONLY_ONCE"] = 1527] = "ER_FILEGROUP_OPTION_ONLY_ONCE";
    /**
     * Message: Failed to create %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CREATE_FILEGROUP_FAILED"] = 1528] = "ER_CREATE_FILEGROUP_FAILED";
    /**
     * Message: Failed to drop %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DROP_FILEGROUP_FAILED"] = 1529] = "ER_DROP_FILEGROUP_FAILED";
    /**
     * Message: The handler doesn't support autoextend of tablespaces
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_AUTO_EXTEND_ERROR"] = 1530] = "ER_TABLESPACE_AUTO_EXTEND_ERROR";
    /**
     * Message: A size parameter was incorrectly specified, either number or on the form 10M
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_SIZE_NUMBER"] = 1531] = "ER_WRONG_SIZE_NUMBER";
    /**
     * Message: The size number was correct but we don't allow the digit part to be more than 2 billion
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SIZE_OVERFLOW_ERROR"] = 1532] = "ER_SIZE_OVERFLOW_ERROR";
    /**
     * Message: Failed to alter: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_FILEGROUP_FAILED"] = 1533] = "ER_ALTER_FILEGROUP_FAILED";
    /**
     * Message: Writing one row to the row-based binary log failed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_ROW_LOGGING_FAILED"] = 1534] = "ER_BINLOG_ROW_LOGGING_FAILED";
    /**
     * Message: Event '%s' already exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_ALREADY_EXISTS"] = 1537] = "ER_EVENT_ALREADY_EXISTS";
    /**
     * Message: Unknown event '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_DOES_NOT_EXIST"] = 1539] = "ER_EVENT_DOES_NOT_EXIST";
    /**
     * Message: INTERVAL is either not positive or too big
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG"] = 1542] = "ER_EVENT_INTERVAL_NOT_POSITIVE_OR_TOO_BIG";
    /**
     * Message: ENDS is either invalid or before STARTS
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_ENDS_BEFORE_STARTS"] = 1543] = "ER_EVENT_ENDS_BEFORE_STARTS";
    /**
     * Message: Event execution time is in the past. Event has been disabled
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_EXEC_TIME_IN_THE_PAST"] = 1544] = "ER_EVENT_EXEC_TIME_IN_THE_PAST";
    /**
     * Message: Same old and new event name
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_SAME_NAME"] = 1551] = "ER_EVENT_SAME_NAME";
    /**
     * Message: Cannot drop index '%s': needed in a foreign key constraint
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DROP_INDEX_FK"] = 1553] = "ER_DROP_INDEX_FK";
    /**
     * Message: The syntax '%s' is deprecated and will be removed in MySQL %s. Please use %s instead
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SYNTAX_WITH_VER"] = 1554] = "ER_WARN_DEPRECATED_SYNTAX_WITH_VER";
    /**
     * Message: You can't use locks with log tables.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_LOCK_LOG_TABLE"] = 1556] = "ER_CANT_LOCK_LOG_TABLE";
    /**
     * Message: Upholding foreign key constraints for table '%s', entry '%s', key %d would lead to a duplicate entry
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DUPLICATE_KEY_OLD_UNUSED"] = 1557] = "ER_FOREIGN_DUPLICATE_KEY_OLD_UNUSED";
    /**
     * Message: The column count of mysql.%s is wrong. Expected %d, found %d. Created with MySQL %d, now running %d. Please perform the MySQL upgrade procedure.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE"] = 1558] = "ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE";
    /**
     * Message: Cannot switch out of the row-based binary log format when the session has open temporary tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR"] = 1559] = "ER_TEMP_TABLE_PREVENTS_SWITCH_OUT_OF_RBR";
    /**
     * Message: Cannot change the binary logging format inside a stored function or trigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT"] = 1560] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_FORMAT";
    /**
     * Message: Cannot create temporary table with partitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_NO_TEMPORARY"] = 1562] = "ER_PARTITION_NO_TEMPORARY";
    /**
     * Message: Partition constant is out of partition function domain
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_CONST_DOMAIN_ERROR"] = 1563] = "ER_PARTITION_CONST_DOMAIN_ERROR";
    /**
     * Message: This partition function is not allowed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_FUNCTION_IS_NOT_ALLOWED"] = 1564] = "ER_PARTITION_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: Error in DDL log
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DDL_LOG_ERROR"] = 1565] = "ER_DDL_LOG_ERROR";
    /**
     * Message: Not allowed to use NULL value in VALUES LESS THAN
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NULL_IN_VALUES_LESS_THAN"] = 1566] = "ER_NULL_IN_VALUES_LESS_THAN";
    /**
     * Message: Incorrect partition name
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARTITION_NAME"] = 1567] = "ER_WRONG_PARTITION_NAME";
    /**
     * Message: Transaction characteristics can't be changed while a transaction is in progress
     * SQLState: 25001
     */
    MysqlServerError[MysqlServerError["ER_CANT_CHANGE_TX_CHARACTERISTICS"] = 1568] = "ER_CANT_CHANGE_TX_CHARACTERISTICS";
    /**
     * Message: ALTER TABLE causes auto_increment resequencing, resulting in duplicate entry '%s' for key '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUP_ENTRY_AUTOINCREMENT_CASE"] = 1569] = "ER_DUP_ENTRY_AUTOINCREMENT_CASE";
    /**
     * Message: Error during starting/stopping of the scheduler. Error code %u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_SET_VAR_ERROR"] = 1571] = "ER_EVENT_SET_VAR_ERROR";
    /**
     * Message: Engine cannot be used in partitioned tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_MERGE_ERROR"] = 1572] = "ER_PARTITION_MERGE_ERROR";
    /**
     * Message: Decoding of base64 string failed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BASE64_DECODE_ERROR"] = 1575] = "ER_BASE64_DECODE_ERROR";
    /**
     * Message: Recursion of EVENT DDL statements is forbidden when body is present
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_RECURSION_FORBIDDEN"] = 1576] = "ER_EVENT_RECURSION_FORBIDDEN";
    /**
     * Message: Only integers allowed as number here
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ONLY_INTEGERS_ALLOWED"] = 1578] = "ER_ONLY_INTEGERS_ALLOWED";
    /**
     * Message: This storage engine cannot be used for log tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPORTED_LOG_ENGINE"] = 1579] = "ER_UNSUPORTED_LOG_ENGINE";
    /**
     * Message: You cannot '%s' a log table if logging is enabled
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BAD_LOG_STATEMENT"] = 1580] = "ER_BAD_LOG_STATEMENT";
    /**
     * Message: Cannot rename '%s'. When logging enabled, rename to/from log table must rename two tables: the log table to an archive table and another table back to '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_RENAME_LOG_TABLE"] = 1581] = "ER_CANT_RENAME_LOG_TABLE";
    /**
     * Message: Incorrect parameter count in the call to native function '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT"] = 1582] = "ER_WRONG_PARAMCOUNT_TO_NATIVE_FCT";
    /**
     * Message: Incorrect parameters in the call to native function '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARAMETERS_TO_NATIVE_FCT"] = 1583] = "ER_WRONG_PARAMETERS_TO_NATIVE_FCT";
    /**
     * Message: Incorrect parameters in the call to stored function %s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PARAMETERS_TO_STORED_FCT"] = 1584] = "ER_WRONG_PARAMETERS_TO_STORED_FCT";
    /**
     * Message: This function '%s' has the same name as a native function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NATIVE_FCT_NAME_COLLISION"] = 1585] = "ER_NATIVE_FCT_NAME_COLLISION";
    /**
     * Message: Duplicate entry '%s' for key '%s'
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_DUP_ENTRY_WITH_KEY_NAME"] = 1586] = "ER_DUP_ENTRY_WITH_KEY_NAME";
    /**
     * Message: Too many files opened, please execute the command again
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_PURGE_EMFILE"] = 1587] = "ER_BINLOG_PURGE_EMFILE";
    /**
     * Message: Event execution time is in the past and ON COMPLETION NOT PRESERVE is set. The event was dropped immediately after creation.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_CANNOT_CREATE_IN_THE_PAST"] = 1588] = "ER_EVENT_CANNOT_CREATE_IN_THE_PAST";
    /**
     * Message: Event execution time is in the past and ON COMPLETION NOT PRESERVE is set. The event was not changed. Specify a time in the future.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_CANNOT_ALTER_IN_THE_PAST"] = 1589] = "ER_EVENT_CANNOT_ALTER_IN_THE_PAST";
    /**
     * Message: Table has no partition for some existing values
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT"] = 1591] = "ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT";
    /**
     * Message: Unsafe statement written to the binary log using statement format since BINLOG_FORMAT = STATEMENT. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_STATEMENT"] = 1592] = "ER_BINLOG_UNSAFE_STATEMENT";
    /**
     * Message: Fatal error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_FATAL_ERROR"] = 1593] = "ER_BINLOG_FATAL_ERROR";
    /**
     * Message: Binary logging not possible. Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_LOGGING_IMPOSSIBLE"] = 1598] = "ER_BINLOG_LOGGING_IMPOSSIBLE";
    /**
     * Message: View `%s`.`%s` has no creation context
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_NO_CREATION_CTX"] = 1599] = "ER_VIEW_NO_CREATION_CTX";
    /**
     * Message: Creation context of view `%s`.`%s' is invalid
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VIEW_INVALID_CREATION_CTX"] = 1600] = "ER_VIEW_INVALID_CREATION_CTX";
    /**
     * Message: Corrupted TRG file for table `%s`.`%s`
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_CORRUPTED_FILE"] = 1602] = "ER_TRG_CORRUPTED_FILE";
    /**
     * Message: Triggers for table `%s`.`%s` have no creation context
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_NO_CREATION_CTX"] = 1603] = "ER_TRG_NO_CREATION_CTX";
    /**
     * Message: Trigger creation context of table `%s`.`%s` is invalid
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_INVALID_CREATION_CTX"] = 1604] = "ER_TRG_INVALID_CREATION_CTX";
    /**
     * Message: Creation context of event `%s`.`%s` is invalid
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EVENT_INVALID_CREATION_CTX"] = 1605] = "ER_EVENT_INVALID_CREATION_CTX";
    /**
     * Message: Cannot open table for trigger `%s`.`%s`
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TRG_CANT_OPEN_TABLE"] = 1606] = "ER_TRG_CANT_OPEN_TABLE";
    /**
     * Message: The BINLOG statement of type `%s` was not preceded by a format description BINLOG statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT"] = 1609] = "ER_NO_FORMAT_DESCRIPTION_EVENT_BEFORE_BINLOG_STATEMENT";
    /**
     * Message: Corrupted replication event was detected
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CORRUPT_EVENT"] = 1610] = "ER_SLAVE_CORRUPT_EVENT";
    /**
     * Message: Being purged log %s was not found
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOG_PURGE_NO_FILE"] = 1612] = "ER_LOG_PURGE_NO_FILE";
    /**
     * Message: XA_RBTIMEOUT: Transaction branch was rolled back: took too long
     * SQLState: XA106
     */
    MysqlServerError[MysqlServerError["ER_XA_RBTIMEOUT"] = 1613] = "ER_XA_RBTIMEOUT";
    /**
     * Message: XA_RBDEADLOCK: Transaction branch was rolled back: deadlock was detected
     * SQLState: XA102
     */
    MysqlServerError[MysqlServerError["ER_XA_RBDEADLOCK"] = 1614] = "ER_XA_RBDEADLOCK";
    /**
     * Message: Prepared statement needs to be re-prepared
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NEED_REPREPARE"] = 1615] = "ER_NEED_REPREPARE";
    /**
     * Message: The master info structure does not exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_NO_MASTER_INFO"] = 1617] = "WARN_NO_MASTER_INFO";
    /**
     * Message: <%s> option ignored
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_OPTION_IGNORED"] = 1618] = "WARN_OPTION_IGNORED";
    /**
     * Message: Built-in plugins cannot be deleted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_DELETE_BUILTIN"] = 1619] = "ER_PLUGIN_DELETE_BUILTIN";
    /**
     * Message: Plugin is busy and will be uninstalled on shutdown
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_PLUGIN_BUSY"] = 1620] = "WARN_PLUGIN_BUSY";
    /**
     * Message: %s variable '%s' is read-only. Use SET %s to assign the value
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_IS_READONLY"] = 1621] = "ER_VARIABLE_IS_READONLY";
    /**
     * Message: Storage engine %s does not support rollback for this statement. Transaction rolled back and must be restarted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_ENGINE_TRANSACTION_ROLLBACK"] = 1622] = "ER_WARN_ENGINE_TRANSACTION_ROLLBACK";
    /**
     * Message: The requested value for the heartbeat period is either negative or exceeds the maximum allowed (%s seconds).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE"] = 1624] = "ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE";
    /**
     * Message: Bad schema for mysql.ndb_replication table. Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NDB_REPLICATION_SCHEMA_ERROR"] = 1625] = "ER_NDB_REPLICATION_SCHEMA_ERROR";
    /**
     * Message: Error in parsing conflict function. Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CONFLICT_FN_PARSE_ERROR"] = 1626] = "ER_CONFLICT_FN_PARSE_ERROR";
    /**
     * Message: Write to exceptions table failed. Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EXCEPTIONS_WRITE_ERROR"] = 1627] = "ER_EXCEPTIONS_WRITE_ERROR";
    /**
     * Message: Comment for table '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_TABLE_COMMENT"] = 1628] = "ER_TOO_LONG_TABLE_COMMENT";
    /**
     * Message: Comment for field '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_FIELD_COMMENT"] = 1629] = "ER_TOO_LONG_FIELD_COMMENT";
    /**
     * Message: FUNCTION %s does not exist. Check the 'Function Name Parsing and Resolution' section in the Reference Manual
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_FUNC_INEXISTENT_NAME_COLLISION"] = 1630] = "ER_FUNC_INEXISTENT_NAME_COLLISION";
    /**
     * Message: Database
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DATABASE_NAME"] = 1631] = "ER_DATABASE_NAME";
    /**
     * Message: Table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NAME"] = 1632] = "ER_TABLE_NAME";
    /**
     * Message: Partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_NAME"] = 1633] = "ER_PARTITION_NAME";
    /**
     * Message: Subpartition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SUBPARTITION_NAME"] = 1634] = "ER_SUBPARTITION_NAME";
    /**
     * Message: Temporary
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEMPORARY_NAME"] = 1635] = "ER_TEMPORARY_NAME";
    /**
     * Message: Renamed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RENAMED_NAME"] = 1636] = "ER_RENAMED_NAME";
    /**
     * Message: Too many active concurrent transactions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_CONCURRENT_TRXS"] = 1637] = "ER_TOO_MANY_CONCURRENT_TRXS";
    /**
     * Message: Non-ASCII separator arguments are not fully supported
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED"] = 1638] = "WARN_NON_ASCII_SEPARATOR_NOT_IMPLEMENTED";
    /**
     * Message: debug sync point wait timed out
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEBUG_SYNC_TIMEOUT"] = 1639] = "ER_DEBUG_SYNC_TIMEOUT";
    /**
     * Message: debug sync point hit limit reached
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEBUG_SYNC_HIT_LIMIT"] = 1640] = "ER_DEBUG_SYNC_HIT_LIMIT";
    /**
     * Message: Duplicate condition information item '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_DUP_SIGNAL_SET"] = 1641] = "ER_DUP_SIGNAL_SET";
    /**
     * Message: Unhandled user-defined warning condition
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_SIGNAL_WARN"] = 1642] = "ER_SIGNAL_WARN";
    /**
     * Message: Unhandled user-defined not found condition
     * SQLState: 02000
     */
    MysqlServerError[MysqlServerError["ER_SIGNAL_NOT_FOUND"] = 1643] = "ER_SIGNAL_NOT_FOUND";
    /**
     * Message: Unhandled user-defined exception condition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SIGNAL_EXCEPTION"] = 1644] = "ER_SIGNAL_EXCEPTION";
    /**
     * Message: RESIGNAL when handler not active
     * SQLState: 0K000
     */
    MysqlServerError[MysqlServerError["ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER"] = 1645] = "ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER";
    /**
     * Message: SIGNAL/RESIGNAL can only use a CONDITION defined with SQLSTATE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SIGNAL_BAD_CONDITION_TYPE"] = 1646] = "ER_SIGNAL_BAD_CONDITION_TYPE";
    /**
     * Message: Data truncated for condition item '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_COND_ITEM_TRUNCATED"] = 1647] = "WARN_COND_ITEM_TRUNCATED";
    /**
     * Message: Data too long for condition item '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COND_ITEM_TOO_LONG"] = 1648] = "ER_COND_ITEM_TOO_LONG";
    /**
     * Message: Unknown locale: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_LOCALE"] = 1649] = "ER_UNKNOWN_LOCALE";
    /**
     * Message: The requested server id %d clashes with the slave startup option --replicate-same-server-id
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_IGNORE_SERVER_IDS"] = 1650] = "ER_SLAVE_IGNORE_SERVER_IDS";
    /**
     * Message: Query cache is disabled; restart the server with query_cache_type=1 to enable it
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_QUERY_CACHE_DISABLED"] = 1651] = "ER_QUERY_CACHE_DISABLED";
    /**
     * Message: Duplicate partition field name '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SAME_NAME_PARTITION_FIELD"] = 1652] = "ER_SAME_NAME_PARTITION_FIELD";
    /**
     * Message: Inconsistency in usage of column lists for partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_COLUMN_LIST_ERROR"] = 1653] = "ER_PARTITION_COLUMN_LIST_ERROR";
    /**
     * Message: Partition column values of incorrect type
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_TYPE_COLUMN_VALUE_ERROR"] = 1654] = "ER_WRONG_TYPE_COLUMN_VALUE_ERROR";
    /**
     * Message: Too many fields in '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR"] = 1655] = "ER_TOO_MANY_PARTITION_FUNC_FIELDS_ERROR";
    /**
     * Message: Cannot use MAXVALUE as value in VALUES IN
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MAXVALUE_IN_VALUES_IN"] = 1656] = "ER_MAXVALUE_IN_VALUES_IN";
    /**
     * Message: Cannot have more than one value for this type of %s partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_VALUES_ERROR"] = 1657] = "ER_TOO_MANY_VALUES_ERROR";
    /**
     * Message: Row expressions in VALUES IN only allowed for multi-field column partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ROW_SINGLE_PARTITION_FIELD_ERROR"] = 1658] = "ER_ROW_SINGLE_PARTITION_FIELD_ERROR";
    /**
     * Message: Field '%s' is of a not allowed type for this type of partitioning
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD"] = 1659] = "ER_FIELD_TYPE_NOT_ALLOWED_AS_PARTITION_FIELD";
    /**
     * Message: The total length of the partitioning fields is too large
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_FIELDS_TOO_LONG"] = 1660] = "ER_PARTITION_FIELDS_TOO_LONG";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since both row-incapable engines and statement-incapable engines are involved.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE"] = 1661] = "ER_BINLOG_ROW_ENGINE_AND_STMT_ENGINE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since BINLOG_FORMAT = ROW and at least one table uses a storage engine limited to statement-based logging.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_ROW_MODE_AND_STMT_ENGINE"] = 1662] = "ER_BINLOG_ROW_MODE_AND_STMT_ENGINE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since statement is unsafe, storage engine is limited to statement-based logging, and BINLOG_FORMAT = MIXED. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_AND_STMT_ENGINE"] = 1663] = "ER_BINLOG_UNSAFE_AND_STMT_ENGINE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since statement is in row format and at least one table uses a storage engine limited to statement-based logging.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE"] = 1664] = "ER_BINLOG_ROW_INJECTION_AND_STMT_ENGINE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since BINLOG_FORMAT = STATEMENT and at least one table uses a storage engine limited to row-based logging.%s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_STMT_MODE_AND_ROW_ENGINE"] = 1665] = "ER_BINLOG_STMT_MODE_AND_ROW_ENGINE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since statement is in row format and BINLOG_FORMAT = STATEMENT.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_ROW_INJECTION_AND_STMT_MODE"] = 1666] = "ER_BINLOG_ROW_INJECTION_AND_STMT_MODE";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since more than one engine is involved and at least one engine is self-logging.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE"] = 1667] = "ER_BINLOG_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE";
    /**
     * Message: The statement is unsafe because it uses a LIMIT clause. This is unsafe because the set of rows included cannot be predicted.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_LIMIT"] = 1668] = "ER_BINLOG_UNSAFE_LIMIT";
    /**
     * Message: The statement is unsafe because it uses the general log, slow query log, or performance_schema table(s). This is unsafe because system tables may differ on slaves.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_SYSTEM_TABLE"] = 1670] = "ER_BINLOG_UNSAFE_SYSTEM_TABLE";
    /**
     * Message: Statement is unsafe because it invokes a trigger or a stored function that inserts into an AUTO_INCREMENT column. Inserted values cannot be logged correctly.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_AUTOINC_COLUMNS"] = 1671] = "ER_BINLOG_UNSAFE_AUTOINC_COLUMNS";
    /**
     * Message: Statement is unsafe because it uses a UDF which may not return the same value on the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_UDF"] = 1672] = "ER_BINLOG_UNSAFE_UDF";
    /**
     * Message: Statement is unsafe because it uses a system variable that may have a different value on the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_SYSTEM_VARIABLE"] = 1673] = "ER_BINLOG_UNSAFE_SYSTEM_VARIABLE";
    /**
     * Message: Statement is unsafe because it uses a system function that may return a different value on the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_SYSTEM_FUNCTION"] = 1674] = "ER_BINLOG_UNSAFE_SYSTEM_FUNCTION";
    /**
     * Message: Statement is unsafe because it accesses a non-transactional table after accessing a transactional table within the same transaction.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS"] = 1675] = "ER_BINLOG_UNSAFE_NONTRANS_AFTER_TRANS";
    /**
     * Message: %s Statement: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MESSAGE_AND_STATEMENT"] = 1676] = "ER_MESSAGE_AND_STATEMENT";
    /**
     * Message: Column %d of table '%s.%s' cannot be converted from type '%s' to type '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CONVERSION_FAILED"] = 1677] = "ER_SLAVE_CONVERSION_FAILED";
    /**
     * Message: Can't create conversion table for table '%s.%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CANT_CREATE_CONVERSION"] = 1678] = "ER_SLAVE_CANT_CREATE_CONVERSION";
    /**
     * Message: Cannot modify @@session.binlog_format inside a transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT"] = 1679] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_FORMAT";
    /**
     * Message: The path specified for %s is too long.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PATH_LENGTH"] = 1680] = "ER_PATH_LENGTH";
    /**
     * Message: '%s' is deprecated and will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT"] = 1681] = "ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT";
    /**
     * Message: Native table '%s'.'%s' has the wrong structure
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_NATIVE_TABLE_STRUCTURE"] = 1682] = "ER_WRONG_NATIVE_TABLE_STRUCTURE";
    /**
     * Message: Invalid performance_schema usage.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_PERFSCHEMA_USAGE"] = 1683] = "ER_WRONG_PERFSCHEMA_USAGE";
    /**
     * Message: Table '%s'.'%s' was skipped since its definition is being modified by concurrent DDL statement
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_I_S_SKIPPED_TABLE"] = 1684] = "ER_WARN_I_S_SKIPPED_TABLE";
    /**
     * Message: Cannot modify @@session.binlog_direct_non_transactional_updates inside a transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT"] = 1685] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_BINLOG_DIRECT";
    /**
     * Message: Cannot change the binlog direct flag inside a stored function or trigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT"] = 1686] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_BINLOG_DIRECT";
    /**
     * Message: A SPATIAL index may only contain a geometrical type column
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_SPATIAL_MUST_HAVE_GEOM_COL"] = 1687] = "ER_SPATIAL_MUST_HAVE_GEOM_COL";
    /**
     * Message: Comment for index '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_INDEX_COMMENT"] = 1688] = "ER_TOO_LONG_INDEX_COMMENT";
    /**
     * Message: Wait on a lock was aborted due to a pending exclusive lock
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_ABORTED"] = 1689] = "ER_LOCK_ABORTED";
    /**
     * Message: %s value is out of range in '%s'
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_DATA_OUT_OF_RANGE"] = 1690] = "ER_DATA_OUT_OF_RANGE";
    /**
     * Message: A variable of a non-integer based type in LIMIT clause
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_SPVAR_TYPE_IN_LIMIT"] = 1691] = "ER_WRONG_SPVAR_TYPE_IN_LIMIT";
    /**
     * Message: Mixing self-logging and non-self-logging engines in a statement is unsafe.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE"] = 1692] = "ER_BINLOG_UNSAFE_MULTIPLE_ENGINES_AND_SELF_LOGGING_ENGINE";
    /**
     * Message: Statement accesses nontransactional table as well as transactional or temporary table, and writes to any of them.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_MIXED_STATEMENT"] = 1693] = "ER_BINLOG_UNSAFE_MIXED_STATEMENT";
    /**
     * Message: Cannot modify @@session.sql_log_bin inside a transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN"] = 1694] = "ER_INSIDE_TRANSACTION_PREVENTS_SWITCH_SQL_LOG_BIN";
    /**
     * Message: Cannot change the sql_log_bin inside a stored function or trigger
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN"] = 1695] = "ER_STORED_FUNCTION_PREVENTS_SWITCH_SQL_LOG_BIN";
    /**
     * Message: Failed to read from the .par file
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_READ_FROM_PAR_FILE"] = 1696] = "ER_FAILED_READ_FROM_PAR_FILE";
    /**
     * Message: VALUES value for partition '%s' must have type INT
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VALUES_IS_NOT_INT_TYPE_ERROR"] = 1697] = "ER_VALUES_IS_NOT_INT_TYPE_ERROR";
    /**
     * Message: Access denied for user '%s'@'%s'
     * SQLState: 28000
     */
    MysqlServerError[MysqlServerError["ER_ACCESS_DENIED_NO_PASSWORD_ERROR"] = 1698] = "ER_ACCESS_DENIED_NO_PASSWORD_ERROR";
    /**
     * Message: SET PASSWORD has no significance for users authenticating via plugins
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SET_PASSWORD_AUTH_PLUGIN"] = 1699] = "ER_SET_PASSWORD_AUTH_PLUGIN";
    /**
     * Message: Cannot truncate a table referenced in a foreign key constraint (%s)
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TRUNCATE_ILLEGAL_FK"] = 1701] = "ER_TRUNCATE_ILLEGAL_FK";
    /**
     * Message: Plugin '%s' is force_plus_permanent and can not be unloaded
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_IS_PERMANENT"] = 1702] = "ER_PLUGIN_IS_PERMANENT";
    /**
     * Message: The requested value for the heartbeat period is less than 1 millisecond. The value is reset to 0, meaning that heartbeating will effectively be disabled.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN"] = 1703] = "ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE_MIN";
    /**
     * Message: The requested value for the heartbeat period exceeds the value of `slave_net_timeout' seconds. A sensible value for the period should be less than the timeout.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX"] = 1704] = "ER_SLAVE_HEARTBEAT_VALUE_OUT_OF_RANGE_MAX";
    /**
     * Message: Multi-row statements required more than 'max_binlog_stmt_cache_size' bytes of storage; increase this mysqld variable and try again
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STMT_CACHE_FULL"] = 1705] = "ER_STMT_CACHE_FULL";
    /**
     * Message: Primary key/partition key update is not allowed since the table is updated both as '%s' and '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MULTI_UPDATE_KEY_CONFLICT"] = 1706] = "ER_MULTI_UPDATE_KEY_CONFLICT";
    /**
     * Message: Table rebuild required. Please do "ALTER TABLE `%s` FORCE" or dump/reload to fix it!
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NEEDS_REBUILD"] = 1707] = "ER_TABLE_NEEDS_REBUILD";
    /**
     * Message: The value of '%s' should be no less than the value of '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_OPTION_BELOW_LIMIT"] = 1708] = "WARN_OPTION_BELOW_LIMIT";
    /**
     * Message: Index column size too large. The maximum column size is %lu bytes.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INDEX_COLUMN_TOO_LONG"] = 1709] = "ER_INDEX_COLUMN_TOO_LONG";
    /**
     * Message: Trigger '%s' has an error in its body: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_IN_TRIGGER_BODY"] = 1710] = "ER_ERROR_IN_TRIGGER_BODY";
    /**
     * Message: Unknown trigger has an error in its body: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_IN_UNKNOWN_TRIGGER_BODY"] = 1711] = "ER_ERROR_IN_UNKNOWN_TRIGGER_BODY";
    /**
     * Message: Index %s is corrupted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INDEX_CORRUPT"] = 1712] = "ER_INDEX_CORRUPT";
    /**
     * Message: Undo log record is too big.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNDO_RECORD_TOO_BIG"] = 1713] = "ER_UNDO_RECORD_TOO_BIG";
    /**
     * Message: INSERT IGNORE... SELECT is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are ignored. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT"] = 1714] = "ER_BINLOG_UNSAFE_INSERT_IGNORE_SELECT";
    /**
     * Message: INSERT... SELECT... ON DUPLICATE KEY UPDATE is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are updated. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE"] = 1715] = "ER_BINLOG_UNSAFE_INSERT_SELECT_UPDATE";
    /**
     * Message: REPLACE... SELECT is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are replaced. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_REPLACE_SELECT"] = 1716] = "ER_BINLOG_UNSAFE_REPLACE_SELECT";
    /**
     * Message: CREATE... IGNORE SELECT is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are ignored. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT"] = 1717] = "ER_BINLOG_UNSAFE_CREATE_IGNORE_SELECT";
    /**
     * Message: CREATE... REPLACE SELECT is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are replaced. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT"] = 1718] = "ER_BINLOG_UNSAFE_CREATE_REPLACE_SELECT";
    /**
     * Message: UPDATE IGNORE is unsafe because the order in which rows are updated determines which (if any) rows are ignored. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_UPDATE_IGNORE"] = 1719] = "ER_BINLOG_UNSAFE_UPDATE_IGNORE";
    /**
     * Message: Plugin '%s' is marked as not dynamically uninstallable. You have to stop the server to uninstall it.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_NO_UNINSTALL"] = 1720] = "ER_PLUGIN_NO_UNINSTALL";
    /**
     * Message: Plugin '%s' is marked as not dynamically installable. You have to stop the server to install it.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_NO_INSTALL"] = 1721] = "ER_PLUGIN_NO_INSTALL";
    /**
     * Message: Statements writing to a table with an auto-increment column after selecting from another table are unsafe because the order in which rows are retrieved determines what (if any) rows will be written. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT"] = 1722] = "ER_BINLOG_UNSAFE_WRITE_AUTOINC_SELECT";
    /**
     * Message: CREATE TABLE... SELECT... on a table with an auto-increment column is unsafe because the order in which rows are retrieved by the SELECT determines which (if any) rows are inserted. This order cannot be predicted and may differ on master and the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC"] = 1723] = "ER_BINLOG_UNSAFE_CREATE_SELECT_AUTOINC";
    /**
     * Message: INSERT... ON DUPLICATE KEY UPDATE on a table with more than one UNIQUE KEY is unsafe
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_INSERT_TWO_KEYS"] = 1724] = "ER_BINLOG_UNSAFE_INSERT_TWO_KEYS";
    /**
     * Message: Table is being used in foreign key check.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_IN_FK_CHECK"] = 1725] = "ER_TABLE_IN_FK_CHECK";
    /**
     * Message: Storage engine '%s' does not support system tables. [%s.%s]
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ENGINE"] = 1726] = "ER_UNSUPPORTED_ENGINE";
    /**
     * Message: INSERT into autoincrement field which is not the first part in the composed primary key is unsafe.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST"] = 1727] = "ER_BINLOG_UNSAFE_AUTOINC_NOT_FIRST";
    /**
     * Message: Cannot load from %s.%s. The table is probably corrupted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_LOAD_FROM_TABLE_V2"] = 1728] = "ER_CANNOT_LOAD_FROM_TABLE_V2";
    /**
     * Message: The requested value %s for the master delay exceeds the maximum %u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_DELAY_VALUE_OUT_OF_RANGE"] = 1729] = "ER_MASTER_DELAY_VALUE_OUT_OF_RANGE";
    /**
     * Message: Only Format_description_log_event and row events are allowed in BINLOG statements (but %s was provided)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT"] = 1730] = "ER_ONLY_FD_AND_RBR_EVENTS_ALLOWED_IN_BINLOG_STATEMENT";
    /**
     * Message: Non matching attribute '%s' between partition and table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_EXCHANGE_DIFFERENT_OPTION"] = 1731] = "ER_PARTITION_EXCHANGE_DIFFERENT_OPTION";
    /**
     * Message: Table to exchange with partition is partitioned: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_EXCHANGE_PART_TABLE"] = 1732] = "ER_PARTITION_EXCHANGE_PART_TABLE";
    /**
     * Message: Table to exchange with partition is temporary: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_EXCHANGE_TEMP_TABLE"] = 1733] = "ER_PARTITION_EXCHANGE_TEMP_TABLE";
    /**
     * Message: Subpartitioned table, use subpartition instead of partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_INSTEAD_OF_SUBPARTITION"] = 1734] = "ER_PARTITION_INSTEAD_OF_SUBPARTITION";
    /**
     * Message: Unknown partition '%s' in table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_PARTITION"] = 1735] = "ER_UNKNOWN_PARTITION";
    /**
     * Message: Tables have different definitions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLES_DIFFERENT_METADATA"] = 1736] = "ER_TABLES_DIFFERENT_METADATA";
    /**
     * Message: Found a row that does not match the partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ROW_DOES_NOT_MATCH_PARTITION"] = 1737] = "ER_ROW_DOES_NOT_MATCH_PARTITION";
    /**
     * Message: Option binlog_cache_size (%lu) is greater than max_binlog_cache_size (%lu); setting binlog_cache_size equal to max_binlog_cache_size.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX"] = 1738] = "ER_BINLOG_CACHE_SIZE_GREATER_THAN_MAX";
    /**
     * Message: Cannot use %s access on index '%s' due to type or collation conversion on field '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_INDEX_NOT_APPLICABLE"] = 1739] = "ER_WARN_INDEX_NOT_APPLICABLE";
    /**
     * Message: Table to exchange with partition has foreign key references: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_EXCHANGE_FOREIGN_KEY"] = 1740] = "ER_PARTITION_EXCHANGE_FOREIGN_KEY";
    /**
     * Message: Data for column '%s' too long
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_INFO_DATA_TOO_LONG"] = 1742] = "ER_RPL_INFO_DATA_TOO_LONG";
    /**
     * Message: Option binlog_stmt_cache_size (%lu) is greater than max_binlog_stmt_cache_size (%lu); setting binlog_stmt_cache_size equal to max_binlog_stmt_cache_size.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX"] = 1745] = "ER_BINLOG_STMT_CACHE_SIZE_GREATER_THAN_MAX";
    /**
     * Message: Can't update table '%s' while '%s' is being created.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT"] = 1746] = "ER_CANT_UPDATE_TABLE_IN_CREATE_TABLE_SELECT";
    /**
     * Message: PARTITION () clause on non partitioned table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTITION_CLAUSE_ON_NONPARTITIONED"] = 1747] = "ER_PARTITION_CLAUSE_ON_NONPARTITIONED";
    /**
     * Message: Found a row not matching the given partition set
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET"] = 1748] = "ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET";
    /**
     * Message: Failure while changing the type of replication repository: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE"] = 1750] = "ER_CHANGE_RPL_INFO_REPOSITORY_FAILURE";
    /**
     * Message: The creation of some temporary tables could not be rolled back.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE"] = 1751] = "ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_CREATED_TEMP_TABLE";
    /**
     * Message: Some temporary tables were dropped, but these operations could not be rolled back.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE"] = 1752] = "ER_WARNING_NOT_COMPLETE_ROLLBACK_WITH_DROPPED_TEMP_TABLE";
    /**
     * Message: %s is not supported in multi-threaded slave mode. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_FEATURE_IS_NOT_SUPPORTED"] = 1753] = "ER_MTS_FEATURE_IS_NOT_SUPPORTED";
    /**
     * Message: The number of modified databases exceeds the maximum %d; the database names will not be included in the replication event metadata.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_UPDATED_DBS_GREATER_MAX"] = 1754] = "ER_MTS_UPDATED_DBS_GREATER_MAX";
    /**
     * Message: Cannot execute the current event group in the parallel mode. Encountered event %s, relay-log name %s, position %s which prevents execution of this event group in parallel mode. Reason: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_CANT_PARALLEL"] = 1755] = "ER_MTS_CANT_PARALLEL";
    /**
     * Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_INCONSISTENT_DATA"] = 1756] = "ER_MTS_INCONSISTENT_DATA";
    /**
     * Message: FULLTEXT index is not supported for partitioned tables.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING"] = 1757] = "ER_FULLTEXT_NOT_SUPPORTED_WITH_PARTITIONING";
    /**
     * Message: Invalid condition number
     * SQLState: 35000
     */
    MysqlServerError[MysqlServerError["ER_DA_INVALID_CONDITION_NUMBER"] = 1758] = "ER_DA_INVALID_CONDITION_NUMBER";
    /**
     * Message: Sending passwords in plain text without SSL/TLS is extremely insecure.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSECURE_PLAIN_TEXT"] = 1759] = "ER_INSECURE_PLAIN_TEXT";
    /**
     * Message: Storing MySQL user name or password information in the master info repository is not secure and is therefore not recommended. Please consider using the USER and PASSWORD connection options for START SLAVE; see the 'START SLAVE Syntax' in the MySQL Manual for more information.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INSECURE_CHANGE_MASTER"] = 1760] = "ER_INSECURE_CHANGE_MASTER";
    /**
     * Message: Foreign key constraint for table '%s', record '%s' would lead to a duplicate entry in table '%s', key '%s'
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO"] = 1761] = "ER_FOREIGN_DUPLICATE_KEY_WITH_CHILD_INFO";
    /**
     * Message: Foreign key constraint for table '%s', record '%s' would lead to a duplicate entry in a child table
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO"] = 1762] = "ER_FOREIGN_DUPLICATE_KEY_WITHOUT_CHILD_INFO";
    /**
     * Message: Setting authentication options is not possible when only the Slave SQL Thread is being started.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SQLTHREAD_WITH_SECURE_SLAVE"] = 1763] = "ER_SQLTHREAD_WITH_SECURE_SLAVE";
    /**
     * Message: The table does not have FULLTEXT index to support this query
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_HAS_NO_FT"] = 1764] = "ER_TABLE_HAS_NO_FT";
    /**
     * Message: The system variable %s cannot be set in stored functions or triggers.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER"] = 1765] = "ER_VARIABLE_NOT_SETTABLE_IN_SF_OR_TRIGGER";
    /**
     * Message: The system variable %s cannot be set when there is an ongoing transaction.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION"] = 1766] = "ER_VARIABLE_NOT_SETTABLE_IN_TRANSACTION";
    /**
     * Message: The statement 'SET %s' cannot invoke a stored function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION"] = 1769] = "ER_SET_STATEMENT_CANNOT_INVOKE_FUNCTION";
    /**
     * Message: The system variable @@SESSION.GTID_NEXT cannot be 'AUTOMATIC' when @@SESSION.GTID_NEXT_LIST is non-NULL.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL"] = 1770] = "ER_GTID_NEXT_CANT_BE_AUTOMATIC_IF_GTID_NEXT_LIST_IS_NON_NULL";
    /**
     * Message: Malformed GTID set specification '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MALFORMED_GTID_SET_SPECIFICATION"] = 1772] = "ER_MALFORMED_GTID_SET_SPECIFICATION";
    /**
     * Message: Malformed GTID set encoding.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MALFORMED_GTID_SET_ENCODING"] = 1773] = "ER_MALFORMED_GTID_SET_ENCODING";
    /**
     * Message: Malformed GTID specification '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MALFORMED_GTID_SPECIFICATION"] = 1774] = "ER_MALFORMED_GTID_SPECIFICATION";
    /**
     * Message: Impossible to generate Global Transaction Identifier: the integer component reached the maximal value. Restart the server with a new server_uuid.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GNO_EXHAUSTED"] = 1775] = "ER_GNO_EXHAUSTED";
    /**
     * Message: Parameters MASTER_LOG_FILE, MASTER_LOG_POS, RELAY_LOG_FILE and RELAY_LOG_POS cannot be set when MASTER_AUTO_POSITION is active.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BAD_SLAVE_AUTO_POSITION"] = 1776] = "ER_BAD_SLAVE_AUTO_POSITION";
    /**
     * Message: CHANGE MASTER TO MASTER_AUTO_POSITION = 1 cannot be executed because @@GLOBAL.GTID_MODE = OFF.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF"] = 1777] = "ER_AUTO_POSITION_REQUIRES_GTID_MODE_NOT_OFF";
    /**
     * Message: Cannot execute statements with implicit commit inside a transaction when @@SESSION.GTID_NEXT == 'UUID:NUMBER'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET"] = 1778] = "ER_CANT_DO_IMPLICIT_COMMIT_IN_TRX_WHEN_GTID_NEXT_IS_SET";
    /**
     * Message: GTID_MODE = ON requires ENFORCE_GTID_CONSISTENCY = ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON"] = 1779] = "ER_GTID_MODE_ON_REQUIRES_ENFORCE_GTID_CONSISTENCY_ON";
    /**
     * Message: @@SESSION.GTID_NEXT cannot be set to UUID:NUMBER when @@GLOBAL.GTID_MODE = OFF.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF"] = 1781] = "ER_CANT_SET_GTID_NEXT_TO_GTID_WHEN_GTID_MODE_IS_OFF";
    /**
     * Message: @@SESSION.GTID_NEXT cannot be set to ANONYMOUS when @@GLOBAL.GTID_MODE = ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON"] = 1782] = "ER_CANT_SET_GTID_NEXT_TO_ANONYMOUS_WHEN_GTID_MODE_IS_ON";
    /**
     * Message: @@SESSION.GTID_NEXT_LIST cannot be set to a non-NULL value when @@GLOBAL.GTID_MODE = OFF.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF"] = 1783] = "ER_CANT_SET_GTID_NEXT_LIST_TO_NON_NULL_WHEN_GTID_MODE_IS_OFF";
    /**
     * Message: Statement violates GTID consistency: Updates to non-transactional tables can only be done in either autocommitted statements or single-statement transactions, and never in the same statement as updates to transactional tables.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE"] = 1785] = "ER_GTID_UNSAFE_NON_TRANSACTIONAL_TABLE";
    /**
     * Message: Statement violates GTID consistency: CREATE TABLE ... SELECT.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_CREATE_SELECT"] = 1786] = "ER_GTID_UNSAFE_CREATE_SELECT";
    /**
     * Message: Statement violates GTID consistency: CREATE TEMPORARY TABLE and DROP TEMPORARY TABLE can only be executed outside transactional context. These statements are also not allowed in a function or trigger because functions and triggers are also considered to be multi-statement transactions.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_CREATE_DROP_TEMPORARY_TABLE_IN_TRANSACTION"] = 1787] = "ER_GTID_UNSAFE_CREATE_DROP_TEMPORARY_TABLE_IN_TRANSACTION";
    /**
     * Message: The value of @@GLOBAL.GTID_MODE can only be changed one step at a time: OFF <-> OFF_PERMISSIVE <-> ON_PERMISSIVE <-> ON. Also note that this value must be stepped up or down simultaneously on all servers. See the Manual for instructions.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME"] = 1788] = "ER_GTID_MODE_CAN_ONLY_CHANGE_ONE_STEP_AT_A_TIME";
    /**
     * Message: Cannot replicate because the master purged required binary logs. Replicate the missing transactions from elsewhere, or provision a new slave from backup. Consider increasing the master's binary log expiration period. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_HAS_PURGED_REQUIRED_GTIDS"] = 1789] = "ER_MASTER_HAS_PURGED_REQUIRED_GTIDS";
    /**
     * Message: @@SESSION.GTID_NEXT cannot be changed by a client that owns a GTID. The client owns %s. Ownership is released on COMMIT or ROLLBACK.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID"] = 1790] = "ER_CANT_SET_GTID_NEXT_WHEN_OWNING_GTID";
    /**
     * Message: Unknown EXPLAIN format name: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_EXPLAIN_FORMAT"] = 1791] = "ER_UNKNOWN_EXPLAIN_FORMAT";
    /**
     * Message: Cannot execute statement in a READ ONLY transaction.
     * SQLState: 25006
     */
    MysqlServerError[MysqlServerError["ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION"] = 1792] = "ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION";
    /**
     * Message: Comment for table partition '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_TABLE_PARTITION_COMMENT"] = 1793] = "ER_TOO_LONG_TABLE_PARTITION_COMMENT";
    /**
     * Message: Slave is not configured or failed to initialize properly. You must at least set --server-id to enable either a master or a slave. Additional error messages can be found in the MySQL error log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CONFIGURATION"] = 1794] = "ER_SLAVE_CONFIGURATION";
    /**
     * Message: InnoDB presently supports one FULLTEXT index creation at a time
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_FT_LIMIT"] = 1795] = "ER_INNODB_FT_LIMIT";
    /**
     * Message: Cannot create FULLTEXT index on temporary InnoDB table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_NO_FT_TEMP_TABLE"] = 1796] = "ER_INNODB_NO_FT_TEMP_TABLE";
    /**
     * Message: Column '%s' is of wrong type for an InnoDB FULLTEXT index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_FT_WRONG_DOCID_COLUMN"] = 1797] = "ER_INNODB_FT_WRONG_DOCID_COLUMN";
    /**
     * Message: Index '%s' is of wrong type for an InnoDB FULLTEXT index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_FT_WRONG_DOCID_INDEX"] = 1798] = "ER_INNODB_FT_WRONG_DOCID_INDEX";
    /**
     * Message: Creating index '%s' required more than 'innodb_online_alter_log_max_size' bytes of modification log. Please try again.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_ONLINE_LOG_TOO_BIG"] = 1799] = "ER_INNODB_ONLINE_LOG_TOO_BIG";
    /**
     * Message: Unknown ALGORITHM '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_ALTER_ALGORITHM"] = 1800] = "ER_UNKNOWN_ALTER_ALGORITHM";
    /**
     * Message: Unknown LOCK type '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_ALTER_LOCK"] = 1801] = "ER_UNKNOWN_ALTER_LOCK";
    /**
     * Message: CHANGE MASTER cannot be executed when the slave was stopped with an error or killed in MTS mode. Consider using RESET SLAVE or START SLAVE UNTIL.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_CHANGE_MASTER_CANT_RUN_WITH_GAPS"] = 1802] = "ER_MTS_CHANGE_MASTER_CANT_RUN_WITH_GAPS";
    /**
     * Message: Cannot recover after SLAVE errored out in parallel execution mode. Additional error messages can be found in the MySQL error log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_RECOVERY_FAILURE"] = 1803] = "ER_MTS_RECOVERY_FAILURE";
    /**
     * Message: Cannot clean up worker info tables. Additional error messages can be found in the MySQL error log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_RESET_WORKERS"] = 1804] = "ER_MTS_RESET_WORKERS";
    /**
     * Message: Column count of %s.%s is wrong. Expected %d, found %d. The table is probably corrupted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2"] = 1805] = "ER_COL_COUNT_DOESNT_MATCH_CORRUPTED_V2";
    /**
     * Message: Slave must silently retry current transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_SILENT_RETRY_TRANSACTION"] = 1806] = "ER_SLAVE_SILENT_RETRY_TRANSACTION";
    /**
     * Message: There is a foreign key check running on table '%s'. Cannot discard the table.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISCARD_FK_CHECKS_RUNNING"] = 1807] = "ER_DISCARD_FK_CHECKS_RUNNING";
    /**
     * Message: Schema mismatch (%s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_SCHEMA_MISMATCH"] = 1808] = "ER_TABLE_SCHEMA_MISMATCH";
    /**
     * Message: Table '%s' in system tablespace
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_IN_SYSTEM_TABLESPACE"] = 1809] = "ER_TABLE_IN_SYSTEM_TABLESPACE";
    /**
     * Message: IO Read error: (%lu, %s) %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IO_READ_ERROR"] = 1810] = "ER_IO_READ_ERROR";
    /**
     * Message: IO Write error: (%lu, %s) %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IO_WRITE_ERROR"] = 1811] = "ER_IO_WRITE_ERROR";
    /**
     * Message: Tablespace is missing for table %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_MISSING"] = 1812] = "ER_TABLESPACE_MISSING";
    /**
     * Message: Tablespace '%s' exists.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_EXISTS"] = 1813] = "ER_TABLESPACE_EXISTS";
    /**
     * Message: Tablespace has been discarded for table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_DISCARDED"] = 1814] = "ER_TABLESPACE_DISCARDED";
    /**
     * Message: Internal error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INTERNAL_ERROR"] = 1815] = "ER_INTERNAL_ERROR";
    /**
     * Message: ALTER TABLE %s IMPORT TABLESPACE failed with error %lu : '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_IMPORT_ERROR"] = 1816] = "ER_INNODB_IMPORT_ERROR";
    /**
     * Message: Index corrupt: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_INDEX_CORRUPT"] = 1817] = "ER_INNODB_INDEX_CORRUPT";
    /**
     * Message: Invalid display width. Use YEAR instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_YEAR_COLUMN_LENGTH"] = 1818] = "ER_INVALID_YEAR_COLUMN_LENGTH";
    /**
     * Message: Your password does not satisfy the current policy requirements
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NOT_VALID_PASSWORD"] = 1819] = "ER_NOT_VALID_PASSWORD";
    /**
     * Message: You must reset your password using ALTER USER statement before executing this statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MUST_CHANGE_PASSWORD"] = 1820] = "ER_MUST_CHANGE_PASSWORD";
    /**
     * Message: Failed to add the foreign key constraint. Missing index for constraint '%s' in the foreign table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_NO_INDEX_CHILD"] = 1821] = "ER_FK_NO_INDEX_CHILD";
    /**
     * Message: Failed to add the foreign key constraint. Missing index for constraint '%s' in the referenced table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_NO_INDEX_PARENT"] = 1822] = "ER_FK_NO_INDEX_PARENT";
    /**
     * Message: Failed to add the foreign key constraint '%s' to system tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_FAIL_ADD_SYSTEM"] = 1823] = "ER_FK_FAIL_ADD_SYSTEM";
    /**
     * Message: Failed to open the referenced table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_CANNOT_OPEN_PARENT"] = 1824] = "ER_FK_CANNOT_OPEN_PARENT";
    /**
     * Message: Failed to add the foreign key constraint on table '%s'. Incorrect options in FOREIGN KEY constraint '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_INCORRECT_OPTION"] = 1825] = "ER_FK_INCORRECT_OPTION";
    /**
     * Message: Duplicate foreign key constraint name '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_DUP_NAME"] = 1826] = "ER_FK_DUP_NAME";
    /**
     * Message: The password hash doesn't have the expected format.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_FORMAT"] = 1827] = "ER_PASSWORD_FORMAT";
    /**
     * Message: Cannot drop column '%s': needed in a foreign key constraint '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_COLUMN_CANNOT_DROP"] = 1828] = "ER_FK_COLUMN_CANNOT_DROP";
    /**
     * Message: Cannot drop column '%s': needed in a foreign key constraint '%s' of table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_COLUMN_CANNOT_DROP_CHILD"] = 1829] = "ER_FK_COLUMN_CANNOT_DROP_CHILD";
    /**
     * Message: Column '%s' cannot be NOT NULL: needed in a foreign key constraint '%s' SET NULL
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_COLUMN_NOT_NULL"] = 1830] = "ER_FK_COLUMN_NOT_NULL";
    /**
     * Message: Duplicate index '%s' defined on the table '%s.%s'. This is deprecated and will be disallowed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUP_INDEX"] = 1831] = "ER_DUP_INDEX";
    /**
     * Message: Cannot change column '%s': used in a foreign key constraint '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_COLUMN_CANNOT_CHANGE"] = 1832] = "ER_FK_COLUMN_CANNOT_CHANGE";
    /**
     * Message: Cannot change column '%s': used in a foreign key constraint '%s' of table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_COLUMN_CANNOT_CHANGE_CHILD"] = 1833] = "ER_FK_COLUMN_CANNOT_CHANGE_CHILD";
    /**
     * Message: Malformed communication packet.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MALFORMED_PACKET"] = 1835] = "ER_MALFORMED_PACKET";
    /**
     * Message: Running in read-only mode
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_READ_ONLY_MODE"] = 1836] = "ER_READ_ONLY_MODE";
    /**
     * Message: When @@SESSION.GTID_NEXT is set to a GTID, you must explicitly set it to a different value after a COMMIT or ROLLBACK. Please check GTID_NEXT variable manual page for detailed explanation. Current @@SESSION.GTID_NEXT is '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_NEXT_TYPE_UNDEFINED_GROUP"] = 1837] = "ER_GTID_NEXT_TYPE_UNDEFINED_GROUP";
    /**
     * Message: When @@SESSION.GTID_NEXT is set to a GTID, you must explicitly set it to a different value after a COMMIT or ROLLBACK. Please check GTID_NEXT variable manual page for detailed explanation. Current @@SESSION.GTID_NEXT is '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_NEXT_TYPE_UNDEFINED_GTID"] = 1837] = "ER_GTID_NEXT_TYPE_UNDEFINED_GTID";
    /**
     * Message: The system variable %s cannot be set in stored procedures.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_NOT_SETTABLE_IN_SP"] = 1838] = "ER_VARIABLE_NOT_SETTABLE_IN_SP";
    /**
     * Message: @@GLOBAL.GTID_PURGED can only be set when @@GLOBAL.GTID_EXECUTED is empty.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY"] = 1840] = "ER_CANT_SET_GTID_PURGED_WHEN_GTID_EXECUTED_IS_NOT_EMPTY";
    /**
     * Message: @@GLOBAL.GTID_PURGED can only be set when there are no ongoing transactions (not even in other clients).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY"] = 1841] = "ER_CANT_SET_GTID_PURGED_WHEN_OWNED_GTIDS_IS_NOT_EMPTY";
    /**
     * Message: @@GLOBAL.GTID_PURGED was changed from '%s' to '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_PURGED_WAS_CHANGED"] = 1842] = "ER_GTID_PURGED_WAS_CHANGED";
    /**
     * Message: @@GLOBAL.GTID_EXECUTED was changed from '%s' to '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_EXECUTED_WAS_CHANGED"] = 1843] = "ER_GTID_EXECUTED_WAS_CHANGED";
    /**
     * Message: Cannot execute statement: impossible to write to binary log since BINLOG_FORMAT = STATEMENT, and both replicated and non replicated tables are written to.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES"] = 1844] = "ER_BINLOG_STMT_MODE_AND_NO_REPL_TABLES";
    /**
     * Message: %s is not supported for this operation. Try %s.
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED"] = 1845] = "ER_ALTER_OPERATION_NOT_SUPPORTED";
    /**
     * Message: %s is not supported. Reason: %s. Try %s.
     * SQLState: 0A000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON"] = 1846] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON";
    /**
     * Message: COPY algorithm requires a lock
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY"] = 1847] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COPY";
    /**
     * Message: Partition specific operations do not yet support LOCK/ALGORITHM
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION"] = 1848] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_PARTITION";
    /**
     * Message: Columns participating in a foreign key are renamed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME"] = 1849] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_RENAME";
    /**
     * Message: Cannot change column type INPLACE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE"] = 1850] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_COLUMN_TYPE";
    /**
     * Message: Adding foreign keys needs foreign_key_checks=OFF
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK"] = 1851] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FK_CHECK";
    /**
     * Message: Dropping a primary key is not allowed without also adding a new primary key
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK"] = 1853] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOPK";
    /**
     * Message: Adding an auto-increment column requires a lock
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC"] = 1854] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_AUTOINC";
    /**
     * Message: Cannot replace hidden FTS_DOC_ID with a user-visible one
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS"] = 1855] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_HIDDEN_FTS";
    /**
     * Message: Cannot drop or rename FTS_DOC_ID
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS"] = 1856] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_CHANGE_FTS";
    /**
     * Message: Fulltext index creation requires a lock
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS"] = 1857] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_FTS";
    /**
     * Message: sql_slave_skip_counter can not be set when the server is running with @@GLOBAL.GTID_MODE = ON. Instead, for each transaction that you want to skip, generate an empty transaction with the same GTID as the transaction
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SQL_SLAVE_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE"] = 1858] = "ER_SQL_SLAVE_SKIP_COUNTER_NOT_SETTABLE_IN_GTID_MODE";
    /**
     * Message: Duplicate entry for key '%s'
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_DUP_UNKNOWN_IN_INDEX"] = 1859] = "ER_DUP_UNKNOWN_IN_INDEX";
    /**
     * Message: Long database name and identifier for object resulted in path length exceeding %d characters. Path: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IDENT_CAUSES_TOO_LONG_PATH"] = 1860] = "ER_IDENT_CAUSES_TOO_LONG_PATH";
    /**
     * Message: cannot silently convert NULL values, as required in this SQL_MODE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL"] = 1861] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_NOT_NULL";
    /**
     * Message: Your password has expired. To log in you must change it using a client that supports expired passwords.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MUST_CHANGE_PASSWORD_LOGIN"] = 1862] = "ER_MUST_CHANGE_PASSWORD_LOGIN";
    /**
     * Message: Found a row in wrong partition %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ROW_IN_WRONG_PARTITION"] = 1863] = "ER_ROW_IN_WRONG_PARTITION";
    /**
     * Message: Cannot schedule event %s, relay-log name %s, position %s to Worker thread because its size %lu exceeds %lu of slave_pending_jobs_size_max.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MTS_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX"] = 1864] = "ER_MTS_EVENT_BIGGER_PENDING_JOBS_SIZE_MAX";
    /**
     * Message: The binary log file '%s' is logically corrupted: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_LOGICAL_CORRUPTION"] = 1866] = "ER_BINLOG_LOGICAL_CORRUPTION";
    /**
     * Message: file %s was not purged because it was being read by %d thread(s), purged only %d out of %d files.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_PURGE_LOG_IN_USE"] = 1867] = "ER_WARN_PURGE_LOG_IN_USE";
    /**
     * Message: file %s was not purged because it is the active log file.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_PURGE_LOG_IS_ACTIVE"] = 1868] = "ER_WARN_PURGE_LOG_IS_ACTIVE";
    /**
     * Message: Auto-increment value in UPDATE conflicts with internally generated values
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUTO_INCREMENT_CONFLICT"] = 1869] = "ER_AUTO_INCREMENT_CONFLICT";
    /**
     * Message: Row events are not logged for %s statements that modify BLACKHOLE tables in row format. Table(s): '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_ON_BLOCKHOLE_IN_RBR"] = 1870] = "WARN_ON_BLOCKHOLE_IN_RBR";
    /**
     * Message: Slave failed to initialize master info structure from the repository
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_MI_INIT_REPOSITORY"] = 1871] = "ER_SLAVE_MI_INIT_REPOSITORY";
    /**
     * Message: Slave failed to initialize relay log info structure from the repository
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_RLI_INIT_REPOSITORY"] = 1872] = "ER_SLAVE_RLI_INIT_REPOSITORY";
    /**
     * Message: Access denied trying to change to user '%s'@'%s' (using password: %s). Disconnecting.
     * SQLState: 28000
     */
    MysqlServerError[MysqlServerError["ER_ACCESS_DENIED_CHANGE_USER_ERROR"] = 1873] = "ER_ACCESS_DENIED_CHANGE_USER_ERROR";
    /**
     * Message: InnoDB is in read only mode.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_READ_ONLY"] = 1874] = "ER_INNODB_READ_ONLY";
    /**
     * Message: STOP SLAVE command execution is incomplete: Slave SQL thread got the stop signal, thread is busy, SQL thread will stop once the current task is complete.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STOP_SLAVE_SQL_THREAD_TIMEOUT"] = 1875] = "ER_STOP_SLAVE_SQL_THREAD_TIMEOUT";
    /**
     * Message: STOP SLAVE command execution is incomplete: Slave IO thread got the stop signal, thread is busy, IO thread will stop once the current task is complete.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STOP_SLAVE_IO_THREAD_TIMEOUT"] = 1876] = "ER_STOP_SLAVE_IO_THREAD_TIMEOUT";
    /**
     * Message: Operation cannot be performed. The table '%s.%s' is missing, corrupt or contains bad data.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_CORRUPT"] = 1877] = "ER_TABLE_CORRUPT";
    /**
     * Message: Temporary file write failure.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEMP_FILE_WRITE_FAILURE"] = 1878] = "ER_TEMP_FILE_WRITE_FAILURE";
    /**
     * Message: Upgrade index name failed, please use create index(alter table) algorithm copy to rebuild index.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_FT_AUX_NOT_HEX_ID"] = 1879] = "ER_INNODB_FT_AUX_NOT_HEX_ID";
    /**
     * Message: TIME/TIMESTAMP/DATETIME columns of old format have been upgraded to the new format.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OLD_TEMPORALS_UPGRADED"] = 1880] = "ER_OLD_TEMPORALS_UPGRADED";
    /**
     * Message: Operation not allowed when innodb_force_recovery > 0.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_FORCED_RECOVERY"] = 1881] = "ER_INNODB_FORCED_RECOVERY";
    /**
     * Message: The initialization vector supplied to %s is too short. Must be at least %d bytes long
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AES_INVALID_IV"] = 1882] = "ER_AES_INVALID_IV";
    /**
     * Message: Plugin '%s' cannot be uninstalled now. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_CANNOT_BE_UNINSTALLED"] = 1883] = "ER_PLUGIN_CANNOT_BE_UNINSTALLED";
    /**
     * Message: Cannot execute statement because it needs to be written to the binary log as multiple statements, and this is not allowed when @@SESSION.GTID_NEXT == 'UUID:NUMBER'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_GTID_GROUP"] = 1884] = "ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_GTID_GROUP";
    /**
     * Message: Cannot execute statement because it needs to be written to the binary log as multiple statements, and this is not allowed when @@SESSION.GTID_NEXT == 'UUID:NUMBER'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID"] = 1884] = "ER_GTID_UNSAFE_BINLOG_SPLITTABLE_STATEMENT_AND_ASSIGNED_GTID";
    /**
     * Message: Slave has more GTIDs than the master has, using the master's SERVER_UUID. This may indicate that the end of the binary log was truncated or that the last binary log file was lost, e.g., after a power or disk failure when sync_binlog != 1. The master may or may not have rolled back transactions that were already replicated to the slave. Suggest to replicate any transactions that master has rolled back from slave to master, and/or commit empty transactions on master to account for transactions that have been committed on master but are not included in GTID_EXECUTED.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_HAS_MORE_GTIDS_THAN_MASTER"] = 1885] = "ER_SLAVE_HAS_MORE_GTIDS_THAN_MASTER";
    /**
     * Message: The table '%s.%s' does not have the necessary key(s) defined on it. Please check the table definition and create index(s) accordingly.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISSING_KEY"] = 1886] = "ER_MISSING_KEY";
    /**
     * Message: Setting named_pipe_full_access_group='%s' is insecure. Consider using a Windows group with fewer members.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_NAMED_PIPE_ACCESS_EVERYONE"] = 1887] = "WARN_NAMED_PIPE_ACCESS_EVERYONE";
    /**
     * Message: File %s is corrupted
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FILE_CORRUPT"] = 3000] = "ER_FILE_CORRUPT";
    /**
     * Message: Query partially completed on the master (error on master: %d) and was aborted. There is a chance that your master is inconsistent at this point. If you are sure that your master is ok, run this query manually on the slave and then restart the slave with SET GLOBAL SQL_SLAVE_SKIP_COUNTER=1; START SLAVE;. Query:'%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_ON_MASTER"] = 3001] = "ER_ERROR_ON_MASTER";
    /**
     * Message: Storage engine for table '%s'.'%s' is not loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STORAGE_ENGINE_NOT_LOADED"] = 3003] = "ER_STORAGE_ENGINE_NOT_LOADED";
    /**
     * Message: GET STACKED DIAGNOSTICS when handler not active
     * SQLState: 0Z002
     */
    MysqlServerError[MysqlServerError["ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER"] = 3004] = "ER_GET_STACKED_DA_WITHOUT_ACTIVE_HANDLER";
    /**
     * Message: %s is no longer supported. The statement was converted to %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_LEGACY_SYNTAX_CONVERTED"] = 3005] = "ER_WARN_LEGACY_SYNTAX_CONVERTED";
    /**
     * Message: Statement is unsafe because it uses a fulltext parser plugin which may not return the same value on the slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN"] = 3006] = "ER_BINLOG_UNSAFE_FULLTEXT_PLUGIN";
    /**
     * Message: Cannot DISCARD/IMPORT tablespace associated with temporary table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_DISCARD_TEMPORARY_TABLE"] = 3007] = "ER_CANNOT_DISCARD_TEMPORARY_TABLE";
    /**
     * Message: Foreign key cascade delete/update exceeds max depth of %d.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_DEPTH_EXCEEDED"] = 3008] = "ER_FK_DEPTH_EXCEEDED";
    /**
     * Message: The column count of %s.%s is wrong. Expected %d, found %d. Created with MySQL %d, now running %d. Please perform the MySQL upgrade procedure.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2"] = 3009] = "ER_COL_COUNT_DOESNT_MATCH_PLEASE_UPDATE_V2";
    /**
     * Message: Trigger %s.%s.%s does not have CREATED attribute.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_TRIGGER_DOESNT_HAVE_CREATED"] = 3010] = "ER_WARN_TRIGGER_DOESNT_HAVE_CREATED";
    /**
     * Message: Referenced trigger '%s' for the given action time and event type does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REFERENCED_TRG_DOES_NOT_EXIST"] = 3011] = "ER_REFERENCED_TRG_DOES_NOT_EXIST";
    /**
     * Message: EXPLAIN FOR CONNECTION command is supported only for SELECT/UPDATE/INSERT/DELETE/REPLACE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EXPLAIN_NOT_SUPPORTED"] = 3012] = "ER_EXPLAIN_NOT_SUPPORTED";
    /**
     * Message: Invalid size for column '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_FIELD_SIZE"] = 3013] = "ER_INVALID_FIELD_SIZE";
    /**
     * Message: Table storage engine '%s' found required create option missing
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISSING_HA_CREATE_OPTION"] = 3014] = "ER_MISSING_HA_CREATE_OPTION";
    /**
     * Message: Out of memory in storage engine '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ENGINE_OUT_OF_MEMORY"] = 3015] = "ER_ENGINE_OUT_OF_MEMORY";
    /**
     * Message: The password for anonymous user cannot be expired.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_EXPIRE_ANONYMOUS_USER"] = 3016] = "ER_PASSWORD_EXPIRE_ANONYMOUS_USER";
    /**
     * Message: This operation cannot be performed with a running slave sql thread; run STOP SLAVE SQL_THREAD first
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_SQL_THREAD_MUST_STOP"] = 3017] = "ER_SLAVE_SQL_THREAD_MUST_STOP";
    /**
     * Message: Cannot create FULLTEXT index on materialized subquery
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_FT_MATERIALIZED_SUBQUERY"] = 3018] = "ER_NO_FT_MATERIALIZED_SUBQUERY";
    /**
     * Message: Undo Log error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_UNDO_LOG_FULL"] = 3019] = "ER_INNODB_UNDO_LOG_FULL";
    /**
     * Message: Invalid argument for logarithm
     * SQLState: 2201E
     */
    MysqlServerError[MysqlServerError["ER_INVALID_ARGUMENT_FOR_LOGARITHM"] = 3020] = "ER_INVALID_ARGUMENT_FOR_LOGARITHM";
    /**
     * Message: This operation cannot be performed with a running slave io thread; run STOP SLAVE IO_THREAD FOR CHANNEL '%s' first.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_IO_THREAD_MUST_STOP"] = 3021] = "ER_SLAVE_CHANNEL_IO_THREAD_MUST_STOP";
    /**
     * Message: This operation may not be safe when the slave has temporary tables. The tables will be kept open until the server restarts or until the tables are deleted by any replicated DROP statement. Suggest to wait until slave_open_temp_tables = 0.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO"] = 3022] = "ER_WARN_OPEN_TEMP_TABLES_MUST_BE_ZERO";
    /**
     * Message: CHANGE MASTER TO with a MASTER_LOG_FILE clause but no MASTER_LOG_POS clause may not be safe. The old position value may not be valid for the new binary log file.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_ONLY_MASTER_LOG_FILE_NO_POS"] = 3023] = "ER_WARN_ONLY_MASTER_LOG_FILE_NO_POS";
    /**
     * Message: Query execution was interrupted, maximum statement execution time exceeded
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_QUERY_TIMEOUT"] = 3024] = "ER_QUERY_TIMEOUT";
    /**
     * Message: Select is not a read only statement, disabling timer
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NON_RO_SELECT_DISABLE_TIMER"] = 3025] = "ER_NON_RO_SELECT_DISABLE_TIMER";
    /**
     * Message: Duplicate entry '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUP_LIST_ENTRY"] = 3026] = "ER_DUP_LIST_ENTRY";
    /**
     * Message: Expression #%u of ORDER BY contains aggregate function and applies to a UNION
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AGGREGATE_ORDER_FOR_UNION"] = 3028] = "ER_AGGREGATE_ORDER_FOR_UNION";
    /**
     * Message: Expression #%u of ORDER BY contains aggregate function and applies to the result of a non-aggregated query
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AGGREGATE_ORDER_NON_AGG_QUERY"] = 3029] = "ER_AGGREGATE_ORDER_NON_AGG_QUERY";
    /**
     * Message: Slave worker has stopped after at least one previous worker encountered an error when slave-preserve-commit-order was enabled. To preserve commit order, the last transaction executed by this thread has not been committed. When restarting the slave after fixing any failed threads, you should fix this worker as well.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_WORKER_STOPPED_PREVIOUS_THD_ERROR"] = 3030] = "ER_SLAVE_WORKER_STOPPED_PREVIOUS_THD_ERROR";
    /**
     * Message: slave_preserve_commit_order is not supported %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DONT_SUPPORT_SLAVE_PRESERVE_COMMIT_ORDER"] = 3031] = "ER_DONT_SUPPORT_SLAVE_PRESERVE_COMMIT_ORDER";
    /**
     * Message: The server is currently in offline mode
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SERVER_OFFLINE_MODE"] = 3032] = "ER_SERVER_OFFLINE_MODE";
    /**
     * Message: Binary geometry function %s given two geometries of different srids: %u and %u, which should have been identical.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_DIFFERENT_SRIDS"] = 3033] = "ER_GIS_DIFFERENT_SRIDS";
    /**
     * Message: Calling geometry function %s with unsupported types of arguments.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_UNSUPPORTED_ARGUMENT"] = 3034] = "ER_GIS_UNSUPPORTED_ARGUMENT";
    /**
     * Message: Unknown GIS error occurred in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_UNKNOWN_ERROR"] = 3035] = "ER_GIS_UNKNOWN_ERROR";
    /**
     * Message: Unknown exception caught in GIS function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_UNKNOWN_EXCEPTION"] = 3036] = "ER_GIS_UNKNOWN_EXCEPTION";
    /**
     * Message: Invalid GIS data provided to function %s.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_GIS_INVALID_DATA"] = 3037] = "ER_GIS_INVALID_DATA";
    /**
     * Message: The geometry has no data in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION"] = 3038] = "ER_BOOST_GEOMETRY_EMPTY_INPUT_EXCEPTION";
    /**
     * Message: Unable to calculate centroid because geometry is empty in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_CENTROID_EXCEPTION"] = 3039] = "ER_BOOST_GEOMETRY_CENTROID_EXCEPTION";
    /**
     * Message: Geometry overlay calculation error: geometry data is invalid in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION"] = 3040] = "ER_BOOST_GEOMETRY_OVERLAY_INVALID_INPUT_EXCEPTION";
    /**
     * Message: Geometry turn info calculation error: geometry data is invalid in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION"] = 3041] = "ER_BOOST_GEOMETRY_TURN_INFO_EXCEPTION";
    /**
     * Message: Analysis procedures of intersection points interrupted unexpectedly in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION"] = 3042] = "ER_BOOST_GEOMETRY_SELF_INTERSECTION_POINT_EXCEPTION";
    /**
     * Message: Unknown exception thrown in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION"] = 3043] = "ER_BOOST_GEOMETRY_UNKNOWN_EXCEPTION";
    /**
     * Message: Memory allocation error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_BAD_ALLOC_ERROR"] = 3044] = "ER_STD_BAD_ALLOC_ERROR";
    /**
     * Message: Domain error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_DOMAIN_ERROR"] = 3045] = "ER_STD_DOMAIN_ERROR";
    /**
     * Message: Length error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_LENGTH_ERROR"] = 3046] = "ER_STD_LENGTH_ERROR";
    /**
     * Message: Invalid argument error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_INVALID_ARGUMENT"] = 3047] = "ER_STD_INVALID_ARGUMENT";
    /**
     * Message: Out of range error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_OUT_OF_RANGE_ERROR"] = 3048] = "ER_STD_OUT_OF_RANGE_ERROR";
    /**
     * Message: Overflow error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_OVERFLOW_ERROR"] = 3049] = "ER_STD_OVERFLOW_ERROR";
    /**
     * Message: Range error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_RANGE_ERROR"] = 3050] = "ER_STD_RANGE_ERROR";
    /**
     * Message: Underflow error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_UNDERFLOW_ERROR"] = 3051] = "ER_STD_UNDERFLOW_ERROR";
    /**
     * Message: Logic error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_LOGIC_ERROR"] = 3052] = "ER_STD_LOGIC_ERROR";
    /**
     * Message: Runtime error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_RUNTIME_ERROR"] = 3053] = "ER_STD_RUNTIME_ERROR";
    /**
     * Message: Unknown exception: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_UNKNOWN_EXCEPTION"] = 3054] = "ER_STD_UNKNOWN_EXCEPTION";
    /**
     * Message: Geometry byte string must be little endian.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_DATA_WRONG_ENDIANESS"] = 3055] = "ER_GIS_DATA_WRONG_ENDIANESS";
    /**
     * Message: The password provided for the replication user exceeds the maximum length of 32 characters
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHANGE_MASTER_PASSWORD_LENGTH"] = 3056] = "ER_CHANGE_MASTER_PASSWORD_LENGTH";
    /**
     * Message: Incorrect user-level lock name '%s'.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_USER_LOCK_WRONG_NAME"] = 3057] = "ER_USER_LOCK_WRONG_NAME";
    /**
     * Message: Deadlock found when trying to get user-level lock; try rolling back transaction/releasing locks and restarting lock acquisition.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_LOCK_DEADLOCK"] = 3058] = "ER_USER_LOCK_DEADLOCK";
    /**
     * Message: REPLACE cannot be executed as it requires deleting rows that are not in the view
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REPLACE_INACCESSIBLE_ROWS"] = 3059] = "ER_REPLACE_INACCESSIBLE_ROWS";
    /**
     * Message: Do not support online operation on table with GIS index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS"] = 3060] = "ER_ALTER_OPERATION_NOT_SUPPORTED_REASON_GIS";
    /**
     * Message: User variable name '%s' is illegal
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_USER_VAR"] = 3061] = "ER_ILLEGAL_USER_VAR";
    /**
     * Message: Cannot %s when GTID_MODE = OFF.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_MODE_OFF"] = 3062] = "ER_GTID_MODE_OFF";
    /**
     * Message: Incorrect type for argument %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INCORRECT_TYPE"] = 3064] = "ER_INCORRECT_TYPE";
    /**
     * Message: Expression #%u of ORDER BY clause is not in SELECT list, references column '%s' which is not in SELECT list; this is incompatible with %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FIELD_IN_ORDER_NOT_SELECT"] = 3065] = "ER_FIELD_IN_ORDER_NOT_SELECT";
    /**
     * Message: Expression #%u of ORDER BY clause is not in SELECT list, contains aggregate function; this is incompatible with %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AGGREGATE_IN_ORDER_NOT_SELECT"] = 3066] = "ER_AGGREGATE_IN_ORDER_NOT_SELECT";
    /**
     * Message: Supplied filter list contains a value which is not in the required format 'db_pattern.table_pattern'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN"] = 3067] = "ER_INVALID_RPL_WILD_TABLE_FILTER_PATTERN";
    /**
     * Message: OK packet too large
     * SQLState: 08S01
     */
    MysqlServerError[MysqlServerError["ER_NET_OK_PACKET_TOO_LARGE"] = 3068] = "ER_NET_OK_PACKET_TOO_LARGE";
    /**
     * Message: Invalid JSON data provided to function %s: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_DATA"] = 3069] = "ER_INVALID_JSON_DATA";
    /**
     * Message: Invalid GeoJSON data provided to function %s: Missing required member '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_GEOJSON_MISSING_MEMBER"] = 3070] = "ER_INVALID_GEOJSON_MISSING_MEMBER";
    /**
     * Message: Invalid GeoJSON data provided to function %s: Member '%s' must be of type '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_GEOJSON_WRONG_TYPE"] = 3071] = "ER_INVALID_GEOJSON_WRONG_TYPE";
    /**
     * Message: Invalid GeoJSON data provided to function %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_GEOJSON_UNSPECIFIED"] = 3072] = "ER_INVALID_GEOJSON_UNSPECIFIED";
    /**
     * Message: Unsupported number of coordinate dimensions in function %s: Found %u, expected %u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DIMENSION_UNSUPPORTED"] = 3073] = "ER_DIMENSION_UNSUPPORTED";
    /**
     * Message: Slave channel '%s' does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_DOES_NOT_EXIST"] = 3074] = "ER_SLAVE_CHANNEL_DOES_NOT_EXIST";
    /**
     * Message: Couldn't create channel: Channel name is either invalid or too long.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_NAME_INVALID_OR_TOO_LONG"] = 3076] = "ER_SLAVE_CHANNEL_NAME_INVALID_OR_TOO_LONG";
    /**
     * Message: To have multiple channels, repository cannot be of type FILE; Please check the repository configuration and convert them to TABLE.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_NEW_CHANNEL_WRONG_REPOSITORY"] = 3077] = "ER_SLAVE_NEW_CHANNEL_WRONG_REPOSITORY";
    /**
     * Message: Multiple channels exist on the slave. Please provide channel name as an argument.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_MULTIPLE_CHANNELS_CMD"] = 3079] = "ER_SLAVE_MULTIPLE_CHANNELS_CMD";
    /**
     * Message: Maximum number of replication channels allowed exceeded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_MAX_CHANNELS_EXCEEDED"] = 3080] = "ER_SLAVE_MAX_CHANNELS_EXCEEDED";
    /**
     * Message: This operation cannot be performed with running replication threads; run STOP SLAVE FOR CHANNEL '%s' first
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_MUST_STOP"] = 3081] = "ER_SLAVE_CHANNEL_MUST_STOP";
    /**
     * Message: This operation requires running replication threads; configure slave and run START SLAVE FOR CHANNEL '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_NOT_RUNNING"] = 3082] = "ER_SLAVE_CHANNEL_NOT_RUNNING";
    /**
     * Message: Replication thread(s) for channel '%s' are already runnning.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_WAS_RUNNING"] = 3083] = "ER_SLAVE_CHANNEL_WAS_RUNNING";
    /**
     * Message: Replication thread(s) for channel '%s' are already stopped.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_WAS_NOT_RUNNING"] = 3084] = "ER_SLAVE_CHANNEL_WAS_NOT_RUNNING";
    /**
     * Message: This operation cannot be performed with a running slave sql thread; run STOP SLAVE SQL_THREAD FOR CHANNEL '%s' first.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_SQL_THREAD_MUST_STOP"] = 3085] = "ER_SLAVE_CHANNEL_SQL_THREAD_MUST_STOP";
    /**
     * Message: When sql_slave_skip_counter > 0, it is not allowed to start more than one SQL thread by using 'START SLAVE [SQL_THREAD]'. Value of sql_slave_skip_counter can only be used by one SQL thread at a time. Please use 'START SLAVE [SQL_THREAD] FOR CHANNEL' to start the SQL thread which will use the value of sql_slave_skip_counter.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_SQL_SKIP_COUNTER"] = 3086] = "ER_SLAVE_CHANNEL_SQL_SKIP_COUNTER";
    /**
     * Message: Expression #%u of %s is not in GROUP BY clause and contains nonaggregated column '%s' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FIELD_WITH_GROUP_V2"] = 3087] = "ER_WRONG_FIELD_WITH_GROUP_V2";
    /**
     * Message: In aggregated query without GROUP BY, expression #%u of %s contains nonaggregated column '%s'; this is incompatible with sql_mode=only_full_group_by
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2"] = 3088] = "ER_MIX_OF_GROUP_FUNC_AND_FIELDS_V2";
    /**
     * Message: Updating '%s' is deprecated. It will be made read-only in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SYSVAR_UPDATE"] = 3089] = "ER_WARN_DEPRECATED_SYSVAR_UPDATE";
    /**
     * Message: Changing sql mode '%s' is deprecated. It will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SQLMODE"] = 3090] = "ER_WARN_DEPRECATED_SQLMODE";
    /**
     * Message: DROP DATABASE failed; some tables may have been dropped but the database directory remains. The GTID has not been added to GTID_EXECUTED and the statement was not written to the binary log. Fix this as follows: (1) remove all files from the database directory %s; (2) SET GTID_NEXT='%s'; (3) DROP DATABASE `%s`.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID"] = 3091] = "ER_CANNOT_LOG_PARTIAL_DROP_DATABASE_WITH_GTID";
    /**
     * Message: The server is not configured properly to be an active member of the group. Please see more details on error log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_CONFIGURATION"] = 3092] = "ER_GROUP_REPLICATION_CONFIGURATION";
    /**
     * Message: The START GROUP_REPLICATION command failed since the group is already running.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_RUNNING"] = 3093] = "ER_GROUP_REPLICATION_RUNNING";
    /**
     * Message: The START GROUP_REPLICATION command failed as the applier module failed to start.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_APPLIER_INIT_ERROR"] = 3094] = "ER_GROUP_REPLICATION_APPLIER_INIT_ERROR";
    /**
     * Message: The STOP GROUP_REPLICATION command execution is incomplete: The applier thread got the stop signal while it was busy. The applier thread will stop once the current task is complete.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT"] = 3095] = "ER_GROUP_REPLICATION_STOP_APPLIER_THREAD_TIMEOUT";
    /**
     * Message: The START GROUP_REPLICATION command failed as there was an error when initializing the group communication layer.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR"] = 3096] = "ER_GROUP_REPLICATION_COMMUNICATION_LAYER_SESSION_ERROR";
    /**
     * Message: The START GROUP_REPLICATION command failed as there was an error when joining the communication group.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR"] = 3097] = "ER_GROUP_REPLICATION_COMMUNICATION_LAYER_JOIN_ERROR";
    /**
     * Message: The table does not comply with the requirements by an external plugin.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BEFORE_DML_VALIDATION_ERROR"] = 3098] = "ER_BEFORE_DML_VALIDATION_ERROR";
    /**
     * Message: Cannot change the value of variable %s without binary log format as ROW.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PREVENTS_VARIABLE_WITHOUT_RBR"] = 3099] = "ER_PREVENTS_VARIABLE_WITHOUT_RBR";
    /**
     * Message: Error on observer while running replication hook '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RUN_HOOK_ERROR"] = 3100] = "ER_RUN_HOOK_ERROR";
    /**
     * Message: Plugin instructed the server to rollback the current transaction.
     * SQLState: 40000
     */
    MysqlServerError[MysqlServerError["ER_TRANSACTION_ROLLBACK_DURING_COMMIT"] = 3101] = "ER_TRANSACTION_ROLLBACK_DURING_COMMIT";
    /**
     * Message: Expression of generated column '%s' contains a disallowed function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED"] = 3102] = "ER_GENERATED_COLUMN_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: INPLACE ADD or DROP of virtual columns cannot be combined with other ALTER TABLE actions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN"] = 3103] = "ER_UNSUPPORTED_ALTER_INPLACE_ON_VIRTUAL_COLUMN";
    /**
     * Message: Cannot define foreign key with %s clause on a generated column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN"] = 3104] = "ER_WRONG_FK_OPTION_FOR_GENERATED_COLUMN";
    /**
     * Message: The value specified for generated column '%s' in table '%s' is not allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN"] = 3105] = "ER_NON_DEFAULT_VALUE_FOR_GENERATED_COLUMN";
    /**
     * Message: '%s' is not supported for generated columns.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN"] = 3106] = "ER_UNSUPPORTED_ACTION_ON_GENERATED_COLUMN";
    /**
     * Message: Generated column can refer only to generated columns defined prior to it.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_NON_PRIOR"] = 3107] = "ER_GENERATED_COLUMN_NON_PRIOR";
    /**
     * Message: Column '%s' has a generated column dependency.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPENDENT_BY_GENERATED_COLUMN"] = 3108] = "ER_DEPENDENT_BY_GENERATED_COLUMN";
    /**
     * Message: Generated column '%s' cannot refer to auto-increment column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_REF_AUTO_INC"] = 3109] = "ER_GENERATED_COLUMN_REF_AUTO_INC";
    /**
     * Message: The '%s' feature is not available; you need to remove '%s' or use MySQL built with '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FEATURE_NOT_AVAILABLE"] = 3110] = "ER_FEATURE_NOT_AVAILABLE";
    /**
     * Message: SET @@GLOBAL.GTID_MODE = %s is not allowed because %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_MODE"] = 3111] = "ER_CANT_SET_GTID_MODE";
    /**
     * Message: The replication receiver thread%s cannot start in AUTO_POSITION mode: this server uses @@GLOBAL.GTID_MODE = OFF.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF"] = 3112] = "ER_CANT_USE_AUTO_POSITION_WITH_GTID_MODE_OFF";
    /**
     * Message: Cannot set ENFORCE_GTID_CONSISTENCY = ON because there are ongoing transactions that violate GTID consistency.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX"] = 3116] = "ER_CANT_ENFORCE_GTID_CONSISTENCY_WITH_ONGOING_GTID_VIOLATING_TX";
    /**
     * Message: There are ongoing transactions that violate GTID consistency.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX"] = 3117] = "ER_ENFORCE_GTID_CONSISTENCY_WARN_WITH_ONGOING_GTID_VIOLATING_TX";
    /**
     * Message: Access denied for user '%s'@'%s'. Account is locked.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ACCOUNT_HAS_BEEN_LOCKED"] = 3118] = "ER_ACCOUNT_HAS_BEEN_LOCKED";
    /**
     * Message: Incorrect tablespace name `%s`
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_TABLESPACE_NAME"] = 3119] = "ER_WRONG_TABLESPACE_NAME";
    /**
     * Message: Tablespace `%s` is not empty.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_IS_NOT_EMPTY"] = 3120] = "ER_TABLESPACE_IS_NOT_EMPTY";
    /**
     * Message: Incorrect File Name '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_FILE_NAME"] = 3121] = "ER_WRONG_FILE_NAME";
    /**
     * Message: Inconsistent intersection points.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION"] = 3122] = "ER_BOOST_GEOMETRY_INCONSISTENT_TURNS_EXCEPTION";
    /**
     * Message: Optimizer hint syntax error
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR"] = 3123] = "ER_WARN_OPTIMIZER_HINT_SYNTAX_ERROR";
    /**
     * Message: Unsupported MAX_EXECUTION_TIME
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_BAD_MAX_EXECUTION_TIME"] = 3124] = "ER_WARN_BAD_MAX_EXECUTION_TIME";
    /**
     * Message: MAX_EXECUTION_TIME hint is supported by top-level standalone SELECT statements only
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME"] = 3125] = "ER_WARN_UNSUPPORTED_MAX_EXECUTION_TIME";
    /**
     * Message: Hint %s is ignored as conflicting/duplicated
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_CONFLICTING_HINT"] = 3126] = "ER_WARN_CONFLICTING_HINT";
    /**
     * Message: Query block name %s is not found for %s hint
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_UNKNOWN_QB_NAME"] = 3127] = "ER_WARN_UNKNOWN_QB_NAME";
    /**
     * Message: Unresolved name %s for %s hint
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNRESOLVED_HINT_NAME"] = 3128] = "ER_UNRESOLVED_HINT_NAME";
    /**
     * Message: Please do not modify the %s table. This is a mysql internal system table to store GTIDs for committed transactions. Modifying it can lead to an inconsistent GTID state.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE"] = 3129] = "ER_WARN_ON_MODIFYING_GTID_EXECUTED_TABLE";
    /**
     * Message: Command not supported by pluggable protocols
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED"] = 3130] = "ER_PLUGGABLE_PROTOCOL_COMMAND_NOT_SUPPORTED";
    /**
     * Message: Incorrect locking service lock name '%s'.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_LOCKING_SERVICE_WRONG_NAME"] = 3131] = "ER_LOCKING_SERVICE_WRONG_NAME";
    /**
     * Message: Deadlock found when trying to get locking service lock; try releasing locks and restarting lock acquisition.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCKING_SERVICE_DEADLOCK"] = 3132] = "ER_LOCKING_SERVICE_DEADLOCK";
    /**
     * Message: Service lock wait timeout exceeded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCKING_SERVICE_TIMEOUT"] = 3133] = "ER_LOCKING_SERVICE_TIMEOUT";
    /**
     * Message: Parameter %s exceeds the maximum number of points in a geometry (%lu) in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED"] = 3134] = "ER_GIS_MAX_POINTS_IN_GEOMETRY_OVERFLOWED";
    /**
     * Message: 'NO_ZERO_DATE', 'NO_ZERO_IN_DATE' and 'ERROR_FOR_DIVISION_BY_ZERO' sql modes should be used with strict mode. They will be merged with strict mode in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SQL_MODE_MERGED"] = 3135] = "ER_SQL_MODE_MERGED";
    /**
     * Message: Version token mismatch for %.*s. Correct value %.*s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VTOKEN_PLUGIN_TOKEN_MISMATCH"] = 3136] = "ER_VTOKEN_PLUGIN_TOKEN_MISMATCH";
    /**
     * Message: Version token %.*s not found.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND"] = 3137] = "ER_VTOKEN_PLUGIN_TOKEN_NOT_FOUND";
    /**
     * Message: Variable %s cannot be changed by a client that owns a GTID. The client owns %s. Ownership is released on COMMIT or ROLLBACK.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID"] = 3138] = "ER_CANT_SET_VARIABLE_WHEN_OWNING_GTID";
    /**
     * Message: %s cannot be performed on channel '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_CHANNEL_OPERATION_NOT_ALLOWED"] = 3139] = "ER_SLAVE_CHANNEL_OPERATION_NOT_ALLOWED";
    /**
     * Message: Invalid JSON text: "%s" at position %u in value for column '%s'.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_TEXT"] = 3140] = "ER_INVALID_JSON_TEXT";
    /**
     * Message: Invalid JSON text in argument %u to function %s: "%s" at position %u.%s
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_TEXT_IN_PARAM"] = 3141] = "ER_INVALID_JSON_TEXT_IN_PARAM";
    /**
     * Message: The JSON binary value contains invalid data.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_BINARY_DATA"] = 3142] = "ER_INVALID_JSON_BINARY_DATA";
    /**
     * Message: Invalid JSON path expression. The error is around character position %u.%s
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_PATH"] = 3143] = "ER_INVALID_JSON_PATH";
    /**
     * Message: Cannot create a JSON value from a string with CHARACTER SET '%s'.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_CHARSET"] = 3144] = "ER_INVALID_JSON_CHARSET";
    /**
     * Message: Invalid JSON character data provided to function %s: '%s'; utf8 is required.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_CHARSET_IN_FUNCTION"] = 3145] = "ER_INVALID_JSON_CHARSET_IN_FUNCTION";
    /**
     * Message: Invalid data type for JSON data in argument %u to function %s; a JSON string or JSON type is required.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_TYPE_FOR_JSON"] = 3146] = "ER_INVALID_TYPE_FOR_JSON";
    /**
     * Message: Cannot CAST value to JSON.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_CAST_TO_JSON"] = 3147] = "ER_INVALID_CAST_TO_JSON";
    /**
     * Message: A path expression must be encoded in the utf8 character set. The path expression '%s' is encoded in character set '%s'.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_PATH_CHARSET"] = 3148] = "ER_INVALID_JSON_PATH_CHARSET";
    /**
     * Message: In this situation, path expressions may not contain the * and ** tokens or an array range.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_PATH_WILDCARD"] = 3149] = "ER_INVALID_JSON_PATH_WILDCARD";
    /**
     * Message: The JSON value is too big to be stored in a JSON column.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_JSON_VALUE_TOO_BIG"] = 3150] = "ER_JSON_VALUE_TOO_BIG";
    /**
     * Message: The JSON object contains a key name that is too long.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_JSON_KEY_TOO_BIG"] = 3151] = "ER_JSON_KEY_TOO_BIG";
    /**
     * Message: JSON column '%s' supports indexing only via generated columns on a specified JSON path.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_JSON_USED_AS_KEY"] = 3152] = "ER_JSON_USED_AS_KEY";
    /**
     * Message: The path expression '$' is not allowed in this context.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_JSON_VACUOUS_PATH"] = 3153] = "ER_JSON_VACUOUS_PATH";
    /**
     * Message: The oneOrAll argument to %s may take these values: 'one' or 'all'.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_JSON_BAD_ONE_OR_ALL_ARG"] = 3154] = "ER_JSON_BAD_ONE_OR_ALL_ARG";
    /**
     * Message: Out of range JSON value for CAST to %s%s from column %s at row %ld
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE"] = 3155] = "ER_NUMERIC_JSON_VALUE_OUT_OF_RANGE";
    /**
     * Message: Invalid JSON value for CAST to %s%s from column %s at row %ld
     * SQLState: 22018
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_VALUE_FOR_CAST"] = 3156] = "ER_INVALID_JSON_VALUE_FOR_CAST";
    /**
     * Message: The JSON document exceeds the maximum depth.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_JSON_DOCUMENT_TOO_DEEP"] = 3157] = "ER_JSON_DOCUMENT_TOO_DEEP";
    /**
     * Message: JSON documents may not contain NULL member names.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_JSON_DOCUMENT_NULL_KEY"] = 3158] = "ER_JSON_DOCUMENT_NULL_KEY";
    /**
     * Message: Connections using insecure transport are prohibited while --require_secure_transport=ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SECURE_TRANSPORT_REQUIRED"] = 3159] = "ER_SECURE_TRANSPORT_REQUIRED";
    /**
     * Message: No secure transports (SSL or Shared Memory) are configured, unable to set --require_secure_transport=ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SECURE_TRANSPORTS_CONFIGURED"] = 3160] = "ER_NO_SECURE_TRANSPORTS_CONFIGURED";
    /**
     * Message: Storage engine %s is disabled (Table creation is disallowed).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISABLED_STORAGE_ENGINE"] = 3161] = "ER_DISABLED_STORAGE_ENGINE";
    /**
     * Message: Authorization ID %s does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_DOES_NOT_EXIST"] = 3162] = "ER_USER_DOES_NOT_EXIST";
    /**
     * Message: Authorization ID %s already exists.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_ALREADY_EXISTS"] = 3163] = "ER_USER_ALREADY_EXISTS";
    /**
     * Message: Aborted by Audit API ('%s';%d).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUDIT_API_ABORT"] = 3164] = "ER_AUDIT_API_ABORT";
    /**
     * Message: A path expression is not a path to a cell in an array.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_PATH_ARRAY_CELL"] = 3165] = "ER_INVALID_JSON_PATH_ARRAY_CELL";
    /**
     * Message: Another buffer pool resize is already in progress.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BUFPOOL_RESIZE_INPROGRESS"] = 3166] = "ER_BUFPOOL_RESIZE_INPROGRESS";
    /**
     * Message: The '%s' feature is disabled; see the documentation for '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FEATURE_DISABLED_SEE_DOC"] = 3167] = "ER_FEATURE_DISABLED_SEE_DOC";
    /**
     * Message: Server isn't available
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SERVER_ISNT_AVAILABLE"] = 3168] = "ER_SERVER_ISNT_AVAILABLE";
    /**
     * Message: Session was killed
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SESSION_WAS_KILLED"] = 3169] = "ER_SESSION_WAS_KILLED";
    /**
     * Message: Memory capacity of %llu bytes for '%s' exceeded. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CAPACITY_EXCEEDED"] = 3170] = "ER_CAPACITY_EXCEEDED";
    /**
     * Message: Range optimization was not done for this query.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER"] = 3171] = "ER_CAPACITY_EXCEEDED_IN_RANGE_OPTIMIZER";
    /**
     * Message: The client holds ownership of the GTID %s. Therefore, WAIT_FOR_EXECUTED_GTID_SET cannot wait for this GTID.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID"] = 3173] = "ER_CANT_WAIT_FOR_EXECUTED_GTID_SET_WHILE_OWNING_A_GTID";
    /**
     * Message: Cannot add foreign key on the base column of indexed virtual column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL"] = 3174] = "ER_CANNOT_ADD_FOREIGN_BASE_COL_VIRTUAL";
    /**
     * Message: Cannot create index on virtual column whose base column has foreign constraint.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT"] = 3175] = "ER_CANNOT_CREATE_VIRTUAL_INDEX_CONSTRAINT";
    /**
     * Message: Please do not modify the %s table with an XA transaction. This is an internal system table used to store GTIDs for committed transactions. Although modifying it can lead to an inconsistent GTID state, if neccessary you can modify it with a non-XA transaction.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE"] = 3176] = "ER_ERROR_ON_MODIFYING_GTID_EXECUTED_TABLE";
    /**
     * Message: Lock acquisition refused by storage engine.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_REFUSED_BY_ENGINE"] = 3177] = "ER_LOCK_REFUSED_BY_ENGINE";
    /**
     * Message: ADD COLUMN col...VIRTUAL, ADD INDEX(col)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN"] = 3178] = "ER_UNSUPPORTED_ALTER_ONLINE_ON_VIRTUAL_COLUMN";
    /**
     * Message: Master key rotation is not supported by storage engine.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE"] = 3179] = "ER_MASTER_KEY_ROTATION_NOT_SUPPORTED_BY_SE";
    /**
     * Message: Write to binlog failed. However, master key rotation has been completed successfully.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_KEY_ROTATION_BINLOG_FAILED"] = 3181] = "ER_MASTER_KEY_ROTATION_BINLOG_FAILED";
    /**
     * Message: Storage engine is not available.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE"] = 3182] = "ER_MASTER_KEY_ROTATION_SE_UNAVAILABLE";
    /**
     * Message: This tablespace can't be encrypted.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_CANNOT_ENCRYPT"] = 3183] = "ER_TABLESPACE_CANNOT_ENCRYPT";
    /**
     * Message: Invalid encryption option.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_ENCRYPTION_OPTION"] = 3184] = "ER_INVALID_ENCRYPTION_OPTION";
    /**
     * Message: Can't find master key from keyring, please check in the server log if a keyring plugin is loaded and initialized successfully.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_FIND_KEY_IN_KEYRING"] = 3185] = "ER_CANNOT_FIND_KEY_IN_KEYRING";
    /**
     * Message: Parser bailed out for this query.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CAPACITY_EXCEEDED_IN_PARSER"] = 3186] = "ER_CAPACITY_EXCEEDED_IN_PARSER";
    /**
     * Message: Cannot alter encryption attribute by inplace algorithm.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE"] = 3187] = "ER_UNSUPPORTED_ALTER_ENCRYPTION_INPLACE";
    /**
     * Message: Function '%s' failed because underlying keyring service returned an error. Please check if a keyring plugin is installed and that provided arguments are valid for the keyring you are using.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEYRING_UDF_KEYRING_SERVICE_ERROR"] = 3188] = "ER_KEYRING_UDF_KEYRING_SERVICE_ERROR";
    /**
     * Message: It seems that your db schema is old. The %s column is 77 characters long and should be 93 characters long. Please perform the MySQL upgrade procedure.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_COLUMN_OLD_LENGTH"] = 3189] = "ER_USER_COLUMN_OLD_LENGTH";
    /**
     * Message: RESET MASTER is not allowed because %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_RESET_MASTER"] = 3190] = "ER_CANT_RESET_MASTER";
    /**
     * Message: The START GROUP_REPLICATION command failed since the group already has 9 members.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_MAX_GROUP_SIZE"] = 3191] = "ER_GROUP_REPLICATION_MAX_GROUP_SIZE";
    /**
     * Message: Cannot add foreign key on the base column of stored column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED"] = 3192] = "ER_CANNOT_ADD_FOREIGN_BASE_COL_STORED";
    /**
     * Message: Cannot complete the operation because table is referenced by another connection.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_REFERENCED"] = 3193] = "ER_TABLE_REFERENCED";
    /**
     * Message: The resource manager is not able to commit the transaction branch at this time. Please retry later.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_XA_RETRY"] = 3197] = "ER_XA_RETRY";
    /**
     * Message: Function %s failed due to: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEYRING_AWS_UDF_AWS_KMS_ERROR"] = 3198] = "ER_KEYRING_AWS_UDF_AWS_KMS_ERROR";
    /**
     * Message: Statement is unsafe because it is being used inside a XA transaction. Concurrent XA transactions may deadlock on slaves when replicated using statements.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_XA"] = 3199] = "ER_BINLOG_UNSAFE_XA";
    /**
     * Message: %s UDF failed; %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UDF_ERROR"] = 3200] = "ER_UDF_ERROR";
    /**
     * Message: Can not perform keyring migration : %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEYRING_MIGRATION_FAILURE"] = 3201] = "ER_KEYRING_MIGRATION_FAILURE";
    /**
     * Message: Access denied; you need %s privileges for this operation
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_KEYRING_ACCESS_DENIED_ERROR"] = 3202] = "ER_KEYRING_ACCESS_DENIED_ERROR";
    /**
     * Message: Keyring migration %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_KEYRING_MIGRATION_STATUS"] = 3203] = "ER_KEYRING_MIGRATION_STATUS";
    /**
     * Message: Invalid "max_array_length" argument value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE"] = 3218] = "ER_AUDIT_LOG_UDF_READ_INVALID_MAX_ARRAY_LENGTH_ARG_VALUE";
    /**
     * Message: CREATE TEMPORARY TABLE is not allowed with ROW_FORMAT=COMPRESSED or KEY_BLOCK_SIZE.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE"] = 3500] = "ER_UNSUPPORT_COMPRESSED_TEMPORARY_TABLE";
    /**
     * Message: The ACL operation failed due to the following error from SE: errcode %d - %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ACL_OPERATION_FAILED"] = 3501] = "ER_ACL_OPERATION_FAILED";
    /**
     * Message: This storage engine does not support the %s index algorithm, storage engine default was used instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_INDEX_ALGORITHM"] = 3502] = "ER_UNSUPPORTED_INDEX_ALGORITHM";
    /**
     * Message: Database '%s' doesn't exist
     * SQLState: 42Y07
     */
    MysqlServerError[MysqlServerError["ER_NO_SUCH_DB"] = 3503] = "ER_NO_SUCH_DB";
    /**
     * Message: Too many enumeration values for column %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_BIG_ENUM"] = 3504] = "ER_TOO_BIG_ENUM";
    /**
     * Message: Too long enumeration/set value for column %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_SET_ENUM_VALUE"] = 3505] = "ER_TOO_LONG_SET_ENUM_VALUE";
    /**
     * Message: %s dictionary object is invalid. (%s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_DD_OBJECT"] = 3506] = "ER_INVALID_DD_OBJECT";
    /**
     * Message: Failed to update %s dictionary object.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UPDATING_DD_TABLE"] = 3507] = "ER_UPDATING_DD_TABLE";
    /**
     * Message: Dictionary object id (%lu) does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_DD_OBJECT_ID"] = 3508] = "ER_INVALID_DD_OBJECT_ID";
    /**
     * Message: Dictionary object name '%s' is invalid. (%s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_DD_OBJECT_NAME"] = 3509] = "ER_INVALID_DD_OBJECT_NAME";
    /**
     * Message: Tablespace %s doesn't exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_MISSING_WITH_NAME"] = 3510] = "ER_TABLESPACE_MISSING_WITH_NAME";
    /**
     * Message: Comment for routine '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_ROUTINE_COMMENT"] = 3511] = "ER_TOO_LONG_ROUTINE_COMMENT";
    /**
     * Message: Failed to load routine '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SP_LOAD_FAILED"] = 3512] = "ER_SP_LOAD_FAILED";
    /**
     * Message: Binary operands of bitwise operators must be of equal length
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_BITWISE_OPERANDS_SIZE"] = 3513] = "ER_INVALID_BITWISE_OPERANDS_SIZE";
    /**
     * Message: Aggregate bitwise functions cannot accept arguments longer than 511 bytes; consider using the SUBSTRING() function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE"] = 3514] = "ER_INVALID_BITWISE_AGGREGATE_OPERANDS_SIZE";
    /**
     * Message: Hints aren't supported in %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_UNSUPPORTED_HINT"] = 3515] = "ER_WARN_UNSUPPORTED_HINT";
    /**
     * Message: %s value is a geometry of unexpected type %s in %s.
     * SQLState: 22S01
     */
    MysqlServerError[MysqlServerError["ER_UNEXPECTED_GEOMETRY_TYPE"] = 3516] = "ER_UNEXPECTED_GEOMETRY_TYPE";
    /**
     * Message: Can't parse the spatial reference system definition of SRID %u.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_PARSE_ERROR"] = 3517] = "ER_SRS_PARSE_ERROR";
    /**
     * Message: The spatial reference system definition for SRID %u does not specify the mandatory %s (EPSG %u) projection parameter.
     * SQLState: SR003
     */
    MysqlServerError[MysqlServerError["ER_SRS_PROJ_PARAMETER_MISSING"] = 3518] = "ER_SRS_PROJ_PARAMETER_MISSING";
    /**
     * Message: There's no spatial reference system with SRID %u.
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_WARN_SRS_NOT_FOUND"] = 3519] = "ER_WARN_SRS_NOT_FOUND";
    /**
     * Message: Function %s is only defined for Cartesian spatial reference systems, but one of its arguments is in SRID %u, which is not Cartesian.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_SRS_NOT_CARTESIAN"] = 3520] = "ER_SRS_NOT_CARTESIAN";
    /**
     * Message: Function %s is only defined for Cartesian spatial reference systems, but one of its arguments is in SRID %u, which has not been defined.
     * SQLState: SR001
     */
    MysqlServerError[MysqlServerError["ER_SRS_NOT_CARTESIAN_UNDEFINED"] = 3521] = "ER_SRS_NOT_CARTESIAN_UNDEFINED";
    /**
     * Message: A primary key index cannot be invisible
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PK_INDEX_CANT_BE_INVISIBLE"] = 3522] = "ER_PK_INDEX_CANT_BE_INVISIBLE";
    /**
     * Message: Unknown authorization ID `%s`@`%s`
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNKNOWN_AUTHID"] = 3523] = "ER_UNKNOWN_AUTHID";
    /**
     * Message: Failed to grant %s` to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_ROLE_GRANT"] = 3524] = "ER_FAILED_ROLE_GRANT";
    /**
     * Message: Failed to open the security system tables
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_OPEN_ROLE_TABLES"] = 3525] = "ER_OPEN_ROLE_TABLES";
    /**
     * Message: Failed to set default roles
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_DEFAULT_ROLES"] = 3526] = "ER_FAILED_DEFAULT_ROLES";
    /**
     * Message: Cannot find schema in specified URN: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_NO_SCHEME"] = 3527] = "ER_COMPONENTS_NO_SCHEME";
    /**
     * Message: Cannot acquire scheme load service implementation for schema '%s' in specified URN: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_NO_SCHEME_SERVICE"] = 3528] = "ER_COMPONENTS_NO_SCHEME_SERVICE";
    /**
     * Message: Cannot load component from specified URN: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_CANT_LOAD"] = 3529] = "ER_COMPONENTS_CANT_LOAD";
    /**
     * Message: `%s`@`%s` is not granted to `%s`@`%s`
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ROLE_NOT_GRANTED"] = 3530] = "ER_ROLE_NOT_GRANTED";
    /**
     * Message: Could not revoke role from `%s`@`%s`
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_REVOKE_ROLE"] = 3531] = "ER_FAILED_REVOKE_ROLE";
    /**
     * Message: Renaming of a role identifier is forbidden
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RENAME_ROLE"] = 3532] = "ER_RENAME_ROLE";
    /**
     * Message: Cannot acquire specified service implementation: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION"] = 3533] = "ER_COMPONENTS_CANT_ACQUIRE_SERVICE_IMPLEMENTATION";
    /**
     * Message: Cannot satisfy dependency for service '%s' required by component '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_CANT_SATISFY_DEPENDENCY"] = 3534] = "ER_COMPONENTS_CANT_SATISFY_DEPENDENCY";
    /**
     * Message: Cannot register service implementation '%s' provided by component '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION"] = 3535] = "ER_COMPONENTS_LOAD_CANT_REGISTER_SERVICE_IMPLEMENTATION";
    /**
     * Message: Initialization method provided by component '%s' failed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_LOAD_CANT_INITIALIZE"] = 3536] = "ER_COMPONENTS_LOAD_CANT_INITIALIZE";
    /**
     * Message: Component specified by URN '%s' to unload has not been loaded before.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_UNLOAD_NOT_LOADED"] = 3537] = "ER_COMPONENTS_UNLOAD_NOT_LOADED";
    /**
     * Message: De-initialization method provided by component '%s' failed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE"] = 3538] = "ER_COMPONENTS_UNLOAD_CANT_DEINITIALIZE";
    /**
     * Message: Release of previously acquired service implementation failed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_CANT_RELEASE_SERVICE"] = 3539] = "ER_COMPONENTS_CANT_RELEASE_SERVICE";
    /**
     * Message: Unregistration of service implementation '%s' provided by component '%s' failed during unloading of the component.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE"] = 3540] = "ER_COMPONENTS_UNLOAD_CANT_UNREGISTER_SERVICE";
    /**
     * Message: Cannot unload component from specified URN: '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_CANT_UNLOAD"] = 3541] = "ER_COMPONENTS_CANT_UNLOAD";
    /**
     * Message: The Persistent Dynamic Loader was used to unload a component '%s', but it was not used to load that component before.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_UNLOAD_THE_NOT_PERSISTED"] = 3542] = "ER_WARN_UNLOAD_THE_NOT_PERSISTED";
    /**
     * Message: The mysql.component table is missing or has an incorrect definition.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENT_TABLE_INCORRECT"] = 3543] = "ER_COMPONENT_TABLE_INCORRECT";
    /**
     * Message: Failed to manipulate component '%s' persistence data. Error code %d from storage engine.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENT_MANIPULATE_ROW_FAILED"] = 3544] = "ER_COMPONENT_MANIPULATE_ROW_FAILED";
    /**
     * Message: The component with specified URN: '%s' was specified in group more than once.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP"] = 3545] = "ER_COMPONENTS_UNLOAD_DUPLICATE_IN_GROUP";
    /**
     * Message: @@GLOBAL.GTID_PURGED cannot be changed: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS"] = 3546] = "ER_CANT_SET_GTID_PURGED_DUE_SETS_CONSTRAINTS";
    /**
     * Message: Can not lock user management caches for processing.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES"] = 3547] = "ER_CANNOT_LOCK_USER_MANAGEMENT_CACHES";
    /**
     * Message: There's no spatial reference system with SRID %u.
     * SQLState: SR001
     */
    MysqlServerError[MysqlServerError["ER_SRS_NOT_FOUND"] = 3548] = "ER_SRS_NOT_FOUND";
    /**
     * Message: Variables cannot be persisted. Please retry.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VARIABLE_NOT_PERSISTED"] = 3549] = "ER_VARIABLE_NOT_PERSISTED";
    /**
     * Message: Information schema queries do not support the '%s' clause.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IS_QUERY_INVALID_CLAUSE"] = 3550] = "ER_IS_QUERY_INVALID_CLAUSE";
    /**
     * Message: Unable to store dynamic %s statistics into data dictionary.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_STORE_STATISTICS"] = 3551] = "ER_UNABLE_TO_STORE_STATISTICS";
    /**
     * Message: Access to system schema '%s' is rejected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_SCHEMA_ACCESS"] = 3552] = "ER_NO_SYSTEM_SCHEMA_ACCESS";
    /**
     * Message: Access to system tablespace '%s' is rejected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_TABLESPACE_ACCESS"] = 3553] = "ER_NO_SYSTEM_TABLESPACE_ACCESS";
    /**
     * Message: Access to %s '%s.%s' is rejected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_TABLE_ACCESS"] = 3554] = "ER_NO_SYSTEM_TABLE_ACCESS";
    /**
     * Message: data dictionary table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE"] = 3555] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_DICTIONARY_TABLE";
    /**
     * Message: system table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE"] = 3556] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_SYSTEM_TABLE";
    /**
     * Message: table
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE"] = 3557] = "ER_NO_SYSTEM_TABLE_ACCESS_FOR_TABLE";
    /**
     * Message: Invalid option key '%s' in function %s.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_KEY"] = 3558] = "ER_INVALID_OPTION_KEY";
    /**
     * Message: Invalid value '%s' for option '%s' in function '%s'.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_VALUE"] = 3559] = "ER_INVALID_OPTION_VALUE";
    /**
     * Message: The string '%s' is not a valid key %c value pair in function %s.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_KEY_VALUE_PAIR"] = 3560] = "ER_INVALID_OPTION_KEY_VALUE_PAIR";
    /**
     * Message: The options argument in function %s starts with the invalid character '%c'.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_START_CHARACTER"] = 3561] = "ER_INVALID_OPTION_START_CHARACTER";
    /**
     * Message: The options argument in function %s ends with the invalid character '%c'.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_END_CHARACTER"] = 3562] = "ER_INVALID_OPTION_END_CHARACTER";
    /**
     * Message: The options argument in function %s contains the invalid character sequence '%s'.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_INVALID_OPTION_CHARACTERS"] = 3563] = "ER_INVALID_OPTION_CHARACTERS";
    /**
     * Message: Duplicate option key '%s' in funtion '%s'.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_DUPLICATE_OPTION_KEY"] = 3564] = "ER_DUPLICATE_OPTION_KEY";
    /**
     * Message: There's no spatial reference system with SRID %u. The axis order is unknown.
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_WARN_SRS_NOT_FOUND_AXIS_ORDER"] = 3565] = "ER_WARN_SRS_NOT_FOUND_AXIS_ORDER";
    /**
     * Message: Access to native function '%s' is rejected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_ACCESS_TO_NATIVE_FCT"] = 3566] = "ER_NO_ACCESS_TO_NATIVE_FCT";
    /**
     * Message: The requested value '%llu' for the next binary log index is out of range. Please use a value between '1' and '%lu'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESET_MASTER_TO_VALUE_OUT_OF_RANGE"] = 3567] = "ER_RESET_MASTER_TO_VALUE_OUT_OF_RANGE";
    /**
     * Message: Unresolved table name %s in locking clause.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNRESOLVED_TABLE_LOCK"] = 3568] = "ER_UNRESOLVED_TABLE_LOCK";
    /**
     * Message: Table %s appears in multiple locking clauses.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DUPLICATE_TABLE_LOCK"] = 3569] = "ER_DUPLICATE_TABLE_LOCK";
    /**
     * Message: Statement is unsafe because it uses SKIP LOCKED. The set of inserted values is non-deterministic.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_SKIP_LOCKED"] = 3570] = "ER_BINLOG_UNSAFE_SKIP_LOCKED";
    /**
     * Message: Statement is unsafe because it uses NOWAIT. Whether the command will succeed or fail is not deterministic.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_UNSAFE_NOWAIT"] = 3571] = "ER_BINLOG_UNSAFE_NOWAIT";
    /**
     * Message: Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_LOCK_NOWAIT"] = 3572] = "ER_LOCK_NOWAIT";
    /**
     * Message: Recursive Common Table Expression '%s' should contain a UNION
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_RECURSIVE_REQUIRES_UNION"] = 3573] = "ER_CTE_RECURSIVE_REQUIRES_UNION";
    /**
     * Message: Recursive Common Table Expression '%s' should have one or more non-recursive query blocks followed by one or more recursive ones
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST"] = 3574] = "ER_CTE_RECURSIVE_REQUIRES_NONRECURSIVE_FIRST";
    /**
     * Message: Recursive Common Table Expression '%s' can contain neither aggregation nor window functions in recursive query block
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_RECURSIVE_FORBIDS_AGGREGATION"] = 3575] = "ER_CTE_RECURSIVE_FORBIDS_AGGREGATION";
    /**
     * Message: In recursive query block of Recursive Common Table Expression '%s', the recursive table must neither be in the right argument of a LEFT JOIN, nor be forced to be non-first with join order hints
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER"] = 3576] = "ER_CTE_RECURSIVE_FORBIDDEN_JOIN_ORDER";
    /**
     * Message: In recursive query block of Recursive Common Table Expression '%s', the recursive table must be referenced only once, and not in any subquery
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE"] = 3577] = "ER_CTE_RECURSIVE_REQUIRES_SINGLE_REFERENCE";
    /**
     * Message: '%s' requires @@internal_tmp_disk_storage_engine=InnoDB
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SWITCH_TMP_ENGINE"] = 3578] = "ER_SWITCH_TMP_ENGINE";
    /**
     * Message: Window name '%s' is not defined.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_SUCH_WINDOW"] = 3579] = "ER_WINDOW_NO_SUCH_WINDOW";
    /**
     * Message: There is a circularity in the window dependency graph.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH"] = 3580] = "ER_WINDOW_CIRCULARITY_IN_WINDOW_GRAPH";
    /**
     * Message: A window which depends on another cannot define partitioning.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_CHILD_PARTITIONING"] = 3581] = "ER_WINDOW_NO_CHILD_PARTITIONING";
    /**
     * Message: Window '%s' has a frame definition, so cannot be referenced by another window.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_INHERIT_FRAME"] = 3582] = "ER_WINDOW_NO_INHERIT_FRAME";
    /**
     * Message: Window '%s' cannot inherit '%s' since both contain an ORDER BY clause.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_REDEFINE_ORDER_BY"] = 3583] = "ER_WINDOW_NO_REDEFINE_ORDER_BY";
    /**
     * Message: Window '%s': frame start cannot be UNBOUNDED FOLLOWING.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_FRAME_START_ILLEGAL"] = 3584] = "ER_WINDOW_FRAME_START_ILLEGAL";
    /**
     * Message: Window '%s': frame end cannot be UNBOUNDED PRECEDING.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_FRAME_END_ILLEGAL"] = 3585] = "ER_WINDOW_FRAME_END_ILLEGAL";
    /**
     * Message: Window '%s': frame start or end is negative, NULL or of non-integral type
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_FRAME_ILLEGAL"] = 3586] = "ER_WINDOW_FRAME_ILLEGAL";
    /**
     * Message: Window '%s' with RANGE N PRECEDING/FOLLOWING frame requires exactly one ORDER BY expression, of numeric or temporal type
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_RANGE_FRAME_ORDER_TYPE"] = 3587] = "ER_WINDOW_RANGE_FRAME_ORDER_TYPE";
    /**
     * Message: Window '%s' with RANGE frame has ORDER BY expression of datetime type. Only INTERVAL bound value allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE"] = 3588] = "ER_WINDOW_RANGE_FRAME_TEMPORAL_TYPE";
    /**
     * Message: Window '%s' with RANGE frame has ORDER BY expression of numeric type, INTERVAL bound value not allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE"] = 3589] = "ER_WINDOW_RANGE_FRAME_NUMERIC_TYPE";
    /**
     * Message: Window '%s' has a non-constant frame bound.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_RANGE_BOUND_NOT_CONSTANT"] = 3590] = "ER_WINDOW_RANGE_BOUND_NOT_CONSTANT";
    /**
     * Message: Window '%s' is defined twice.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_DUPLICATE_NAME"] = 3591] = "ER_WINDOW_DUPLICATE_NAME";
    /**
     * Message: Window '%s': ORDER BY or PARTITION BY uses legacy position indication which is not supported, use expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_ILLEGAL_ORDER_BY"] = 3592] = "ER_WINDOW_ILLEGAL_ORDER_BY";
    /**
     * Message: You cannot use the window function '%s' in this context.'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_INVALID_WINDOW_FUNC_USE"] = 3593] = "ER_WINDOW_INVALID_WINDOW_FUNC_USE";
    /**
     * Message: You cannot use the alias '%s' of an expression containing a window function in this context.'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE"] = 3594] = "ER_WINDOW_INVALID_WINDOW_FUNC_ALIAS_USE";
    /**
     * Message: You cannot nest a window function in the specification of window '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC"] = 3595] = "ER_WINDOW_NESTED_WINDOW_FUNC_USE_IN_WINDOW_SPEC";
    /**
     * Message: Window '%s': INTERVAL can only be used with RANGE frames.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_ROWS_INTERVAL_USE"] = 3596] = "ER_WINDOW_ROWS_INTERVAL_USE";
    /**
     * Message: ASC or DESC with GROUP BY isn't allowed with window functions; put ASC or DESC in ORDER BY
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_GROUP_ORDER"] = 3597] = "ER_WINDOW_NO_GROUP_ORDER";
    /**
     * Message: ASC or DESC with GROUP BY isn't allowed with window functions; put ASC or DESC in ORDER BY
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_NO_GROUP_ORDER_UNUSED"] = 3597] = "ER_WINDOW_NO_GROUP_ORDER_UNUSED";
    /**
     * Message: To get information about window functions use EXPLAIN FORMAT=JSON
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_EXPLAIN_JSON"] = 3598] = "ER_WINDOW_EXPLAIN_JSON";
    /**
     * Message: Window function '%s' ignores the frame clause of window '%s' and aggregates over the whole partition
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_FUNCTION_IGNORES_FRAME"] = 3599] = "ER_WINDOW_FUNCTION_IGNORES_FRAME";
    /**
     * Message: Windowing requires @@internal_tmp_mem_storage_engine=TempTable.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WINDOW_SE_NOT_ACCEPTABLE"] = 3600] = "ER_WINDOW_SE_NOT_ACCEPTABLE";
    /**
     * Message: Windowing requires @@internal_tmp_mem_storage_engine=TempTable.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WL9236_NOW_UNUSED"] = 3600] = "ER_WL9236_NOW_UNUSED";
    /**
     * Message: Too many arguments for function %s: %lu; maximum allowed is %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_NO_OF_ARGS"] = 3601] = "ER_INVALID_NO_OF_ARGS";
    /**
     * Message: Argument #%u of GROUPING function is not in GROUP BY
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FIELD_IN_GROUPING_NOT_GROUP_BY"] = 3602] = "ER_FIELD_IN_GROUPING_NOT_GROUP_BY";
    /**
     * Message: Comment for tablespace '%s' is too long (max = %lu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_LONG_TABLESPACE_COMMENT"] = 3603] = "ER_TOO_LONG_TABLESPACE_COMMENT";
    /**
     * Message: Storage engine can't drop table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ENGINE_CANT_DROP_TABLE"] = 3604] = "ER_ENGINE_CANT_DROP_TABLE";
    /**
     * Message: Storage engine can't drop table '%s' because it is missing. Use DROP TABLE IF EXISTS to remove it from data-dictionary.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ENGINE_CANT_DROP_MISSING_TABLE"] = 3605] = "ER_ENGINE_CANT_DROP_MISSING_TABLE";
    /**
     * Message: Duplicate file name for tablespace '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_DUP_FILENAME"] = 3606] = "ER_TABLESPACE_DUP_FILENAME";
    /**
     * Message: Problem while dropping database. Can't remove database directory (%s). Please remove it manually.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DB_DROP_RMDIR2"] = 3607] = "ER_DB_DROP_RMDIR2";
    /**
     * Message: No SDI files matched the pattern '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_NO_FILES_MATCHED"] = 3608] = "ER_IMP_NO_FILES_MATCHED";
    /**
     * Message: Schema '%s', referenced in SDI, does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_SCHEMA_DOES_NOT_EXIST"] = 3609] = "ER_IMP_SCHEMA_DOES_NOT_EXIST";
    /**
     * Message: Table '%s.%s', referenced in SDI, already exists.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_TABLE_ALREADY_EXISTS"] = 3610] = "ER_IMP_TABLE_ALREADY_EXISTS";
    /**
     * Message: Imported mysqld_version (%llu) is not compatible with current (%llu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_INCOMPATIBLE_MYSQLD_VERSION"] = 3611] = "ER_IMP_INCOMPATIBLE_MYSQLD_VERSION";
    /**
     * Message: Imported dd version (%u) is not compatible with current (%u)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_INCOMPATIBLE_DD_VERSION"] = 3612] = "ER_IMP_INCOMPATIBLE_DD_VERSION";
    /**
     * Message: Imported sdi version (%llu) is not compatible with current (%llu)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_INCOMPATIBLE_SDI_VERSION"] = 3613] = "ER_IMP_INCOMPATIBLE_SDI_VERSION";
    /**
     * Message: Invalid number of arguments for hint %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_INVALID_HINT"] = 3614] = "ER_WARN_INVALID_HINT";
    /**
     * Message: Variable %s does not exist in persisted config file
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_VAR_DOES_NOT_EXIST"] = 3615] = "ER_VAR_DOES_NOT_EXIST";
    /**
     * Message: Longitude %f is out of range in function %s. It must be within (%f, %f].
     * SQLState: 22S02
     */
    MysqlServerError[MysqlServerError["ER_LONGITUDE_OUT_OF_RANGE"] = 3616] = "ER_LONGITUDE_OUT_OF_RANGE";
    /**
     * Message: Latitude %f is out of range in function %s. It must be within [%f, %f].
     * SQLState: 22S03
     */
    MysqlServerError[MysqlServerError["ER_LATITUDE_OUT_OF_RANGE"] = 3617] = "ER_LATITUDE_OUT_OF_RANGE";
    /**
     * Message: %s(%s) has not been implemented for geographic spatial reference systems.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS"] = 3618] = "ER_NOT_IMPLEMENTED_FOR_GEOGRAPHIC_SRS";
    /**
     * Message: Illegal privilege level specified for %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ILLEGAL_PRIVILEGE_LEVEL"] = 3619] = "ER_ILLEGAL_PRIVILEGE_LEVEL";
    /**
     * Message: Access to system view INFORMATION_SCHEMA.'%s' is rejected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SYSTEM_VIEW_ACCESS"] = 3620] = "ER_NO_SYSTEM_VIEW_ACCESS";
    /**
     * Message: The log-filter component "%s" got confused at "%s" ...
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENT_FILTER_FLABBERGASTED"] = 3621] = "ER_COMPONENT_FILTER_FLABBERGASTED";
    /**
     * Message: Partitioning expression is too long.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PART_EXPR_TOO_LONG"] = 3622] = "ER_PART_EXPR_TOO_LONG";
    /**
     * Message: DROP FUNCTION can't drop a dynamically registered user defined function
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UDF_DROP_DYNAMICALLY_REGISTERED"] = 3623] = "ER_UDF_DROP_DYNAMICALLY_REGISTERED";
    /**
     * Message: Unable to store column statistics for column '%s' in table '%s'.'%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_STORE_COLUMN_STATISTICS"] = 3624] = "ER_UNABLE_TO_STORE_COLUMN_STATISTICS";
    /**
     * Message: Unable to update column statistics for column '%s' in table '%s'.'%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS"] = 3625] = "ER_UNABLE_TO_UPDATE_COLUMN_STATISTICS";
    /**
     * Message: Unable to remove column statistics for column '%s' in table '%s'.'%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_DROP_COLUMN_STATISTICS"] = 3626] = "ER_UNABLE_TO_DROP_COLUMN_STATISTICS";
    /**
     * Message: Unable to build histogram statistics for column '%s' in table '%s'.'%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_BUILD_HISTOGRAM"] = 3627] = "ER_UNABLE_TO_BUILD_HISTOGRAM";
    /**
     * Message: The role %s is a mandatory role and can't be revoked or dropped. The restriction can be lifted by excluding the role identifier from the global variable mandatory_roles.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MANDATORY_ROLE"] = 3628] = "ER_MANDATORY_ROLE";
    /**
     * Message: Tablespace '%s' does not have a file named '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISSING_TABLESPACE_FILE"] = 3629] = "ER_MISSING_TABLESPACE_FILE";
    /**
     * Message: Access denied; you need %s privileges for this operation
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_PERSIST_ONLY_ACCESS_DENIED_ERROR"] = 3630] = "ER_PERSIST_ONLY_ACCESS_DENIED_ERROR";
    /**
     * Message: You need the SUPER privilege for command '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CMD_NEED_SUPER"] = 3631] = "ER_CMD_NEED_SUPER";
    /**
     * Message: Path is within the current data directory '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PATH_IN_DATADIR"] = 3632] = "ER_PATH_IN_DATADIR";
    /**
     * Message: Concurrent DDL is performed during the operation. Please try again.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DDL_IN_PROGRESS"] = 3633] = "ER_DDL_IN_PROGRESS";
    /**
     * Message: Concurrent DDL is performed during clone operation. Please try again.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_DDL_IN_PROGRESS"] = 3633] = "ER_CLONE_DDL_IN_PROGRESS";
    /**
     * Message: Too many concurrent clone operations. Maximum allowed - %d.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TOO_MANY_CONCURRENT_CLONES"] = 3634] = "ER_TOO_MANY_CONCURRENT_CLONES";
    /**
     * Message: Too many concurrent clone operations. Maximum allowed - %d.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_TOO_MANY_CONCURRENT_CLONES"] = 3634] = "ER_CLONE_TOO_MANY_CONCURRENT_CLONES";
    /**
     * Message: The table in transaction %s does not comply with the requirements by an external plugin.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_APPLIER_LOG_EVENT_VALIDATION_ERROR"] = 3635] = "ER_APPLIER_LOG_EVENT_VALIDATION_ERROR";
    /**
     * Message: Recursive query aborted after %u iterations. Try increasing @@cte_max_recursion_depth to a larger value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CTE_MAX_RECURSION_DEPTH"] = 3636] = "ER_CTE_MAX_RECURSION_DEPTH";
    /**
     * Message: Variable %s cannot be set using SET_VAR hint.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NOT_HINT_UPDATABLE_VARIABLE"] = 3637] = "ER_NOT_HINT_UPDATABLE_VARIABLE";
    /**
     * Message: Cannot use these credentials for '%.*s@%.*s' because they contradict the password history policy
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CREDENTIALS_CONTRADICT_TO_HISTORY"] = 3638] = "ER_CREDENTIALS_CONTRADICT_TO_HISTORY";
    /**
     * Message: Non-zero password history clauses ignored for user '%s'@'%s' as its authentication plugin %s does not support password history
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID"] = 3639] = "ER_WARNING_PASSWORD_HISTORY_CLAUSES_VOID";
    /**
     * Message: The client doesn't support %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_DOES_NOT_SUPPORT"] = 3640] = "ER_CLIENT_DOES_NOT_SUPPORT";
    /**
     * Message: Tablespace '%s' was skipped since its definition is being modified by concurrent DDL statement
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_I_S_SKIPPED_TABLESPACE"] = 3641] = "ER_I_S_SKIPPED_TABLESPACE";
    /**
     * Message: Engine '%s' does not match stored engine '%s' for tablespace '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_ENGINE_MISMATCH"] = 3642] = "ER_TABLESPACE_ENGINE_MISMATCH";
    /**
     * Message: The SRID of the geometry does not match the SRID of the column '%s'. The SRID of the geometry is %lu, but the SRID of the column is %lu. Consider changing the SRID of the geometry or the SRID property of the column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_SRID_FOR_COLUMN"] = 3643] = "ER_WRONG_SRID_FOR_COLUMN";
    /**
     * Message: The SRID specification on the column '%s' cannot be changed because there is a spatial index on the column. Please remove the spatial index before altering the SRID specification.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_ALTER_SRID_DUE_TO_INDEX"] = 3644] = "ER_CANNOT_ALTER_SRID_DUE_TO_INDEX";
    /**
     * Message: When %s, the option binlog_row_value_options=%s will be ignored and updates will be written in full format to binary log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED"] = 3645] = "ER_WARN_BINLOG_PARTIAL_UPDATES_DISABLED";
    /**
     * Message: When %s, the option log_bin_use_v1_row_events=1 will be ignored and row events will be written in new format to binary log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED"] = 3646] = "ER_WARN_BINLOG_V1_ROW_EVENTS_DISABLED";
    /**
     * Message: When %s, the option binlog_row_value_options=%s will be used only for the after-image. Full values will be written in the before-image, so the saving in disk space due to binlog_row_value_options is limited to less than 50%%.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES"] = 3647] = "ER_WARN_BINLOG_PARTIAL_UPDATES_SUGGESTS_PARTIAL_IMAGES";
    /**
     * Message: Could not apply JSON diff in table %.*s, column %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COULD_NOT_APPLY_JSON_DIFF"] = 3648] = "ER_COULD_NOT_APPLY_JSON_DIFF";
    /**
     * Message: Corrupted JSON diff for table %.*s, column %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CORRUPTED_JSON_DIFF"] = 3649] = "ER_CORRUPTED_JSON_DIFF";
    /**
     * Message: Resource Group '%s' exists
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESOURCE_GROUP_EXISTS"] = 3650] = "ER_RESOURCE_GROUP_EXISTS";
    /**
     * Message: Resource Group '%s' does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESOURCE_GROUP_NOT_EXISTS"] = 3651] = "ER_RESOURCE_GROUP_NOT_EXISTS";
    /**
     * Message: Invalid cpu id %u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_VCPU_ID"] = 3652] = "ER_INVALID_VCPU_ID";
    /**
     * Message: Invalid VCPU range %u-%u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_VCPU_RANGE"] = 3653] = "ER_INVALID_VCPU_RANGE";
    /**
     * Message: Invalid thread priority value %d for %s resource group %s. Allowed range is [%d, %d].
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_THREAD_PRIORITY"] = 3654] = "ER_INVALID_THREAD_PRIORITY";
    /**
     * Message: %s operation is disallowed on %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISALLOWED_OPERATION"] = 3655] = "ER_DISALLOWED_OPERATION";
    /**
     * Message: Resource group %s is busy.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESOURCE_GROUP_BUSY"] = 3656] = "ER_RESOURCE_GROUP_BUSY";
    /**
     * Message: Resource group %s is disabled.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESOURCE_GROUP_DISABLED"] = 3657] = "ER_RESOURCE_GROUP_DISABLED";
    /**
     * Message: Feature %s is unsupported (%s).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FEATURE_UNSUPPORTED"] = 3658] = "ER_FEATURE_UNSUPPORTED";
    /**
     * Message: Attribute %s is ignored (%s).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ATTRIBUTE_IGNORED"] = 3659] = "ER_ATTRIBUTE_IGNORED";
    /**
     * Message: Invalid thread id (%llu).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_THREAD_ID"] = 3660] = "ER_INVALID_THREAD_ID";
    /**
     * Message: Unable to bind resource group %s with thread id (%llu).(%s).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESOURCE_GROUP_BIND_FAILED"] = 3661] = "ER_RESOURCE_GROUP_BIND_FAILED";
    /**
     * Message: Option FORCE invalid as DISABLE option is not specified.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_USE_OF_FORCE_OPTION"] = 3662] = "ER_INVALID_USE_OF_FORCE_OPTION";
    /**
     * Message: The %s command encountered a failure. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_COMMAND_FAILURE"] = 3663] = "ER_GROUP_REPLICATION_COMMAND_FAILURE";
    /**
     * Message: Failed to %s SDI '%s.%s' in tablespace '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SDI_OPERATION_FAILED"] = 3664] = "ER_SDI_OPERATION_FAILED";
    /**
     * Message: Missing value for JSON_TABLE column '%s'
     * SQLState: 22035
     */
    MysqlServerError[MysqlServerError["ER_MISSING_JSON_TABLE_VALUE"] = 3665] = "ER_MISSING_JSON_TABLE_VALUE";
    /**
     * Message: Can't store an array or an object in the scalar JSON_TABLE column '%s'
     * SQLState: 2203F
     */
    MysqlServerError[MysqlServerError["ER_WRONG_JSON_TABLE_VALUE"] = 3666] = "ER_WRONG_JSON_TABLE_VALUE";
    /**
     * Message: Every table function must have an alias
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_TF_MUST_HAVE_ALIAS"] = 3667] = "ER_TF_MUST_HAVE_ALIAS";
    /**
     * Message: INNER or LEFT JOIN must be used for LATERAL references made by '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TF_FORBIDDEN_JOIN_TYPE"] = 3668] = "ER_TF_FORBIDDEN_JOIN_TYPE";
    /**
     * Message: Value is out of range for JSON_TABLE's column '%s'
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_JT_VALUE_OUT_OF_RANGE"] = 3669] = "ER_JT_VALUE_OUT_OF_RANGE";
    /**
     * Message: More than supported %u NESTED PATHs were found in JSON_TABLE '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_JT_MAX_NESTED_PATH"] = 3670] = "ER_JT_MAX_NESTED_PATH";
    /**
     * Message: The selected authentication method %.*s does not support password expiration
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD"] = 3671] = "ER_PASSWORD_EXPIRATION_NOT_SUPPORTED_BY_AUTH_METHOD";
    /**
     * Message: Invalid GeoJSON data provided to function %s: Member 'crs' must be specified in the top level object.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL"] = 3672] = "ER_INVALID_GEOJSON_CRS_NOT_TOP_LEVEL";
    /**
     * Message: Column '%s' cannot be null
     * SQLState: 23000
     */
    MysqlServerError[MysqlServerError["ER_BAD_NULL_ERROR_NOT_IGNORED"] = 3673] = "ER_BAD_NULL_ERROR_NOT_IGNORED";
    /**
     * Message: The spatial index on column '%s' will not be used by the query optimizer since the column does not have an SRID attribute. Consider adding an SRID attribute to the column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_USELESS_SPATIAL_INDEX"] = 3674] = "WARN_USELESS_SPATIAL_INDEX";
    /**
     * Message: Create table/tablespace '%s' failed, as disk is full
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISK_FULL_NOWAIT"] = 3675] = "ER_DISK_FULL_NOWAIT";
    /**
     * Message: Could not parse argument to digest function: "%s".
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARSE_ERROR_IN_DIGEST_FN"] = 3676] = "ER_PARSE_ERROR_IN_DIGEST_FN";
    /**
     * Message: Could not parse argument to digest function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN"] = 3677] = "ER_UNDISCLOSED_PARSE_ERROR_IN_DIGEST_FN";
    /**
     * Message: Schema directory '%s' already exists. This must be resolved manually (e.g. by moving the schema directory to another location).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SCHEMA_DIR_EXISTS"] = 3678] = "ER_SCHEMA_DIR_EXISTS";
    /**
     * Message: Schema directory '%s' does not exist
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SCHEMA_DIR_MISSING"] = 3679] = "ER_SCHEMA_DIR_MISSING";
    /**
     * Message: Failed to create schema directory '%s' (errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SCHEMA_DIR_CREATE_FAILED"] = 3680] = "ER_SCHEMA_DIR_CREATE_FAILED";
    /**
     * Message: Schema '%s' does not exist, but schema directory '%s' was found. This must be resolved manually (e.g. by moving the schema directory to another location).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SCHEMA_DIR_UNKNOWN"] = 3681] = "ER_SCHEMA_DIR_UNKNOWN";
    /**
     * Message: Function %s is only defined for SRID 0 and SRID 4326.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326"] = 3682] = "ER_ONLY_IMPLEMENTED_FOR_SRID_0_AND_4326";
    /**
     * Message: The option expire_logs_days and binlog_expire_logs_seconds cannot be used together. Please use binlog_expire_logs_seconds to set the expire time (expire_logs_days is deprecated)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER"] = 3683] = "ER_BINLOG_EXPIRE_LOG_DAYS_AND_SECS_USED_TOGETHER";
    /**
     * Message: An output string could not be zero-terminated because the length exceeds the buffer capacity.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_STRING_NOT_TERMINATED"] = 3684] = "ER_REGEXP_STRING_NOT_TERMINATED";
    /**
     * Message: The result string is larger than the result buffer.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_BUFFER_OVERFLOW"] = 3684] = "ER_REGEXP_BUFFER_OVERFLOW";
    /**
     * Message: Illegal argument to a regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_ILLEGAL_ARGUMENT"] = 3685] = "ER_REGEXP_ILLEGAL_ARGUMENT";
    /**
     * Message: Index out of bounds in regular expression search.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR"] = 3686] = "ER_REGEXP_INDEX_OUTOFBOUNDS_ERROR";
    /**
     * Message: Internal error in the regular expression library.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INTERNAL_ERROR"] = 3687] = "ER_REGEXP_INTERNAL_ERROR";
    /**
     * Message: Syntax error in regular expression on line %u, character %u.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_RULE_SYNTAX"] = 3688] = "ER_REGEXP_RULE_SYNTAX";
    /**
     * Message: Unrecognized escape sequence in regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_BAD_ESCAPE_SEQUENCE"] = 3689] = "ER_REGEXP_BAD_ESCAPE_SEQUENCE";
    /**
     * Message: The regular expression contains a feature that is not implemented in this library version.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_UNIMPLEMENTED"] = 3690] = "ER_REGEXP_UNIMPLEMENTED";
    /**
     * Message: Mismatched parenthesis in regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_MISMATCHED_PAREN"] = 3691] = "ER_REGEXP_MISMATCHED_PAREN";
    /**
     * Message: Incorrect description of a {min,max} interval.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_BAD_INTERVAL"] = 3692] = "ER_REGEXP_BAD_INTERVAL";
    /**
     * Message: The maximum is less than the minumum in a {min,max} interval.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_MAX_LT_MIN"] = 3693] = "ER_REGEXP_MAX_LT_MIN";
    /**
     * Message: Invalid back-reference in regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INVALID_BACK_REF"] = 3694] = "ER_REGEXP_INVALID_BACK_REF";
    /**
     * Message: The look-behind assertion exceeds the limit in regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_LOOK_BEHIND_LIMIT"] = 3695] = "ER_REGEXP_LOOK_BEHIND_LIMIT";
    /**
     * Message: The regular expression contains an unclosed bracket expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_MISSING_CLOSE_BRACKET"] = 3696] = "ER_REGEXP_MISSING_CLOSE_BRACKET";
    /**
     * Message: The regular expression contains an [x-y] character range where x comes after y.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INVALID_RANGE"] = 3697] = "ER_REGEXP_INVALID_RANGE";
    /**
     * Message: Overflow in the regular expression backtrack stack.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_STACK_OVERFLOW"] = 3698] = "ER_REGEXP_STACK_OVERFLOW";
    /**
     * Message: Timeout exceeded in regular expression match.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_TIME_OUT"] = 3699] = "ER_REGEXP_TIME_OUT";
    /**
     * Message: The regular expression pattern exceeds limits on size or complexity.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_PATTERN_TOO_BIG"] = 3700] = "ER_REGEXP_PATTERN_TOO_BIG";
    /**
     * Message: Value for %s got confusing at or around "%s". Syntax may be wrong, component may not be INSTALLed, or a component that does not support instances may be listed more than once.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_ERROR_LOG_SERVICE"] = 3701] = "ER_CANT_SET_ERROR_LOG_SERVICE";
    /**
     * Message: Setting an empty %s pipeline disables error logging!
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE"] = 3702] = "ER_EMPTY_PIPELINE_FOR_ERROR_LOG_SERVICE";
    /**
     * Message: filter %s: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COMPONENT_FILTER_DIAGNOSTICS"] = 3703] = "ER_COMPONENT_FILTER_DIAGNOSTICS";
    /**
     * Message: ignore-builtin-innodb is ignored and will be removed in future releases.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_CANNOT_BE_IGNORED"] = 3704] = "ER_INNODB_CANNOT_BE_IGNORED";
    /**
     * Message: %s(%s) has not been implemented for Cartesian spatial reference systems.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS"] = 3704] = "ER_NOT_IMPLEMENTED_FOR_CARTESIAN_SRS";
    /**
     * Message: %s(%s) has not been implemented for projected spatial reference systems.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS"] = 3705] = "ER_NOT_IMPLEMENTED_FOR_PROJECTED_SRS";
    /**
     * Message: Invalid radius provided to function %s: Radius must be greater than zero.
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_NONPOSITIVE_RADIUS"] = 3706] = "ER_NONPOSITIVE_RADIUS";
    /**
     * Message: Restart server failed (%s).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESTART_SERVER_FAILED"] = 3707] = "ER_RESTART_SERVER_FAILED";
    /**
     * Message: Missing mandatory attribute %s.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_MISSING_MANDATORY_ATTRIBUTE"] = 3708] = "ER_SRS_MISSING_MANDATORY_ATTRIBUTE";
    /**
     * Message: Multiple definitions of attribute %s.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS"] = 3709] = "ER_SRS_MULTIPLE_ATTRIBUTE_DEFINITIONS";
    /**
     * Message: The spatial reference system name can't be an empty string or start or end with whitespace.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE"] = 3710] = "ER_SRS_NAME_CANT_BE_EMPTY_OR_WHITESPACE";
    /**
     * Message: The organization name can't be an empty string or start or end with whitespace.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE"] = 3711] = "ER_SRS_ORGANIZATION_CANT_BE_EMPTY_OR_WHITESPACE";
    /**
     * Message: There is already a spatial reference system with SRID %u.
     * SQLState: SR004
     */
    MysqlServerError[MysqlServerError["ER_SRS_ID_ALREADY_EXISTS"] = 3712] = "ER_SRS_ID_ALREADY_EXISTS";
    /**
     * Message: There is already a spatial reference system with SRID %u.
     * SQLState: 01S00
     */
    MysqlServerError[MysqlServerError["ER_WARN_SRS_ID_ALREADY_EXISTS"] = 3713] = "ER_WARN_SRS_ID_ALREADY_EXISTS";
    /**
     * Message: SRID 0 is not modifiable.
     * SQLState: SR000
     */
    MysqlServerError[MysqlServerError["ER_CANT_MODIFY_SRID_0"] = 3714] = "ER_CANT_MODIFY_SRID_0";
    /**
     * Message: The SRID range [%u, %u] has been reserved for system use. SRSs in this range may be added, modified or removed without warning during upgrade.
     * SQLState: 01S01
     */
    MysqlServerError[MysqlServerError["ER_WARN_RESERVED_SRID_RANGE"] = 3715] = "ER_WARN_RESERVED_SRID_RANGE";
    /**
     * Message: Can't modify SRID %u. There is at least one column depending on it.
     * SQLState: SR005
     */
    MysqlServerError[MysqlServerError["ER_CANT_MODIFY_SRS_USED_BY_COLUMN"] = 3716] = "ER_CANT_MODIFY_SRS_USED_BY_COLUMN";
    /**
     * Message: Invalid character in attribute %s.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE"] = 3717] = "ER_SRS_INVALID_CHARACTER_IN_ATTRIBUTE";
    /**
     * Message: Attribute %s is too long. The maximum length is %u characters.
     * SQLState: SR006
     */
    MysqlServerError[MysqlServerError["ER_SRS_ATTRIBUTE_STRING_TOO_LONG"] = 3718] = "ER_SRS_ATTRIBUTE_STRING_TOO_LONG";
    /**
     * Message: 'utf8' is currently an alias for the character set UTF8MB3, but will be an alias for UTF8MB4 in a future release. Please consider using UTF8MB4 in order to be unambiguous.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPRECATED_UTF8_ALIAS"] = 3719] = "ER_DEPRECATED_UTF8_ALIAS";
    /**
     * Message: NATIONAL/NCHAR/NVARCHAR implies the character set UTF8MB3, which will be replaced by UTF8MB4 in a future release. Please consider using CHAR(x) CHARACTER SET UTF8MB4 in order to be unambiguous.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPRECATED_NATIONAL"] = 3720] = "ER_DEPRECATED_NATIONAL";
    /**
     * Message: Invalid default collation %s: utf8mb4_0900_ai_ci or utf8mb4_general_ci expected
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_DEFAULT_UTF8MB4_COLLATION"] = 3721] = "ER_INVALID_DEFAULT_UTF8MB4_COLLATION";
    /**
     * Message: Unable to collect information for column '%s': %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_COLLECT_LOG_STATUS"] = 3722] = "ER_UNABLE_TO_COLLECT_LOG_STATUS";
    /**
     * Message: The table '%s' may not be created in the reserved tablespace '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RESERVED_TABLESPACE_NAME"] = 3723] = "ER_RESERVED_TABLESPACE_NAME";
    /**
     * Message: This option cannot be set %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNABLE_TO_SET_OPTION"] = 3724] = "ER_UNABLE_TO_SET_OPTION";
    /**
     * Message: A commit for an atomic DDL statement was unsuccessful on the master and the slave. The slave supports atomic DDL statements but the master does not, so the action taken by the slave and master might differ. Check that their states have not diverged before proceeding.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLAVE_POSSIBLY_DIVERGED_AFTER_DDL"] = 3725] = "ER_SLAVE_POSSIBLY_DIVERGED_AFTER_DDL";
    /**
     * Message: Function %s is only defined for geographic spatial reference systems, but one of its arguments is in SRID %u, which is not geographic.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_SRS_NOT_GEOGRAPHIC"] = 3726] = "ER_SRS_NOT_GEOGRAPHIC";
    /**
     * Message: Function %s encountered a polygon that was too large. Polygons must cover less than half the planet.
     * SQLState: 22023
     */
    MysqlServerError[MysqlServerError["ER_POLYGON_TOO_LARGE"] = 3727] = "ER_POLYGON_TOO_LARGE";
    /**
     * Message: Spatial indexes can't be primary or unique indexes.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SPATIAL_UNIQUE_INDEX"] = 3728] = "ER_SPATIAL_UNIQUE_INDEX";
    /**
     * Message: The index type %s is not supported for spatial indexes.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX"] = 3729] = "ER_INDEX_TYPE_NOT_SUPPORTED_FOR_SPATIAL_INDEX";
    /**
     * Message: Cannot drop table '%s' referenced by a foreign key constraint '%s' on table '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_CANNOT_DROP_PARENT"] = 3730] = "ER_FK_CANNOT_DROP_PARENT";
    /**
     * Message: A parameter of function %s contains a geometry with longitude %f, which is out of range. It must be within (%f, %f].
     * SQLState: 22S02
     */
    MysqlServerError[MysqlServerError["ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE"] = 3731] = "ER_GEOMETRY_PARAM_LONGITUDE_OUT_OF_RANGE";
    /**
     * Message: A parameter of function %s contains a geometry with latitude %f, which is out of range. It must be within [%f, %f].
     * SQLState: 22S03
     */
    MysqlServerError[MysqlServerError["ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE"] = 3732] = "ER_GEOMETRY_PARAM_LATITUDE_OUT_OF_RANGE";
    /**
     * Message: Foreign key '%s' uses virtual column '%s' which is not supported.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_CANNOT_USE_VIRTUAL_COLUMN"] = 3733] = "ER_FK_CANNOT_USE_VIRTUAL_COLUMN";
    /**
     * Message: Failed to add the foreign key constraint. Missing column '%s' for constraint '%s' in the referenced table '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_NO_COLUMN_PARENT"] = 3734] = "ER_FK_NO_COLUMN_PARENT";
    /**
     * Message: %s: Could not add suppression rule for code "%s". Rule-set may be full, or code may not correspond to an error-log message.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANT_SET_ERROR_SUPPRESSION_LIST"] = 3735] = "ER_CANT_SET_ERROR_SUPPRESSION_LIST";
    /**
     * Message: The spatial reference system definition for SRID %u specifies invalid geographic axes '%s' and '%s'. One axis must be NORTH or SOUTH and the other must be EAST or WEST.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_GEOGCS_INVALID_AXES"] = 3736] = "ER_SRS_GEOGCS_INVALID_AXES";
    /**
     * Message: The length of the semi-major axis must be a positive number.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_INVALID_SEMI_MAJOR_AXIS"] = 3737] = "ER_SRS_INVALID_SEMI_MAJOR_AXIS";
    /**
     * Message: The inverse flattening must be larger than 1.0, or 0.0 if the ellipsoid is a sphere.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_INVALID_INVERSE_FLATTENING"] = 3738] = "ER_SRS_INVALID_INVERSE_FLATTENING";
    /**
     * Message: The angular unit conversion factor must be a positive number.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_INVALID_ANGULAR_UNIT"] = 3739] = "ER_SRS_INVALID_ANGULAR_UNIT";
    /**
     * Message: The prime meridian must be within (-180, 180] degrees, specified in the SRS angular unit.
     * SQLState: SR002
     */
    MysqlServerError[MysqlServerError["ER_SRS_INVALID_PRIME_MERIDIAN"] = 3740] = "ER_SRS_INVALID_PRIME_MERIDIAN";
    /**
     * Message: Transformation from SRID %u is not supported.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED"] = 3741] = "ER_TRANSFORM_SOURCE_SRS_NOT_SUPPORTED";
    /**
     * Message: Transformation to SRID %u is not supported.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED"] = 3742] = "ER_TRANSFORM_TARGET_SRS_NOT_SUPPORTED";
    /**
     * Message: Transformation from SRID %u is not supported. The spatial reference system has no TOWGS84 clause.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84"] = 3743] = "ER_TRANSFORM_SOURCE_SRS_MISSING_TOWGS84";
    /**
     * Message: Transformation to SRID %u is not supported. The spatial reference system has no TOWGS84 clause.
     * SQLState: 22S00
     */
    MysqlServerError[MysqlServerError["ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84"] = 3744] = "ER_TRANSFORM_TARGET_SRS_MISSING_TOWGS84";
    /**
     * Message: Changing @@session.binlog_format is disallowed when the session has open temporary table(s). You could wait until these temporary table(s) are dropped and try again.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT"] = 3745] = "ER_TEMP_TABLE_PREVENTS_SWITCH_SESSION_BINLOG_FORMAT";
    /**
     * Message: Changing @@global.binlog_format or @@persist.binlog_format is disallowed when any replication channel has open temporary table(s). You could wait until Slave_open_temp_tables = 0 and try again
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT"] = 3746] = "ER_TEMP_TABLE_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT";
    /**
     * Message: Changing @@global.binlog_format or @@persist.binlog_format is disallowed when any replication channel applier thread is running. You could execute STOP SLAVE SQL_THREAD and try again.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT"] = 3747] = "ER_RUNNING_APPLIER_PREVENTS_SWITCH_GLOBAL_BINLOG_FORMAT";
    /**
     * Message: Statement violates GTID consistency: CREATE TEMPORARY TABLE and DROP TEMPORARY TABLE are not allowed inside a transaction or inside a procedure in a transactional context when @@session.binlog_format=STATEMENT.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR"] = 3748] = "ER_CLIENT_GTID_UNSAFE_CREATE_DROP_TEMP_TABLE_IN_TRX_IN_SBR";
    /**
     * Message: Unable to create or change a table without a primary key, when the system variable 'sql_require_primary_key' is set. Add a primary key to the table or unset this variable to avoid this message. Note that tables without a primary key can cause performance problems in row-based replication, so please consult your DBA before changing this setting.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_WITHOUT_PK"] = 3750] = "ER_TABLE_WITHOUT_PK";
    /**
     * Message: Data truncated for functional index '%s' at row %ld
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX"] = 3751] = "WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX";
    /**
     * Message: Data truncated for functional index '%s' at row %ld
     * SQLState: 01000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX"] = 3751] = "ER_WARN_DATA_TRUNCATED_FUNCTIONAL_INDEX";
    /**
     * Message: Value is out of range for functional index '%s' at row %ld
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX"] = 3752] = "ER_WARN_DATA_OUT_OF_RANGE_FUNCTIONAL_INDEX";
    /**
     * Message: Cannot create a functional index on a function that returns a JSON or GEOMETRY value.
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION"] = 3753] = "ER_FUNCTIONAL_INDEX_ON_JSON_OR_GEOMETRY_FUNCTION";
    /**
     * Message: Functional index '%s' cannot refer to an auto-increment column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT"] = 3754] = "ER_FUNCTIONAL_INDEX_REF_AUTO_INCREMENT";
    /**
     * Message: Cannot drop column '%s' because it is used by a functional index. In order to drop the column, you must remove the functional index.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX"] = 3755] = "ER_CANNOT_DROP_COLUMN_FUNCTIONAL_INDEX";
    /**
     * Message: The primary key cannot be a functional index
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_PRIMARY_KEY"] = 3756] = "ER_FUNCTIONAL_INDEX_PRIMARY_KEY";
    /**
     * Message: Cannot create a functional index on an expression that returns a BLOB or TEXT. Please consider using CAST.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_ON_LOB"] = 3757] = "ER_FUNCTIONAL_INDEX_ON_LOB";
    /**
     * Message: Expression of functional index '%s' contains a disallowed function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED"] = 3758] = "ER_FUNCTIONAL_INDEX_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: Fulltext functional index is not supported.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FULLTEXT_FUNCTIONAL_INDEX"] = 3759] = "ER_FULLTEXT_FUNCTIONAL_INDEX";
    /**
     * Message: Spatial functional index is not supported.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SPATIAL_FUNCTIONAL_INDEX"] = 3760] = "ER_SPATIAL_FUNCTIONAL_INDEX";
    /**
     * Message: The used storage engine cannot index the expression '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX"] = 3761] = "ER_WRONG_KEY_COLUMN_FUNCTIONAL_INDEX";
    /**
     * Message: Functional index on a column is not supported. Consider using a regular index instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_ON_FIELD"] = 3762] = "ER_FUNCTIONAL_INDEX_ON_FIELD";
    /**
     * Message: Expression of generated column '%s' contains a disallowed function: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED"] = 3763] = "ER_GENERATED_COLUMN_NAMED_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: Expression of generated column '%s' cannot refer to a row value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_ROW_VALUE"] = 3764] = "ER_GENERATED_COLUMN_ROW_VALUE";
    /**
     * Message: Expression of generated column '%s' cannot refer user or system variables.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GENERATED_COLUMN_VARIABLES"] = 3765] = "ER_GENERATED_COLUMN_VARIABLES";
    /**
     * Message: Column '%s' of table '%s' has a default value expression dependency and cannot be dropped or renamed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE"] = 3766] = "ER_DEPENDENT_BY_DEFAULT_GENERATED_VALUE";
    /**
     * Message: Default value expression of column '%s' cannot refer to a column defined after it if that column is a generated column or has an expression as default value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_NON_PRIOR"] = 3767] = "ER_DEFAULT_VAL_GENERATED_NON_PRIOR";
    /**
     * Message: Default value expression of column '%s' cannot refer to an auto-increment column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC"] = 3768] = "ER_DEFAULT_VAL_GENERATED_REF_AUTO_INC";
    /**
     * Message: Default value expression of column '%s' contains a disallowed function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED"] = 3769] = "ER_DEFAULT_VAL_GENERATED_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: Default value expression of column '%s' contains a disallowed function: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED"] = 3770] = "ER_DEFAULT_VAL_GENERATED_NAMED_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: Default value expression of column '%s' cannot refer to a row value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_ROW_VALUE"] = 3771] = "ER_DEFAULT_VAL_GENERATED_ROW_VALUE";
    /**
     * Message: Default value expression of column '%s' cannot refer user or system variables.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_VAL_GENERATED_VARIABLES"] = 3772] = "ER_DEFAULT_VAL_GENERATED_VARIABLES";
    /**
     * Message: DEFAULT function cannot be used with default value expressions
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEFAULT_AS_VAL_GENERATED"] = 3773] = "ER_DEFAULT_AS_VAL_GENERATED";
    /**
     * Message: '%s' is not supported for default value expressions.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED"] = 3774] = "ER_UNSUPPORTED_ACTION_ON_DEFAULT_VAL_GENERATED";
    /**
     * Message: Statement violates GTID consistency: ALTER TABLE ... ADD COLUMN .. with expression as DEFAULT.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION"] = 3775] = "ER_GTID_UNSAFE_ALTER_ADD_COL_WITH_DEFAULT_EXPRESSION";
    /**
     * Message: Cannot change table's storage engine because the table participates in a foreign key constraint.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_CANNOT_CHANGE_ENGINE"] = 3776] = "ER_FK_CANNOT_CHANGE_ENGINE";
    /**
     * Message: Setting user variables within expressions is deprecated and will be removed in a future release. Consider alternatives: 'SET variable=expression, ...', or 'SELECT expression(s) INTO variables(s)'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_USER_SET_EXPR"] = 3777] = "ER_WARN_DEPRECATED_USER_SET_EXPR";
    /**
     * Message: '%s' is a collation of the deprecated character set UTF8MB3. Please consider using UTF8MB4 with an appropriate collation instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_UTF8MB3_COLLATION"] = 3778] = "ER_WARN_DEPRECATED_UTF8MB3_COLLATION";
    /**
     * Message: Nested comment syntax is deprecated and will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX"] = 3779] = "ER_WARN_DEPRECATED_NESTED_COMMENT_SYNTAX";
    /**
     * Message: Referencing column '%s' and referenced column '%s' in foreign key constraint '%s' are incompatible.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FK_INCOMPATIBLE_COLUMNS"] = 3780] = "ER_FK_INCOMPATIBLE_COLUMNS";
    /**
     * Message: Timeout exceeded for held statement while new Group Replication primary member is applying backlog.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GR_HOLD_WAIT_TIMEOUT"] = 3781] = "ER_GR_HOLD_WAIT_TIMEOUT";
    /**
     * Message: Held statement aborted because Group Replication plugin got shut down or thread was killed while new primary member was applying backlog.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GR_HOLD_KILLED"] = 3782] = "ER_GR_HOLD_KILLED";
    /**
     * Message: Held statement was aborted due to member being in error state, while backlog is being applied during Group Replication primary election.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GR_HOLD_MEMBER_STATUS_ERROR"] = 3783] = "ER_GR_HOLD_MEMBER_STATUS_ERROR";
    /**
     * Message: Failed to fetch key from keyring, please check if keyring plugin is loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY"] = 3784] = "ER_RPL_ENCRYPTION_FAILED_TO_FETCH_KEY";
    /**
     * Message: Can't find key from keyring, please check in the server log if a keyring plugin is loaded and initialized successfully.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_KEY_NOT_FOUND"] = 3785] = "ER_RPL_ENCRYPTION_KEY_NOT_FOUND";
    /**
     * Message: Fetched an invalid key from keyring.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY"] = 3786] = "ER_RPL_ENCRYPTION_KEYRING_INVALID_KEY";
    /**
     * Message: Error reading a replication log encryption header: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_HEADER_ERROR"] = 3787] = "ER_RPL_ENCRYPTION_HEADER_ERROR";
    /**
     * Message: Failed to rotate some logs after changing binlog encryption settings. Please fix the problem and rotate the logs manually.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS"] = 3788] = "ER_RPL_ENCRYPTION_FAILED_TO_ROTATE_LOGS";
    /**
     * Message: Key %s exists unexpected.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED"] = 3789] = "ER_RPL_ENCRYPTION_KEY_EXISTS_UNEXPECTED";
    /**
     * Message: Failed to generate key, please check if keyring plugin is loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY"] = 3790] = "ER_RPL_ENCRYPTION_FAILED_TO_GENERATE_KEY";
    /**
     * Message: Failed to store key, please check if keyring plugin is loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY"] = 3791] = "ER_RPL_ENCRYPTION_FAILED_TO_STORE_KEY";
    /**
     * Message: Failed to remove key, please check if keyring plugin is loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY"] = 3792] = "ER_RPL_ENCRYPTION_FAILED_TO_REMOVE_KEY";
    /**
     * Message: Failed to change binlog_encryption value. %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION"] = 3793] = "ER_RPL_ENCRYPTION_UNABLE_TO_CHANGE_OPTION";
    /**
     * Message: Unable to recover binlog encryption master key, please check if keyring plugin is loaded.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED"] = 3794] = "ER_RPL_ENCRYPTION_MASTER_KEY_RECOVERY_FAILED";
    /**
     * Message: slow query log file format changed as requested, but setting will have no effect when not actually logging to a file.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE"] = 3795] = "ER_SLOW_LOG_MODE_IGNORED_WHEN_NOT_LOGGING_TO_FILE";
    /**
     * Message: The option group_replication_consistency cannot be used on the current member state.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED"] = 3796] = "ER_GRP_TRX_CONSISTENCY_NOT_ALLOWED";
    /**
     * Message: Error while waiting for group transactions commit on group_replication_consistency= 'BEFORE'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_TRX_CONSISTENCY_BEFORE"] = 3797] = "ER_GRP_TRX_CONSISTENCY_BEFORE";
    /**
     * Message: Error while waiting for transactions with group_replication_consistency= 'AFTER' to commit.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN"] = 3798] = "ER_GRP_TRX_CONSISTENCY_AFTER_ON_TRX_BEGIN";
    /**
     * Message: The Group Replication plugin is stopping, therefore new transactions are not allowed to start.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED"] = 3799] = "ER_GRP_TRX_CONSISTENCY_BEGIN_NOT_ALLOWED";
    /**
     * Message: Expression of functional index '%s' cannot refer to a row value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED"] = 3800] = "ER_FUNCTIONAL_INDEX_ROW_VALUE_IS_NOT_ALLOWED";
    /**
     * Message: Failed to encrypt content to write into binlog file: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT"] = 3801] = "ER_RPL_ENCRYPTION_FAILED_TO_ENCRYPT";
    /**
     * Message: Page Tracking is not started yet.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PAGE_TRACKING_NOT_STARTED"] = 3802] = "ER_PAGE_TRACKING_NOT_STARTED";
    /**
     * Message: Tracking was not enabled for the LSN range specified
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PAGE_TRACKING_RANGE_NOT_TRACKED"] = 3803] = "ER_PAGE_TRACKING_RANGE_NOT_TRACKED";
    /**
     * Message: Cannot purge data when concurrent clone is in progress. Try later.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PAGE_TRACKING_CANNOT_PURGE"] = 3804] = "ER_PAGE_TRACKING_CANNOT_PURGE";
    /**
     * Message: Cannot rotate binary log master key when 'binlog-encryption' is off.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY"] = 3805] = "ER_RPL_ENCRYPTION_CANNOT_ROTATE_BINLOG_MASTER_KEY";
    /**
     * Message: Unable to recover binary log master key, the combination of new_master_key_seqno=%u, master_key_seqno=%u and old_master_key_seqno=%u are wrong.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION"] = 3806] = "ER_BINLOG_MASTER_KEY_RECOVERY_OUT_OF_COMBINATION";
    /**
     * Message: Failed to operate binary log master key on keyring, please check if keyring plugin is loaded. The statement had no effect: the old binary log master key is still in use, the keyring, binary and relay log files are unchanged, and the server could not start using a new binary log master key for encrypting new binary and relay log files.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY"] = 3807] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_OPERATE_KEY";
    /**
     * Message: Failed to rotate one or more binary or relay log files. A new binary log master key was generated and will be used to encrypt new binary and relay log files. There may still exist binary or relay log files using the previous binary log master key.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS"] = 3808] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_ROTATE_LOGS";
    /**
     * Message: %s. A new binary log master key was generated and will be used to encrypt new binary and relay log files. There may still exist binary or relay log files using the previous binary log master key.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG"] = 3809] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_REENCRYPT_LOG";
    /**
     * Message: Failed to remove unused binary log encryption keys from the keyring, please check if keyring plugin is loaded. The unused binary log encryption keys may still exist in the keyring, and they will be removed upon server restart or next 'ALTER INSTANCE ROTATE BINLOG MASTER KEY' execution.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS"] = 3810] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_UNUSED_KEYS";
    /**
     * Message: Failed to remove auxiliary binary log encryption key from keyring, please check if keyring plugin is loaded. The cleanup of the binary log master key rotation process did not finish as expected and the cleanup will take place upon server restart or next 'ALTER INSTANCE ROTATE BINLOG MASTER KEY' execution.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY"] = 3811] = "ER_BINLOG_MASTER_KEY_ROTATION_FAIL_TO_CLEANUP_AUX_KEY";
    /**
     * Message: An expression of non-boolean type specified to a check constraint '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT"] = 3812] = "ER_NON_BOOLEAN_EXPR_FOR_CHECK_CONSTRAINT";
    /**
     * Message: Column check constraint '%s' references other column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN"] = 3813] = "ER_COLUMN_CHECK_CONSTRAINT_REFERENCES_OTHER_COLUMN";
    /**
     * Message: An expression of a check constraint '%s' contains disallowed function: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED"] = 3814] = "ER_CHECK_CONSTRAINT_NAMED_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: An expression of a check constraint '%s' contains disallowed function.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED"] = 3815] = "ER_CHECK_CONSTRAINT_FUNCTION_IS_NOT_ALLOWED";
    /**
     * Message: An expression of a check constraint '%s' cannot refer to a user or system variable.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_VARIABLES"] = 3816] = "ER_CHECK_CONSTRAINT_VARIABLES";
    /**
     * Message: Check constraint '%s' cannot refer to a row value.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_ROW_VALUE"] = 3817] = "ER_CHECK_CONSTRAINT_ROW_VALUE";
    /**
     * Message: Check constraint '%s' cannot refer to an auto-increment column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN"] = 3818] = "ER_CHECK_CONSTRAINT_REFERS_AUTO_INCREMENT_COLUMN";
    /**
     * Message: Check constraint '%s' is violated.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_VIOLATED"] = 3819] = "ER_CHECK_CONSTRAINT_VIOLATED";
    /**
     * Message: Check constraint '%s' refers to non-existing column '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN"] = 3820] = "ER_CHECK_CONSTRAINT_REFERS_UNKNOWN_COLUMN";
    /**
     * Message: Check constraint '%s' is not found in the table.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_NOT_FOUND"] = 3821] = "ER_CHECK_CONSTRAINT_NOT_FOUND";
    /**
     * Message: Duplicate check constraint name '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_DUP_NAME"] = 3822] = "ER_CHECK_CONSTRAINT_DUP_NAME";
    /**
     * Message: Column '%s' cannot be used in a check constraint '%s': needed in a foreign key constraint '%s' referential action.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN"] = 3823] = "ER_CHECK_CONSTRAINT_CLAUSE_USING_FK_REFER_ACTION_COLUMN";
    /**
     * Message: Creating an unencrypted table in a database with default encryption enabled.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB"] = 3824] = "WARN_UNENCRYPTED_TABLE_IN_ENCRYPTED_DB";
    /**
     * Message: Request to create %s table while using an %s tablespace.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_ENCRYPTION_REQUEST"] = 3825] = "ER_INVALID_ENCRYPTION_REQUEST";
    /**
     * Message: Table encryption differ from its database default encryption, and user doesn't have enough privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_SET_TABLE_ENCRYPTION"] = 3826] = "ER_CANNOT_SET_TABLE_ENCRYPTION";
    /**
     * Message: Database default encryption differ from 'default_table_encryption' setting, and user doesn't have enough privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_SET_DATABASE_ENCRYPTION"] = 3827] = "ER_CANNOT_SET_DATABASE_ENCRYPTION";
    /**
     * Message: Tablespace encryption differ from 'default_table_encryption' setting, and user doesn't have enough privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_SET_TABLESPACE_ENCRYPTION"] = 3828] = "ER_CANNOT_SET_TABLESPACE_ENCRYPTION";
    /**
     * Message: This tablespace can't be encrypted, because one of table's schema has default encryption OFF and user doesn't have enough privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_CANNOT_BE_ENCRYPTED"] = 3829] = "ER_TABLESPACE_CANNOT_BE_ENCRYPTED";
    /**
     * Message: This tablespace can't be decrypted, because one of table's schema has default encryption ON and user doesn't have enough privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_CANNOT_BE_DECRYPTED"] = 3830] = "ER_TABLESPACE_CANNOT_BE_DECRYPTED";
    /**
     * Message: Cannot determine the type of the tablespace named '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLESPACE_TYPE_UNKNOWN"] = 3831] = "ER_TABLESPACE_TYPE_UNKNOWN";
    /**
     * Message: Source tablespace is encrypted but target tablespace is not.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TARGET_TABLESPACE_UNENCRYPTED"] = 3832] = "ER_TARGET_TABLESPACE_UNENCRYPTED";
    /**
     * Message: ENCRYPTION clause is not valid for %s tablespace.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_USE_ENCRYPTION_CLAUSE"] = 3833] = "ER_CANNOT_USE_ENCRYPTION_CLAUSE";
    /**
     * Message: Multiple %s clauses
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_MULTIPLE_CLAUSES"] = 3834] = "ER_INVALID_MULTIPLE_CLAUSES";
    /**
     * Message: GRANT ... AS is currently supported only for global privileges.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_USE_OF_GRANT_AS"] = 3835] = "ER_UNSUPPORTED_USE_OF_GRANT_AS";
    /**
     * Message: Either some of the authorization IDs in the AS clause are invalid or the current user lacks privileges to execute the statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS"] = 3836] = "ER_UKNOWN_AUTH_ID_OR_ACCESS_DENIED_FOR_GRANT_AS";
    /**
     * Message: Column '%s' has a functional index dependency and cannot be dropped or renamed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPENDENT_BY_FUNCTIONAL_INDEX"] = 3837] = "ER_DEPENDENT_BY_FUNCTIONAL_INDEX";
    /**
     * Message: Plugin '%s' is not to be used as an "early" plugin. Don't add it to --early-plugin-load, keyring migration etc.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PLUGIN_NOT_EARLY"] = 3838] = "ER_PLUGIN_NOT_EARLY";
    /**
     * Message: Redo log archiving start prohibits path name in 'subdir' argument
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH"] = 3839] = "ER_INNODB_REDO_LOG_ARCHIVE_START_SUBDIR_PATH";
    /**
     * Message: Redo log archiving start timed out
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT"] = 3840] = "ER_INNODB_REDO_LOG_ARCHIVE_START_TIMEOUT";
    /**
     * Message: Server variable 'innodb_redo_log_archive_dirs' is NULL or empty
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID"] = 3841] = "ER_INNODB_REDO_LOG_ARCHIVE_DIRS_INVALID";
    /**
     * Message: Label '%s' not found in server variable 'innodb_redo_log_archive_dirs'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND"] = 3842] = "ER_INNODB_REDO_LOG_ARCHIVE_LABEL_NOT_FOUND";
    /**
     * Message: Directory is empty after label '%s' in server variable 'innodb_redo_log_archive_dirs'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY"] = 3843] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_EMPTY";
    /**
     * Message: Redo log archive directory '%s' does not exist or is not a directory
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR"] = 3844] = "ER_INNODB_REDO_LOG_ARCHIVE_NO_SUCH_DIR";
    /**
     * Message: Redo log archive directory '%s' is in, under, or over server directory '%s' - '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH"] = 3845] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_CLASH";
    /**
     * Message: Redo log archive directory '%s' is accessible to all OS users
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS"] = 3846] = "ER_INNODB_REDO_LOG_ARCHIVE_DIR_PERMISSIONS";
    /**
     * Message: Cannot create redo log archive file '%s' (OS errno: %d - %s)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE"] = 3847] = "ER_INNODB_REDO_LOG_ARCHIVE_FILE_CREATE";
    /**
     * Message: Redo log archiving has been started on '%s' - Call innodb_redo_log_archive_stop() first
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE"] = 3848] = "ER_INNODB_REDO_LOG_ARCHIVE_ACTIVE";
    /**
     * Message: Redo log archiving is not active
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE"] = 3849] = "ER_INNODB_REDO_LOG_ARCHIVE_INACTIVE";
    /**
     * Message: Redo log archiving failed: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_FAILED"] = 3850] = "ER_INNODB_REDO_LOG_ARCHIVE_FAILED";
    /**
     * Message: Redo log archiving has not been started by this session
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_LOG_ARCHIVE_SESSION"] = 3851] = "ER_INNODB_REDO_LOG_ARCHIVE_SESSION";
    /**
     * Message: Regex error: %s in function %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STD_REGEX_ERROR"] = 3852] = "ER_STD_REGEX_ERROR";
    /**
     * Message: Invalid JSON type in argument %u to function %s; an %s is required.
     * SQLState: 22032
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_TYPE"] = 3853] = "ER_INVALID_JSON_TYPE";
    /**
     * Message: Cannot convert string '%s' from %s to %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_CONVERT_STRING"] = 3854] = "ER_CANNOT_CONVERT_STRING";
    /**
     * Message: Column '%s' has a partitioning function dependency and cannot be dropped or renamed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPENDENT_BY_PARTITION_FUNC"] = 3855] = "ER_DEPENDENT_BY_PARTITION_FUNC";
    /**
     * Message: AUTO_INCREMENT support for FLOAT/DOUBLE columns is deprecated and will be removed in a future release. Consider removing AUTO_INCREMENT from column '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT"] = 3856] = "ER_WARN_DEPRECATED_FLOAT_AUTO_INCREMENT";
    /**
     * Message: Cannot stop the slave SQL thread while the instance is locked for backup. Try running `UNLOCK INSTANCE` first.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_CANT_STOP_SLAVE_WHILE_LOCKED_BACKUP"] = 3857] = "ER_RPL_CANT_STOP_SLAVE_WHILE_LOCKED_BACKUP";
    /**
     * Message: Specifying number of digits for floating point data types is deprecated and will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_FLOAT_DIGITS"] = 3858] = "ER_WARN_DEPRECATED_FLOAT_DIGITS";
    /**
     * Message: UNSIGNED for decimal and floating point data types is deprecated and support for it will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_FLOAT_UNSIGNED"] = 3859] = "ER_WARN_DEPRECATED_FLOAT_UNSIGNED";
    /**
     * Message: Integer display width is deprecated and will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH"] = 3860] = "ER_WARN_DEPRECATED_INTEGER_DISPLAY_WIDTH";
    /**
     * Message: The ZEROFILL attribute is deprecated and will be removed in a future release. Use the LPAD function to zero-pad numbers, or store the formatted numbers in a CHAR column.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_ZEROFILL"] = 3861] = "ER_WARN_DEPRECATED_ZEROFILL";
    /**
     * Message: Clone Donor Error: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_DONOR"] = 3862] = "ER_CLONE_DONOR";
    /**
     * Message: Clone received unexpected response from Donor : %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_PROTOCOL"] = 3863] = "ER_CLONE_PROTOCOL";
    /**
     * Message: Clone Donor MySQL version: %s is different from Recipient MySQL version %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_DONOR_VERSION"] = 3864] = "ER_CLONE_DONOR_VERSION";
    /**
     * Message: Clone Donor OS: %s is different from Recipient OS: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_OS"] = 3865] = "ER_CLONE_OS";
    /**
     * Message: Clone Donor platform: %s is different from Recipient platform: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_PLATFORM"] = 3866] = "ER_CLONE_PLATFORM";
    /**
     * Message: Clone Donor collation: %s is unavailable in Recipient.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_CHARSET"] = 3867] = "ER_CLONE_CHARSET";
    /**
     * Message: Clone Configuration %s: Donor value: %s is different from Recipient value: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_CONFIG"] = 3868] = "ER_CLONE_CONFIG";
    /**
     * Message: Clone system configuration: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_SYS_CONFIG"] = 3869] = "ER_CLONE_SYS_CONFIG";
    /**
     * Message: Clone Donor plugin %s is not active in Recipient.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_PLUGIN_MATCH"] = 3870] = "ER_CLONE_PLUGIN_MATCH";
    /**
     * Message: Clone cannot use loop back connection while cloning into current data directory.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_LOOPBACK"] = 3871] = "ER_CLONE_LOOPBACK";
    /**
     * Message: Clone needs SSL connection for encrypted table.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_ENCRYPTION"] = 3872] = "ER_CLONE_ENCRYPTION";
    /**
     * Message: Clone estimated database size is %s. Available space %s is not enough.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_DISK_SPACE"] = 3873] = "ER_CLONE_DISK_SPACE";
    /**
     * Message: Concurrent clone in progress. Please try after clone is complete.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_IN_PROGRESS"] = 3874] = "ER_CLONE_IN_PROGRESS";
    /**
     * Message: The clone operation cannot be executed when %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_DISALLOWED"] = 3875] = "ER_CLONE_DISALLOWED";
    /**
     * Message: Cannot grant roles to an anonymous user.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER"] = 3876] = "ER_CANNOT_GRANT_ROLES_TO_ANONYMOUS_USER";
    /**
     * Message: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SECONDARY_ENGINE_PLUGIN"] = 3877] = "ER_SECONDARY_ENGINE_PLUGIN";
    /**
     * Message: Empty password can not be retained as second password for user '%s'@'%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SECOND_PASSWORD_CANNOT_BE_EMPTY"] = 3878] = "ER_SECOND_PASSWORD_CANNOT_BE_EMPTY";
    /**
     * Message: Access denied for AuthId `%s`@`%s` to database '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DB_ACCESS_DENIED"] = 3879] = "ER_DB_ACCESS_DENIED";
    /**
     * Message: Cannot set mandatory_roles: AuthId `%s`@`%s` has '%s' privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES"] = 3880] = "ER_DA_AUTH_ID_WITH_SYSTEM_USER_PRIV_IN_MANDATORY_ROLES";
    /**
     * Message: Gtid table is not ready to be used. Table '%s.%s' cannot be opened.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_RPL_GTID_TABLE_CANNOT_OPEN"] = 3881] = "ER_DA_RPL_GTID_TABLE_CANNOT_OPEN";
    /**
     * Message: The geometry passed to function %s is in SRID 0, which doesn't specify a length unit. Can't convert to '%s'.
     * SQLState: SU001
     */
    MysqlServerError[MysqlServerError["ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT"] = 3882] = "ER_GEOMETRY_IN_UNKNOWN_LENGTH_UNIT";
    /**
     * Message: Error installing plugin '%s': %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_PLUGIN_INSTALL_ERROR"] = 3883] = "ER_DA_PLUGIN_INSTALL_ERROR";
    /**
     * Message: Storage engine could not allocate temporary tablespace for this session.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NO_SESSION_TEMP"] = 3884] = "ER_NO_SESSION_TEMP";
    /**
     * Message: Got unknown error: %d
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UNKNOWN_ERROR_NUMBER"] = 3885] = "ER_DA_UNKNOWN_ERROR_NUMBER";
    /**
     * Message: Could not change column '%s' of table '%s'. The resulting size of index '%s' would exceed the max key length of %d bytes.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_COLUMN_CHANGE_SIZE"] = 3886] = "ER_COLUMN_CHANGE_SIZE";
    /**
     * Message: A capture group has an invalid name.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INVALID_CAPTURE_GROUP_NAME"] = 3887] = "ER_REGEXP_INVALID_CAPTURE_GROUP_NAME";
    /**
     * Message: Failed to set up SSL because of the following SSL library error: %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_SSL_LIBRARY_ERROR"] = 3888] = "ER_DA_SSL_LIBRARY_ERROR";
    /**
     * Message: Secondary engine operation failed. %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SECONDARY_ENGINE"] = 3889] = "ER_SECONDARY_ENGINE";
    /**
     * Message: DDLs on a table with a secondary engine defined are not allowed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SECONDARY_ENGINE_DDL"] = 3890] = "ER_SECONDARY_ENGINE_DDL";
    /**
     * Message: Incorrect current password. Specify the correct password which has to be replaced.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INCORRECT_CURRENT_PASSWORD"] = 3891] = "ER_INCORRECT_CURRENT_PASSWORD";
    /**
     * Message: Current password needs to be specified in the REPLACE clause in order to change it.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISSING_CURRENT_PASSWORD"] = 3892] = "ER_MISSING_CURRENT_PASSWORD";
    /**
     * Message: Do not specify the current password while changing it for other users.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CURRENT_PASSWORD_NOT_REQUIRED"] = 3893] = "ER_CURRENT_PASSWORD_NOT_REQUIRED";
    /**
     * Message: Current password can not be retained for user '%s'@'%s' because authentication plugin is being changed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE"] = 3894] = "ER_PASSWORD_CANNOT_BE_RETAINED_ON_PLUGIN_CHANGE";
    /**
     * Message: Current password can not be retained for user '%s'@'%s' because new password is empty.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED"] = 3895] = "ER_CURRENT_PASSWORD_CANNOT_BE_RETAINED";
    /**
     * Message: At least one partial revoke exists on a database. The system variable '@@partial_revokes' must be set to ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTIAL_REVOKES_EXIST"] = 3896] = "ER_PARTIAL_REVOKES_EXIST";
    /**
     * Message: AuthId `%s`@`%s` is set as mandatory_roles. Cannot grant the '%s' privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE"] = 3897] = "ER_CANNOT_GRANT_SYSTEM_PRIV_TO_MANDATORY_ROLE";
    /**
     * Message: The use of replication filters with XA transactions is not supported, and can lead to an undefined state in the replication slave.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_XA_REPLICATION_FILTERS"] = 3898] = "ER_XA_REPLICATION_FILTERS";
    /**
     * Message: sql_mode=0x%08x is not supported.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UNSUPPORTED_SQL_MODE"] = 3899] = "ER_UNSUPPORTED_SQL_MODE";
    /**
     * Message: Invalid match mode flag in regular expression.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEXP_INVALID_FLAG"] = 3900] = "ER_REGEXP_INVALID_FLAG";
    /**
     * Message: '%s' privilege for database '%s' exists both as partial revoke and mysql.db simultaneously. It could mean that the 'mysql' schema is corrupted.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS"] = 3901] = "ER_PARTIAL_REVOKE_AND_DB_GRANT_BOTH_EXISTS";
    /**
     * Message: There's no unit of measure named '%s'.
     * SQLState: SU001
     */
    MysqlServerError[MysqlServerError["ER_UNIT_NOT_FOUND"] = 3902] = "ER_UNIT_NOT_FOUND";
    /**
     * Message: Invalid JSON value for CAST for functional index '%s'.
     * SQLState: 22018
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX"] = 3903] = "ER_INVALID_JSON_VALUE_FOR_FUNC_INDEX";
    /**
     * Message: Out of range JSON value for CAST for functional index '%s'.
     * SQLState: 22003
     */
    MysqlServerError[MysqlServerError["ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX"] = 3904] = "ER_JSON_VALUE_OUT_OF_RANGE_FOR_FUNC_INDEX";
    /**
     * Message: Exceeded max number of values per record for multi-valued index '%s' by %u value(s).
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EXCEEDED_MV_KEYS_NUM"] = 3905] = "ER_EXCEEDED_MV_KEYS_NUM";
    /**
     * Message: Exceeded max total length of values per record for multi-valued index '%s' by %u bytes.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_EXCEEDED_MV_KEYS_SPACE"] = 3906] = "ER_EXCEEDED_MV_KEYS_SPACE";
    /**
     * Message: Data too long for functional index '%s'.
     * SQLState: 22001
     */
    MysqlServerError[MysqlServerError["ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG"] = 3907] = "ER_FUNCTIONAL_INDEX_DATA_IS_TOO_LONG";
    /**
     * Message: Cannot store an array or an object in a scalar key part of the index '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_MVI_VALUE"] = 3908] = "ER_WRONG_MVI_VALUE";
    /**
     * Message: Cannot use functional index '%s' due to type or collation conversion.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_FUNC_INDEX_NOT_APPLICABLE"] = 3909] = "ER_WARN_FUNC_INDEX_NOT_APPLICABLE";
    /**
     * Message: The function '%s' failed. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_RPL_UDF_ERROR"] = 3910] = "ER_GRP_RPL_UDF_ERROR";
    /**
     * Message: Cannot update GTID_PURGED with the Group Replication plugin running
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_UPDATE_GTID_PURGED_WITH_GR"] = 3911] = "ER_UPDATE_GTID_PURGED_WITH_GR";
    /**
     * Message: Grouping on temporal is non-deterministic for timezones having DST. Please consider switching to UTC for this query.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUPING_ON_TIMESTAMP_IN_DST"] = 3912] = "ER_GROUPING_ON_TIMESTAMP_IN_DST";
    /**
     * Message: Long database name and identifier for object resulted in a path length too long for table '%s'. Please check the path limit for your OS.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_NAME_CAUSES_TOO_LONG_PATH"] = 3913] = "ER_TABLE_NAME_CAUSES_TOO_LONG_PATH";
    /**
     * Message: Request ignored for '%s'@'%s'. Role needed to perform operation: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE"] = 3914] = "ER_AUDIT_LOG_INSUFFICIENT_PRIVILEGE";
    /**
     * Message: Started auto-rejoin procedure attempt %lu of %lu
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_GRP_RPL_STARTED_AUTO_REJOIN"] = 3916] = "ER_DA_GRP_RPL_STARTED_AUTO_REJOIN";
    /**
     * Message: A plugin was loaded or unloaded during a query, a system variable table was changed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SYSVAR_CHANGE_DURING_QUERY"] = 3917] = "ER_SYSVAR_CHANGE_DURING_QUERY";
    /**
     * Message: A plugin was loaded or unloaded during a query, a global status variable was changed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GLOBSTAT_CHANGE_DURING_QUERY"] = 3918] = "ER_GLOBSTAT_CHANGE_DURING_QUERY";
    /**
     * Message: The START GROUP_REPLICATION command failed to start its message service.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE"] = 3919] = "ER_GRP_RPL_MESSAGE_SERVICE_INIT_FAILURE";
    /**
     * Message: Invalid MASTER_COMPRESSION_ALGORITHMS '%s' for channel '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHANGE_MASTER_WRONG_COMPRESSION_ALGORITHM_CLIENT"] = 3920] = "ER_CHANGE_MASTER_WRONG_COMPRESSION_ALGORITHM_CLIENT";
    /**
     * Message: Invalid MASTER_ZSTD_COMPRESSION_LEVEL %u for channel '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHANGE_MASTER_WRONG_COMPRESSION_LEVEL_CLIENT"] = 3921] = "ER_CHANGE_MASTER_WRONG_COMPRESSION_LEVEL_CLIENT";
    /**
     * Message: Invalid compression algorithm '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_COMPRESSION_ALGORITHM_CLIENT"] = 3922] = "ER_WRONG_COMPRESSION_ALGORITHM_CLIENT";
    /**
     * Message: Invalid zstd compression level for algorithm '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_COMPRESSION_LEVEL_CLIENT"] = 3923] = "ER_WRONG_COMPRESSION_LEVEL_CLIENT";
    /**
     * Message: Specified compression algorithm list '%s' exceeds total count of 3 for channel '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHANGE_MASTER_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT"] = 3924] = "ER_CHANGE_MASTER_WRONG_COMPRESSION_ALGORITHM_LIST_CLIENT";
    /**
     * Message: PRIVILEGE_CHECKS_USER for replication channel '%s' was set to ``@`%s`, but anonymous users are disallowed for PRIVILEGE_CHECKS_USER.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS"] = 3925] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_CANNOT_BE_ANONYMOUS";
    /**
     * Message: PRIVILEGE_CHECKS_USER for replication channel '%s' was set to `%s`@`%s`, but this is not an existing user.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST"] = 3926] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_DOES_NOT_EXIST";
    /**
     * Message: Invalid, corrupted PRIVILEGE_CHECKS_USER was found in the replication configuration repository for channel '%s'. Use CHANGE MASTER TO PRIVILEGE_CHECKS_USER to correct the configuration.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT"] = 3927] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_CORRUPT";
    /**
     * Message: PRIVILEGE_CHECKS_USER for replication channel '%s' was set to `%s`@`%s`, but this user does not have REPLICATION_APPLIER privilege.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV"] = 3928] = "ER_CLIENT_PRIVILEGE_CHECKS_USER_NEEDS_RPL_APPLIER_PRIV";
    /**
     * Message: Dynamic privilege '%s' is not registered with the server.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DA_PRIVILEGE_NOT_REGISTERED"] = 3929] = "ER_WARN_DA_PRIVILEGE_NOT_REGISTERED";
    /**
     * Message: Function '%s' failed because key is invalid.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_KEYRING_UDF_KEY_INVALID"] = 3930] = "ER_CLIENT_KEYRING_UDF_KEY_INVALID";
    /**
     * Message: Function '%s' failed because key type is invalid.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID"] = 3931] = "ER_CLIENT_KEYRING_UDF_KEY_TYPE_INVALID";
    /**
     * Message: Function '%s' failed because key length is too long.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG"] = 3932] = "ER_CLIENT_KEYRING_UDF_KEY_TOO_LONG";
    /**
     * Message: Function '%s' failed because key type is too long.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG"] = 3933] = "ER_CLIENT_KEYRING_UDF_KEY_TYPE_TOO_LONG";
    /**
     * Message: %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT"] = 3934] = "ER_JSON_SCHEMA_VALIDATION_ERROR_WITH_DETAILED_REPORT";
    /**
     * Message: Invalid character set '%s' was specified. It must be either character set name or collation name as supported by server.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_CHARSET_SPECIFIED"] = 3935] = "ER_DA_UDF_INVALID_CHARSET_SPECIFIED";
    /**
     * Message: Invalid character set '%s' was specified. It must be a character set name as supported by server.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_CHARSET"] = 3936] = "ER_DA_UDF_INVALID_CHARSET";
    /**
     * Message: Invalid collation '%s' was specified. It must be a collation name as supported by server.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_COLLATION"] = 3937] = "ER_DA_UDF_INVALID_COLLATION";
    /**
     * Message: Invalid extension argument type '%s' was specified. Refer the MySQL manual for the valid UDF extension arguments type.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE"] = 3938] = "ER_DA_UDF_INVALID_EXTENSION_ARGUMENT_TYPE";
    /**
     * Message: Table has multiple constraints with the name '%s'. Please use constraint specific '%s' clause.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME"] = 3939] = "ER_MULTIPLE_CONSTRAINTS_WITH_SAME_NAME";
    /**
     * Message: Constraint '%s' does not exist.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CONSTRAINT_NOT_FOUND"] = 3940] = "ER_CONSTRAINT_NOT_FOUND";
    /**
     * Message: Altering constraint enforcement is not supported for the constraint '%s'. Enforcement state alter is not supported for the PRIMARY, UNIQUE and FOREIGN KEY type constraints.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED"] = 3941] = "ER_ALTER_CONSTRAINT_ENFORCEMENT_NOT_SUPPORTED";
    /**
     * Message: Each row of a VALUES clause must have at least one column, unless when used as source in an INSERT statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS"] = 3942] = "ER_TABLE_VALUE_CONSTRUCTOR_MUST_HAVE_COLUMNS";
    /**
     * Message: A VALUES clause cannot use DEFAULT values, unless used as a source in an INSERT statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT"] = 3943] = "ER_TABLE_VALUE_CONSTRUCTOR_CANNOT_HAVE_DEFAULT";
    /**
     * Message: The query does not comply with variable require_row_format restrictions.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT"] = 3944] = "ER_CLIENT_QUERY_FAILURE_INVALID_NON_ROW_FORMAT";
    /**
     * Message: The requested value %s is invalid for REQUIRE_ROW_FORMAT, must be either 0 or 1.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REQUIRE_ROW_FORMAT_INVALID_VALUE"] = 3945] = "ER_REQUIRE_ROW_FORMAT_INVALID_VALUE";
    /**
     * Message: Failed to acquire lock on user management service, unable to determine if role `%s`@`%s` is mandatory
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY"] = 3946] = "ER_FAILED_TO_DETERMINE_IF_ROLE_IS_MANDATORY";
    /**
     * Message: Failed to acquire lock on user management service, unable to fetch mandatory role list
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST"] = 3947] = "ER_FAILED_TO_FETCH_MANDATORY_ROLE_LIST";
    /**
     * Message: Loading local data is disabled; this must be enabled on both the client and server sides
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_CLIENT_LOCAL_FILES_DISABLED"] = 3948] = "ER_CLIENT_LOCAL_FILES_DISABLED";
    /**
     * Message: Failed to import %s because the CFG file version (%u) is not compatible with the current version (%u)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMP_INCOMPATIBLE_CFG_VERSION"] = 3949] = "ER_IMP_INCOMPATIBLE_CFG_VERSION";
    /**
     * Message: Out of memory
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_OOM"] = 3950] = "ER_DA_OOM";
    /**
     * Message: Character set can be set only for the UDF argument type STRING.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET"] = 3951] = "ER_DA_UDF_INVALID_ARGUMENT_TO_SET_CHARSET";
    /**
     * Message: Character set can be set only for the UDF RETURN type STRING.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET"] = 3952] = "ER_DA_UDF_INVALID_RETURN_TYPE_TO_SET_CHARSET";
    /**
     * Message: Multiple INTO clauses in one query block.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MULTIPLE_INTO_CLAUSES"] = 3953] = "ER_MULTIPLE_INTO_CLAUSES";
    /**
     * Message: Misplaced INTO clause, INTO is not allowed inside subqueries, and must be placed at end of UNION clauses.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MISPLACED_INTO"] = 3954] = "ER_MISPLACED_INTO";
    /**
     * Message: Access denied for user '%s'@'%s'. Account is blocked for %s day(s) (%s day(s) remaining) due to %u consecutive failed logins.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK"] = 3955] = "ER_USER_ACCESS_DENIED_FOR_USER_ACCOUNT_BLOCKED_BY_PASSWORD_LOCK";
    /**
     * Message: UNSIGNED for the YEAR data type is deprecated and support for it will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_YEAR_UNSIGNED"] = 3956] = "ER_WARN_DEPRECATED_YEAR_UNSIGNED";
    /**
     * Message: Clone needs max_allowed_packet value to be %u or more. Current value is %u
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CLONE_NETWORK_PACKET"] = 3957] = "ER_CLONE_NETWORK_PACKET";
    /**
     * Message: Failed to %s sdi for %s.%s in %s due to missing record.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SDI_OPERATION_FAILED_MISSING_RECORD"] = 3958] = "ER_SDI_OPERATION_FAILED_MISSING_RECORD";
    /**
     * Message: Check constraint '%s' uses column '%s', hence column cannot be dropped or renamed.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DEPENDENT_BY_CHECK_CONSTRAINT"] = 3959] = "ER_DEPENDENT_BY_CHECK_CONSTRAINT";
    /**
     * Message: This operation cannot be performed while Group Replication is running; run STOP GROUP_REPLICATION first
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP"] = 3960] = "ER_GRP_OPERATION_NOT_ALLOWED_GR_MUST_STOP";
    /**
     * Message: Specifying an ON EMPTY clause after the ON ERROR clause in a JSON_TABLE column definition is deprecated syntax and will be removed in a future release. Specify ON EMPTY before ON ERROR instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY"] = 3961] = "ER_WARN_DEPRECATED_JSON_TABLE_ON_ERROR_ON_EMPTY";
    /**
     * Message: The INTO clause is deprecated inside query blocks of query expressions and will be removed in a future release. Please move the INTO clause to the end of statement instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_INNER_INTO"] = 3962] = "ER_WARN_DEPRECATED_INNER_INTO";
    /**
     * Message: The VALUES function is deprecated and will be removed in a future release. It always returns NULL in this context. If you meant to access a value from the VALUES clause of the INSERT statement, consider using an alias (INSERT INTO ... VALUES (...) AS alias) and reference alias.col instead of VALUES(col) in the ON DUPLICATE KEY UPDATE clause.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL"] = 3963] = "ER_WARN_DEPRECATED_VALUES_FUNCTION_ALWAYS_NULL";
    /**
     * Message: SQL_CALC_FOUND_ROWS is deprecated and will be removed in a future release. Consider using two separate queries instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS"] = 3964] = "ER_WARN_DEPRECATED_SQL_CALC_FOUND_ROWS";
    /**
     * Message: FOUND_ROWS() is deprecated and will be removed in a future release. Consider using COUNT(*) instead.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_DEPRECATED_FOUND_ROWS"] = 3965] = "ER_WARN_DEPRECATED_FOUND_ROWS";
    /**
     * Message: No value was found by '%s' on the specified path.
     * SQLState: 22035
     */
    MysqlServerError[MysqlServerError["ER_MISSING_JSON_VALUE"] = 3966] = "ER_MISSING_JSON_VALUE";
    /**
     * Message: More than one value was found by '%s' on the specified path.
     * SQLState: 22034
     */
    MysqlServerError[MysqlServerError["ER_MULTIPLE_JSON_VALUES"] = 3967] = "ER_MULTIPLE_JSON_VALUES";
    /**
     * Message: Hostname cannot be longer than %d characters.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_HOSTNAME_TOO_LONG"] = 3968] = "ER_HOSTNAME_TOO_LONG";
    /**
     * Message: Column '%s.%s.%s' having prefix key part '%s(%u)' is ignored by the partitioning function. Use of prefixed columns in the PARTITION BY KEY() clause is deprecated and will be removed in a future release.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY"] = 3969] = "ER_WARN_CLIENT_DEPRECATED_PARTITION_PREFIX_KEY";
    /**
     * Message: The START GROUP_REPLICATION command failed since the username provided for recovery channel is empty.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_USER_EMPTY_MSG"] = 3970] = "ER_GROUP_REPLICATION_USER_EMPTY_MSG";
    /**
     * Message: The START GROUP_REPLICATION command failed since the USER option was not provided with PASSWORD for recovery channel.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_USER_MANDATORY_MSG"] = 3971] = "ER_GROUP_REPLICATION_USER_MANDATORY_MSG";
    /**
     * Message: The START GROUP_REPLICATION command failed since the password provided for the recovery channel exceeds the maximum length of 32 characters.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_GROUP_REPLICATION_PASSWORD_LENGTH"] = 3972] = "ER_GROUP_REPLICATION_PASSWORD_LENGTH";
    /**
     * Message: Statement requires a transform of a subquery to a non-SET operation (like IN2EXISTS, or subquery-to-LATERAL-derived-table). This is not allowed with optimizer switch 'subquery_to_derived' on
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SUBQUERY_TRANSFORM_REJECTED"] = 3973] = "ER_SUBQUERY_TRANSFORM_REJECTED";
    /**
     * Message: Invalid input value for recovery socket endpoints '%s'. Please, provide a valid, comma separated, list of endpoints (IP:port)
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT"] = 3974] = "ER_DA_GRP_RPL_RECOVERY_ENDPOINT_FORMAT";
    /**
     * Message: The server is not listening on endpoint '%s'. Only endpoints that the server is listening on are valid recovery endpoints.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID"] = 3975] = "ER_DA_GRP_RPL_RECOVERY_ENDPOINT_INVALID";
    /**
     * Message: Variable '%s' cannot be set to the value of '%s'. %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART"] = 3976] = "ER_WRONG_VALUE_FOR_VAR_PLUS_ACTIONABLE_PART";
    /**
     * Message: Only BINLOG INSERT, COMMIT and ROLLBACK statements are allowed after CREATE TABLE with START TRANSACTION statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION"] = 3977] = "ER_STATEMENT_NOT_ALLOWED_AFTER_START_TRANSACTION";
    /**
     * Message: Foreign key creation is not allowed with CREATE TABLE as SELECT and CREATE TABLE with START TRANSACTION statement.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT"] = 3978] = "ER_FOREIGN_KEY_WITH_ATOMIC_CREATE_SELECT";
    /**
     * Message: START TRANSACTION clause cannot be used %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_NOT_ALLOWED_WITH_START_TRANSACTION"] = 3979] = "ER_NOT_ALLOWED_WITH_START_TRANSACTION";
    /**
     * Message: Invalid json attribute, error: "%s" at pos %u: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_JSON_ATTRIBUTE"] = 3980] = "ER_INVALID_JSON_ATTRIBUTE";
    /**
     * Message: Storage engine '%s' does not support ENGINE_ATTRIBUTE.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED"] = 3981] = "ER_ENGINE_ATTRIBUTE_NOT_SUPPORTED";
    /**
     * Message: The user attribute must be a valid JSON object
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_USER_ATTRIBUTE_JSON"] = 3982] = "ER_INVALID_USER_ATTRIBUTE_JSON";
    /**
     * Message: Cannot perform operation as InnoDB redo logging is disabled. Please retry after enabling redo log with ALTER INSTANCE
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_DISABLED"] = 3983] = "ER_INNODB_REDO_DISABLED";
    /**
     * Message: Cannot perform operation as InnoDB is archiving redo log. Please retry after stopping redo archive by invoking innodb_redo_log_archive_stop()
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INNODB_REDO_ARCHIVING_ENABLED"] = 3984] = "ER_INNODB_REDO_ARCHIVING_ENABLED";
    /**
     * Message: Not enough resources to complete lock request.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_MDL_OUT_OF_RESOURCES"] = 3985] = "ER_MDL_OUT_OF_RESOURCES";
    /**
     * Message: Evaluating a JSON value in SQL boolean context does an implicit comparison against JSON integer 0; if this is not what you want, consider converting JSON to a SQL numeric type with JSON_VALUE RETURNING
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMPLICIT_COMPARISON_FOR_JSON"] = 3986] = "ER_IMPLICIT_COMPARISON_FOR_JSON";
    /**
     * Message: The function %s does not support the character set '%s'.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET"] = 3987] = "ER_FUNCTION_DOES_NOT_SUPPORT_CHARACTER_SET";
    /**
     * Message: Conversion from collation %s into %s impossible for %s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_IMPOSSIBLE_STRING_CONVERSION"] = 3988] = "ER_IMPOSSIBLE_STRING_CONVERSION";
    /**
     * Message: Schema '%s' is in read only mode.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_SCHEMA_READ_ONLY"] = 3989] = "ER_SCHEMA_READ_ONLY";
    /**
     * Message: Failed to enable Asynchronous Replication Connection Failover feature. The CHANGE MASTER TO SOURCE_CONNECTION_AUTO_FAILOVER = 1 can only be set when @@GLOBAL.GTID_MODE = ON.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF"] = 3990] = "ER_RPL_ASYNC_RECONNECT_GTID_MODE_OFF";
    /**
     * Message: Failed to enable Asynchronous Replication Connection Failover feature. The CHANGE MASTER TO SOURCE_CONNECTION_AUTO_FAILOVER = 1 can only be set when MASTER_AUTO_POSITION option of CHANGE MASTER TO is enabled.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF"] = 3991] = "ER_RPL_ASYNC_RECONNECT_AUTO_POSITION_OFF";
    /**
     * Message: The @@GLOBAL.GTID_MODE = %s cannot be executed because Asynchronous Replication Connection Failover is enabled i.e. CHANGE MASTER TO SOURCE_CONNECTION_AUTO_FAILOVER = 1.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF"] = 3992] = "ER_DISABLE_GTID_MODE_REQUIRES_ASYNC_RECONNECT_OFF";
    /**
     * Message: CHANGE MASTER TO MASTER_AUTO_POSITION = 0 cannot be executed because Asynchronous Replication Connection Failover is enabled i.e. CHANGE MASTER TO SOURCE_CONNECTION_AUTO_FAILOVER = 1.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF"] = 3993] = "ER_DISABLE_AUTO_POSITION_REQUIRES_ASYNC_RECONNECT_OFF";
    /**
     * Message: Invalid use of parameters in '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_PARAMETER_USE"] = 3994] = "ER_INVALID_PARAMETER_USE";
    /**
     * Message: Character set '%s' cannot be used in conjunction with '%s' in call to %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CHARACTER_SET_MISMATCH"] = 3995] = "ER_CHARACTER_SET_MISMATCH";
    /**
     * Message: Changing %s not supported on this platform. Falling back to the default.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED"] = 3996] = "ER_WARN_VAR_VALUE_CHANGE_NOT_SUPPORTED";
    /**
     * Message: Invalid time zone interval: '%s'
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_TIME_ZONE_INTERVAL"] = 3997] = "ER_INVALID_TIME_ZONE_INTERVAL";
    /**
     * Message: Cannot cast value to %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_INVALID_CAST"] = 3998] = "ER_INVALID_CAST";
    /**
     * Message: The hypergraph optimizer does not yet support '%s'
     * SQLState: 42000
     */
    MysqlServerError[MysqlServerError["ER_HYPERGRAPH_NOT_SUPPORTED_YET"] = 3999] = "ER_HYPERGRAPH_NOT_SUPPORTED_YET";
    /**
     * Message: The hypergraph optimizer is highly experimental and is meant for testing only. Do not enable it unless you are a MySQL developer.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_WARN_HYPERGRAPH_EXPERIMENTAL"] = 4000] = "ER_WARN_HYPERGRAPH_EXPERIMENTAL";
    /**
     * Message: None of the log-sinks selected with --log-error-services=... provides a log-parser. The server will not be able to make the previous runs' error-logs available in performance_schema.error_log.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED"] = 4001] = "ER_DA_NO_ERROR_LOG_PARSER_CONFIGURED";
    /**
     * Message: None of the log-sinks selected in @@global.log_error_services supports writing to the performance schema. The server will not be able to make the current runs' error events available in performance_schema.error_log. To change this, add a log-sink that supports the performance schema to @@global.log_error_services.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_ERROR_LOG_TABLE_DISABLED"] = 4002] = "ER_DA_ERROR_LOG_TABLE_DISABLED";
    /**
     * Message: @@global.log_error_services lists more than one log-filter service. This is discouraged as it will make it hard to understand which rule in which filter affected a log-event.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_ERROR_LOG_MULTIPLE_FILTERS"] = 4003] = "ER_DA_ERROR_LOG_MULTIPLE_FILTERS";
    /**
     * Message: Could not open file '%s' for error logging%s%s
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_DA_CANT_OPEN_ERROR_LOG"] = 4004] = "ER_DA_CANT_OPEN_ERROR_LOG";
    /**
     * Message: User %s is referenced as a definer account in %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_USER_REFERENCED_AS_DEFINER"] = 4005] = "ER_USER_REFERENCED_AS_DEFINER";
    /**
     * Message: Operation %s failed for %s as it is referenced as a definer account in %s.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_CANNOT_USER_REFERENCED_AS_DEFINER"] = 4006] = "ER_CANNOT_USER_REFERENCED_AS_DEFINER";
    /**
     * Message: Decimal number in regular expression is too large.
     * SQLState: HY000
     */
    MysqlServerError[MysqlServerError["ER_REGEX_NUMBER_TOO_BIG"] = 4007] = "ER_REGEX_NUMBER_TOO_BIG";
})(MysqlServerError = exports.MysqlServerError || (exports.MysqlServerError = {}));
//# sourceMappingURL=mysqlError.js.map