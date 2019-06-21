import Vue, {VNode} from "vue";
import Router from "./router";
import AppComponent from "./App.vue";
import VueObserveVisibility from "vue-observe-visibility";
import {WSClient} from "./WebsocketClient";
import {emitBusEvent, onBusEvent} from "./bus";
import {optimizedResize} from "./init";
import {ExternalList, ExternalUser, List, Medium, News, TransferList, TransferMedium, User} from "./types";
import {HttpClient} from "./Httpclient";

Vue.config.devtools = true;
Vue.use(VueObserveVisibility);

const user = {

    get media(): Medium[] {
        return app.user.media;
    },

    set media(media: Medium[]) {
        app.user.media = media;
    },

    get columns() {
        return app.user.columns;
    },

    set columns(columns) {
        app.user.columns = columns;
    },

    get lists(): List[] {
        return app.user.lists;
    },

    set lists(lists: List[]) {
        app.user.lists = lists;
    },

    get session() {
        return app.session;
    },

    set session(session) {
        app.session = session;
    },

    get uuid() {
        return app.uuid;
    },

    set uuid(uuid) {
        app.uuid = uuid;
    },

    get name() {
        return app.user.name;
    },

    set name(name) {
        app.user.name = name;
    },
    get externalUser(): ExternalUser[] {
        return app.user.externalUser;
    },

    set externalUser(externalUser: ExternalUser[]) {
        app.user.externalUser = externalUser;
    },

    get news(): News[] {
        return app.user.news;
    },

    set news(news: News[]) {
        app.user.news = news;
    },

    clear() {
        this.name = "";
        this.uuid = "";
        this.session = "";
        this.lists = [];
        this.media = [];
        this.externalUser = [];
        // this.settings = {};
        // this.columns = [];
        return this;
    },

    setName(name: string) {
        this.name = name;
        return this;
    },

    setId(id: string) {
        this.uuid = id;
        return this;
    },

    setSession(session: string) {
        this.session = session;
        return this;
    },

    pushExternalUser(...externalUser: ExternalUser[]) {
        externalUser.forEach((value: ExternalUser) => value.lists.forEach((list: ExternalList) => {
            list.show = false;
            list.external = true;
        }));
        this.externalUser.push(...externalUser);
        return this;
    },

    deleteExternalUser(uuid: string) {
        const index = this.externalUser.findIndex((value) => value.uuid === uuid);
        if (index < 0) {
            return;
        }
        this.externalUser.splice(index, 1);
    },

    addMedium(...data: Medium[]) {
        this.media.push(...data);
        return this;
    },

    editMedium(data: object) {
        // todo implement editing
        console.log("edited");
        return this;
    },

    deleteMedium(id: number) {
        const index = this.media.findIndex((value) => value.id === id);
        if (index < 0) {
            throw Error("invalid mediumId");
        }
        this.media.splice(index, 1);
        this.lists.forEach((value) => {
            const listIndex = value.items.findIndex((itemId: number) => itemId === id);

            if (listIndex >= 0) {
                value.items.splice(listIndex, 1);
            }
        });
        return this;
    },

    addList(...lists: List[]) {
        lists.forEach((value) => {
            value.show = false;
            value.external = false;
            this.lists.push(value);
        });
        return this;
    },

    deleteList(id: number) {
        const index = this.lists.findIndex((value) => value.id === id);
        if (index < 0) {
            throw Error("invalid mediumId");
        }
        this.lists.splice(index, 1);
        return this;
    },

    /**
     *
     * @param {Array<News>} news
     */
    addNews(news: News[]) {
        const ownNews = this.news;
        news = news
            .filter((value) => !ownNews.find((otherValue) => otherValue.id === value.id))
            .map((value) => (value.date = new Date(value.date)) && value);

        if (news.length) {
            ownNews.push(...news);
        }
    },
};

interface Column {
    name: string;
    prop: string;
    show: boolean;
}

interface VueUser {
    lists: List[];
    news: News[];
    name: string;
    externalUser: ExternalUser[];
    media: Medium[];
    settings: object;
    columns: Column[];
}

interface Modal {
    show: boolean;
    error: string;
}

interface App {
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

const app: App = new Vue({
    el: "#app",
    router: Router,
    data: {
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
                {name: "Title", prop: "title", show: true},
                {name: "Author", prop: "author", show: true},
                {name: "Artist", prop: "artist", show: true},
            ],
        },
        readNews: [],
        newReadNews: [],
        session: "",
        uuid: "",
    },

    render(h): VNode {
        return h(AppComponent, {
            props: this.user,
        });
    },

