/** 仅当透传与代理模式互相切换时，Claude Code 才需要重新读取设置。 */
export function shouldReloadWindow(currentProxy: boolean, nextProxy: boolean): boolean {
  return currentProxy !== nextProxy;
}
