import { JsonRegex } from "./types";
import { finder } from "./css-selector";

type Properties = Record<string, PropertyConfig>;

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
  properties: Properties;
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

function getPropertyKey(parent: string, key: string): string {
  return parent ? parent + "." + key : key;
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
    this.group = Object.keys(properties).map((key) => getPropertyKey(parentKey, key));
  }
  public score(node: HTMLElement): number {
    const parentPrefix = this.propertyKey + ".";
    const propertyMap = this.analyzer.getPropertyMap();

    if (node.analyzer) {
      // score negatively for scoring a parent group on a node with a child group already scored
      for (const item of this.group) {
        if (item.startsWith(parentPrefix) && node.analyzer[item] && node.analyzer[item].nodeScore > 0) {
          return -5;
        }
      }
    }
    // forbid it, that a group key is only present in another group
    // e.g. mediumLink should not be only present in candidates of the only candidate of releases
    const count = this.group.filter((item) => node.analyzer && node.analyzer[item]).length;
    if (count === this.group.length) {
      const groupCandidates = {} as Record<string, HTMLElement[]>;
      // properties in this group, which are also a group
      const groupProperties = this.group.filter((item) => propertyMap.get(item)?.properties);
      // properties in this group, which are not a group
      const nonGroupProperties = this.group.filter((item) => !propertyMap.get(item)?.properties);

      for (const candidate of this.analyzer.getCurrentCandidates()) {
        // skip candidates that are not part of this sub-tree
        if (!node.contains(candidate)) {
          continue;
        }
        for (const item of this.group) {
          if (candidate.analyzer[item]?.nodeScore) {
            const group = groupCandidates[item] || (groupCandidates[item] = []);
            group.push(candidate);
          }
        }
      }
      // node.analyzer should be defined, else the condition count === this.group.length should fail
      for (const item of this.group) {
        if (node.analyzer[item]?.nodeScore) {
          const group = groupCandidates[item] || (groupCandidates[item] = []);
          group.push(node);
        }
      }

      if (groupProperties.length) {
        for (const nonGroupProperty of nonGroupProperties) {
          // should always be defined, else the condition count === this.group.length should not be fulfilled
          const filteredCandidates = groupCandidates[nonGroupProperty].filter((candidate) => {
            // check that candidate is not a descendant of another group
            return !groupProperties.some((groupProperty) => {
              return groupCandidates[groupProperty].some((groupCandidate) => groupCandidate.contains(candidate));
            });
          });

          if (!filteredCandidates.length) {
            return -5;
          }
        }
      }

      // weaken the influence of propertyKeys not inside this group on nonGroupProperties candidates

      for (const nonGroupProperty of nonGroupProperties) {
        const nonGroupCandidates = groupCandidates[nonGroupProperty];

        if (!nonGroupCandidates) {
          continue;
        }

        const candidates = nonGroupCandidates.filter((candidate) => {
          // check that candidate is not a descendant of another group
          return !groupProperties.some((groupProperty) => {
            return groupCandidates[groupProperty].some((groupCandidate) => groupCandidate.contains(candidate));
          });
        });

        for (const candidate of candidates) {
          for (const [property, value] of Object.entries(candidate.analyzer)) {
            if (this.group.includes(property)) {
              continue;
            }
            value.groupScore -= 5;
          }
        }
      }
      return 5;
    } else {
      return -5;
    }
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

function toScorer(properties: Properties, parentKey = ""): Scorer[] {
  const scorer = [];

  for (const [key, value] of Object.entries(properties)) {
    const propertyKey = getPropertyKey(parentKey, key);

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
      const propertyKey = getPropertyKey(parentKey, key);
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
  private candidates: HTMLElement[] = [];
  private usedCandidates: HTMLElement[] = [];

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

  private visit(node: HTMLElement, scorer: Scorer[], config: Config) {
    this.visited++;
    if (!this.isProbablyVisible(node)) {
      this.log("Skipping hidden node" + finder(node));
      this.skipped++;
      return;
    }

    const skipCandidate =
      /-ad-|ai2html|banner|combx|comment|community|cover-wrap|disqus|extra|gdpr|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|popup|yom-remote/i;

    const matchString = node.className + " " + node.id;

    // never skip body
    if (skipCandidate.test(matchString) && node.tagName !== "BODY") {
      this.log("skipping unlikely candidate: " + finder(node));
      this.skipped++;
      return;
    }

    const descendantScored = new Set<string>();

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index];
      const descendantRequire = this.visit(child as HTMLElement, scorer, config);

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
        // update nodeScore gradually, so that other scorers may notice it too
        // currently only for GroupScorer
        propertyScore.nodeScore += value;
      }
    }

    const requireSatisfied = new Set<string>(descendantScored);

    if (node.analyzer) {
      this.candidates.push(node);
      Object.keys(node.analyzer).forEach((key) => requireSatisfied.add(key));
      this.calculateScore(node);
    }
    return requireSatisfied;
  }

  private propertyMap: Map<string, PropertyConfig> = new Map();

  public getPropertyMap(): ReadonlyMap<string, Readonly<PropertyConfig>> {
    return this.propertyMap;
  }

  public getCurrentCandidates(): ReadonlyArray<Readonly<HTMLElement>> {
    return this.candidates;
  }

  private initConfigPropertyMap(properties: Properties, parentKey = "", map = new Map<string, PropertyConfig>()) {
    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = getPropertyKey(parentKey, key);
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
  private scoreRelative(anchorKey: string, relativeToKey: string, position: "before" | "after", parentKey: string) {
    for (const candidate of this.candidates) {
      const value = candidate.analyzer[parentKey];

      // ignore candidates without a groupScore
      if (!value || value.groupScore <= 0) {
        continue;
      }

      const anchorCandidates = [];
      const relativeCandidates = [];

      // get all descendants of candidate with either anchorKey or relativeKey scored
      for (const possibleDescendant of this.candidates) {
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

  private reCalculateScore() {
    for (const node of this.candidates) {
      this.calculateScore(node);
    }
  }

  private getRelativeConfigs(
    properties: Properties,
    parentKey = "",
    group: Array<{
      parentKey: string;
      anchor: string;
      relativeTo: string;
      position: "before" | "after";
    }> = [],
  ) {
    for (const [key, value] of Object.entries(properties)) {
      const propertyKey = getPropertyKey(parentKey, key);

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

  private generatePropertyResult(
    key: string,
    parentKey: string,
    value: PropertyConfig,
    root: HTMLElement,
    usedCandidates: Record<string, HTMLElement>,
  ) {
    let subMainCandidate: HTMLElement;
    const propertyKey = getPropertyKey(parentKey, key);

    if (value.sameAs) {
      const usedCandidate = usedCandidates[value.sameAs];

      if (!usedCandidate) {
        throw Error(`missing used candidate of ${value.sameAs} for ${propertyKey}`);
      }
      subMainCandidate = usedCandidate;
    } else {
      const subCandidates = this.candidates.filter((candidate) => root.contains(candidate));

      if (!subCandidates.length) {
        this.log("no candidates for " + propertyKey);
        return;
      }
      // get best candidate within the sample, there must be candidates, else this group should not exist
      subMainCandidate = subCandidates.reduce((previous, current) =>
        (previous.analyzer[propertyKey]?.nodeScore || 0) < (current.analyzer[propertyKey]?.nodeScore || 0)
          ? current
          : previous,
      );

      this.removeCandidate(subMainCandidate);
      usedCandidates[propertyKey] = subMainCandidate;
    }
    let selector = finder(subMainCandidate, { root });

    if (value.extract?.type === "attribute") {
      selector += "@" + value.extract.attribute;
    }
    selector += " | trim";
    return selector;
  }

  private generateGroupResult(
    groupKey: string,
    groupConfig: PropertyConfig,
    groupProperties: Properties,
    root: HTMLElement,
    parentKey = "",
  ): any {
    const propertyKey = getPropertyKey(parentKey, groupKey);
    const keyCandidates = this.candidates.filter((node) => node.analyzer[propertyKey] && root.contains(node));

    if (!keyCandidates.length) {
      this.log("no candidate found for " + groupKey);
      return;
    }
    const mainCandidate = keyCandidates.reduce((previous, current) =>
      (previous.analyzer[propertyKey].score || 0) < (current.analyzer[propertyKey].score || 0) ? current : previous,
    );

    let groupSelector;
    let sample: HTMLElement;

    if (groupConfig.array) {
      const mainCandidateGroups = this.candidates.filter((candidate) => {
        return (
          mainCandidate !== candidate &&
          mainCandidate.contains(candidate) &&
          candidate.analyzer[propertyKey] &&
          candidate.analyzer[propertyKey].nodeScore > 0
        );
      });

      if (!mainCandidateGroups.length) {
        this.log("no groups found in mainCanditate: " + finder(mainCandidate));
        return;
      }
      sample = mainCandidateGroups[0];
      let partialSelector: string;

      // if sample is a child of mainCandidate a simple selector should suffice
      if (sample.parentElement === mainCandidate) {
        partialSelector = sample.tagName.toLowerCase();
      } else {
        const ancestors = getNodeAncestors(sample);
        partialSelector = finder(sample, { root: ancestors[ancestors.length - 1] });

        for (let index = ancestors.length - 1; index >= 0; index--) {
          const ancestor = ancestors[index];

          // should always encounter mainCandidate in loop, as sample is a descendant
          if (ancestor === mainCandidate) {
            break;
          }
          partialSelector = ancestor.tagName.toLowerCase() + " > " + partialSelector;
        }
      }

      partialSelector = finder(mainCandidate, { root }) + " > " + partialSelector;

      // this selector is only within root
      const selected = root.querySelectorAll<HTMLElement>(partialSelector);
      let unusableSelector = false;

      for (let index = 0; index < selected.length; index++) {
        const element = selected[index];
        if (!mainCandidateGroups.includes(element)) {
          unusableSelector = true;
          break;
        }
      }
      if (unusableSelector) {
        this.log("no usable selector found: " + groupKey);
        return;
      }

      groupSelector = partialSelector;

      // remove all "used" candidates from the candidates pool
      for (const element of mainCandidateGroups) {
        this.removeCandidate(element);
      }
      // TODO: handle other cases?
    } else {
      sample = mainCandidate;
      groupSelector = finder(mainCandidate, { root });
    }
    this.removeCandidate(mainCandidate);
    this.log(`Group selector for '${groupKey}'${groupConfig.array ? " (array)" : ""}: ${groupSelector}`);
    const keyResult = { selector: groupSelector, properties: {} as any };

    const usedCandidates = {} as Record<string, HTMLElement>;

    for (const [subKey, subValue] of Object.entries(groupProperties)) {
      if (subValue.properties) {
        keyResult.properties[subKey] = this.generateGroupResult(
          subKey,
          subValue,
          subValue.properties,
          sample,
          propertyKey,
        );
      } else {
        keyResult.properties[subKey] = this.generatePropertyResult(
          subKey,
          propertyKey,
          subValue,
          sample,
          usedCandidates,
        );
      }
    }
    return keyResult;
  }

  private removeCandidate(node: HTMLElement) {
    const index = this.candidates.indexOf(node);

    if (index >= 0) {
      this.candidates.splice(index, 1);
      this.usedCandidates.push(node);
    }
  }

  private generateResult(config: Config) {
    const result = {} as Record<string, any>;

    Object.entries(config.properties).forEach(([key, value]) => {
      if (value.properties) {
        result[key] = this.generateGroupResult(key, value, value.properties, this._doc.documentElement);
      } else {
        result[key] = this.generatePropertyResult(key, "", value, this._doc.documentElement, {});
      }
    });
    return result;
  }

  public parse(config: Config) {
    this.log("**** init ****");
    const result = {} as any;
    config.verbosity = config.verbosity || 0;
    this.skipped = 0;
    this.visited = 0;
    this.candidates = [];
    this.usedCandidates = [];
    this.propertyMap = this.initConfigPropertyMap(config.properties);
    // We can't grab an article if we don't have a page!
    if (!this._doc.body) {
      this.log("No body found in document. Abort.");
      return null;
    }

    const node: HTMLElement | null = this._doc.documentElement;

    if (node.tagName === "HTML") {
      result.lang = node.getAttribute("lang");
    }
    this.log("**** generating scorer ****");

    const scorer = toScorer(config.properties).map((value) => {
      value.analyzer = this;
      return value;
    });
    // sort from most nested to root
    scorer.sort((a, b) => b.propertyKey.split(".").length - a.propertyKey.split(".").length);

    this.log("**** visiting nodes ****");
    this.visit(node, scorer, config);

    this.log("**** scoring post stage ****");
    for (const score of scorer) {
      if (score.stage !== "post") {
        continue;
      }
      for (const candidate of this.candidates) {
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
        relativeConfig.anchor,
        relativeConfig.relativeTo,
        relativeConfig.position,
        relativeConfig.parentKey,
      );
    }
    this.log("**** recalculating scores ****");
    this.reCalculateScore();
    console.log(this.candidates.length, "Candidates");

    this.log("**** generating result ****");
    Object.assign(result, this.generateResult(config));
    this.log("**** visualizing candidates ****");
    this.visualizeCandidates(config);

    const totalNodes = this._doc.getElementsByTagName("*").length;
    this.log(`all=${totalNodes}; visited=${this.visited}; skipped=${this.skipped}; scored=${this.candidates.length}`);
    return result;
  }

  /**
   * Visualize candidates with a border in a different color for each propertyKey.
   * (Though candidates with multiple propertyScores, get only one color)
   *
   * Adds a sticky color legend to the top left corner.
   * @param candidates candidates to visualize
   */
  private visualizeCandidates(config: Config) {
    const classes = new Set<string>();
    let count = 0;
    const verbosity = config.verbosity as number;

    [...this.candidates, ...this.usedCandidates].forEach((node) => {
      let score = 0;
      let highestKey = "";

      Object.entries(node.analyzer).forEach(([key, value]) => {
        if (value.nodeScore != 0) {
          const escapedKey = key.replaceAll(".", "_");
          count++;
          if (value.nodeScore > score) {
            score = value.nodeScore;
            highestKey = escapedKey;
          }
          if (verbosity >= 2) {
            Object.entries(value).forEach(
              ([valueKey, valueValue]) => valueValue && node.setAttribute(escapedKey + "_" + valueKey, valueValue + ""),
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
