import { Show } from "solid-js";

import { ToastRegion } from "../components/feedback/ToastRegion";
import { AppShell } from "../components/layout/AppShell";
import { ExplorerSidebar } from "../components/layout/ExplorerSidebar";
import { EditorPane } from "../components/editor/EditorPane";
import { NoteHistoryPanel } from "../components/editor/NoteHistoryPanel";
import { SettingsModal } from "../components/settings/SettingsModal";
import {
  chooseWorkspace,
  closeWorkspaceError,
  getDocumentLoading,
  getDocumentReloadToken,
  getExpandedPaths,
  getSaveStatus,
  getSelectedDocument,
  getSelectedPath,
  getWorkspace,
  getWorkspaceError,
  getWorkspaceLoading,
  getWorkspaceTree,
  refreshWorkspaceTree,
  reloadSelectedDocument,
  retryPendingSave,
  selectNote,
  toggleFolder,
  updateSelectedDocument,
  updateSelectedTitle,
  workspaceSupportsFolderPicker,
} from "../workspace/store";
import { useAppController } from "./useAppController";

export default function App() {
  const controller = useAppController();
  const appearance = controller.appearance;
  const explorer = controller.explorer;
  const history = controller.history;

  return (
    <AppShell>
      <ExplorerSidebar
        workspace={getWorkspace()}
        tree={getWorkspaceTree()}
        loading={getWorkspaceLoading()}
        canChooseWorkspace={workspaceSupportsFolderPicker()}
        error={getWorkspaceError()}
        selectedPath={getSelectedPath()}
        expandedPaths={getExpandedPaths()}
        creation={explorer.creation()}
        creating={explorer.creating()}
        canPaste={Boolean(explorer.cutPath())}
        legacyNoteCount={explorer.legacyNotes().length}
        legacyIssue={explorer.legacyIssue()}
        onChooseWorkspace={() => void chooseWorkspace()}
        onRefresh={() => void refreshWorkspaceTree()}
        onOpenSettings={() => controller.setSettingsOpen(true)}
        onDismissError={closeWorkspaceError}
        onImportLegacy={() => void explorer.importOldNotes()}
        onStartCreation={explorer.startCreation}
        onSubmitCreation={(name) => void explorer.submitCreation(name)}
        onCancelCreation={() => explorer.setCreation(null)}
        onSelect={(path) => void selectNote(path)}
        onToggle={toggleFolder}
        onRename={(path) => void explorer.rename(path)}
        onDelete={(path) => void explorer.remove(path)}
        onMove={(path, parent) => void explorer.move(path, parent)}
        onCopyMarkdown={(path) => void explorer.copyMarkdown(path)}
        onCut={(path) => explorer.cut(path)}
        onPaste={(parent) => void explorer.paste(parent)}
        onShowHistory={history.open}
      />

      <EditorPane
        document={getSelectedDocument()}
        status={getSaveStatus()}
        initializing={getWorkspaceLoading()}
        loading={getDocumentLoading()}
        reloadToken={getDocumentReloadToken()}
        error={getWorkspaceError()}
        onChange={updateSelectedDocument}
        onTitleChange={updateSelectedTitle}
        onCreate={() => explorer.startCreation("note")}
        onRetry={() => void retryPendingSave()}
        onReload={() => void reloadSelectedDocument()}
      />

      <Show when={history.path()} keyed>
        {(notePath) => (
          <NoteHistoryPanel
            notePath={notePath}
            noteName={history.noteName()}
            versions={history.versions()}
            now={history.now()}
            busy={history.busy()}
            onClose={history.close}
            onRestore={(version) => void history.restore(version)}
            onForget={history.forget}
          />
        )}
      </Show>

      <Show when={controller.settingsOpen()}>
        <SettingsModal
          skins={appearance.skins()}
          activeSkin={appearance.activeSkin()}
          loading={appearance.skinLoading()}
          appearance={appearance.appearance()}
          onAppearanceChange={appearance.updateAppearance}
          onSkinChange={(id) => void appearance.changeSkin(id)}
          onSkinCreated={appearance.skinCreated}
          onClose={() => controller.setSettingsOpen(false)}
        />
      </Show>
      <ToastRegion />
    </AppShell>
  );
}
