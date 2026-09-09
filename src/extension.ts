import * as vscode from 'vscode';
import * as path from 'path';
import { setProxy, setPass, readSettings, isProxy } from './settings';

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

function refreshStatusBar(): void {
  if (isProxy(readSettings(workspaceSettingsPath()))) {
    statusBar.text = '$(plug) Claude: 代理';
    statusBar.tooltip = 'Claude Code 正在走本地 CLIProxyAPI,点击切回直连官方';
  } else {
    statusBar.text = '$(circle-slash) Claude: 透传';
    statusBar.tooltip = 'Claude Code 直连官方 API,点击切换到本地 CLIProxyAPI 代理';
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'claudeCliProxy.toggleProxy';
  refreshStatusBar();
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCliProxy.toggleProxy', () => toggleProxy()),
  );
}

export function deactivate(): void {}

async function toggleProxy(): Promise<void> {
  const wsPath = workspaceSettingsPath();
  const currentProxy = isProxy(readSettings(wsPath));
  if (currentProxy) {
    setPass(wsPath);
  } else {
    setProxy(wsPath, baseUrl());
  }
  refreshStatusBar();

  // 环境变量变更只有重载窗口后才对 Claude Code 生效。
  void vscode.window.showInformationMessage('已切换 Claude Code 接入方式，正在重载窗口');
  await vscode.commands.executeCommand('workbench.action.reloadWindow');
}
