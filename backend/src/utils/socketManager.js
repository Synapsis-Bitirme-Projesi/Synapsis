let io = null;

const initSocket = (socketServer) => {
    io = socketServer;
    return io;
};

const emitCommunityPost = (post) => {
    if (!io) return;
    io.to('community').emit('community:newPost', post);
};

const emitDirectMessage = (message, recipientId) => {
    if (!io) return;
    io.to(`user:${recipientId}`).emit('direct:message', message);
};

module.exports = {
    initSocket,
    emitCommunityPost,
    emitDirectMessage,
};
