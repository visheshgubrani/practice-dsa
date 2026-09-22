import type { AuthoredProblem } from "./authoring";

export const groupAnagrams = {
  slug: "group-anagrams",
  number: 49,
  title: "Group Anagrams",
  difficulty: "medium",
  tags: ["array", "hash-table", "string", "sorting", "neetcode-150"],
  statement: [
    "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.",
    "",
    "An **anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.",
  ].join("\n"),
  examples: [
    {
      args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
      output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      explanation:
        '"eat", "tea", and "ate" are anagrams; "tan" and "nat" are anagrams; "bat" is alone.',
    },
    {
      args: [[""]],
      output: '[[""]]',
      explanation: "A single empty string is one group.",
    },
    {
      args: [["a"]],
      output: '[["a"]]',
      explanation: "A single letter is one group.",
    },
  ],
  constraints: [
    "`1 <= strs.length <= 10⁴`",
    "`0 <= strs[i].length <= 100`",
    "`strs[i]` consists of lowercase English letters.",
  ],
  testcases: [
    {
      args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
      expected: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      note: '"eat", "tea", and "ate" are anagrams; "tan" and "nat" are anagrams; "bat" is alone.',
    },
    {
      args: [[""]],
      expected: '[[""]]',
      note: "A single empty string is one group.",
    },
    {
      args: [["a"]],
      expected: '[["a"]]',
      note: "A single letter is one group.",
    },
    {
      args: [["abc", "def", "ghi"]],
      expected: '[["abc"],["def"],["ghi"]]',
      hidden: true,
      note: "no anagrams",
    },
    {
      args: [["aaa", "aaa"]],
      expected: '[["aaa","aaa"]]',
      hidden: true,
      note: "duplicate identical words",
    },
    {
      args: [["ab", "ba", "ab"]],
      expected: '[["ab","ba","ab"]]',
      hidden: true,
      note: "all one group, with a duplicate",
    },
    {
      args: [["", "", ""]],
      expected: '[["","",""]]',
      hidden: true,
      note: "empty strings are anagrams of each other",
    },
    {
      args: [["eat", "tea", "ate"]],
      expected: '[["eat","tea","ate"]]',
      hidden: true,
      note: "one group, insertion order",
    },
    {
      args: [["a", "b", "a"]],
      expected: '[["a","a"],["b"]]',
      hidden: true,
      note: "single letters, mixed",
    },
    {
      args: [["listen", "silent", "enlist", "google"]],
      expected: '[["listen","silent","enlist"],["google"]]',
      hidden: true,
      note: "longer words plus a singleton",
    },
    {
      args: [["ab", "cd", "ba", "dc", "ac"]],
      expected: '[["ab","ba"],["cd","dc"],["ac"]]',
      hidden: true,
      note: "three groups, mixed order",
    },
    {
      args: [["", "a"]],
      expected: '[[""],["a"]]',
      hidden: true,
      note: "empty mixed with a letter",
    },
  ],
  starterCode: {
    python: `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        `,
  },
  notes: {
    approach:
      "Two strings are anagrams exactly when they share a canonical form. Build that key — either the sorted string or a 26-length count signature — and bucket every word under it in a map. The count signature avoids the sort and keeps the whole pass linear in the total number of characters.",
    timeComplexity: "O(n · k)",
    spaceComplexity: "O(n · k)",
  },
  signature: {
    name: "groupAnagrams",
    params: [{ name: "strs", kind: "string[]" }],
    returns: "string[][]",
  },
  // "You can return the answer in any order" applies twice here: the groups
  // and the words inside them. The seeded `expected` is one valid grouping,
  // not the only one.
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/group-anagrams/",
  reference: `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for word in strs:
            groups["".join(sorted(word))].append(word)
        return list(groups.values())
`,
} satisfies AuthoredProblem;
