- [ ] replace *.env files with configuration files
- [ ] replace own parser with external, better sql parser
- [x] after logging in transition to home
- [ ] lock routes
    - [ ] make all routes except login and register inaccessible when not logged in
    - [ ] make login and register views inaccessible when logged in
    - [ ] redirect from home to login when not logged in
- [x] make login and register views not a modal
- [ ] login and register view: use error messages correctly
- [ ] login view: implement `forgot password` functionality
- [ ] login and register view: center forms
- [x] releases.vue: make medium title a link to the given medium view
- [ ] login.vue: try login after pressing enter
- [ ] make an events enum for bus.ts (less error prone for typos)
- [x] Releases.vue: query takes a long time (~15s for a query without until and ~250000 releases) -> speedup
    - index on releaseDate
    - limit cardinality on join by moving the where and limit clauses
    - reduced time for query example from above to < 200 ms
- [ ] when setting up from clean database, do not forget to add all indices from migrations (integrate in databaseSchema.ts?)
    - currently migrations are all skipped when setting up from clean database


## OpenApi

- [ ] API Endpoint parameter typing
    - add a hook to temporarily set them manually
- [ ] Object schemata to reference
- [ ] Add error responses