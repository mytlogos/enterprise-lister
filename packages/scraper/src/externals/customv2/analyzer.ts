import { JsonRegex } from "./types";
import { finder } from "./css-selector";

interface Scorer {
  propertyKey: string;
  stage: "node" | "parent";
  scoreName: keyof PropertyScore;
  optional?: boolean;
  score(node: HTMLElement): number;
}

interface TagScorer extends Scorer {
  tagName: string;
  stage: "node";
}

interface TextScorer extends Scorer {
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  stage: "node";
}

interface AttributeScorer extends Scorer {
  pattern: RegExp;
  attr: string;
  stage: "node";
}

interface DescendantScorer extends Scorer {
  descendantOf: string;
}

interface ArrayScorer extends Scorer {
  stage: "parent";
}

interface GroupScorer {
  group: string[];
}

interface TextPropertyConfig {
  type: "text";
  pattern: JsonRegex;
  minLength?: number;
  maxLength?: number;
}

interface AttributePropertyConfig {
  type: "attribute";
  attr?: string; // either attr or pattern or both, none is illegal
  pattern?: JsonRegex;
}

interface PropertyConfig {
  require?: {
    tag?: string;
    content?: TextPropertyConfig | AttributePropertyConfig;
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
   * A negative score for each missing required score.
   */
  missingRequiredScore: number;

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

function initNode(node: HTMLElement, key: string) {
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
      missingRequiredScore: 0,
    } as PropertyScore;
  }
  return node.analyzer[key];
}

