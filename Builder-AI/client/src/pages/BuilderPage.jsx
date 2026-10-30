
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';

import BuilderHeader from '../components/BuilderHeader';
import Loading from '../components/Loading';
import ChatPanel from '../components/ChatPanel';
import FileExplorer from '../components/FileExplorer';
import PreviewPanel from '../components/PreviewPanel';
import AgentProgressDashboard from '../components/AgentProgressDashboard';
import PublishModal from '../components/PublishModal';

import api from '../api/api';
import toast from 'react-hot-toast';
import {exportProjectZip} from '../utils/exportProject';

import {
    MessageSquareIcon,
    FolderTreeIcon
} from 'lucide-react';

const BuilderPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [leftTab, setLeftTab] = useState('chat');
    const [publishing, setPublishing] = useState(false);
    const [publishUrl, setPublishUrl] = useState(null);

    const {
        activeProject,
        loadingActiveProject,
        activeFile,
        showCode,
        setActiveFile,
        setShowCode,
        loadProject,
        logout,
        chatLoading,
        handleChat
    } = useAppContext();

    // Load the selected project
    useEffect(() => {
        if (!id) return;

        loadProject(id);
    }, [id, loadProject]);

    // Poll while the project is being generated
    useEffect(() => {
        if (
            !id ||
            !activeProject ||
            String(activeProject._id) !== String(id) ||
            !['pending', 'generating'].includes(activeProject.status)
        ) {
            return;
        }

        const interval = setInterval(() => {
            loadProject(id, true);
        }, 1500);

        return () => clearInterval(interval);
    }, [id, activeProject, loadProject]);

    // Open project preview in a new tab
    const handleOpenPreview = () => {
        if (!id) return;

        window.open(
            `/preview/${id}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    // Publish project
    const handlePublish = async () => {
        if (!id || publishing) return;

        setPublishing(true);

        try {
            const response = await api.post(
                `/api/projects/${id}/publish`
            );

            // Prefer the URL returned by the backend.
            const backendUrl =
                response?.data?.publishUrl ||
                response?.data?.url;

            const url =
                backendUrl ||
                `${window.location.origin}/publish/${id}`;

            setPublishUrl(url);
            toast.success('Website published successfully!');
        } catch (err) {
            console.error('Publish failed:', err);

            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                'Publish failed. Please try again.';

            toast.error(message);
        } finally {
            setPublishing(false);
        }
    };

    // Download project as ZIP
    const handleDownload = async () => {
        if (!activeProject) {
            toast.error('No project available to download.');
            return;
        }

        try {
            await exportProjectZip(activeProject);
        } catch (err) {
            console.error('Project download failed:', err);
            toast.error('Failed to download project.');
        }
    };

    if (
        loadingActiveProject ||
        !activeProject ||
        String(activeProject._id) !== String(id)
    ) {
        return <Loading />;
    }

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-white text-zinc-900">

            {/* Header */}
            <BuilderHeader
                projectName={activeProject.name}
                version={activeProject.version}
                showCode={showCode}
                publishing={publishing}
                onToggleShowCode={() => setShowCode(!showCode)}
                onOpenPreview={handleOpenPreview}
                onPublish={handlePublish}
                onDownload={handleDownload}
                onBack={() => navigate('/')}
                onLogout={logout}
            />

            {/* Main layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar */}
                <div className="flex w-[320px] shrink-0 flex-col border-r border-zinc-200 bg-white">

                    {/* Tabs */}
                    <div className="flex border-b border-zinc-100">
                        <button
                            type="button"
                            onClick={() => setLeftTab('chat')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${
                                leftTab === 'chat'
                                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                                    : 'text-zinc-400 hover:text-zinc-700'
                            }`}
                        >
                            <MessageSquareIcon size={13} />
                            Chat
                        </button>

                        <button
                            type="button"
                            onClick={() => setLeftTab('files')}
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${
                                leftTab === 'files'
                                    ? 'border-b-2 border-zinc-900 text-zinc-900'
                                    : 'text-zinc-400 hover:text-zinc-700'
                            }`}
                        >
                            <FolderTreeIcon size={13} />
                            Files
                        </button>
                    </div>

                    {/* Sidebar content */}
                    <div className="flex-1 overflow-hidden">
                        {leftTab === 'chat' ? (
                            <ChatPanel
                                messages={activeProject.messages || []}
                                onSend={handleChat}
                                loading={chatLoading}
                            />
                        ) : (
                            <FileExplorer
                                files={activeProject.files || []}
                                activeFile={activeFile}
                                onFileSelect={(path) => {
                                    setActiveFile(path);
                                    setShowCode(true);
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Preview / code area */}
                <div className="flex-1 overflow-hidden">
                    {['pending', 'generating', 'failed'].includes(
                        activeProject.status
                    ) ? (
                        <AgentProgressDashboard
                            project={activeProject}
                        />
                    ) : (
                        <PreviewPanel
                            project={activeProject}
                            activeFile={activeFile}
                            showCode={showCode}
                        />
                    )}
                </div>
            </div>

            {/* Publish modal */}
            {publishUrl && (
                <PublishModal
                    publishUrl={publishUrl}
                    onClose={() => setPublishUrl(null)}
                />
            )}
        </div>
    );
};

export default BuilderPage;
