import { Extension } from "@tiptap/react";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: Editor; range: { from: number; to: number } }) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: "\u2022",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Quote block",
    icon: "\u275D",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Syntax-highlighted code",
    icon: "<>",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: "\u2014",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

interface SlashCommandState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

export const slashCommandPluginKey = new PluginKey<SlashCommandState>(
  "slashCommand"
);

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      new Plugin<SlashCommandState>({
        key: slashCommandPluginKey,
        state: {
          init(): SlashCommandState {
            return { active: false, query: "", range: null };
          },
          apply(tr, prev): SlashCommandState {
            const meta = tr.getMeta(slashCommandPluginKey);
            if (meta) return meta;
            if (!prev.active) return prev;

            const { $from } = tr.selection;
            const textBefore = $from.parent.textContent.slice(
              0,
              $from.parentOffset
            );
            const slashIndex = textBefore.lastIndexOf("/");

            if (slashIndex === -1) {
              return { active: false, query: "", range: null };
            }

            const query = textBefore.slice(slashIndex + 1);
            const from = $from.start() + slashIndex;
            const to = $from.pos;

            return { active: true, query, range: { from, to } };
          },
        },
        props: {
          handleKeyDown(view, event) {
            if (event.key === "/") {
              const { $from } = view.state.selection;
              const textBefore = $from.parent.textContent.slice(
                0,
                $from.parentOffset
              );
              if (textBefore === "" || textBefore.endsWith(" ")) {
                setTimeout(() => {
                  const { $from: $f } = view.state.selection;
                  const from = $f.pos - 1;
                  const to = $f.pos;
                  const tr = view.state.tr.setMeta(slashCommandPluginKey, {
                    active: true,
                    query: "",
                    range: { from, to },
                  });
                  view.dispatch(tr);
                }, 10);
              }
            }

            if (event.key === "Escape") {
              const state = slashCommandPluginKey.getState(view.state);
              if (state?.active) {
                view.dispatch(
                  view.state.tr.setMeta(slashCommandPluginKey, {
                    active: false,
                    query: "",
                    range: null,
                  })
                );
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
