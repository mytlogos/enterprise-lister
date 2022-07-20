import { JsonRegex } from "./types";
import { finder } from "./css-selector";

interface Scorer {
  propertyKey: string;
  stage: "node" | "parent" | "post" | "post-node";
  scoreName: keyof PropertyScore;
  optional?: boolean;
  analyzer: ScrapeAnalyzer;
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

interface ArrayScorer extends Scorer {
  stage: "parent";
}

interface GroupScorer extends Scorer {
  stage: "node";
  group: string[];
}

interface RelativeScorer extends Scorer {
  relativeTo: string;
  position: "before" | "after";
  stage: "post";
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
    relative?: {
      relativeTo: string;
      position: "before" | "after";
    };
  };
  sameAs?: string;
  extract?: { type: "text" } | { type: "attribute"; attribute: string };
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
   * Relative score.
   */
  relativeScore: number;

  /**
   * Whether all keys are satisified.
   */
  groupScore: number;

  /**
   * Number of children with such a PropertyScore per descendentLevel
   */
  levels: number[];
}

declare global {
  interface Node {
    analyzer: Record<string, PropertyScore>;
  }
  interface Document {
    candidates: HTMLElement[];
  }
}

function getNodeAncestors(node: Node, maxDepth?: number): HTMLElement[] {
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
      relativeScore: 0,
      groupScore: 0,
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
  if (parentKey) {
    scorer.push({
      stage: "node",
      propertyKey: parentKey,
      scoreName: "groupScore",
      group: Object.keys(properties).map((key) => (parentKey ? parentKey + "." + key : key)),
      score(node: HTMLElement) {
        const count = this.group.filter((item) => node.analyzer && node.analyzer[item]).length;
        return count === this.group.length ? 5 : -5;
      },
    } as GroupScorer);
  }
  for (const [key, value] of Object.entries(properties)) {
    if (value.sameAs) {
      const propertyKey = parentKey ? parentKey + "." + key : key;
      scorer
        .filter((score) => score.propertyKey === value.sameAs)
        .forEach((score) => {
          scorer.push({ ...score, propertyKey } as Scorer);
        });
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

  private propertyMap: Map<string, PropertyConfig> = new Map();

  private visit(node: HTMLElement, candidates: HTMLElement[], scorer: Scorer[], config: Config) {
    if (!this.isProbablyVisible(node)) {
      this.log("Skipping hidden node");
      return;
    }

    const skipCandidate =
      /-ad-|ai2html|banner|combx|comment|community|cover-wrap|disqus|extra|gdpr|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|popup|yom-remote/i;

    const matchString = node.className + " " + node.id;

    if (skipCandidate.test(matchString)) {
      return;
    }

    const descendantScored = new Set<string>();

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const descendantRequire = this.visit(child as HTMLElement, candidates, scorer, config);

      if (descendantRequire) {
        descendantRequire.forEach((value) => descendantScored.add(value));
      }

      if (child.analyzer) {
        for (const [key, value] of Object.entries(child.analyzer)) {
          initNode(node, key);
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
    const missingRequired = new Set<string>();

    for (const score of scorer) {
      if (score.stage !== "node") {
        continue;
      }
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
      Object.keys(node.analyzer).forEach((key) => requireSatisfied.add(key));
      this.calculateScore(node);
    }
    return requireSatisfied;
  }

  private initConfigPropertyMap(
    properties: Record<string, PropertyConfig>,
    parentKey = "",
    map = new Map<string, PropertyConfig>(),
  ) {
    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = parentKey ? parentKey + "." + key : key;
      map.set(propertyKey, value);

      if (value.properties) {
        this.initConfigPropertyMap(value.properties, propertyKey, map);
      }
    }
    return map;
  }

  private configKeyGroups(properties: Record<string, PropertyConfig>, parentKey = "", groups: string[][] = []) {
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

  /**
   * Scores all nodes with the anchorKey within a group whether a specific property key is before/after
   * any other specific property in the descendant hierarchy of the group.
   */
  private scoreRelative(
    candidates: HTMLElement[],
    anchorKey: string,
    relativeToKey: string,
    position: "before" | "after",
    parentKey: string,
  ) {
    for (const candidate of candidates) {
      const value = candidate.analyzer[parentKey];

      // ignore candidates without a groupScore
      if (!value || value.groupScore <= 0) {
        continue;
      }

      const anchorCandidates = [];
      const relativeCandidates = [];

      // get all descendants of candidate with either anchorKey or relativeKey scored
      for (const possibleDescendant of candidates) {
        // ignore candidates that are not within this sub tree, excluding root
        if (candidate === possibleDescendant || !candidate.contains(possibleDescendant)) {
          continue;
        }
        if (possibleDescendant.analyzer[anchorKey]) {
          anchorCandidates.push(possibleDescendant);
        }
        if (possibleDescendant.analyzer[relativeToKey]) {
          relativeCandidates.push(possibleDescendant);
        }
      }

      // scores positive if at least one relativeCandidate satifies the position requirement, else negative
      for (const anchor of anchorCandidates) {
        const anchorAncestors = getNodeAncestors(anchor);
        let positionFound = false;

        for (const relative of relativeCandidates) {
          const relativeAncestors = getNodeAncestors(relative);

          for (let index = 0; index < anchorAncestors.length && index < relativeAncestors.length; index++) {
            const anchorAncestor = anchorAncestors[index];
            const relativeAncestor = relativeAncestors[index];

            // if the ancestors do not match, they must be siblings
            if (anchorAncestor !== relativeAncestor) {
              if (position === "after") {
                for (
                  let nextSibling = anchorAncestor.nextElementSibling;
                  nextSibling;
                  nextSibling = anchorAncestor.nextElementSibling
                ) {
                  if (nextSibling === relativeAncestor) {
                    positionFound = true;
                    break;
                  }
                }
              } else {
                for (
                  let previousSibling = anchorAncestor.previousElementSibling;
                  previousSibling;
                  previousSibling = anchorAncestor.previousElementSibling
                ) {
                  if (previousSibling === relativeAncestor) {
                    positionFound = true;
                    break;
                  }
                }
              }
              if (positionFound) {
                break;
              }
            }
          }

          if (positionFound) {
            break;
          }
        }

        anchor.analyzer[anchorKey].relativeScore += positionFound ? 5 : -5;
      }
    }
  }

  private calculateScore(node: HTMLElement) {
    Object.values(node.analyzer).forEach((value) => {
      value.nodeScore =
        value.generalScore +
        value.patternScore +
        value.tagScore +
        value.childrenScore +
        value.relativeScore +
        value.groupScore;

      value.score =
        value.descendantScore.reduce(
          // score per descendant level (one- not zero-based), capped at 3
          (previous, current, index) => previous + current / (index + 1),
          0,
        ) + value.nodeScore;
    });
  }

  private reCalculateScore(candidates: HTMLElement[]) {
    for (const node of candidates) {
      this.calculateScore(node);
    }
  }

  private getRelativeConfigs(
    properties: Record<string, PropertyConfig>,
    parentKey = "",
    group: Array<{
      parentKey: string;
      anchor: string;
      relativeTo: string;
      position: "before" | "after";
    }> = [],
  ) {
    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = parentKey ? parentKey + "." + key : key;

      if (value.require?.relative) {
        group.push({
          ...value.require.relative,
          parentKey,
          anchor: propertyKey,
        });
      }

      if (value.properties) {
        this.getRelativeConfigs(value.properties, propertyKey, group);
      }
    }
    return group;
  }

  public parse(config: Config) {
    const result = {} as any;
    this.propertyMap = this.initConfigPropertyMap(config.properties);
    this.log("**** grabArticle ****");
    const page = this._doc.body;

    // We can't grab an article if we don't have a page!
    if (!page) {
      this.log("No body found in document. Abort.");
      return null;
    }

    const node: HTMLElement | null = this._doc.documentElement;
    const candidates: HTMLElement[] = [];
    this._doc.candidates = candidates;

    if (node.tagName === "HTML") {
      result.lang = node.getAttribute("lang");
    }

    const scorer = toScorer(config.properties).map((value) => {
      value.analyzer = this;
      return value;
    });
    this.visit(node, candidates, scorer, config);
    this.reCalculateScore(candidates);

    for (const relativeConfig of this.getRelativeConfigs(config.properties)) {
      this.scoreRelative(
        candidates,
        relativeConfig.anchor,
        relativeConfig.relativeTo,
        relativeConfig.position,
        relativeConfig.parentKey,
      );
    }
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

    Object.entries(config.properties).forEach(([key, value]) => {
      const mainCandidate = candidates.reduce((previous, current) =>
        (previous.analyzer[key]?.score || 0) < (current.analyzer[key]?.score || 0) ? current : previous,
      );

      if (value.array) {
        const mainCandidateGroups = candidates.filter((candidate) => {
          return (
            mainCandidate !== candidate &&
            mainCandidate.contains(candidate) &&
            candidate.analyzer[key] &&
            candidate.analyzer[key].nodeScore > 0
          );
        });

        // if all children have groups, then no further inspection should be necessary
        if (mainCandidate.children.length === mainCandidate.analyzer[key].levels[0]) {
          const groupContainerSelector = finder(mainCandidate);

          let possibleSelector = groupContainerSelector + " > " + mainCandidate.children[0].tagName;

          this.log(`evluating possible group selector: '${possibleSelector}'`);

          const selected = this._doc.querySelectorAll<HTMLElement>(possibleSelector);
          let unusableSelector = false;

          for (let index = 0; index < selected.length; index++) {
            const element = selected[index];
            if (!mainCandidateGroups.includes(element)) {
              unusableSelector = true;
              break;
            }
          }
          if (unusableSelector) {
            possibleSelector = groupContainerSelector + " > *";
          }

          this.log("Group selector: " + possibleSelector);
        } else {
          // TODO: handle other cases
          this.log("No selector found");
        }
      } else {
        this.log("Result selector", finder(mainCandidate));
      }
    });
    console.log(candidates.length, "Candidates");
    this.visualizeCandidates(candidates);
    return result;
  }

  /**
   * Visualize candidates with a border in a different color for each propertyKey.
   * (Though candidates with multiple propertyScores, get only one color)
   *
   * Adds a sticky color legend to the top left corner.
   * @param candidates candidates to visualize
   */
  private visualizeCandidates(candidates: HTMLElement[]) {
    const classes = new Set<string>();
    let count = 0;

    candidates.forEach((node) => {
      let score = 0;
      let highestKey = "";

      Object.entries(node.analyzer).forEach(([key, value]) => {
        if (value.nodeScore > 0) {
          count++;
          if (value.nodeScore > score) {
            score = value.nodeScore;
            highestKey = key;
          }
          node.setAttribute(key.replaceAll(".", "_"), value.nodeScore + "");
        }
      });
      if (highestKey) {
        const keyClass = "analyzer-" + highestKey.replaceAll(".", "_");
        classes.add(keyClass);
        node.classList.add(keyClass);
      }
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
