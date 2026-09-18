"use client";

import Editor, {
  type BeforeMount,
  type OnMount,
  type Monaco,
} from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import { MONACO_FONT_FAMILY } from "@/lib/languages";

import { ensureMonacoLoader } from "./monaco-setup";

// The AMD loader has to be pointed at the self-hosted build before the editor
// asks for it. This module is only ever imported behind `ssr: false`.
ensureMonacoLoader();

const THEME_NAME = "dsa-ink";

const THEME: Parameters<Monaco["editor"]["defineTheme"]>[1] = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7885", fontStyle: "italic" },
    { token: "keyword", foreground: "e0a03c" },
    { token: "keyword.control", foreground: "e0a03c" },
    { token: "string", foreground: "7fb69a" },
    { token: "number", foreground: "c8a2e0" },
    { token: "type", foreground: "8fb8e0" },
    { token: "type.identifier", foreground: "8fb8e0" },
    { token: "function", foreground: "e6edf3" },
    { token: "variable", foreground: "e6edf3" },
    { token: "delimiter", foreground: "8b98a5" },
  ],
  colors: {
    "editor.background": "#0d1116",
    "editor.foreground": "#e6edf3",
    "editorGutter.background": "#0d1116",
    "editorLineNumber.foreground": "#4a5561",
    "editorLineNumber.activeForeground": "#8b98a5",
    "editor.lineHighlightBackground": "#131920",
    "editor.lineHighlightBorder": "#0d1116",
    "editor.selectionBackground": "#1f3243",
    "editor.inactiveSelectionBackground": "#182430",
    "editorCursor.foreground": "#e0a03c",
    "editorIndentGuide.background1": "#1b222b",
    "editorIndentGuide.activeBackground1": "#2f3a46",
    "editorBracketMatch.background": "#1f3243",
    "editorBracketMatch.border": "#3d5a73",
    "editorWidget.background": "#161c24",
    "editorWidget.border": "#232b35",
    "editorSuggestWidget.background": "#161c24",
    "editorSuggestWidget.border": "#232b35",
    "editorSuggestWidget.selectedBackground": "#1c232c",
    "editorHoverWidget.background": "#161c24",
    "editorHoverWidget.border": "#232b35",
    "scrollbarSlider.background": "#232b35",
    "scrollbarSlider.hoverBackground": "#2f3a46",
    "scrollbarSlider.activeBackground": "#3d4a58",
    "editorOverviewRuler.border": "#0d1116",
  },
};

export type MonacoCodeEditorProps = {
  value: string;
  /** Monaco language id. */
  language: string;
  /** Model path — one model per problem + language. */
  path: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Bound to Mod+Enter. */
  onRun?: () => void;
};

export default function MonacoCodeEditor({
  value,
  language,
  path,
  readOnly = false,
  onChange,
  onRun,
}: MonacoCodeEditorProps) {
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = onRun;
  }, [onRun]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme(THEME_NAME, THEME);
  };

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runRef.current?.();
    });
  };

  return (
    <Editor
      theme={THEME_NAME}
      value={value}
      language={language}
      path={path}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      onChange={(next) => onChange?.(next ?? "")}
      loading={null}
      options={{
        readOnly,
        domReadOnly: readOnly,
        fontFamily: MONACO_FONT_FAMILY,
        fontSize: 13.5,
        lineHeight: 22,
        fontLigatures: true,
        minimap: { enabled: false },
        padding: { top: 14, bottom: 14 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        renderLineHighlight: "all",
        cursorSmoothCaretAnimation: "on",
        cursorBlinking: "smooth",
        smoothScrolling: true,
        stickyScroll: { enabled: false },
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: false, indentation: true },
        overviewRulerBorder: false,
        scrollbar: {
          verticalScrollbarSize: 9,
          horizontalScrollbarSize: 9,
          useShadows: false,
        },
        wordWrap: "off",
        contextmenu: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestSelection: "first",
        scrollBeyondLastColumn: 4,
      }}
    />
  );
}
