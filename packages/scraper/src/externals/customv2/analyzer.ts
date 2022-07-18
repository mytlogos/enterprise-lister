import { JsonRegex } from "./types";
import { finder } from "./css-selector";

interface PropertyConfig {
  require?: {
    tag?: string;
    content?: {
      type: "text" | "attribute";
      pattern?: JsonRegex;
    };
  };
  properties?: Record<string, PropertyConfig>;
  array?: boolean;
}

interface Config {
  properties: Record<string, PropertyConfig>;
}

interface PropertyScore {
  /**
   * The total score
   */
  score: number;
  /**
   * Number of children with such a PropertyScore per descendentLevel
   */
  levels: number[];
}

declare global {
  interface Node {
    analyzer: Record<string, PropertyScore>;
  }
}

export class ScrapeAnalyzer {
  private _doc: Document;

  public constructor(document: Document) {
    this._doc = document;
  }

  private log(...values: any[]) {
    console.log(...values);
  }

  private isProbablyVisible(node: HTMLElement) {
    // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
    return (
      (!node.style || node.style.display != "none") &&
      !node.hasAttribute("hidden") &&
      //check for "fallback-image" so that wikimedia math images are displayed
      (!node.hasAttribute("aria-hidden") ||
        node.getAttribute("aria-hidden") != "true" ||
        (node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1))
    );
  }

  private getNodeAncestors(node: Node, maxDepth?: number): HTMLElement[] {
    maxDepth = maxDepth || 0;
    let i = 0;
    const ancestors = [];

    while (node.parentNode) {
      ancestors.push(node.parentNode);
      if (maxDepth && ++i === maxDepth) break;
      node = node.parentNode;
    }
    return ancestors.filter((value) => value.nodeType === value.ELEMENT_NODE) as HTMLElement[];
  }

  private initNode(node: HTMLElement, key: string) {
    if (!node.analyzer) {
      node.analyzer = {};
    }
    if (!node.analyzer[key]) {
      node.analyzer[key] = { score: 0, levels: [] };
    }
  }

  /**
   * Score a single node based on the characteristics of the properties.
   *
   * @param node current node to score
   * @param candidates array of candidates to add this node to
   * @param properties properties to score
   * @param parentKey propertey key of parent
   */
  private scoreNode(
    node: HTMLElement,
    candidates: HTMLElement[],
    properties: Record<string, PropertyConfig>,
    parentKey = "",
  ) {
    const matchString = node.className + " " + node.id;

    const unlikelyCandidates =
      /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i;

    let generalScore = 0;

    if (unlikelyCandidates.test(matchString)) {
      generalScore = -5;
    }

    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = parentKey ? parentKey + "." + key : key;

      if (!node.analyzer || !node.analyzer[propertyKey]) {
        if (value.require?.tag && value.require.tag.toLowerCase() === node.tagName.toLowerCase()) {
          this.initNode(node, propertyKey);
          node.analyzer[propertyKey].score += 5 + generalScore;
        }
        if (value.require?.content) {
          if (value.require.content.pattern) {
            const pattern = new RegExp(value.require.content.pattern.pattern, value.require.content.pattern.flags);

            if (value.require.content.type === "text") {
              const textValue = node.textContent || "";

              if (textValue.length < 300 && pattern.test(textValue)) {
                this.initNode(node, propertyKey);
                node.analyzer[propertyKey].score += 5 + generalScore;
              }
            }
          }
        }
      }

      if (node.analyzer && candidates[candidates.length - 1] !== node) {
        candidates.push(node);
      }
      if (value.properties) {
        this.scoreNode(node, candidates, value.properties, propertyKey);
      }
    }
  }

  private visit(node: HTMLElement, candidates: HTMLElement[], config: Config) {
    if (!this.isProbablyVisible(node)) {
      this.log("Skipping hidden node");
      return;
    }

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      this.visit(child as HTMLElement, candidates, config);

      if (child.analyzer) {
        if (!node.analyzer) {
          node.analyzer = {};
        }
        for (const [key, value] of Object.entries(child.analyzer)) {
          let nodeValue = node.analyzer[key];

          if (!nodeValue) {
            node.analyzer[key] = nodeValue = { score: 0, levels: [0] };
          }
          nodeValue.levels[0]++;

          for (let level = 0; level < value.levels.length; level++) {
            const levelCount = value.levels[level];

            if (level + 1 >= nodeValue.levels.length) {
              nodeValue.levels.push(levelCount);
            } else {
              nodeValue.levels[level + 1] += levelCount;
            }
          }
          nodeValue.score += value.score / 2;
        }
      }
    }

    this.scoreNode(node, candidates, config.properties);

    if (node.analyzer) {
      Object.values(node.analyzer).forEach((value) => {
        const count = value.levels[0];

        if (count) {
          value.score += 0.5 * count;
        }
      });
    }
  }

  public configKeyGroups(properties: Record<string, PropertyConfig>, parentKey = "", groups: string[][] = []) {
    const group: string[] = [];

    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = parentKey ? parentKey + "." + key : key;
      group.push(propertyKey);

      if (value.properties) {
        this.configKeyGroups(value.properties, propertyKey, groups);
      }
    }
    if (group.length) {
      groups.push(group);
    }
    return groups;
  }

  public parse(config: Config) {
    const result = {} as any;
    this.log("**** grabArticle ****");
    const page = this._doc.body;

    // We can't grab an article if we don't have a page!
    if (!page) {
      this.log("No body found in document. Abort.");
      return null;
    }

    const node: HTMLElement | null = this._doc.documentElement;
    const candidates: HTMLElement[] = [];

    if (node.tagName === "HTML") {
      result.lang = node.getAttribute("lang");
    }

    this.visit(node, candidates, config);
    const keyGroups = this.configKeyGroups(config.properties);

    candidates
      .filter((value) => {
        if (["HTML", "BODY"].includes(value.tagName)) {
          return false;
        }
        const groupScore: Array<{ count: number; total: number }> = [];

        keyGroups.forEach((group) => {
          const score = { count: 0, total: group.length };
          groupScore.push(score);

          for (const key of group) {
            const aValue = value.analyzer[key];

            if (aValue) {
              score.count++;
            }
          }
        });

        // at least one group should be satisfied
        return groupScore.some((score) => score.count === score.total);
      })
      .sort((a, b) => {
        const groupScoreA: Array<{ score: number; count: number; total: number }> = [];
        const groupScoreB: Array<{ score: number; count: number; total: number }> = [];

        keyGroups.forEach((group) => {
          const aScore = { score: 0, count: 0, total: group.length };
          const bScore = { score: 0, count: 0, total: group.length };

          groupScoreA.push(aScore);
          groupScoreB.push(bScore);

          for (const key of group) {
            const aValue = a.analyzer[key];
            const bValue = b.analyzer[key];

            if (aValue) {
              aScore.count++;
              aScore.score += aValue.score;
            }
            if (bValue) {
              bScore.count++;
              bScore.score += bValue.score;
            }
          }
        });

        const sumA = groupScoreA.reduce((previous, current) => {
          return previous + current.score * (current.total ? current.count / current.total : 1);
        }, 0);
        const sumB = groupScoreB.reduce((previous, current) => {
          return previous + current.score * (current.total ? current.count / current.total : 1);
        }, 0);
        return sumA - sumB;
      })
      .slice(-20) // print the 20 best only
      .forEach((value) => console.log(value.analyzer, value.tagName, finder(value)));
    return result;
  }
}
