import type { AuthoredProblem } from "./authoring";

export const letterCombinationsOfAPhoneNumber = {
  slug: "letter-combinations-of-a-phone-number",
  number: 17,
  title: "Letter Combinations of a Phone Number",
  difficulty: "medium",
  tags: ["hash-table", "string", "backtracking", "neetcode-150"],
  statement: [
    "Given a string of digits from `2` through `9`, return all letter strings represented by pressing those keys on a phone keypad.",
    "",
    "The combinations may be returned in any order. If `digits` is empty, return an empty list.",
  ].join("\\n"),
  examples: [
    { args: ["23"], output: "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]", explanation: "Each of a, b, c pairs with each of d, e, f." },
    { args: ["2"], output: "[\"a\",\"b\",\"c\"]", explanation: "A single 2 maps to three one-letter combinations." },
  ],
  constraints: ["`0 <= digits.length <= 4`", "Each character in `digits` is between `2` and `9`."],
  testcases: [
    { args: ["23"], expected: "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]", note: "The standard two-digit keypad product." },
    { args: ["2"], expected: "[\"a\",\"b\",\"c\"]", note: "One digit gives its three letters." },
    { args: [""], expected: "[]", hidden: true, note: "An empty digit string has no combinations." },
    { args: ["7"], expected: "[\"p\",\"q\",\"r\",\"s\"]", hidden: true, note: "Seven maps to four letters." },
    { args: ["9"], expected: "[\"w\",\"x\",\"y\",\"z\"]", hidden: true, note: "Nine also maps to four letters." },
    { args: ["79"], expected: "[\"pw\",\"px\",\"py\",\"pz\",\"qw\",\"qx\",\"qy\",\"qz\",\"rw\",\"rx\",\"ry\",\"rz\",\"sw\",\"sx\",\"sy\",\"sz\"]", hidden: true, note: "Two four-letter keys produce sixteen combinations." },
    { args: ["34"], expected: "[\"dg\",\"dh\",\"di\",\"eg\",\"eh\",\"ei\",\"fg\",\"fh\",\"fi\"]", hidden: true, note: "Two three-letter keys produce nine combinations." },
    { args: ["56"], expected: "[\"jm\",\"jn\",\"jo\",\"km\",\"kn\",\"ko\",\"lm\",\"ln\",\"lo\"]", hidden: true, note: "A middle keypad pair." },
    { args: ["29"], expected: "[\"aw\",\"ax\",\"ay\",\"az\",\"bw\",\"bx\",\"by\",\"bz\",\"cw\",\"cx\",\"cy\",\"cz\"]", hidden: true, note: "A three-letter key paired with a four-letter key." },
    { args: ["87"], expected: "[\"tp\",\"tq\",\"tr\",\"ts\",\"up\",\"uq\",\"ur\",\"us\",\"vp\",\"vq\",\"vr\",\"vs\"]", hidden: true, note: "The reversed digit order still forms every keypad product." },
  ],
  starterCode: { python: `class Solution:\n    def letterCombinations(self, digits: str) -> List[str]:\n        ` },
  notes: { approach: "Map each digit to its letters and choose one letter for the next digit. When the partial string reaches the digit count, record it.", timeComplexity: "O(4ⁿ · n)", spaceComplexity: "O(n) recursion depth, excluding the returned combinations" },
  signature: { name: "letterCombinations", params: [{ name: "digits", kind: "string" }], returns: "string[]" },
  compare: "unordered",
  sourceUrl: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/",
  reference: `class Solution:\n    def letterCombinations(self, digits: str) -> List[str]:\n        res = []\n        digitToChar = {\n            "2": "abc", "3": "def", "4": "ghi", "5": "jkl",\n            "6": "mno", "7": "qprs", "8": "tuv", "9": "wxyz",\n        }\n\n        def backtrack(i, curStr):\n            if len(curStr) == len(digits):\n                res.append(curStr)\n                return\n            for c in digitToChar[digits[i]]:\n                backtrack(i + 1, curStr + c)\n\n        if digits:\n            backtrack(0, "")\n        return res\n`,
  rejection: `class Solution:\n    def letterCombinations(self, digits):\n        # Treats every digit as a three-letter key and drops the fourth letters.\n        mapping = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqr", "8": "tuv", "9": "wxy"}\n        result = [""]\n        for digit in digits:\n            result = [prefix + letter for prefix in result for letter in mapping[digit]]\n        return result if digits else []\n`,
} satisfies AuthoredProblem;
