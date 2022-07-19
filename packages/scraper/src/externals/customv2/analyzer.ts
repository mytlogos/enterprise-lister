import { JsonRegex } from "./types";
import { finder } from "./css-selector";

interface Scorer {
  propertyKey: string;
}

interface TagScorer extends Scorer {
  tagName: string;
}

interface TextScorer extends Scorer {
  pattern: RegExp;
}

interface AttributeScorer extends Scorer {
  pattern: RegExp;
  attr: RegExp;
}

interface DescendantScorer extends Scorer {
  descendantOf: string;
}

type ArrayScorer = Scorer;

interface GroupScorer {
  group: string[];
}

interface PropertyConfig {
  require?: {
    tag?: string;
    content?:
      | {
          type: "text";
          pattern: JsonRegex;
          minLength?: number;
          maxLength?: number;
        }
      | {
          type: "attribute";
          attr?: string; // either attr or pattern or both, none is illegal
          pattern?: JsonRegex;
        };
    descendantOf?: string;
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
   * Total score of the node
   */
  nodeScore: number;

  /**
   * Total score of the node
   */
  descendantScore: number[];

  /**
   * Generalscore dependant on the node attributes.
   * e.g. banner and comments should never be really used.
   */
  generalScore: number;

  /**
   * Score based on text pattern.
   */
  patternScore: number;

  /**
   * Score based on text pattern.
   */
  tagScore: number;

  /**
   * Score scaled on how many children with score a node has.
   */
  childrenScore: number;

  /**
   *
   */
  siblingScore: number;

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
      node.analyzer[key] = {
        score: 0,
        levels: [0],
        generalScore: 0,
        descendantScore: [0],
        nodeScore: 0,
        patternScore: 0,
        tagScore: 0,
        childrenScore: 0,
        siblingScore: 0,
      } as PropertyScore;
    }
    return node.analyzer[key];
  }

  private scoreProperty(node: HTMLElement, propertyKey: string, generalScore: number, value: PropertyConfig) {
    if (generalScore) {
      this.initNode(node, propertyKey).generalScore = generalScore;
    }
    const require = value.require;

    if (require) {
      if (require.tag && require.tag.toLowerCase() === node.tagName.toLowerCase()) {
        this.initNode(node, propertyKey).tagScore += 5;
      }
      if (require.content) {
        if (require.content.type === "text") {
          const textValue = node.textContent || "";

          if (require.content.pattern) {
            const pattern = new RegExp(require.content.pattern.pattern, require.content.pattern.flags);
            const notTooBig = textValue.length <= (require.content.maxLength || Number.POSITIVE_INFINITY);
            const notTooSmall = textValue.length >= (require.content.minLength || 0);

            if (notTooBig && notTooSmall && pattern.test(textValue)) {
              this.initNode(node, propertyKey).patternScore += 5;
            } else {
              this.initNode(node, propertyKey).patternScore -= 5;
            }
          }
        } else if (require.content.type === "attribute" && require.content.attr && require.content.pattern) {
          const textValue = node.getAttribute(require.content.attr) || "";

          const pattern = new RegExp(require.content.pattern.pattern, require.content.pattern.flags);

          if (pattern.test(textValue)) {
            this.initNode(node, propertyKey).patternScore += 5;
          } else {
            this.initNode(node, propertyKey).patternScore -= 5;
          }
        }
      }
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

      // add score only once
      if (!node.analyzer || !node.analyzer[propertyKey]) {
        this.scoreProperty(node, propertyKey, generalScore, value);
      }
      if (value.properties) {
        this.scoreNode(node, candidates, value.properties, propertyKey);
      }
    }
  }

  private propertyMap = new Map<string, PropertyConfig>();

  private getConfigProperty(propertyKey: string, config: Config) {
    const mapValue = this.propertyMap.get(propertyKey);

    if (mapValue) {
      return mapValue;
    }
    let properties = config.properties;
    let propertyConfig = null;

    const keyParts = propertyKey.split(".");

    for (let index = 0; index < keyParts.length; index++) {
      const key = keyParts[index];
      const value = properties[key];

      if (value) {
        propertyConfig = value;

        if (value.properties) {
          properties = value.properties;
        } else if (index + 1 < keyParts.length) {
          throw Error(`did not expect another key: '${keyParts[index + 1]}' of ${propertyKey}`);
        }
      } else {
        throw Error(`unknown key part: '${key}' of key '${propertyKey}'`);
      }
    }

    if (propertyConfig) {
      this.propertyMap.set(propertyKey, propertyConfig);
      return propertyConfig;
    } else {
      throw Error("could not find PropertyConfig for " + propertyKey);
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
        for (const [key, value] of Object.entries(child.analyzer)) {
          this.initNode(node, key);
          const nodeValue = node.analyzer[key];
          nodeValue.levels[0]++;

          for (let level = 0; level < value.levels.length; level++) {
            const levelCount = value.levels[level];

            if (level + 1 >= nodeValue.levels.length) {
              nodeValue.levels.push(levelCount);
            } else {
              nodeValue.levels[level + 1] += levelCount;
            }
          }
          for (let level = 0; level < value.descendantScore.length; level++) {
            const score = value.descendantScore[level];

            if (level + 1 >= nodeValue.descendantScore.length) {
              nodeValue.descendantScore.push(score);
            } else {
              nodeValue.descendantScore[level + 1] += score;
            }
          }
          nodeValue.descendantScore[0] += value.nodeScore;
        }
      }
    }

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];

      if (child.analyzer) {
        // siblingScore?
        // descendantOf?
      }
    }
    this.scoreNode(node, candidates, config.properties);

    if (node.analyzer) {
      candidates.push(node);
      Object.entries(node.analyzer).forEach(([key, value]) => {
        const propertyConfig = this.getConfigProperty(key, config);

        // only count children for score if property expects an array
        if (propertyConfig.array) {
          const count = value.levels[0];

          if (count) {
            value.childrenScore += 0.5 * count;
          }
        }

        value.nodeScore = value.generalScore + value.patternScore + value.tagScore + value.childrenScore;
        value.score =
          value.descendantScore.reduce(
            // score per descendant level (one- not zero-based), capped at 3
            (previous, current, index) => previous + current / (index + 1),
            0,
          ) + value.nodeScore;
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
    this.propertyMap = new Map<string, PropertyConfig>();
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

    this.visualizeCandidates(candidates);
    return result;
  }

  private visualizeCandidates(candidates: HTMLElement[]) {
    const classes = new Set<string>();
    candidates.forEach((node) => {
      Object.entries(node.analyzer).forEach(([key, value]) => {
        if (value.patternScore || value.tagScore) {
          const keyClass = "analyzer-" + key.replaceAll(".", "_");
          classes.add(keyClass);
          node.classList.add(keyClass);
        }
      });
    });
    const style = this._doc.createElement("style");
    const overlay = this._doc.createElement("div");
    this._doc.body.insertBefore(overlay, this._doc.body.firstElementChild);
    this._doc.head.appendChild(style);
    const colors = ["aqua", "bisque", "cadetblue", "coral", "orangered", "plum", "yellow"];
    let css = "";
    let content = "";
    [...classes].forEach((value, index) => {
      css += `.${value} {
      border: solid 10px ${colors[index]} !important;
  }
  `;
      content += `<div class="${value}">${value}</div>`;
    });

    overlay.classList.add("analyzer-overlay");
    overlay.innerHTML = `${content}`;
    css += `\n.analyzer-overlay {
      position: sticky;
      top: 50px;
      left: 50px;
      border: solid 10px black !important;
      z-index: 100;
      background: white;
      max-width: 300px;
  }`;
    style.appendChild(this._doc.createTextNode(css));
  }
}
