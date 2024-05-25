class EventEmitter {
    constructor() {
        this.events = {};
    }

    // Subscribe to an event
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    // Unsubscribe from an event
    off(event, listenerToRemove) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
    }

    // Emit an event
    emit(event, payload = null) {
        if (!this.events[event]) return;

        this.events[event].forEach(listener => listener(payload));
    }
}

export default EventEmitter;