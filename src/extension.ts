import * as vscode from 'vscode';
import * as path from 'path';
import { setProxy, setPass, readSettings, activeModel, isProxy } from './settings';
import { fetchModelIds } from './models';
import { shouldReloadWindow } from './reload';

const PASS_LABEL = '透传';

let statusBar: vscode.StatusBarItem;

function workspaceSettingsPath(): string {
  const folders = vscode.workspace.workspaceFolders;
  const root = folders && folders.length > 0 ? folders[0].uri.fsPath : process.cwd();
  return path.join(root, '.claude', 'settings.json');
}

function baseUrl(): string {
  const cfg = vscode.workspace.getConfiguration('claudeCliProxy').get<string>('baseUrl', 'http://127.0.0.1:8317');
  return cfg.replace(/\/+$/, '');
}

/** 读取当前生效的模式文案：代理模型 ID 或透传。 */
function currentLabel(): string {
  const model = activeModel(readSettings(workspaceSettingsPath()));
  return model ?? PASS_LABEL;
}

function refreshStatusBar(): void {
  statusBar.text = `$(arrow-swap) Claude: ${currentLabel()}`;
  statusBar.tooltip = '切换 Claude Code 到透传或本地 CLIProxyAPI 模型';
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'claudeCliProxy.switchModel';
  refreshStatusBar();
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCliProxy.switchModel', () => switchModel()),
  );
}

export function deactivate(): void {}

async function switchModel(): Promise<void> {
  const url = baseUrl();
  let ids: string[];
  try {
    ids = await fetchModelIds(url);
  } catch (e) {
    void vscode.window.showErrorMessage(`获取模型失败: ${url}/v1/models —— ${String((e as any)?.message ?? e)}`);
    return;
  }

  type Item = vscode.QuickPickItem & { pass?: boolean; model?: string };
  const items: Item[] = [
    { label: '$(circle-slash) 透传', description: '直连官方 api.anthropic.com', pass: true },
  ];
  for (const id of ids) {
    items.push({ label: `$(server) ${id}`, description: url, model: id });
  }

  const picked = await vscode.window.showQuickPick(items, { placeHolder: '选择模型或透传' });
  if (!picked) {
    return;
  }

  const wsPath = workspaceSettingsPath();
  const currentProxy = isProxy(readSettings(wsPath));
  let nextProxy: boolean;
  let message: string;
  if (picked.pass) {
    setPass(wsPath);
    nextProxy = false;
    message = '已切回透传';
  } else if (picked.model) {
    setProxy(wsPath, url, picked.model);
    nextProxy = true;
    message = `已切换到 ${picked.model}`;
  } else {
    return;
  }
  refreshStatusBar();

  if (!shouldReloadWindow(currentProxy, nextProxy)) {
    void vscode.window.showInformationMessage(`${message}，无需重载窗口`);
    return;
  }

  void vscode.window.showInformationMessage(`${message}，正在重载窗口`);
  // Claude Code 仅在透传与代理模式互相切换时，才需要重启窗口重新读取设置。
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
}