import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = async (token: string) => {
    if (typeof window === 'undefined') return null;
    if (socket) return socket;

    const { io } = await import('socket.io-client');

    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connect error:', error);
    });

    return socket;
};

export const initCommunitySocket = initSocket;
export const getSocket = () => socket;
