import { VNode, createApp, h } from "vue";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import Router from "./router";
import AppComponent from "./App.vue";
import VueObserveVisibility from "vue-observe-visibility";
import { emitBusEvent, onBusEvent } from "./bus";
import { optimizedResize } from "./init";
import {
    ExternalList,
    ExternalUser,
    List,
    Medium,
    News,
    TransferList,
    TransferMedium,
    User,
} from "./siteTypes";
import { HttpClient } from "./Httpclient";
import { Column } from "./siteTypes";

interface VueUser {
    lists: List[];
    news: News[];
    name: string;
    externalUser: ExternalUser[];
    media: Medium[];
    settings: any;
    columns: Column[];
}

interface Modal {
    show: boolean;
    error: string;
}

interface AppData {
    addListModal: Modal;
    addMediumModal: Modal;
    loginModal: Modal;
    registerModal: Modal;
    settingsModal: Modal;
    errorModal: Modal;
    loadingMedia: number[];
    user: VueUser;
    readNews: number[];
    newReadNews: number[];
    session: string;
    uuid: string;
}

const app = createApp({
    data(): AppData {
        return {
            addListModal: {
                show: false,
                error: "",
            },
            addMediumModal: {
                show: false,
                error: "",
            },
            loginModal: {
                show: false,
                error: "",
            },
            registerModal: {
                show: false,
                error: "",
            },
            settingsModal: {
                show: false,
                error: "",
            },
            errorModal: {
                show: false,
                error: "",
            },
            loadingMedia: [],
            user: {
                lists: [],
                news: [],
                name: "",
                externalUser: [],
                media: [],
                settings: {},
                columns: [
                    { name: "Title", prop: "title", show: true },
                    { name: "Author", prop: "author", show: true },
                    { name: "Artist", prop: "artist", show: true },
                ]
            },
            readNews: [],
            newReadNews: [],
            session: "",
            uuid: "",
        };
    },

    computed: {
        loggedIn(): boolean {
            return !!this.user.name;
        },
    },

    watch: {
        loggedIn(newValue) {
            console.log("loggedin changed: ", newValue);
            if (!newValue) {
                this.loginState();
            } else {
                HttpClient.getLists().then(lists => {
                    this.user.lists = lists;
                    console.log("Finished loading Lists");
                }).catch(console.error);

            }
        },
    },

    mounted() {
        onBusEvent("open:register", () => (this.registerModal.show = true));
        onBusEvent("do:register", (data: any) => this.register(data));

        onBusEvent("open:login", () => (this.loginModal.show = true));
        onBusEvent("do:login", (data: any) => this.login(data));
        onBusEvent("do:logout", () => this.logout());

        onBusEvent("open:add-medium", () => (this.addMediumModal.show = true));
        onBusEvent("open:medium", (data: any) => this.openMedium(data));
        onBusEvent("add:medium", (data: any) => this.addMedium(data));
        onBusEvent("edit:medium", (data: any) => this.editMedium(data));
        onBusEvent("delete:medium", (data: number) => this.deleteMedium(data));

        onBusEvent("open:add-list", () => (this.addListModal.show = true));
        onBusEvent("add:list", (data: any) => this.addList(data));
        onBusEvent("delete:list", (data: number) => this.deleteList(data));

        onBusEvent("add:externalUser", (data: any) =>
            this.addExternalUser(data)
        );
        onBusEvent("delete:externalUser", (data: string) =>
            this.deleteExternalUser(data)
        );
        onBusEvent("refresh:externalUser", (data: string) =>
            this.refreshExternalUser(data)
        );

        onBusEvent("do:settings", (data: any) => this.changeSettings(data));

        onBusEvent("get:news", (data: any) => this.loadNews(data));
        onBusEvent("read:news", (data: number) => this.markReadNews(data));

        onBusEvent("append:media", (media: Medium | Medium[]) => {
            if (Array.isArray(media)) {
                this.userAddMedium(...media);
            } else {
                this.userAddMedium(media);
            }
        });

        onBusEvent("reset:modal", () => this.closeModal());

        optimizedResize.add(() => emitBusEvent("window:resize"));

        console.log("Mounted:", this.user, this.$router);
        // @ts-ignore
        HttpClient.user = this.user;
        // TODO: use invalidation polling to check
        // WSClient.addEventListener(events.ADD, (value) => this.processAddEvent(value));
        // WSClient.addEventListener(events.DELETE, (value) => this.processDeleteEvent(value));
        // WSClient.addEventListener(events.UPDATE, (value) => this.processUpdateEvent(value));
        // WSClient.addEventListener(events.NEWS, (value) => user.addNews(value));

        this.loginState();
    },

    methods: {
        processDeleteEvent(value: any) {
            if (value.items) {
                value.items.forEach((item: TransferMedium) => {
                    let list;
                    if (item.external) {
                        list = this.user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find(
                                (externalList) =>
                                    externalList.id === item.listId
                            );
                    } else {
                        list = this.user.lists.find(
                            (internalList) => internalList.id === item.listId
                        );
                    }

                    if (!list) {
                        return;
                    }

                    const index = list.items.indexOf(item.mediumId);
                    if (index < 0) {
                        return;
                    }
                    list.items.splice(index, 1);
                });
            }
            if (value.externalList) {
                value.externalList.forEach((id: number) => {
                    for (const externalUser of this.user.externalUser) {
                        const index = externalUser.lists.findIndex(
                            (externalList: ExternalList) =>
                                externalList.id === id
                        );

                        if (index < 0) {
                            continue;
                        }

                        externalUser.lists.splice(index, 1);
                        break;
                    }
                });
            }
            console.log(value);
        },

        processUpdateEvent(value: any) {
            if (value.lists) {
                value.lists.forEach((item: TransferList) => {
                    if (item.external) {
                        const list = this.user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find(
                                (externalList) =>
                                    externalList.id === item.listId
                            );

                        if (item.name && list) {
                            list.name = item.name;
                        }
                    } else {
                        const list = this.user.lists.find(
                            (internalList) => internalList.id === item.id
                        );

                        if (item.name && list) {
                            list.name = item.name;
                        }
                    }
                });
            }
            console.log(value);
        },

        processAddEvent(value: any) {
            if (value.items) {
                value.items.forEach((item: TransferMedium) => {
                    let list;
                    if (item.external) {
                        list = this.user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find(
                                (externalList: ExternalList) =>
                                    externalList.id === item.listId
                            );
                    } else {
                        list = this.user.lists.find(
                            (internalList) => internalList.id === item.listId
                        );
                    }
                    if (!list) {
                        return;
                    }
                    list.items.push(item.mediumId);
                });
            }
            if (value.externalList) {
                value.externalList.forEach((list: ExternalList) => {
                    for (const externalUser of this.user.externalUser) {
                        if (
                            list.uuid === externalUser.uuid &&
                            !externalUser.lists.find(
                                (externalList: ExternalList) =>
                                    externalList.id === list.id
                            )
                        ) {
                            externalUser.lists.push(list);
                            break;
                        }
                    }
                });
            }
        },

        closeModal() {
            this.resetModal(this.loginModal);
            this.resetModal(this.registerModal);
            this.resetModal(this.settingsModal);
            this.resetModal(this.addListModal);
            this.resetModal(this.addMediumModal);
        },

        resetModal(modal: { show: boolean; error: string }) {
            modal.show = false;
            modal.error = "";
        },

        loginState() {
            console.log("loginState:", this.user);
            if (this.loggedIn) {
                return;
            }
            HttpClient.isLoggedIn()
                .then((newUser: User) => {
                    console.log(`Logged In: ${this.loggedIn} New User: `, newUser);
                    if (!this.loggedIn && newUser) {
                        this.setUser(newUser);
                        // automatically navigate to view under home if successfully logged in
                        this.$router.push("/").catch(console.error);
                        console.log("pushed home");
                    } else {
                        throw Error();
                    }
                })
                .catch(() => setTimeout(() => this.loginState(), 5000));
        },

        login(data: { user: string; pw: string }) {
            if (!data.user) {
                this.loginModal.error = "Username is missing";
            } else if (!data.pw) {
                this.loginModal.error = "Password is missing";
            } else {
                // FIXME modal does not close after successful login
                HttpClient.login(data.user, data.pw)
                    .then((newUser: User) => {
                        this.setUser(newUser);
                        this.resetModal(this.loginModal);
                        // automatically navigate to view under home if successfully logged in
                        this.$router.push("/").catch(console.error);
                        console.log("pushed home");
                    })
                    .catch(
                        (error: any) => (this.loginModal.error = String(error))
                    );
            }
        },

        register(data: { user: string; pw: string; pwRepeat: string }) {
            if (!data.user) {
                this.registerModal.error = "Username is missing";
            } else if (!data.pw) {
                this.registerModal.error = "Password is missing";
            } else if (!data.pwRepeat) {
                this.registerModal.error = "Password was not repeated";
            } else if (data.pwRepeat !== data.pw) {
                this.registerModal.error = "Repeated Password is not password";
            } else {
                HttpClient.register(data.user, data.pw, data.pwRepeat)
                    .then((newUser: User) => {
                        this.setUser(newUser);
                        this.resetModal(this.registerModal);
                        // automatically navigate to view under home if successfully logged in
                        this.$router.push("/").catch(console.error);
                        console.log("pushed home");
                    })
                    .catch(
                        (error: any) =>
                            (this.registerModal.error = String(error))
                    );
            }
        },

        addExternalUser(data: { identifier: string; pwd: string }) {
            if (!data.identifier) {
                emitBusEvent(
                    "error:add:externalUser",
                    "Identifier is missing!"
                );
            } else if (!data.pwd) {
                emitBusEvent("error:add:externalUser", "Password is missing!");
            } else {
                HttpClient.addExternalUser(data)
                    .then((externalUser: ExternalUser) =>
                        this.userPushExternalUser(externalUser)
                    )
                    .catch((error: any) =>
                        emitBusEvent("error:add:externalUser", String(error))
                    );
            }
        },

        deleteExternalUser(uuid: string) {
            if (!uuid) {
                console.error("cannot delete externalUser without data");
                return;
            }

            HttpClient.deleteExternalUser(uuid)
                .then(() => this.userDeleteExternalUser(uuid))
                .catch((error: any) => console.log(error));
        },

        refreshExternalUser(uuid: string) {
            if (!uuid) {
                console.error("cannot refresh externalUser without data");
                return;
            }

            // TODO: replace this
            // WSClient.push({ refresh: { externalUuid: uuid } });
        },

        setUser(setUser: User) {
            return this
                .userClear()
                .userSetName(setUser.name)
                .userSetId(setUser.uuid)
                .userSetSession(setUser.session)
                .userAddList(...setUser.lists)
                .userPushExternalUser(...setUser.externalUser);
        },

        logout() {
            HttpClient.logout()
                .then((loggedOut: any) => {
                    this.userClear();

                    if (!loggedOut) {
                        this.errorModal.error =
                            "An error occurred while logging out";
                    }
                })
                .catch((error: any) => (this.errorModal.error = String(error)));
            // TODO implement logout
        },

        openMedium(id: number) {
            // TODO implement this
            console.log(id);
        },

        addMedium(data: { title: string; type: number }) {
            if (!data.title) {
                this.addMediumModal.error = "Missing title";
            } else if (!data.type) {
                this.addMediumModal.error = "Missing type";
            } else {
                HttpClient.createMedium(data)
                    .then((medium) => {
                        this.userAddMedium(medium);
                        this.resetModal(this.addMediumModal);
                    })
                    .catch(
                        (error) => (this.addMediumModal.error = String(error))
                    );
            }
            // TODO implement addMedium
        },

        editMedium(data: { id: number; prop: string }) {
            if (data.id == null || !data.prop) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.updateMedium(data).catch(console.log);
            }
            // TODO implement editMedium
        },

        deleteMedium(id: number) {
            if (id == null) {
                // TODO handle this better
                throw Error();
            } else {
                HttpClient.deleteMedium(id)
                    .then(() => emitBusEvent("deletion", false))
                    .catch((error) => console.log(error));
            }
            // TODO implement deleteMedium
        },

        addList(data: { name: string; type: number }) {
            if (!data.name) {
                this.addListModal.error = "Missing name";
            } else if (!data.type) {
                this.addListModal.error = "Missing type";
            } else {
                HttpClient.createList(data)
                    .then((list) => {
                        this.userAddList(list);
                        this.resetModal(this.addListModal);
                    })
                    .catch(
                        (error) => (this.addListModal.error = String(error))
                    );
            }
            // TODO implement addList
        },

        deleteList(id: number) {
            HttpClient.deleteList(id)
                .then(() => console.log("success"))
                .catch((error) => console.log(error));
            // TODO implement deleteList
        },

        changeSettings(data: any) {
            // TODO implement settings
        },

        markReadNews(newsId: number) {
            if (this.readNews.indexOf(newsId) < 0) {
                this.readNews.push(newsId);
                this.newReadNews.push(newsId);
            }
        },

        /**
         *
         * @param {{from: Date|undefined, to: Date|undefined}} data
         */
        loadNews(data: { from: Date | undefined; to: Date | undefined }) {
            HttpClient.getNews(data.from, data.to)
                .then((news) => this.userAddNews(news))
                .catch(console.log);
        },

        userClear() {
            this.user.name = "";
            this.user.uuid = "";
            this.user.session = "";
            this.user.lists = [];
            this.user.media = [];
            this.user.externalUser = [];
            // this.settings = {};
            // this.columns = [];
            return this;
        },

        userSetName(name: string) {
            this.user.name = name;
            return this;
        },

        userSetId(id: string) {
            this.user.uuid = id;
            return this;
        },

        userSetSession(session: string) {
            this.user.session = session;
            return this;
        },

        userPushExternalUser(...externalUser: ExternalUser[]) {
            externalUser.forEach((value: ExternalUser) =>
                value.lists.forEach((list: ExternalList) => {
                    list.show = false;
                    list.external = true;
                })
            );
            this.user.externalUser.push(...externalUser);
            return this;
        },

        userDeleteExternalUser(uuid: string) {
            const index = this.user.externalUser.findIndex(
                (value) => value.uuid === uuid
            );
            if (index < 0) {
                return;
            }
            this.user.externalUser.splice(index, 1);
        },

        userAddMedium(...data: Medium[]) {
            this.user.media.push(...data);
            return this;
        },

        userEditMedium(data: any) {
            // TODO implement editing
            console.log("edited");
            return this;
        },

        userDeleteMedium(id: number) {
            const index = this.user.media.findIndex((value) => value.id === id);
            if (index < 0) {
                throw Error("invalid mediumId");
            }
            this.user.media.splice(index, 1);
            this.user.lists.forEach((value) => {
                const listIndex = value.items.findIndex(
                    (itemId: number) => itemId === id
                );

                if (listIndex >= 0) {
                    value.items.splice(listIndex, 1);
                }
            });
            return this;
        },

        userAddList(...lists: List[]) {
            lists.forEach((value) => {
                value.show = false;
                value.external = false;
                this.user.lists.push(value);
            });
            return this;
        },

        userDeleteList(id: number) {
            const index = this.user.lists.findIndex((value) => value.id === id);
            if (index < 0) {
                throw Error("invalid mediumId");
            }
            this.user.lists.splice(index, 1);
            return this;
        },

        /**
         *
         * @param {Array<News>} news
         */
        userAddNews(news: News[]) {
            const ownNews = this.user.news;
            news = news
                .filter(
                    (value) =>
                        !ownNews.find((otherValue) => otherValue.id === value.id)
                )
                .map((value) => (value.date = new Date(value.date)) && value);

            if (news.length) {
                ownNews.push(...news);
            }
        },
    },

    render(): VNode {
        // @ts-ignore
        return h(AppComponent, this.user);
    },
});
app.use(VueObserveVisibility);
app.use(Router);
Router.isReady().then(() => app.mount("#app"));
globalThis.app = app;
globalThis.router = Router;



// TODO rework news, add the read property to news item itself instead of asking for it
// TODO login mechanism, check if it was already logged in before
// TODO give a reason for any rejects
