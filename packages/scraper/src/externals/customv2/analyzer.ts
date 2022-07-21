import { JsonRegex } from "./types";
import { finder } from "./css-selector";

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
    descendantOf?: string; // using descendantOff implies an implicit reverse ancestorOf relationship and is scored as such
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
  verbosity?: 0 | 1 | 2;
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
   * Scores whether a node is a descendant of another specifiy scored key.
   */
  descendantOfScore: number;

  /**
   * Scores whether a node is a ancestor of another specifiy scored key.
   */
  ancestorOfScore: number;

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
    ancestors.unshift(node.parentNode);
    if (maxDepth && ++i === maxDepth) break;
    node = node.parentNode;
  }
  return ancestors.filter((value) => value.nodeType === value.ELEMENT_NODE) as HTMLElement[];
}

function remove<T>(array: T[], item: T): number {
  const index = array.indexOf(item);

  if (index >= 0) {
    array.splice(index, 1);
  }
  return index;
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
      ancestorOfScore: 0,
      descendantOfScore: 0,
    };
  }
  return node.analyzer[key];
}

function copyInstance<T>(original: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(original)), original);
}

abstract class Scorer {
  public stage: "node" | "parent" | "post" | "post-node";
  public readonly scoreName: keyof PropertyScore;
  public analyzer!: ScrapeAnalyzer;
  public readonly optional?: boolean | undefined;
  public readonly propertyKey: string;

  public constructor(stage: Scorer["stage"], scoreName: keyof PropertyScore, propertyKey: string) {
    this.stage = stage;
    this.scoreName = scoreName;
    this.propertyKey = propertyKey;
  }

  public abstract score(node: HTMLElement): number;
}

class TextScorer extends Scorer {
  public readonly pattern: RegExp;
  public readonly minLength: number;
  public readonly maxLength: number;

  public constructor(propertyKey: string, pattern: JsonRegex, minLength?: number, maxLength?: number) {
    super("node", "patternScore", propertyKey);
    this.pattern = new RegExp(pattern.pattern, pattern.flags);
    this.minLength = minLength || 0;
    this.maxLength = maxLength || Number.POSITIVE_INFINITY;
  }
  public score(node: HTMLElement): number {
    const textValue = node.textContent || "";
    return textValue.length <= this.maxLength && textValue.length >= this.minLength && this.pattern.test(textValue)
      ? 5
      : -5;
  }
}

class TagScorer extends Scorer {
  public readonly tagName: string;

  public constructor(tagName: string, propertyKey: string) {
    super("node", "tagScore", propertyKey);
    this.tagName = tagName;
  }
  public score(node: HTMLElement): number {
    return this.tagName === node.tagName.toLowerCase() ? 5 : -5;
  }
}

class DescendantScorer extends Scorer {
  public readonly descendantOf: string;

  public constructor(propertyKey: string, descendantOf: string) {
    super("post", "descendantOfScore", propertyKey);
    this.descendantOf = descendantOf;
  }
  public score(node: HTMLElement): number {
    const ancestors = getNodeAncestors(node);
    let foundAncestor = null;

    for (const ancestor of ancestors) {
      if (
        ancestor.analyzer &&
        ancestor.analyzer[this.descendantOf] &&
        ancestor.analyzer[this.descendantOf].nodeScore > 0
      ) {
        foundAncestor = ancestor;
        break;
      }
    }
    const score = foundAncestor ? 5 : -5;

    if (foundAncestor) {
      foundAncestor.analyzer[this.descendantOf].ancestorOfScore = score;
    }
    return score;
  }
}

class GroupScorer extends Scorer {
  public readonly group: string[];

  public constructor(propertyKey: string, properties: Record<string, any>, parentKey: string) {
    super("node", "groupScore", propertyKey);
    this.group = Object.keys(properties).map((key) => (parentKey ? parentKey + "." + key : key));
  }
  public score(node: HTMLElement): number {
    const count = this.group.filter((item) => node.analyzer && node.analyzer[item]).length;
    return count === this.group.length ? 5 : -5;
  }
}

class AttributeScorer extends Scorer {
  public readonly attr: string;
  public readonly pattern: RegExp;

  public constructor(propertyKey: string, attr: string, pattern: JsonRegex) {
    super("node", "patternScore", propertyKey);
    this.attr = attr;
    this.pattern = new RegExp(pattern.pattern, pattern.flags);
  }
  public score(node: HTMLElement): number {
    const textValue = node.getAttribute(this.attr) || "";
    return this.pattern.test(textValue) ? 5 : -5;
  }
}

