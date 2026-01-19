import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // Auth State
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('nexora_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Device State
    const [devices, setDevices] = useState(() => {
        const saved = localStorage.getItem('nexora_devices');
        return saved ? JSON.parse(saved) : {
            classroomLight: false,
            labFan: false
        };
    });

    // Logs State
    const [logs, setLogs] = useState([]);

    // Persist User
    useEffect(() => {
        if (user) localStorage.setItem('nexora_user', JSON.stringify(user));
        else localStorage.removeItem('nexora_user');
    }, [user]);

    // Persist Devices
    useEffect(() => {
        localStorage.setItem('nexora_devices', JSON.stringify(devices));
    }, [devices]);

    const login = (username) => {
        const newUser = { username, loggedIn: true };
        setUser(newUser);
        addLog(`User ${username} logged in.`);
    };

    const logout = () => {
        addLog(`User ${user?.username} logged out.`);
        setUser(null);
    };

    const toggleDevice = (deviceName, state = null) => {
        setDevices(prev => {
            const newState = state !== null ? state : !prev[deviceName];
            return { ...prev, [deviceName]: newState };
        });
        // Log is handled by the caller or effect usually, but we can add here
        const status = (state !== null ? state : !devices[deviceName]) ? 'ONLINE' : 'OFFLINE';
        // addLog(`${deviceName} switched ${status}`); // Optional: keep logs in one place or distributed
    };

    const addLog = (text) => {
        const newLog = {
            id: Date.now(),
            text,
            time: new Date().toLocaleTimeString()
        };
        setLogs(prev => [newLog, ...prev]);
    };

    return (
        <AppContext.Provider value={{ user, login, logout, devices, toggleDevice, logs, addLog }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
