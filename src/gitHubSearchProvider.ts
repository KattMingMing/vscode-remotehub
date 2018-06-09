'use strict';
import {
    CancellationToken,
    FileSearchOptions,
    FileType,
    Progress,
    SearchProvider,
    TextSearchOptions,
    TextSearchQuery,
    TextSearchResult,
    Uri
} from 'vscode';
import { GitHubFileSystemProvider } from './gitHubFileSystemProvider';
import { Strings } from './system';
import * as path from 'path';

export class GitHubSearchProvider implements SearchProvider {
    constructor(private readonly _githubFS: GitHubFileSystemProvider) {}

    async provideFileSearchResults(
        options: FileSearchOptions,
        progress: Progress<string>,
        token: CancellationToken
    ): Promise<void> {
        void (await this.provideFileSearchResultsCore(
            options.folder,
            '',
            progress,
            token
        ));
    }

    private async provideFileSearchResultsCore(
        uri: Uri,
        relativePath: string,
        progress: Progress<string>,
        token: CancellationToken
    ): Promise<void> {
        if (token.isCancellationRequested) return;

        const items = await this._githubFS.readDirectory(
            joinPath(uri, relativePath)
        );

        for (const [name, type] of items) {
            if (token.isCancellationRequested) break;

            const relativeResult = Strings.normalizePath(
                path.join(relativePath, name)
            );

            if (type === FileType.Directory) {
                await this.provideFileSearchResultsCore(
                    uri,
                    relativeResult,
                    progress,
                    token
                );
            } else if (type === FileType.File) {
                progress.report(relativeResult);
            }
        }
    }

    async provideTextSearchResults(
        query: TextSearchQuery,
        options: TextSearchOptions,
        progress: Progress<TextSearchResult>,
        token: CancellationToken
    ): Promise<void> {}
}

function joinPath(uri: Uri, pathFragment: string): Uri {
    return uri.with({
        path: Strings.normalizePath(path.join(uri.path || '/', pathFragment))
    });
}
