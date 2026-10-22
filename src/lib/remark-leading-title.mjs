/**
 * The article template renders its title from frontmatter. Remove a leading
 * body-level H1 during Markdown compilation, while preserving source files.
 * Scope this to the posts collection so other Markdown pages keep their titles.
 */
export function removeLeadingPostTitle(tree, file) {
  const pathname = String(file?.path ?? file?.history?.at(-1) ?? '').replaceAll('\\', '/');
  if (!/(?:^|\/)src\/content\/posts\//.test(pathname)) return;
  const firstVisible = tree.children.findIndex((node) => !['yaml', 'toml', 'definition'].includes(node.type));
  if (firstVisible < 0) return;
  const first = tree.children[firstVisible];
  if (first.type === 'heading' && first.depth === 1) tree.children.splice(firstVisible, 1);
}

export default function remarkLeadingTitle() {
  return removeLeadingPostTitle;
}
