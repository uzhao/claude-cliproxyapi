import * as vscode from 'vscode';
import * as path from 'path';
import { setProxy, setPass, readSettings, activeModel } from './settings';
import { fetchModelIds } from './models';

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
  if (picked.pass) {
    setPass(wsPath);
    void vscode.window.showInformationMessage('已切回透传，正在重载窗口');
  } else if (picked.model) {
    setProxy(wsPath, url, picked.model);
    void vscode.window.showInformationMessage(`已切换到 ${picked.model}，正在重载窗口`);
  } else {
    return;
  }
  refreshStatusBar();

  // Claude Code 必须重启窗口才能读到最新 settings.json（baseURL / modelOverrides）。
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
}