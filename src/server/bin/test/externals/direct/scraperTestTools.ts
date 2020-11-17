import * as scraperTools from "../../../externals/scraperTools";
import * as tools from "../../../tools";
import { TocContent } from "../../../externals/types";
const MediaType = tools.MediaType;

interface GeneralToc {
    title: string;
    link: string;
    mediumType: tools.MediaType.TEXT;
    content: TocContent[];
}

exports.testGeneralToc = function testGeneralToc(toc: GeneralToc) {
    toc.should.be.an("object");
    toc.title.should.be.a("string");
    toc.link.should.be.a("string");
    toc.mediumType.should.equals(MediaType.TEXT);
    toc.content.should.be.an("array");

    const seenFirstLevelIndices = [];
    const seenSecondLevelIndices = [];

    for (let i = 0; i < toc.content.length; i++) {
        const tocContent = toc.content[i];
        (() => scraperTools.checkTocContent(tocContent)).should.not.throw();
        tocContent.title.should.be.an("string").and.be.not.empty;

        if (i > 0) {
            // total Index of TocContent should be unique to ToC at this level
            seenFirstLevelIndices.should.not.contain(tocContent.combiIndex);
            seenFirstLevelIndices.push(tocContent.combiIndex)
        }
        if (tools.isTocPart(tocContent)) {
            tocContent.episodes.should.be.an("array");
            for (let j = 0; j < tocContent.episodes.length; j++) {
                const episode = tocContent.episodes[j];
                (() => scraperTools.checkTocContent(episode)).should.not.throw();

                if (j > 0) {
                    // total Index of TocContent should be unique to ToC at this level
                    seenSecondLevelIndices.should.not.contain(episode.combiIndex);
                    seenSecondLevelIndices.push(episode.combiIndex)
                }
            }
        }
    }
};
