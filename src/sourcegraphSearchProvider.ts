'use strict';
import {
    CancellationToken,
    FileSearchOptions,
    Progress,
    Range,
    SearchProvider,
    TextSearchOptions,
    TextSearchQuery,
    TextSearchResult,
    Uri
} from 'vscode';
import { SourcegraphApi } from './sourcegraphApi';

export class SourceGraphSearchProvider implements SearchProvider {
    constructor(private readonly _sourcegraph: SourcegraphApi) {}

    async provideFileSearchResults(
        options: FileSearchOptions,
        progress: Progress<string>,
        token: CancellationToken
    ): Promise<void> {
        const matches = await this._sourcegraph.filesQuery(options.folder);
        if (matches === undefined || token.isCancellationRequested) return;

        for (const m of matches) {
            progress.report(m);
        }
    }

    async provideTextSearchResults(
        query: TextSearchQuery,
        options: TextSearchOptions,
        progress: Progress<TextSearchResult>,
        token: CancellationToken
    ): Promise<void> {
        let sgQuery;
        if (query.isRegExp) {
            if (query.isWordMatch) {
                sgQuery = `\\b${query.pattern}\\b`;
            } else {
                sgQuery = query.pattern;
            }
        } else {
            if (query.isWordMatch) {
                sgQuery = `\\b${query.pattern}\\b`;
            } else {
                sgQuery = `"${query.pattern}"`;
            }
        }

        if (query.isCaseSensitive) {
            sgQuery = ` case:yes ${sgQuery}`;
        }

        const matches = await this._sourcegraph.searchQuery(
            sgQuery,
            options.folder,
            token
        );
        if (matches === undefined) return;

        for (const m of matches) {
            const path = Uri.parse(m.resource).fragment;
            for (const line of m.lineMatches) {
                for (const offset of line.offsetAndLengths) {
                    const range = new Range(
                        line.lineNumber,
                        offset[0],
                        line.lineNumber,
                        offset[0] + offset[1]
                    );

                    progress.report({
                        path: path,
                        range: range,
                        preview: {
                            text: line.preview,
                            match: range
                        }
                    });
                }
            }
        }
    }
}