function toScorer(properties: Record<string, PropertyConfig>, parentKey = ""): Scorer[] {
  const scorer = [];

  for (const [key, value] of Object.entries(properties)) {
    const propertyKey = parentKey ? parentKey + "." + key : key;

    const require = value.require;

    if (require) {
      if (require.tag) {
        scorer.push({
          stage: "node",
          propertyKey: propertyKey,
          scoreName: "tagScore",
          tagName: require.tag.toLowerCase(),
          score(node: HTMLElement) {
            return this.tagName === node.tagName.toLowerCase() ? 5 : -5;
          },
        } as TagScorer);
      }
      if (require.content) {
        if (require.content.type === "text") {
          if (require.content.pattern) {
            const pattern = new RegExp(require.content.pattern.pattern, require.content.pattern.flags);
            scorer.push({
              stage: "node",
              propertyKey: propertyKey,
              scoreName: "patternScore",
              pattern,
              minLength: require.content.minLength || 0,
              maxLength: require.content.maxLength || Number.POSITIVE_INFINITY,
              score(node: HTMLElement) {
                const textValue = node.textContent || "";
                return textValue.length <= this.maxLength &&
                  textValue.length >= this.minLength &&
                  this.pattern.test(textValue)
                  ? 5
                  : -5;
              },
            } as TextScorer);
          }
        } else if (require.content.type === "attribute" && require.content.attr && require.content.pattern) {
          const pattern = new RegExp(require.content.pattern.pattern, require.content.pattern.flags);
          scorer.push({
            stage: "node",
            propertyKey: propertyKey,
            scoreName: "patternScore",
            pattern,
            attr: require.content.attr,
            score(node: HTMLElement) {
              const textValue = node.getAttribute(this.attr) || "";
              return this.pattern.test(textValue) ? 5 : -5;
            },
          } as AttributeScorer);
        }
      }
    }

    // if (value.array) {
    //   scorer.push({
    //     stage: "parent",
    //     score() {},
    //   } as ArrayScorer);
    // }
    if (value.properties) {
      scorer.push(...toScorer(value.properties, propertyKey));
    }
  }
  return scorer;
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

  private visit(node: HTMLElement, candidates: HTMLElement[], scorer: Scorer[], config: Config) {
    if (!this.isProbablyVisible(node)) {
      this.log("Skipping hidden node");
      return;
    }

    // const skipCandidate =
    //   /-ad-|ai2html|banner|combx|comment|community|cover-wrap|disqus|extra|gdpr|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|popup|yom-remote/i;

    // const matchString = node.className + " " + node.id;

    // if (skipCandidate.test(matchString)) {
    //   return;
    // }

    const descendantScored = new Set<string>();

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const descendantRequire = this.visit(child as HTMLElement, candidates, scorer, config);

      if (descendantRequire) {
        descendantRequire.forEach((value) => descendantScored.add(value));
      }

      // if (child.analyzer) {
      // for (const [key, value] of Object.entries(child.analyzer)) {
      //   initNode(node, key);
      //   const nodeValue = node.analyzer[key];

      //     nodeValue.levels[0]++;

      //     for (let level = 0; level < value.levels.length; level++) {
      //       const levelCount = value.levels[level];

      //       if (level + 1 >= nodeValue.levels.length) {
      //         nodeValue.levels.push(levelCount);
      //       } else {
      //         nodeValue.levels[level + 1] += levelCount;
      //       }
      //     }
      //     for (let level = 0; level < value.descendantScore.length; level++) {
      //       const score = value.descendantScore[level];

      //       if (level + 1 >= nodeValue.descendantScore.length) {
      //         nodeValue.descendantScore.push(score);
      //       } else {
      //         nodeValue.descendantScore[level + 1] += score;
      //       }
      //     }
      //     nodeValue.descendantScore[0] += value.nodeScore;
      //     }
      // }
    }

    // for (let index = 0; index < node.children.length; index++) {
    //   const child = node.children[index];

    //   if (child.analyzer) {
    //     // siblingScore?
    //     // descendantOf?
    //   }
    // }

    const missingRequired = new Set<string>();

    for (const score of scorer) {
      // if a descendant already scored this, this may score it too, so prevent it
      if (descendantScored.has(score.propertyKey)) {
        continue;
      }
      // if any requirements on that propertyKey are already violated, ignore it
      if (missingRequired.has(score.propertyKey)) {
        continue;
      }
      const value = score.score(node);

      if (value <= 0 && !score.optional) {
        missingRequired.add(score.propertyKey);
        // remove propertyScore if any requirements are missing
        if (node.analyzer && node.analyzer[score.propertyKey]) {
          delete node.analyzer[score.propertyKey];
        }
      } else if (value) {
        const propertyScore = initNode(node, score.propertyKey);
        // @ts-expect-error
        propertyScore[score.scoreName] += value;
      }
    }

    const requireSatisfied = new Set<string>(descendantScored);

    if (node.analyzer) {
      candidates.push(node);

      Object.entries(node.analyzer).forEach(([key, value]) => {
        requireSatisfied.add(key);
        // const propertyConfig = this.getConfigProperty(key, config);

        // only count children for score if property expects an array
        // if (propertyConfig.array) {
        //   const count = value.levels[0];

        //   if (count) {
        //     value.childrenScore += 0.5 * count;
        //   }
        // }

        value.nodeScore =
          value.generalScore + value.patternScore + value.tagScore + value.childrenScore + value.missingRequiredScore;

        value.score = value.nodeScore;
        // value.descendantScore.reduce(
        //   // score per descendant level (one- not zero-based), capped at 3
        //   (previous, current, index) => previous + current / (index + 1),
        //   0,
        // ) + value.nodeScore;
      });
    }
    return requireSatisfied;
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

    const scorer = toScorer(config.properties);
    this.visit(node, candidates, scorer, config);
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

    console.log(candidates.length, "Candidates");
    this.visualizeCandidates(candidates);
    return result;
  }

  private visualizeCandidates(candidates: HTMLElement[]) {
    const classes = new Set<string>();
    let count = 0;

    candidates.forEach((node) => {
      Object.entries(node.analyzer).forEach(([key, value]) => {
        if (value.patternScore > 0 || value.tagScore > 0) {
          count++;
          const keyClass = "analyzer-" + key.replaceAll(".", "_");
          classes.add(keyClass);
          node.classList.add(keyClass);
        }
      });
    });
    console.log(count, "scored Candidates");
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