    mounted() {
        onBusEvent("open:register", () => this.registerModal.show = true);
        onBusEvent("do:register", (data: any) => this.register(data));

        onBusEvent("open:login", () => this.loginModal.show = true);
        onBusEvent("do:login", (data: any) => this.login(data));
        onBusEvent("do:logout", () => this.logout());

        onBusEvent("open:add-medium", () => this.addMediumModal.show = true);
        onBusEvent("open:medium", (data: any) => this.openMedium(data));
        onBusEvent("add:medium", (data: any) => this.addMedium(data));
        onBusEvent("edit:medium", (data: any) => this.editMedium(data));
        onBusEvent("delete:medium", (data: number) => this.deleteMedium(data));

        onBusEvent("open:add-list", () => this.addListModal.show = true);
        onBusEvent("add:list", (data: any) => this.addList(data));
        onBusEvent("delete:list", (data: number) => this.deleteList(data));

        onBusEvent("add:externalUser", (data: any) => this.addExternalUser(data));
        onBusEvent("delete:externalUser", (data: string) => this.deleteExternalUser(data));
        onBusEvent("refresh:externalUser", (data: string) => this.refreshExternalUser(data));

        onBusEvent("do:settings", (data: any) => this.changeSettings(data));

        onBusEvent("get:news", (data: any) => this.loadNews(data));
        onBusEvent("read:news", (data: number) => this.markReadNews(data));

        onBusEvent("append:media", (media: Medium | Medium[]) => {
            if (Array.isArray(media)) {
                user.addMedium(...media);
            } else {
                user.addMedium(media);
            }
        });

        onBusEvent("reset:modal", () => this.closeModal());

        optimizedResize.add(() => emitBusEvent("window:resize"));

        // @ts-ignore
        HttpClient.user = user;
        // TODO: use invalidation polling to check
        // WSClient.addEventListener(events.ADD, (value) => this.processAddEvent(value));
        // WSClient.addEventListener(events.DELETE, (value) => this.processDeleteEvent(value));
        // WSClient.addEventListener(events.UPDATE, (value) => this.processUpdateEvent(value));
        // WSClient.addEventListener(events.NEWS, (value) => user.addNews(value));

        this.loginState();
        this.sendPeriodicData();
    },
    methods: {
        processDeleteEvent(value: any) {
            if (value.items) {
                value.items.forEach((item: TransferMedium) => {
                    let list;
                    if (item.external) {
                        list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList) => externalList.id === item.listId);
                    } else {
                        list = user.lists.find((internalList) => internalList.id === item.listId);
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
                    for (const externalUser of user.externalUser) {

                        const index = externalUser.lists
                            .findIndex((externalList: ExternalList) => externalList.id === id);

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
                        const list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList) => externalList.id === item.listId);

                        if (item.name && list) {
                            list.name = item.name;
                        }
                    } else {
                        const list = user.lists.find((internalList) => internalList.id === item.id);

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
                        list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList: ExternalList) => externalList.id === item.listId);

                    } else {
                        list = user.lists.find((internalList) => internalList.id === item.listId);
                    }
                    if (!list) {
                        return;
                    }
                    list.items.push(item.mediumId);
                });
            }
            if (value.externalList) {
                value.externalList.forEach((list: ExternalList) => {

                    for (const externalUser of user.externalUser) {
                        if (list.uuid === externalUser.uuid
                            && !externalUser.lists
                                .find((externalList: ExternalList) => externalList.id === list.id)) {

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

        resetModal(modal: { show: boolean, error: string }) {
            modal.show = false;
            modal.error = "";
        },

        sendPeriodicData() {
            if (this.newReadNews.length) {
                WSClient.push({read: {news: this.newReadNews}});
                // @ts-ignore
                this.newReadNews = [];
            }
            setTimeout(() => this.sendPeriodicData(), 500);
        },

        loginState() {
            if (this.loggedIn) {
                return;
            }
            HttpClient
                .isLoggedIn()
                .then((newUser: User) => {
                    if (!this.loggedIn && newUser) {
                        this.setUser(newUser);
                    } else {
                        throw Error();
                    }
                })
                .catch(() => setTimeout(() => this.loginState(), 5000));
        },

        login(data: { user: string, pw: string }) {
            if (!data.user) {
                this.loginModal.error = "Username is missing";
            } else if (!data.pw) {
                this.loginModal.error = "Password is missing";
            } else {
                // fixme modal does not close after successful login
                HttpClient
                    .login(data.user, data.pw)
                    .then((newUser: User) => {
                        this.setUser(newUser);
                        this.resetModal(this.loginModal);
                    })
                    .catch((error: any) => this.loginModal.error = String(error));
            }
        },

        register(data: { user: string, pw: string, pwRepeat: string }) {
            if (!data.user) {
                this.registerModal.error = "Username is missing";
            } else if (!data.pw) {
                this.registerModal.error = "Password is missing";
            } else if (!data.pwRepeat) {
                this.registerModal.error = "Password was not repeated";
            } else if (data.pwRepeat !== data.pw) {
                this.registerModal.error = "Repeated Password is not password";
            } else {
                HttpClient
                    .register(data.user, data.pw, data.pwRepeat)
                    .then((newUser: User) => {
                        this.setUser(newUser);
                        this.resetModal(this.registerModal);
                    })
                    .catch((error: any) => this.registerModal.error = String(error));
            }
        },

        addExternalUser(data: { identifier: string, pwd: string }) {
            if (!data.identifier) {
                emitBusEvent("error:add:externalUser", "Identifier is missing!");
            } else if (!data.pwd) {
                emitBusEvent("error:add:externalUser", "Password is missing!");
            } else {
                HttpClient
                    .addExternalUser(data)
                    .then((externalUser: ExternalUser) => user.pushExternalUser(externalUser))
                    .catch((error: any) => emitBusEvent("error:add:externalUser", String(error)));

            }
        },

        deleteExternalUser(uuid: string) {
            if (!uuid) {
                console.error("cannot delete externalUser without data");
                return;
            }

            HttpClient
                .deleteExternalUser(uuid)
                .then(() => user.deleteExternalUser(uuid))
                .catch((error: any) => console.log(error));
        },

        refreshExternalUser(uuid: string) {
            if (!uuid) {
                console.error("cannot refresh externalUser without data");
                return;
            }

            WSClient.push({refresh: {externalUuid: uuid}});
        },

        setUser(setUser: User) {
            return user
                .clear()
                .setName(setUser.name)
                .setId(setUser.uuid)
                .setSession(setUser.session)
                .addList(...setUser.lists)
                .pushExternalUser(...setUser.externalUser);
        },

        logout() {
            HttpClient
                .logout()
                .then((loggedOut: any) => {
                    user.clear();

                    if (!loggedOut) {
                        this.errorModal.error = "An error occurred while logging out";
                    }
                })
                .catch((error: any) => this.errorModal.error = String(error));
            // todo implement logout
        },

        openMedium(id: number) {
            // todo implement this
            console.log(id);
        },

        addMedium(data: { title: string, type: number }) {
            if (!data.title) {
                this.addMediumModal.error = "Missing title";
            } else if (!data.type) {
                this.addMediumModal.error = "Missing type";
            } else {
                HttpClient
                    .createMedium(data)
                    .then((medium) => {
                        user.addMedium(medium);
                        this.resetModal(this.addMediumModal);
                    })
                    .catch((error) => this.addMediumModal.error = String(error));
            }
            // todo implement addMedium
        },

        editMedium(data: { id: number, prop: string }) {
            if (data.id == null || !data.prop) {
                // todo handle this better
                throw Error();
            } else {
                HttpClient.updateMedium(data).catch(console.log);
            }
            // todo implement editMedium
        },

        deleteMedium(id: number) {
            if (id == null) {
                // todo handle this better
                throw Error();
            } else {
                HttpClient
                    .deleteMedium(id)
                    .then(() => emitBusEvent("deletion", false))
                    .catch((error) => console.log(error));
            }
            // todo implement deleteMedium
        },

        addList(data: { name: string, type: number }) {
            if (!data.name) {
                this.addListModal.error = "Missing name";
            } else if (!data.type) {
                this.addListModal.error = "Missing type";
            } else {
                HttpClient
                    .createList(data)
                    .then((list) => {
                        user.addList(list);
                        this.resetModal(this.addListModal);
                    })
                    .catch((error) => this.addListModal.error = String(error));
            }
            // todo implement addList
        },

        deleteList(id: number) {
            HttpClient
                .deleteList(id)
                .then(() => console.log("success"))
                .catch((error) => console.log(error));
            // todo implement deleteList
        },

        changeSettings(data: any) {
            // todo implement settings
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
        loadNews(data: { from: Date | undefined, to: Date | undefined }) {
            HttpClient
                .getNews(data.from, data.to)
                .then((news) => user.addNews(news))
                .catch(console.log);
        },
    },
    computed: {
        loggedIn(): boolean {
            return !!this.user.name;
        },
    },
    watch: {
        loggedIn(newValue) {
            if (!newValue) {
                WSClient.close();
                this.loginState();
            } else {
                WSClient
                    .startPush()
                    .then(() => WSClient.push({uuid: this.uuid}))
                    .catch(console.log);
            }
        },
    },
});

// todo rework news, add the read property to news item itself instead of asking for it
// todo login mechanism, check if it was already logged in before
// todo give a reason for any rejects
