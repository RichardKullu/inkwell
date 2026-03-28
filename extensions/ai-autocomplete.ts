import { Extension } from "@tiptap/react";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const aiAutocompletePluginKey = new PluginKey("aiAutocomplete");

interface AutocompleteState {
  suggestion: string | null;
  loading: boolean;
  position: number | null;
}

export const AIAutocompleteExtension = Extension.create({
  name: "aiAutocomplete",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiAutocompletePluginKey,
        state: {
          init(): AutocompleteState {
            return { suggestion: null, loading: false, position: null };
          },
          apply(tr, prev): AutocompleteState {
            const meta = tr.getMeta(aiAutocompletePluginKey);
            if (meta) return meta;
            if (tr.docChanged) return { suggestion: null, loading: false, position: null };
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = aiAutocompletePluginKey.getState(state) as AutocompleteState;
            if (!pluginState?.suggestion || pluginState.position === null) {
              return DecorationSet.empty;
            }
            const widget = Decoration.widget(pluginState.position, () => {
              const span = document.createElement("span");
              span.className = "ai-suggestion-ghost";
              span.textContent = pluginState.suggestion;
              span.style.color = "#9ca3af";
              span.style.fontStyle = "italic";
              return span;
            });
            return DecorationSet.create(state.doc, [widget]);
          },
          handleKeyDown(view, event) {
            const pluginState = aiAutocompletePluginKey.getState(view.state) as AutocompleteState;
            if (event.key === "Tab" && pluginState?.suggestion) {
              event.preventDefault();
              const { tr } = view.state;
              const pos = pluginState.position ?? view.state.selection.from;
              tr.insertText(pluginState.suggestion, pos);
              tr.setMeta(aiAutocompletePluginKey, { suggestion: null, loading: false, position: null });
              view.dispatch(tr);
              return true;
            }
            if (event.key === "Escape" && pluginState?.suggestion) {
              view.dispatch(view.state.tr.setMeta(aiAutocompletePluginKey, { suggestion: null, loading: false, position: null }));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
