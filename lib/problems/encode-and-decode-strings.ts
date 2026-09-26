import type { AuthoredProblem } from "./authoring";

export const encodeAndDecodeStrings = {
  slug: "encode-and-decode-strings",
  number: 271,
  title: "Encode and Decode Strings",
  difficulty: "medium",
  tags: ["array", "hash-table", "string", "neetcode-150"],
  statement: [
    "Design a codec for a list of strings. `encode` turns the list into a single string that can be sent to another machine. `decode` turns that string back into the original list.",
    "",
    "The two methods run on different instances, so the encoded string is the only information `decode` receives. `decode(encode(strs))` must equal `strs`.",
    "",
    "The encoding itself is up to you. It has to survive every character the strings may contain, including whatever delimiter you might otherwise pick.",
  ].join("\n"),
  examples: [
    {
      args: [["Hello", "World"]],
      output: '["Hello","World"]',
      explanation:
        "Machine 1 encodes the list. Machine 2 decodes that string and gets the same two words back.",
    },
    {
      args: [[""]],
      output: '[""]',
      explanation: "A list of one empty string comes back as one empty string.",
    },
    {
      args: [[]],
      output: "[]",
      explanation: "An empty list encodes and decodes to an empty list.",
    },
  ],
  constraints: [
    "`0 <= strs.length <= 99`",
    "`0 <= strs[i].length <= 199`",
    "`strs[i]` may contain any of the 256 ASCII characters.",
  ],
  testcases: [
    {
      args: [["Hello", "World"]],
      expected: '["Hello","World"]',
      note: "two ordinary words",
    },
    {
      args: [[""]],
      expected: '[""]',
      note: "one empty string",
    },
    {
      args: [[]],
      expected: "[]",
      note: "empty list",
    },
    {
      args: [["", ""]],
      expected: '["",""]',
      hidden: true,
      note: "two empty strings stay two",
    },
    {
      args: [["", "a", ""]],
      expected: '["","a",""]',
      hidden: true,
      note: "empty strings around a letter",
    },
    {
      args: [["a#b", "c"]],
      expected: '["a#b","c"]',
      hidden: true,
      note: "a hash inside a string is data, not a separator",
    },
    {
      args: [["hello\nworld"]],
      expected: '["hello\\nworld"]',
      hidden: true,
      note: "a newline inside a string",
    },
    {
      args: [["123", "4"]],
      expected: '["123","4"]',
      hidden: true,
      note: "digit strings",
    },
    {
      args: [["4#abc"]],
      expected: '["4#abc"]',
      hidden: true,
      note: "a string that looks like a length prefix",
    },
    {
      args: [["#", "##", ""]],
      expected: '["#","##",""]',
      hidden: true,
      note: "hashes and an empty string",
    },
    {
      args: [["we", "say", ":", "yes"]],
      expected: '["we","say",":","yes"]',
      hidden: true,
      note: "a colon that a delimiter join would swallow",
    },
    {
      args: [['say "hi"', "next"]],
      expected: '["say \\"hi\\"","next"]',
      hidden: true,
      note: "a quote inside a string",
    },
  ],
  starterCode: {
    python: `class Solution:
    def encode(self, strs: List[str]) -> str:
        
    def decode(self, s: str) -> List[str]:
        `,
  },
  notes: {
    approach:
      "A delimiter join breaks as soon as a string contains that delimiter. Write each string as its length, a separator, then the characters themselves, and concatenate those chunks. Decoding reads the length, skips the separator, and takes exactly that many characters, so a hash, a newline, or a digit inside a string is payload rather than syntax.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
  },
  signature: {
    name: "encode",
    params: [{ name: "strs", kind: "string[]" }],
    returns: "string[]",
    roundTrip: { encode: "encode", decode: "decode" },
  },
  compare: "exact",
  sourceUrl: "https://leetcode.com/problems/encode-and-decode-strings/",
  reference: `class Solution:
    def encode(self, strs: List[str]) -> str:
        return "".join(f"{len(s)}#{s}" for s in strs)

    def decode(self, s: str) -> List[str]:
        decoded = []
        i = 0
        while i < len(s):
            j = s.find("#", i)
            length = int(s[i:j])
            i = j + 1
            decoded.append(s[i:i + length])
            i += length
        return decoded
`,
  rejection: `class Solution:
    def encode(self, strs: List[str]) -> str:
        return "#".join(strs)

    def decode(self, s: str) -> List[str]:
        return s.split("#")
`,
} satisfies AuthoredProblem;
