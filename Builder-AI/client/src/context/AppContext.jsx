
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from "react";

import api from "../api/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AppContext = createContext(undefined);

export function AppContextProvider({ children }) {
    const navigate = useNavigate();

    // Auth States
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Project States
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [activeProject, setActiveProject] = useState(null);
    const [loadingActiveProject, setLoadingActiveProject] = useState(true);
    const [generatingProject, setGeneratingProject] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [activeFile, setActiveFile] = useState(null);
    const [chatLoading, setChatLoading] = useState(false);

    // Auth Actions
    const checkSession = useCallback(async () => {
        try {
            const { data } = await api.get("/api/auth/me");
            setUser(data.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoadingUser(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/api/auth/login", {
                email,
                password
            });

            setUser(data.user);
            toast.success("Welcome back!");
            navigate("/");
        } catch (err) {
            console.error("Login failed:", err);

            const errMsg =
                err?.response?.data?.error ||
                "Invalid email or password";

            toast.error(errMsg);
            throw new Error(errMsg);
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await api.post("/api/auth/register", {
                name,
                email,
                password
            });

            setUser(data.user);
            toast.success("Account created successfully!");
            navigate("/");
        } catch (err) {
            console.error("Registration failed:", err);

            const errMsg =
                err?.response?.data?.error ||
                "Registration failed";

            toast.error(errMsg);
            throw new Error(errMsg);
        }
    };

    const logout = async () => {
        try {
            await api.post("/api/auth/logout");

            setUser(null);
            setProjects([]);
            setActiveProject(null);
            setActiveFile(null);
            setChatLoading(false);

            toast.success("Logged out successfully");
            navigate("/login");
        } catch (err) {
            console.error("Logout failed:", err);
            toast.error("Logout failed");
        }
    };

    // Project Actions
    const loadProjects = async () => {
        if (!user) {
            setLoadingProjects(false);
            return;
        }

        try {
            const { data } = await api.get("/api/projects");
            setProjects(data);
        } catch (err) {
            console.error("Failed to list projects:", err);
            toast.error("Failed to load projects list");
        } finally {
            setLoadingProjects(false);
        }
    };

    const loadProject = useCallback(async (id, silent = false) => {
        if (!user) return;

        if (!silent) {
            setLoadingActiveProject(true);
        }

        try {
            const { data } = await api.get(`/api/projects/${id}`);

            setActiveProject(data);

            // Default file selection
            const files = Object.keys(data.files || {});

            if (files.length > 0) {
                setActiveFile((prev) => {
                    if (prev && files.includes(prev)) {
                        return prev;
                    }

                    if (files.includes("/App.js")) {
                        return "/App.js";
                    }

                    return files[0];
                });
            }
        } catch (err) {
            console.error("Failed to load project:", err);

            if (!silent) {
                toast.error("Failed to load project details");
                navigate("/");
            }
        } finally {
            if (!silent) {
                setLoadingActiveProject(false);
            }
        }
    }, [user, navigate]);

    // Automatically poll active project status
    // while generating, pending, or revising
    useEffect(() => {
        if (!activeProject?._id || !user) {
            setChatLoading(false);
            return;
        }

        const isOngoing = [
            "generating",
            "pending",
            "revising"
        ].includes(activeProject.status);

        if (isOngoing) {
            setChatLoading(true);

            const interval = setInterval(() => {
                loadProject(activeProject._id, true);
            }, 2000);

            return () => clearInterval(interval);
        }

        setChatLoading(false);
    }, [
        activeProject?._id,
        activeProject?.status,
        loadProject,
        user
    ]);

    const handleGenerate = useCallback(
        async (prompt) => {
            if (!user) return;

            setGeneratingProject(true);

            try {
                const { data } = await api.post("/api/projects", {
                    prompt
                });

                toast.success("AI Agent is planning structure...");
                navigate(`/builder/${data._id}`);
            } catch (err) {
                console.error("Failed to generate project:", err);

                toast.error(
                    err?.response?.data?.error ||
                    "Failed to generate project"
                );
            } finally {
                setGeneratingProject(false);
            }
        },
        [navigate, user]
    );

    const handleDelete = useCallback(
        async (id) => {
            if (!user) return;

            try {
                await api.delete(`/api/projects/${id}`);

                setProjects((prev) =>
                    prev.filter((project) => project._id !== id)
                );

                if (activeProject?._id === id) {
                    setActiveProject(null);
                    setActiveFile(null);
                }

                toast.success("Project deleted successfully");
            } catch (err) {
                console.error("Failed to delete project:", err);
                toast.error("Failed to delete project");
            }
        },
        [user, activeProject?._id]
    );

    return (
        <AppContext.Provider
            value={{
                user,
                loadingUser,
                login,
                register,
                logout,
                projects,
                loadingProjects,
                activeProject,
                loadingActiveProject,
                chatLoading,
                generatingProject,
                activeFile,
                showCode,
                setActiveFile,
                setShowCode,
                loadProjects,
                loadProject,
                handleGenerate,
                handleDelete
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);

    if (context === undefined) {
        throw new Error(
            "useAppContext must be used within an AppContextProvider"
        );
    }

    return context;
}