function toScorer(properties: Record<string, PropertyConfig>, parentKey = ""): Scorer[] {
  const scorer = [];

  for (const [key, value] of Object.entries(properties)) {
    const propertyKey = parentKey ? parentKey + "." + key : key;

    const require = value.require;

    if (require) {
      if (require.tag) {
        scorer.push(new TagScorer(require.tag.toLowerCase(), propertyKey));
      }
      if (require.content) {
        if (require.content.type === "text") {
          if (require.content.pattern) {
            scorer.push(
              new TextScorer(
                propertyKey,
                require.content.pattern,
                require.content.minLength,
                require.content.maxLength,
              ),
            );
          }
        } else if (require.content.type === "attribute" && require.content.attr && require.content.pattern) {
          scorer.push(new AttributeScorer(propertyKey, require.content.attr, require.content.pattern));
        }
      }

      if (require.descendantOf) {
        scorer.push(new DescendantScorer(propertyKey, require.descendantOf));
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
    scorer.push(new GroupScorer(parentKey, properties, parentKey));
  }
  for (const [key, value] of Object.entries(properties)) {
    if (value.sameAs) {
      const propertyKey = parentKey ? parentKey + "." + key : key;
      scorer
        .filter((score) => score.propertyKey === value.sameAs)
        .forEach((score) => {
          const clone = copyInstance(score);
          // @ts-expect-error
          clone.propertyKey = propertyKey;
          scorer.push(clone);
        });
    }
  }
  return scorer;
}

export class ScrapeAnalyzer {
  private _doc: Document;
  private visited = 0;
  private skipped = 0;

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

  private visit(node: HTMLElement, candidates: HTMLElement[], scorer: Scorer[], config: Config) {
    this.visited++;
    if (!this.isProbablyVisible(node)) {
      this.log("Skipping hidden node" + finder(node));
      this.skipped++;
      return;
    }

    const skipCandidate =
      /-ad-|ai2html|banner|combx|comment|community|cover-wrap|disqus|extra|gdpr|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|popup|yom-remote/i;

    const matchString = node.className + " " + node.id;

      this.skipped++;
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
        anchorAncestors.push(anchor);
        let positionFound = false;

        for (const relative of relativeCandidates) {
          if (anchor === relative) {
            continue;
          }
          const relativeAncestors = getNodeAncestors(relative);
          relativeAncestors.push(relative);

          for (let index = 0; index < anchorAncestors.length && index < relativeAncestors.length; index++) {
            const anchorAncestor = anchorAncestors[index];
            const relativeAncestor = relativeAncestors[index];

            // if the ancestors do not match, they must be siblings
            if (anchorAncestor !== relativeAncestor) {
              if (position === "before") {
                for (
                  let nextSibling = anchorAncestor.nextElementSibling;
                  nextSibling;
                  nextSibling = nextSibling.nextElementSibling
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
                  previousSibling = previousSibling.previousElementSibling
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
        value.ancestorOfScore +
        value.descendantOfScore +
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

  private generateResult(candidates: HTMLElement[], config: Config) {
    const result = {} as Record<string, any>;

    Object.entries(config.properties).forEach(([key, value]) => {
      const keyCandidates = candidates.filter((node) => node.analyzer[key]);

      if (!keyCandidates.length) {
        this.log("no candidate found for " + key);
        return;
      }
      const mainCandidate = keyCandidates.reduce((previous, current) =>
        (previous.analyzer[key].score || 0) < (current.analyzer[key].score || 0) ? current : previous,
      );

      let groupSelector;
      let sample: HTMLElement;

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
        if (
          mainCandidate.analyzer[key].levels[0] > 0 &&
          mainCandidate.children.length === mainCandidate.analyzer[key].levels[0]
        ) {
          const groupContainerSelector = finder(mainCandidate);

          const groupAncestors = getNodeAncestors(mainCandidateGroups[0]);

          let possibleSelector;

          // if group is direct child of mainCandidate
          if (mainCandidate === mainCandidateGroups[0].parentElement) {
            possibleSelector = groupContainerSelector + " > " + mainCandidate.children[0].tagName.toLowerCase();
            this.log(`evaluating possible group selector: '${possibleSelector}'`);

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
          } else {
            // if group is descendant and no direct child, it complicates it a little
            const mainIndex = groupAncestors.findIndex((node) => node === mainCandidate);
            const mainChild = groupAncestors[mainIndex + 1];

            // get the selector from the direct child to the group
            // this assumes that a direct from mainCandidate as a descendant group
            possibleSelector =
              groupContainerSelector +
              " > " +
              mainChild.tagName.toLowerCase() +
              " " +
              finder(mainCandidateGroups[0], { root: mainChild });

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
              this.log("no usable selector found: " + key);
              return;
            }
          }

          groupSelector = possibleSelector;
          sample = mainCandidateGroups[0];

          // remove all "used" candidates from the candidates pool
          for (const element of mainCandidateGroups) {
            remove(candidates, element);
          }
        } else {
          // TODO: handle other cases
          this.log("No selector found");
          return;
        }
      } else {
        sample = mainCandidate;
        groupSelector = finder(mainCandidate);
      }
      remove(candidates, mainCandidate);
      this.log(`Group selector for '${key}'${value.array ? " (array)" : ""}: ${groupSelector}`);
      const keyResult = (result[key] = { selector: groupSelector } as any);

      if (value.properties) {
        keyResult.properties = {};
        const usedCandidates = {} as Record<string, HTMLElement>;

        // TODO: do this properly later on, support arbitrary nesting, arrays etc.
        Object.entries(value.properties)
          .filter((entry) => !entry[1].sameAs)
          .forEach(([subKey, subValue]) => {
            if (subValue.properties) {
              throw Error("double nested properties are currently not supported");
            }
            const propertyKey = key + "." + subKey;

            // if sameAs, just copy the selector
            if (subValue.sameAs) {
              const keyParts = subValue.sameAs.split(".");
              // assumes that key and subValue.sameAs are on the same level
              const lastProperty = keyParts[keyParts.length - 1];
              keyResult.properties[subKey] = keyResult.properties[lastProperty];
              return;
            }
            const subCandidates = candidates.filter((candidate) => sample.contains(candidate));

            // get best candidate within the sample, there must be candidates, else this group should not exist
            const subMainCandidate = subCandidates.reduce((previous, current) =>
              (previous.analyzer[propertyKey]?.nodeScore || 0) < (current.analyzer[propertyKey]?.nodeScore || 0)
                ? current
                : previous,
            );

            remove(candidates, subMainCandidate);
            usedCandidates[propertyKey] = subMainCandidate;
            keyResult.properties[subKey] = finder(subMainCandidate, { root: sample });

            if (subValue.extract?.type === "attribute") {
              keyResult.properties[subKey] += "@" + subValue.extract.attribute;
            }
            keyResult.properties[subKey] += " | trim";
          });
        Object.entries(value.properties)
          .filter((entry) => entry[1].sameAs)
          .forEach(([subKey, subValue]) => {
            if (subValue.properties) {
              throw Error("double nested properties are currently not supported");
            }
            const propertyKey = key + "." + subKey;
            const usedCandidate = usedCandidates[subValue.sameAs as string];

            if (!usedCandidate) {
              throw Error(`missing used candidate of ${subValue.sameAs} for ${propertyKey}`);
            }

            keyResult.properties[subKey] = finder(usedCandidate, { root: sample });

            if (subValue.extract?.type === "attribute") {
              keyResult.properties[subKey] += "@" + subValue.extract.attribute;
            }
            keyResult.properties[subKey] += " | trim";
          });
      }
    });
    this.log("Current result:", result);
    return result;
  }

  public parse(config: Config) {
    this.log("**** init ****");
    const result = {} as any;
    config.verbosity = config.verbosity || 0;
    this.skipped = 0;
    this.visited = 0;
    this.propertyMap = this.initConfigPropertyMap(config.properties);
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
    this.log("**** generating scorer ****");

    const scorer = toScorer(config.properties).map((value) => {
      value.analyzer = this;
      return value;
    });
    this.log("**** visiting nodes ****");
    this.visit(node, candidates, scorer, config);

    this.log("**** scoring post stage ****");
    for (const score of scorer) {
      if (score.stage !== "post") {
        continue;
      }
      for (const candidate of candidates) {
        const value = score.score(candidate);

        if (value) {
          const propertyScore = initNode(node, score.propertyKey);
          // @ts-expect-error
          propertyScore[score.scoreName] += value;
        }
      }
    }
    this.log("**** scoring relatives ****");
    for (const relativeConfig of this.getRelativeConfigs(config.properties)) {
      this.scoreRelative(
        candidates,
        relativeConfig.anchor,
        relativeConfig.relativeTo,
        relativeConfig.position,
        relativeConfig.parentKey,
      );
    }
    this.log("**** recalculating scores ****");
    this.reCalculateScore(candidates);
    console.log(candidates.length, "Candidates");

    this.log("**** generating result ****");
    Object.assign(result, this.generateResult([...candidates], config));
    this.log("**** visualizing candidates ****");
    this.visualizeCandidates(candidates, config);
    this.log(
      `all=${this._doc.getElementsByTagName("*").length}; visited=${this.visited}; skipped=${this.skipped}; scored=${
        candidates.length
      }`,
    );
    return result;
  }

  /**
   * Visualize candidates with a border in a different color for each propertyKey.
   * (Though candidates with multiple propertyScores, get only one color)
   *
   * Adds a sticky color legend to the top left corner.
   * @param candidates candidates to visualize
   */
  private visualizeCandidates(candidates: HTMLElement[], config: Config) {
    const classes = new Set<string>();
    let count = 0;
    const verbosity = config.verbosity as number;

    candidates.forEach((node) => {
      let score = 0;
      let highestKey = "";

      Object.entries(node.analyzer).forEach(([key, value]) => {
        if (value.nodeScore > 0) {
          const escapedKey = key.replaceAll(".", "_");
          count++;
          if (value.nodeScore > score) {
            score = value.nodeScore;
            highestKey = escapedKey;
          }
          if (verbosity >= 2) {
            Object.entries(value).forEach(([valueKey, valueValue]) =>
              node.setAttribute(escapedKey + "_" + valueKey, valueValue + ""),
            );
          }
          if (verbosity >= 1) {
            node.setAttribute(escapedKey, value.nodeScore + "");
          }
        }
      });
      if (highestKey) {
        const keyClass = "analyzer-" + highestKey;
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
