
import React, { useMemo, useState } from 'react';

import {
    SandpackProvider,
    SandpackLayout,
    SandpackPreview
} from '@codesandbox/sandpack-react';

import SandpackErrorMonitor from './SandpackErrorMonitor';
import { detectDependencies } from '../utils/sandpackUtils';

const FullPagePreview = ({ files }) => {

    const [showErrorOverlay, setShowErrorOverlay] = useState(true);

    // Convert project files into Sandpack format
    const sandpackFiles = useMemo(() => {
        if (!files) return {};

        const spFiles = {};

        for (const [path, content] of Object.entries(files)) {
            spFiles[path] = {
                code: typeof content === 'string' ? content : content.code
            };
        }

        return spFiles;
    }, [files]);

    // Detect dependencies from import statements
    const dependencies = useMemo(() => {
        if (!files) return {};

        return detectDependencies(files);
    }, [files]); // Fixed: use files instead of liveFiles

    return (
        <div className="h-screen w-screen bg-white overflow-hidden">

            <SandpackProvider
                template="react"
                files={sandpackFiles}
                customSetup={{
                    dependencies
                }}
                options={{
                    externalResources: [
                        'https://cdn.tailwindcss.com',
                        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
                    ],
                    logLevel: 0
                }}
                className="h-full w-full"
            >

                <SandpackErrorMonitor
                    onErrorChange={setShowErrorOverlay}
                />

                <SandpackLayout className="h-full w-full border-none! bg-transparent!">

                    <SandpackPreview
                        showNavigator={false}
                        showRefreshButton={false}
                        showOpenInCodeSandbox={false}
                        showSandPackErrorOverlay={showErrorOverlay}
                        className="h-full w-full"
                    />

                </SandpackLayout>

            </SandpackProvider>

        </div>
    );
};

export default FullPagePreview;
