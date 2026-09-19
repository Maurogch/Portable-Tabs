const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const STATE_FILE = ".vscode/portable-tabs.json";
let timer = null, restoring = false, startupSettled = false;

function root() { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; }
function statePath() { const r = root(); return r && path.join(r, STATE_FILE); }
function rel(uri) { return path.relative(root(), uri.fsPath).replace(/\\/g, "/"); }
function inside(p) { return p !== ".." && !p.startsWith("../") && !path.isAbsolute(p); }
function uri(p) { return vscode.Uri.file(path.join(root(), ...p.split("/"))); }

function editorInfo(input) {
    const e = vscode.window.activeTextEditor;
    if (!e || e.document.uri.toString() !== input.uri.toString()) return null;
    const s = e.selection;
    return { start:{line:s.start.line, character:s.start.character}, end:{line:s.end.line, character:s.end.character} };
}

function collect() {
    const r = root(); if (!r) return null;
    const groups = vscode.window.tabGroups.all.map(g => ({
        viewColumn:g.viewColumn,
        tabs:g.tabs.map(t => {
            if (!(t.input instanceof vscode.TabInputText)) return null;
            const p = rel(t.input.uri); if (!inside(p)) return null;
            const x = {path:p, pinned:t.isPinned, preview:t.isPreview};
            const sel = editorInfo(t.input);
            if (sel) x.selection = sel;
            return x;
        }).filter(Boolean)
    }));
    const t = vscode.window.tabGroups.activeTabGroup.activeTab;
    let active = null;
    if (t?.input instanceof vscode.TabInputText) {
        const p = rel(t.input.uri); if (inside(p)) active = {path:p, viewColumn:vscode.window.tabGroups.activeTabGroup.viewColumn};
    }
    return {version:3, savedAt:new Date().toISOString(), groups, active};
}

async function save() {
    if (restoring) return;
    const p=statePath(), s=collect(); if (!p || !s) return;
    await fs.promises.mkdir(path.dirname(p), {recursive:true});
    await fs.promises.writeFile(p, JSON.stringify(s,null,2)+"\n", "utf8");
}
function scheduleSave() {
    if (restoring || !startupSettled) return;
    clearTimeout(timer); timer=setTimeout(()=>save().catch(console.error),300);
}
function savedPaths(s) {
    const out=new Set(); for (const g of s.groups||[]) for (const t of g.tabs||[]) if(t.path) out.add(t.path); return out;
}
function openPaths() {
    const out=new Set(); if(!root()) return out;
    for(const g of vscode.window.tabGroups.all) for(const t of g.tabs) if(t.input instanceof vscode.TabInputText){const p=rel(t.input.uri);if(inside(p))out.add(p);}
    return out;
}
function alreadyRestored(s) {
    const a=savedPaths(s), b=openPaths(); if(!a.size || a.size!==b.size) return false;
    for(const p of a) if(!b.has(p)) return false;
    return true;
}
function pos(p, doc) {
    if(!p) return null; const l=Math.max(0,Math.min(p.line,doc.lineCount-1));
    return new vscode.Position(l,Math.max(0,Math.min(p.character,doc.lineAt(l).text.length)));
}
async function restoreOne(t, col) {
    const u=uri(t.path); if(!fs.existsSync(u.fsPath)) return;
    try {
        const d=await vscode.workspace.openTextDocument(u);
        const e=await vscode.window.showTextDocument(d,{viewColumn:col,preserveFocus:true,preview:false});
        if(t.selection){const a=pos(t.selection.start,d),b=pos(t.selection.end,d);if(a&&b){e.selection=new vscode.Selection(a,b);e.revealRange(new vscode.Range(a,b),vscode.TextEditorRevealType.InCenterIfOutsideViewport);}}
        if(t.pinned) await vscode.commands.executeCommand("workbench.action.pinEditor");
    } catch(err){console.error(`Portable Tabs: failed to restore ${t.path}`,err);}
}
async function restore() {
    const p=statePath(); if(!p || !fs.existsSync(p)) return;
    let s; try{s=JSON.parse(await fs.promises.readFile(p,"utf8"));}catch(e){vscode.window.showErrorMessage(`Portable Tabs: Cannot read ${STATE_FILE}`);return;}
    if(!s?.groups || alreadyRestored(s)) return;
    restoring=true;
    try {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
        for(const g of s.groups) for(const t of g.tabs||[]) await restoreOne(t,g.viewColumn);
        if(s.active?.path && fs.existsSync(uri(s.active.path).fsPath)){
            const d=await vscode.workspace.openTextDocument(uri(s.active.path));
            const e=await vscode.window.showTextDocument(d,{viewColumn:s.active.viewColumn,preserveFocus:false,preview:false});
            const t=s.groups.flatMap(g=>g.tabs||[]).find(x=>x.path===s.active.path);
            if(t?.selection){const a=pos(t.selection.start,d),b=pos(t.selection.end,d);if(a&&b){e.selection=new vscode.Selection(a,b);e.revealRange(new vscode.Range(a,b),vscode.TextEditorRevealType.InCenterIfOutsideViewport);}}
        }
    } finally { restoring=false; await save(); }
}
function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand("portableTabs.save",async()=>{await save();vscode.window.showInformationMessage("Portable Tabs: state saved.");}),
        vscode.commands.registerCommand("portableTabs.restore",restore),
        vscode.window.tabGroups.onDidChangeTabs(scheduleSave),
        vscode.window.tabGroups.onDidChangeTabGroups(scheduleSave),
        vscode.window.onDidChangeActiveTextEditor(scheduleSave)
    );
    setTimeout(async()=>{
        startupSettled=true; const p=statePath(); if(!p)return;
        if(!fs.existsSync(p)) await save(); else await restore();
    },2000);
}
async function deactivate() {
    clearTimeout(timer);
    if (restoring) return;
    try {
        await save();
    } catch (err) {
        console.error("Portable Tabs: failed to save state during shutdown", err);
    }
}
module.exports={activate,deactivate};
