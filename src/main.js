import Vue from "vue";
import Router from "./router";
import AppComponent from "./App.vue";
import VueObserveVisibility from "vue-observe-visibility";
import { events, WSClient } from "./WebsocketClient";
import { emitBusEvent, onBusEvent } from "@/bus";
import { optimizedResize } from "./init";
import { HttpClient } from "@/Httpclient";
Vue.config.devtools = true;
Vue.use(VueObserveVisibility);
const user = {
    get media() {
        return app.user.media;
    },
    set media(media) {
        app.user.media = media;
    },
    get columns() {
        return app.user.columns;
    },
    set columns(columns) {
        app.user.columns = columns;
    },
    get lists() {
        return app.user.lists;
    },
    set lists(lists) {
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
    get externalUser() {
        return app.user.externalUser;
    },
    set externalUser(externalUser) {
        app.user.externalUser = externalUser;
    },
    get news() {
        return app.user.news;
    },
    set news(news) {
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
    setName(name) {
        this.name = name;
        return this;
    },
    setId(id) {
        this.uuid = id;
        return this;
    },
    setSession(session) {
        this.session = session;
        return this;
    },
    pushExternalUser(...externalUser) {
        externalUser.forEach((value) => value.lists.forEach((list) => {
            list.show = false;
            list.external = true;
        }));
        this.externalUser.push(...externalUser);
        return this;
    },
    deleteExternalUser(uuid) {
        const index = this.externalUser.findIndex((value) => value.uuid === uuid);
        if (index < 0) {
            return;
        }
        this.externalUser.splice(index, 1);
    },
    addMedium(...data) {
        this.media.push(...data);
        return this;
    },
    editMedium(data) {
        // todo implement editing
        console.log("edited");
        return this;
    },
    deleteMedium(id) {
        const index = this.media.findIndex((value) => value.id === id);
        if (index < 0) {
            throw Error("invalid mediumId");
        }
        this.media.splice(index, 1);
        this.lists.forEach((value) => {
            const listIndex = value.items.findIndex((itemId) => itemId === id);
            if (listIndex >= 0) {
                value.items.splice(listIndex, 1);
            }
        });
        return this;
    },
    addList(...lists) {
        lists.forEach((value) => {
            value.show = false;
            value.external = false;
            this.lists.push(value);
        });
        return this;
    },
    deleteList(id) {
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
    addNews(news) {
        const ownNews = this.news;
        news = news
            .filter((value) => !ownNews.find((otherValue) => otherValue.id === value.id))
            .map((value) => (value.date = new Date(value.date)) && value);
        if (news.length) {
            ownNews.push(...news);
        }
    },
};
const app = new Vue({
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
                { name: "Title", prop: "title", show: true },
                { name: "Author", prop: "author", show: true },
                { name: "Artist", prop: "artist", show: true },
            ],
        },
        readNews: [],
        newReadNews: [],
        session: "",
        uuid: "",
    },
    render(h) {
        return h(AppComponent, {
            props: this.user,
        });
    },
    mounted() {
        onBusEvent("open:register", () => this.registerModal.show = true);
        onBusEvent("do:register", (data) => this.register(data));
        onBusEvent("open:login", () => this.loginModal.show = true);
        onBusEvent("do:login", (data) => this.login(data));
        onBusEvent("do:logout", () => this.logout());
        onBusEvent("open:add-medium", () => this.addMediumModal.show = true);
        onBusEvent("add:medium", (data) => this.addMedium(data));
        onBusEvent("edit:medium", (data) => this.editMedium(data));
        onBusEvent("delete:medium", (data) => this.deleteMedium(data));
        onBusEvent("open:add-list", () => this.addListModal.show = true);
        onBusEvent("add:list", (data) => this.addList(data));
        onBusEvent("delete:list", (data) => this.deleteList(data));
        onBusEvent("add:externalUser", (data) => this.addExternalUser(data));
        onBusEvent("delete:externalUser", (data) => this.deleteExternalUser(data));
        onBusEvent("refresh:externalUser", (data) => this.refreshExternalUser(data));
        onBusEvent("do:settings", (data) => this.changeSettings(data));
        onBusEvent("get:news", (data) => this.loadNews(data));
        onBusEvent("read:news", (data) => this.markReadNews(data));
        onBusEvent("reset:modal", () => this.closeModal());
        optimizedResize.add(() => emitBusEvent("window:resize"));
        // @ts-ignore
        HttpClient.user = user;
        WSClient.addEventListener(events.ADD, (value) => {
            if (value.items) {
                value.items.forEach((item) => {
                    let list;
                    if (item.external) {
                        list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList) => externalList.id === item.listId);
                    }
                    else {
                        list = user.lists.find((internalList) => internalList.id === item.listId);
                    }
                    if (!list) {
                        return;
                    }
                    list.items.push(item.mediumId);
                });
            }
            if (value.externalList) {
                value.externalList.forEach((list) => {
                    for (const externalUser of user.externalUser) {
                        if (list.uuid === externalUser.uuid
                            && !externalUser.lists.find((externalList) => externalList.id === list.id)) {
                            externalUser.lists.push(list);
                            break;
                        }
                    }
                });
            }
        });
        WSClient.addEventListener(events.DELETE, (value) => {
            if (value.items) {
                value.items.forEach((item) => {
                    let list;
                    if (item.external) {
                        list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList) => externalList.id === item.listId);
                    }
                    else {
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
                value.externalList.forEach((id) => {
                    for (const externalUser of user.externalUser) {
                        const index = externalUser.lists.findIndex((externalList) => externalList.id === id);
                        if (index < 0) {
                            continue;
                        }
                        externalUser.lists.splice(index, 1);
                        break;
                    }
                });
            }
            console.log(value);
        });
        WSClient.addEventListener(events.UPDATE, (value) => {
            if (value.lists) {
                value.lists.forEach((item) => {
                    if (item.external) {
                        const list = user.externalUser
                            .flatMap((externalUser) => externalUser.lists)
                            .find((externalList) => externalList.id === item.listId);
                        if (item.name && list) {
                            list.name = item.name;
                        }
                    }
                    else {
                        const list = user.lists.find((internalList) => internalList.id === item.id);
                        if (item.name && list) {
                            list.name = item.name;
                        }
                    }
                });
            }
            console.log(value);
        });
        WSClient.addEventListener(events.NEWS, (value) => user.addNews(value));
        this.loginState();
        this.sendPeriodicData();
        // generateData(100, this.media, 20, this.lists, (mI, lI) => mI % 2);
    },
    methods: {
        closeModal() {
            this.resetModal(this.loginModal);
            this.resetModal(this.registerModal);
            this.resetModal(this.settingsModal);
            this.resetModal(this.addListModal);
            this.resetModal(this.addMediumModal);
        },
        resetModal(modal) {
            modal.show = false;
            modal.error = "";
        },
        sendPeriodicData() {
            if (this.newReadNews.length) {
                WSClient.push({ read: { news: this.newReadNews } });
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
                .then((newUser) => {
                if (!this.loggedIn && newUser) {
                    this.setUser(newUser);
                }
                else {
                    throw Error();
                }
            })
                .catch(() => setTimeout(() => this.loginState(), 5000));
        },
        login(data) {
            if (!data.user) {
                this.loginModal.error = "Username is missing";
            }
            else if (!data.pw) {
                this.loginModal.error = "Password is missing";
            }
            else {
                // fixme modal does not close after successful login
                HttpClient
                    .login(data.user, data.pw)
                    .then((newUser) => {
                    this.setUser(newUser);
                    this.resetModal(this.loginModal);
                })
                    .catch((error) => this.loginModal.error = String(error));
            }
        },
        register(data) {
            if (!data.user) {
                this.registerModal.error = "Username is missing";
            }
            else if (!data.pw) {
                this.registerModal.error = "Password is missing";
            }
            else if (!data.pwRepeat) {
                this.registerModal.error = "Password was not repeated";
            }
            else if (data.pwRepeat !== data.pw) {
                this.registerModal.error = "Repeated Password is not password";
            }
            else {
                HttpClient
                    .register(data.user, data.pw, data.pwRepeat)
                    .then((newUser) => {
                    this.setUser(newUser);
                    this.resetModal(this.registerModal);
                })
                    .catch((error) => this.registerModal.error = String(error));
            }
        },
        addExternalUser(data) {
            if (!data.identifier) {
                emitBusEvent("error:add:externalUser", "Identifier is missing!");
            }
            else if (!data.pwd) {
                emitBusEvent("error:add:externalUser", "Password is missing!");
            }
            else {
                HttpClient
                    .addExternalUser(data)
                    .then((externalUser) => user.pushExternalUser(externalUser))
                    .catch((error) => emitBusEvent("error:add:externalUser", String(error)));
            }
        },
        deleteExternalUser(uuid) {
            if (!uuid) {
                console.error("cannot delete externalUser without data");
                return;
            }
            HttpClient
                .deleteExternalUser(uuid)
                .then(() => user.deleteExternalUser(uuid))
                .catch((error) => console.log(error));
        },
        refreshExternalUser(uuid) {
            if (!uuid) {
                console.error("cannot refresh externalUser without data");
                return;
            }
            WSClient.push({ refresh: { externalUuid: uuid } });
        },
        setUser(setUser) {
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
                .then((loggedOut) => {
                user.clear();
                if (!loggedOut) {
                    this.errorModal.error = "An error occurred while logging out";
                }
            })
                .catch((error) => this.errorModal.error = String(error));
            // todo implement logout
        },
        addMedium(data) {
            if (!data.title) {
                this.addMediumModal.error = "Missing title";
            }
            else if (!data.type) {
                this.addMediumModal.error = "Missing type";
            }
            else {
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
        editMedium(data) {
            if (data.id == null || !data.prop) {
                // todo handle this better
                throw Error();
            }
            else {
                HttpClient.updateMedium(data).catch(console.log);
            }
            // todo implement editMedium
        },
        deleteMedium(id) {
            if (id == null) {
                // todo handle this better
                throw Error();
            }
            else {
                HttpClient
                    .deleteMedium(id)
                    .then(() => emitBusEvent("deletion", false))
                    .catch((error) => console.log(error));
            }
            // todo implement deleteMedium
        },
        addList(data) {
            if (!data.name) {
                this.addListModal.error = "Missing name";
            }
            else if (!data.type) {
                this.addListModal.error = "Missing type";
            }
            else {
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
        deleteList(id) {
            HttpClient
                .deleteList(id)
                .then(() => console.log("success"))
                .catch((error) => console.log(error));
            // todo implement deleteList
        },
        changeSettings(data) {
            // todo implement settings
        },
        markReadNews(newsId) {
            if (this.readNews.indexOf(newsId) < 0) {
                this.readNews.push(newsId);
                this.newReadNews.push(newsId);
            }
        },
        /**
         *
         * @param {{from: Date|undefined, to: Date|undefined}} data
         */
        loadNews(data) {
            HttpClient
                .getNews(data.from, data.to)
                .then((news) => user.addNews(news))
                .catch(console.log);
        },
    },
    computed: {
        loggedIn() {
            return !!this.user.name;
        },
    },
    watch: {
        loggedIn(newValue) {
            if (!newValue) {
                WSClient.close();
                this.loginState();
            }
            else {
                WSClient
                    .startPush()
                    .then(() => WSClient.push({ uuid: this.uuid }))
                    .catch(console.log);
            }
        },
    },
});
// todo login mechanism, check if it was already logged in before
// todo give a reason for any rejects
//# sourceMappingURL=main.js.map