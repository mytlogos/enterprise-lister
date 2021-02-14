import { News, NewsStore, VuexStore } from "../siteTypes";
import { Module } from "vuex";
import { HttpClient } from "../Httpclient";

const module: Module<NewsStore, VuexStore> = {
    state: () => ({
        news: []
    }),
    mutations: {
        addNews(state, news: News[]): void {
            const ownNews = state.news;
            news = news
                .filter(
                    (value) =>
                        !ownNews.find((otherValue) => otherValue.id === value.id)
                )
                .map((value) => (value.date = new Date(value.date)) && value);

            if (news.length) {
                ownNews.push(...news);
            }
        }
    },
    actions: {
        markReadNews({ commit }, newsId: number): void {
            // if (this.readNews.indexOf(newsId) < 0) {
            //     this.readNews.push(newsId);
            //     this.newReadNews.push(newsId);
            // }
        },

        loadNews({ commit }, data: { from: Date | undefined; to: Date | undefined }): void {
            HttpClient.getNews(data.from, data.to)
                .then((news) => commit("userNews", news))
                .catch(console.log);
        },
    }
};
export default module;